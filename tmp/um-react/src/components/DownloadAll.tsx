import { DecryptedAudioFile, selectFiles } from '~/features/file-listing/fileListingSlice';
import { FaDownload } from 'react-icons/fa';
import { useAppSelector } from '~/hooks';
import { toast } from 'react-toastify';

export function DownloadAll() {
  const files = useAppSelector(selectFiles);
  const filesLength = Object.keys(files).length;
  const onClickDownloadAll = async () => {
    let dir: FileSystemDirectoryHandle | undefined;
    let success = 0;
    try {
      dir = await window.showDirectoryPicker();
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
    }
    for (const [_, file] of Object.entries(files)) {
      try {
        if (dir) {
          await DownloadNew(dir, file);
        } else {
          await DownloadOld(file);
        }
        success++;
      } catch (e) {
        console.error(`下载失败: ${file.fileName}`, e);
        toast.error(`出现错误: ${e}`);
      }
    }
    if (success === filesLength) {
      toast.success(`成功下载: ${success}/${filesLength}首`);
    } else {
      toast.error(`成功下载: ${success}/${filesLength}首`);
    }
  };

  return (
    <button
      style={{ width: '48px', height: '48px', paddingInline: '0px', margin: '10px', marginLeft: 'auto' }}
      className="btn btn-primary"
      onClick={onClickDownloadAll}
      title="下载全部"
    >
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
