import { DecryptedAudioFile, ProcessState, selectFiles } from '~/features/file-listing/fileListingSlice';
import { FaDownload } from 'react-icons/fa';
import { useAppSelector } from '~/hooks';
import { toast } from 'react-toastify';
import { selectFinalBatchDownloadSettings } from '~/features/settings/settingsSelector';
import { buildEnabledDownloadModes } from '~/platform/buildEnabledDownloadModes';
import { usePlatform } from '~/platform/PlatformContext';

export function DownloadAll() {
  const files = useAppSelector(selectFiles);
  const batchSettings = useAppSelector(selectFinalBatchDownloadSettings);
  const { download, capabilities } = usePlatform();

  if (capabilities.downloadTypes.length === 0) {
    return null;
  }

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
      const file = completeFiles[0];
      await download.saveOne({
        url: file.decrypted,
        fileName: decryptedDownloadName(file),
      });
      toast.success('已开始下载');
      return;
    }

    const modes = buildEnabledDownloadModes(batchSettings, capabilities.downloadTypes);
    if (modes.length === 0) {
      toast.error('批量下载失败：未启用任何可用的下载方式，请在「设定 → 通用设置」中勾选。');
      return;
    }

    toast.warning('开始下载，请稍候');

    const manyInput = {
      files: completeFiles.map((file) => ({
        url: file.decrypted,
        fileName: decryptedDownloadName(file),
      })),
      rememberDirectory: batchSettings.rememberDirectory,
    };

    for (const mode of modes) {
      try {
        const result = await download.saveMany(mode, manyInput);
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

function decryptedDownloadName(file: DecryptedAudioFile): string {
  return `${file.cleanName}.${file.ext}`;
}
