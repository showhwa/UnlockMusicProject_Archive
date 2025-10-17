import { DecryptedAudioFile, ProcessState, selectFiles } from '~/features/file-listing/fileListingSlice';
import { FaDownload } from 'react-icons/fa';
import { useAppSelector } from '~/hooks';
import { toast } from 'react-toastify';
import { SimpleQueue } from '~/util/SimpleQueue';

export function DownloadAll() {
  const files = useAppSelector(selectFiles);
  const downloadAllAsync = async () => {
    const fileList = Object.values(files);
    const fileCount = fileList.length;
    if (fileCount === 0) {
      toast.warning('未添加文件');
      return;
    }

    // 判断所有文件是否处理完成
    const allComplete = fileList.every((file) => file.state !== ProcessState.PROCESSING);
    if (!allComplete) {
      toast.warning('请等待所有文件解密完成');
      return;
    }

    // 过滤处理失败的文件
    const completeFiles = fileList.filter((file) => file.state === ProcessState.COMPLETE);

    // 准备下载
    let dir: FileSystemDirectoryHandle | null = null;
    try {
      dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return; // user cancelled
      }
      console.error(e);
    }
    toast.warning('开始下载，请稍候');
    const queue = new SimpleQueue(8);
    const promises = Object.values(completeFiles).map(async (file) => {
      try {
        await queue.enter();
        await downloadFile(file, dir);
      } catch (e) {
        console.error(`下载失败: ${file.fileName}`, e);
        toast.error(`出现错误: ${e as Error}`);
        throw e;
      } finally {
        queue.leave();
      }
    });

    const promiseResults = await Promise.allSettled(promises);
    const success = promiseResults.filter((result) => result.status === 'fulfilled').length;
    const level = success === fileCount ? 'success' : success === 0 ? 'error' : 'warning';
    toast[level](`成功下载: ${success}/${fileCount}首`);
  };

  function onDownloadAll() {
    downloadAllAsync().catch((e) => {
      // this should not happen
      console.error('下载全部出现错误', e);
    });
  }

  return (
    <button className="btn btn-primary" id="downloadAll" onClick={onDownloadAll} title="下载全部">
      <FaDownload />
    </button>
  );
}

async function downloadFile(file: DecryptedAudioFile, dir: FileSystemDirectoryHandle | null) {
  if (dir) {
    const fileHandle = await dir.getFileHandle(file.cleanName + '.' + file.ext, { create: true });
    const fileStream = await fileHandle.createWritable();
    try {
      const res = await fetch(file.decrypted);
      await res.body?.pipeTo(fileStream);
    } catch {
      await fileStream.abort();
    }
  } else {
    const anchor = document.createElement('a');
    anchor.href = file.decrypted;
    anchor.download = file.cleanName + '.' + file.ext;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }
}
