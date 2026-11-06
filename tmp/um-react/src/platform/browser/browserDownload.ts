import { toast } from 'react-toastify';
import { BatchDownloadType } from '~/platform/capabilities';
import { NotSupportedMethod } from '~/platform/errors';
import type { DownloadManyInput, DownloadManyResult, DownloadOneInput } from '~/platform/types';
import { resolveWritableDirectory } from '~/util/downloadDirectoryHandle';
import { SimpleQueue } from '~/util/SimpleQueue';
import { downloadZipAsBlob, downloadZipViaSavePicker, type ZipSourceFile } from '~/util/streamZip';
import { triggerAnchorDownload } from '~/util/triggerDownload';

export interface BrowserDownload {
  saveOne(input: DownloadOneInput): Promise<void>;
  saveMany(type: BatchDownloadType, input: DownloadManyInput): Promise<DownloadManyResult>;
  pickDirectory(): Promise<string | null>;
}

/**
 * Browser download backend: single-file anchor download plus batch directory / ZIP modes.
 * Modes not listed in `downloadTypes` reject with `NotSupportedMethod`.
 * `pickDirectory` always rejects: the browser cannot return an OS path string.
 */
export function createBrowserDownload(downloadTypes: readonly BatchDownloadType[]): BrowserDownload {
  const supported = new Set(downloadTypes);

  return {
    saveOne(input: DownloadOneInput): Promise<void> {
      if (supported.size === 0) {
        return Promise.reject(new NotSupportedMethod('download.saveOne'));
      }
      triggerAnchorDownload(input.url, input.fileName);
      return Promise.resolve();
    },

    async saveMany(type: BatchDownloadType, input: DownloadManyInput): Promise<DownloadManyResult> {
      if (!supported.has(type)) {
        throw new NotSupportedMethod('download.saveMany', `${type} unavailable on this platform`);
      }

      switch (type) {
        case BatchDownloadType.SelectDirectory:
          return downloadToDirectory(input.files, input.rememberDirectory ?? false);
        case BatchDownloadType.StreamZip:
          return downloadStreamingZip(input.files);
        case BatchDownloadType.PackZip:
          await downloadBlobZip(input.files);
          return 'ok';
      }
    },

    pickDirectory(): Promise<string | null> {
      return Promise.reject(new NotSupportedMethod('download.pickDirectory'));
    },
  };
}

async function downloadToDirectory(files: DownloadManyInput['files'], remember: boolean): Promise<DownloadManyResult> {
  const dir = await resolveWritableDirectory(remember);
  if (!dir) {
    return 'cancelled';
  }

  const fileCount = files.length;
  const queue = new SimpleQueue(8);
  const promises = files.map(async (file) => {
    try {
      await queue.enter();
      await writeFileToDirectory(file.url, file.fileName, dir);
    } catch (e) {
      console.error(`下载失败: ${file.fileName}`, e);
      toast.error(`出现错误: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    } finally {
      queue.leave();
    }
  });

  const promiseResults = await Promise.allSettled(promises);
  const success = promiseResults.filter((result) => result.status === 'fulfilled').length;
  const level = success === fileCount ? 'success' : success === 0 ? 'error' : 'warning';
  toast[level](`成功下载: ${success}/${fileCount}首`);

  if (success === 0) {
    throw new Error('未能写入任何文件到所选目录');
  }
  return 'ok';
}

async function writeFileToDirectory(url: string, fileName: string, dir: FileSystemDirectoryHandle) {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const fileStream = await fileHandle.createWritable();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`无法读取文件: ${fileName} (${res.status})`);
    }
    if (!res.body) {
      await fileStream.write(await res.arrayBuffer());
      await fileStream.close();
      return;
    }
    await res.body.pipeTo(fileStream);
  } catch (e) {
    await fileStream.abort();
    throw e;
  }
}

function toZipSources(files: DownloadManyInput['files']): ZipSourceFile[] {
  return files.map((file) => ({
    name: file.fileName,
    url: file.url,
  }));
}

async function downloadStreamingZip(files: DownloadManyInput['files']): Promise<DownloadManyResult> {
  const result = await downloadZipViaSavePicker(toZipSources(files));
  if (result === 'ok') {
    toast.success(`已导出 ZIP（${files.length} 首）`);
  }
  return result;
}

async function downloadBlobZip(files: DownloadManyInput['files']): Promise<void> {
  await downloadZipAsBlob(toZipSources(files));
  toast.success(`已开始下载 ZIP（${files.length} 首）`);
}
