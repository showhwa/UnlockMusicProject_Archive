import { DecryptedAudioFile, ProcessState, selectFiles } from '~/features/file-listing/fileListingSlice';
import { FaDownload } from 'react-icons/fa';
import { useAppSelector } from '~/hooks';
import { toast } from 'react-toastify';
import { SimpleQueue } from '~/util/SimpleQueue';
import { selectFinalBatchDownloadSettings } from '~/features/settings/settingsSelector';
import type { BatchDownloadSettings } from '~/features/settings/settingsSlice';
import { supportsDirectoryPicker, supportsStreamingZipDownload } from '~/util/batchDownloadCapabilities';
import { resolveWritableDirectory } from '~/util/downloadDirectoryHandle';
import { downloadZipAsBlob, downloadZipViaSavePicker, ZipSourceFile } from '~/util/streamZip';
import { triggerAnchorDownload } from '~/util/triggerDownload';

export function DownloadAll() {
  const files = useAppSelector(selectFiles);
  const batchSettings = useAppSelector(selectFinalBatchDownloadSettings);

  const downloadAllAsync = async () => {
    const fileList = Object.values(files);
    const fileCount = fileList.length;
    if (fileCount === 0) {
      toast.warning('未添加文件');
      return;
    }

    const allComplete = fileList.every((file) => file.state !== ProcessState.PROCESSING);
    if (!allComplete) {
      toast.warning('请等待所有文件解密完成');
      return;
    }

    const completeFiles = fileList.filter((file) => file.state === ProcessState.COMPLETE);
    if (completeFiles.length === 0) {
      toast.warning('没有可下载的已解密文件');
      return;
    }

    // Single file: direct blob download, no ZIP / directory picker.
    if (completeFiles.length === 1) {
      downloadSingleBlob(completeFiles[0]);
      toast.success('已开始下载');
      return;
    }

    const modes = buildEnabledModes(batchSettings);
    if (modes.length === 0) {
      toast.error('批量下载失败：未启用任何可用的下载方式，请在「设定 → 通用设置」中勾选。');
      return;
    }

    toast.warning('开始下载，请稍候');

    for (const mode of modes) {
      try {
        const result = await runMode(mode, completeFiles, batchSettings.rememberDirectory);
        if (result === 'ok') {
          return;
        }
        // cancelled / skipped → try next mode
      } catch (e) {
        console.error(`批量下载模式 ${mode} 失败`, e);
        toast.error(`下载方式失败，尝试下一种: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    toast.error('批量下载失败：当前浏览器不支持或您取消了所有可用方式。可在「设定 → 通用设置」调整选项。');
  };

  function onDownloadAll() {
    downloadAllAsync().catch((e) => {
      console.error('下载全部出现错误', e);
      toast.error(`批量下载出现错误: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  return (
    <button className="btn btn-primary" id="downloadAll" onClick={onDownloadAll} title="下载全部">
      <FaDownload />
    </button>
  );
}

type BatchMode = 'directory' | 'streamingZip' | 'blobZip';

function buildEnabledModes(
  settings: Pick<BatchDownloadSettings, 'directoryPicker' | 'streamingZip' | 'blobZip'>,
): BatchMode[] {
  const modes: BatchMode[] = [];
  if (settings.directoryPicker && supportsDirectoryPicker()) {
    modes.push('directory');
  }
  if (settings.streamingZip && supportsStreamingZipDownload()) {
    modes.push('streamingZip');
  }
  if (settings.blobZip) {
    modes.push('blobZip');
  }
  return modes;
}

async function runMode(
  mode: BatchMode,
  completeFiles: DecryptedAudioFile[],
  rememberDirectory: boolean,
): Promise<'ok' | 'cancelled'> {
  switch (mode) {
    case 'directory':
      return downloadToDirectory(completeFiles, rememberDirectory);
    case 'streamingZip':
      return downloadStreamingZip(completeFiles);
    case 'blobZip':
      await downloadBlobZip(completeFiles);
      return 'ok';
  }
}

async function downloadToDirectory(
  completeFiles: DecryptedAudioFile[],
  remember: boolean,
): Promise<'ok' | 'cancelled'> {
  const dir = await resolveWritableDirectory(remember);
  if (!dir) {
    return 'cancelled';
  }

  const fileCount = completeFiles.length;
  const queue = new SimpleQueue(8);
  const promises = completeFiles.map(async (file) => {
    try {
      await queue.enter();
      await writeFileToDirectory(file, dir);
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

function decryptedDownloadName(file: DecryptedAudioFile): string {
  return `${file.cleanName}.${file.ext}`;
}

async function writeFileToDirectory(file: DecryptedAudioFile, dir: FileSystemDirectoryHandle) {
  const fileHandle = await dir.getFileHandle(decryptedDownloadName(file), { create: true });
  const fileStream = await fileHandle.createWritable();
  try {
    const res = await fetch(file.decrypted);
    if (!res.ok) {
      throw new Error(`无法读取文件: ${decryptedDownloadName(file)} (${res.status})`);
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

function toZipSources(files: DecryptedAudioFile[]): ZipSourceFile[] {
  return files.map((file) => ({
    name: decryptedDownloadName(file),
    url: file.decrypted,
  }));
}

function downloadSingleBlob(file: DecryptedAudioFile) {
  triggerAnchorDownload(file.decrypted, decryptedDownloadName(file));
}

async function downloadStreamingZip(completeFiles: DecryptedAudioFile[]): Promise<'ok' | 'cancelled'> {
  const sources = toZipSources(completeFiles);
  const result = await downloadZipViaSavePicker(sources);
  if (result === 'ok') {
    toast.success(`已导出 ZIP（${completeFiles.length} 首）`);
  }
  return result;
}

async function downloadBlobZip(completeFiles: DecryptedAudioFile[]): Promise<void> {
  await downloadZipAsBlob(toZipSources(completeFiles));
  toast.success(`已开始下载 ZIP（${completeFiles.length} 首）`);
}
