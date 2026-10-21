import { Zip, ZipPassThrough } from 'fflate';
import { isAbortError } from '~/util/fsPicker';
import { triggerAnchorDownload } from '~/util/triggerDownload';

export interface ZipSourceFile {
  /** Path inside the ZIP (UTF-8; non-ASCII gets Language Encoding Flag). */
  name: string;
  /** Blob URL or other fetchable URL of file contents. */
  url: string;
}

/**
 * Build a streaming ZIP (STORE / no recompression) from fetchable URLs.
 * Filenames with non-ASCII characters get ZIP UTF-8 (LEF) via fflate.
 */
export function createZipReadableStream(files: ZipSourceFile[]): ReadableStream<Uint8Array> {
  const zip = new Zip();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      zip.ondata = (err, data, final) => {
        if (err) {
          controller.error(err);
          return;
        }
        controller.enqueue(data);
        if (final) {
          controller.close();
        }
      };

      void (async () => {
        try {
          const usedNames = new Set<string>();

          for (const file of files) {
            const name = uniqueZipName(file.name, usedNames);
            const entry = new ZipPassThrough(name);
            zip.add(entry);

            const res = await fetch(file.url);
            if (!res.ok) {
              throw new Error(`无法读取文件: ${file.name} (${res.status})`);
            }
            if (!res.body) {
              const buf = new Uint8Array(await res.arrayBuffer());
              entry.push(buf, true);
              continue;
            }

            const reader = res.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) {
                entry.push(new Uint8Array(0), true);
                break;
              }
              entry.push(value, false);
            }
          }

          zip.end();
        } catch (e) {
          zip.terminate();
          controller.error(e);
        }
      })();
    },
    cancel() {
      zip.terminate();
    },
  });
}

/** Split `name.ext` → base + ext (ext includes the leading dot). */
function splitBaseExt(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.');
  if (dot > 0) {
    return { base: name.slice(0, dot), ext: name.slice(dot) };
  }
  return { base: name, ext: '' };
}

function uniqueZipName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const { base, ext } = splitBaseExt(name);
  let i = 2;
  let candidate: string;
  do {
    candidate = `${base} (${i})${ext}`;
    i += 1;
  } while (used.has(candidate));
  used.add(candidate);
  return candidate;
}

export function defaultZipFileName(files: ZipSourceFile[]): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const first = files[0]?.name ?? '已解密的音乐';
  const stem = splitBaseExt(first).base || '已解密的音乐';
  return `${date} - ${stem} 等.zip`;
}

export async function downloadZipViaSavePicker(
  files: ZipSourceFile[],
  suggestedName = defaultZipFileName(files),
): Promise<'ok' | 'cancelled'> {
  let handle: FileSystemFileHandle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'ZIP archive',
          accept: { 'application/zip': ['.zip'] },
        },
      ],
    });
  } catch (e) {
    if (isAbortError(e)) {
      return 'cancelled';
    }
    throw e;
  }

  const writable = await handle.createWritable();
  try {
    await createZipReadableStream(files).pipeTo(writable);
  } catch (e) {
    try {
      await writable.abort();
    } catch {
      // ignore
    }
    throw e;
  }
  return 'ok';
}

export async function downloadZipAsBlob(files: ZipSourceFile[], filename = defaultZipFileName(files)): Promise<void> {
  const blob = await new Response(createZipReadableStream(files), {
    headers: { 'Content-Type': 'application/zip' },
  }).blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerAnchorDownload(objectUrl, filename);
  } finally {
    // Revoke after a short delay so the download can start.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
}
