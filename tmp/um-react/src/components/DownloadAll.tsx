import { DecryptedAudioFile, ProcessState, selectFiles } from '~/features/file-listing/fileListingSlice';
import { FaDownload } from 'react-icons/fa';
import { useAppSelector } from '~/hooks';
import { toast } from 'react-toastify';

export function DownloadAll() {
  const files = useAppSelector(selectFiles);
  const onClickDownloadAll = async () => {
    console.time('DownloadAll'); //开始计时
    const fileCount = Object.keys(files).length;
    if (fileCount === 0) {
      toast.warning('未添加文件');
      return;
    }

    //判断所有文件是否处理完成
    const allComplete = Object.values(files).every((file) => file.state !== ProcessState.PROCESSING);
    if (!allComplete) {
      toast.warning('请等待所有文件解密完成');
      return;
    }

    //过滤处理失败的文件
    const completeFiles = Object.values(files).filter((file) => file.state === ProcessState.COMPLETE);

    //开始下载
    let dir: FileSystemDirectoryHandle | undefined;
    try {
      dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
    }
    toast.warning('开始下载，请稍候');

    const promises = Object.values(completeFiles).map(async (file) => {
      console.log(`开始下载: ${file.fileName}`);
      try {
        if (dir) {
          await DownloadNew(dir, file);
        } else {
          await DownloadOld(file);
        }
        console.log(`成功下载: ${file.fileName}`);
      } catch (e) {
        console.error(`下载失败: ${file.fileName}`, e);
        toast.error(`出现错误: ${e}`);
        throw e;
      }
    });
    await Promise.allSettled(promises).then((f) => {
      const success = f.filter((result) => result.status === 'fulfilled').length;
      if (success === fileCount) {
        toast.success(`成功下载: ${success}/${fileCount}首`);
      } else {
        toast.warning(`成功下载: ${success}/${fileCount}首`);
      }
    });
    console.timeEnd('DownloadAll'); //停止计时
  };

  return (
    <button className="btn btn-primary" id="downloadAll" onClick={onClickDownloadAll} title="下载全部">
      <FaDownload />
    </button>
  );
}

async function DownloadNew(dir: FileSystemDirectoryHandle, file: DecryptedAudioFile) {
  const fileHandle = await dir.getFileHandle(file.cleanName + '.' + file.ext, { create: true });
  const writable = await fileHandle.createWritable();
  await fetch(file.decrypted).then((res) => res.body?.pipeTo(writable));
}

async function DownloadOld(file: DecryptedAudioFile) {
  const a = document.createElement('a');
  a.href = file.decrypted;
  a.download = file.cleanName + '.' + file.ext;
  document.body.append(a);
  a.click();
  a.remove();
}
