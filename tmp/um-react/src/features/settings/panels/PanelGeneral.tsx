import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '~/hooks';
import { selectStagingBatchDownloadSettings, selectStagingDirectWriteSettings } from '../settingsSelector';
import {
  BatchDownloadSettings,
  DirectWriteOutputMode,
  updateBatchDownloadSetting,
  updateDirectWriteSetting,
} from '../settingsSlice';
import { BatchDownloadType } from '~/platform/capabilities';
import { usePlatform } from '~/platform/PlatformContext';
import { clearRememberedDirectoryHandle, hasRememberedDirectoryHandle } from '~/util/downloadDirectoryHandle';
import { toast } from 'react-toastify';

export function PanelGeneral() {
  const dispatch = useAppDispatch();
  const batch = useAppSelector(selectStagingBatchDownloadSettings);
  const directWrite = useAppSelector(selectStagingDirectWriteSettings);
  const { capabilities, download } = usePlatform();
  const downloadTypes = new Set(capabilities.downloadTypes);
  const canDirectoryPicker = downloadTypes.has(BatchDownloadType.SelectDirectory);
  const canStreamingZip = downloadTypes.has(BatchDownloadType.StreamZip);
  const canBlobZip = downloadTypes.has(BatchDownloadType.PackZip);
  const showBatchDownload = downloadTypes.size > 0;
  const canDirectWrite = capabilities.directFsAccess;
  const [hasRememberedDir, setHasRememberedDir] = useState(false);
  const [pickingDirectory, setPickingDirectory] = useState(false);

  const refreshRemembered = useCallback(() => {
    hasRememberedDirectoryHandle()
      .then(setHasRememberedDir)
      .catch(() => setHasRememberedDir(false));
  }, []);

  useEffect(() => {
    refreshRemembered();
  }, [refreshRemembered]);

  const setBatch = (key: keyof BatchDownloadSettings, value: boolean) => {
    dispatch(updateBatchDownloadSetting({ key, value }));
  };

  const handleClearDirectory = async () => {
    await clearRememberedDirectoryHandle();
    refreshRemembered();
    toast.info('已清除记住的输出目录');
  };

  const handlePickDirectory = async () => {
    setPickingDirectory(true);
    try {
      const path = await download.pickDirectory();
      if (path) {
        dispatch(updateDirectWriteSetting({ fixedDirectoryPath: path, outputMode: 'fixedDirectory' }));
      }
    } catch (e) {
      toast.error(`无法选择文件夹: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPickingDirectory(false);
    }
  };

  const idDir = useId();
  const idRemember = useId();
  const idStreamZip = useId();
  const idBlobZip = useId();
  const idOutputMode = useId();
  const idFixedPath = useId();
  const idDeleteSource = useId();

  return (
    <div className="min-h-0 flex-col grow px-1">
      <h2 className="text-2xl font-bold mb-4">通用设置</h2>

      {showBatchDownload && (
        <>
          <h3 className="text-xl font-semibold mb-2">批量下载</h3>
          <p className="text-sm text-base-content/80 mb-4">
            点击「下载全部」时，将按下方勾选项的顺序依次尝试。若选中的模式均不可用或全部失败，会弹出提示。
          </p>

          <div className="flex flex-col gap-3">
            {canDirectoryPicker && (
              <>
                <BatchOption
                  id={idDir}
                  checked={batch.directoryPicker}
                  title="使用选择目录批量下载"
                  description="通过 showDirectoryPicker 将解密文件直接写入所选目录（推荐，Chrome / Edge）。"
                  onChange={(checked) => setBatch('directoryPicker', checked)}
                />

                <div className={`ml-6 flex flex-col gap-2 ${batch.directoryPicker ? '' : 'opacity-50'}`}>
                  <BatchOption
                    id={idRemember}
                    checked={batch.rememberDirectory}
                    disabled={!batch.directoryPicker}
                    title="记住输出目录"
                    description="将目录句柄保存在本机；下次下载时可能仍需确认写入权限。"
                    onChange={(checked) => setBatch('rememberDirectory', checked)}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-base-content/70">
                      {hasRememberedDir ? '已记住一个输出目录' : '尚未记住输出目录'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      disabled={!hasRememberedDir}
                      onClick={() => void handleClearDirectory()}
                    >
                      清除
                    </button>
                  </div>
                </div>
              </>
            )}

            {canStreamingZip && (
              <BatchOption
                id={idStreamZip}
                checked={batch.streamingZip}
                title="流式生成 ZIP"
                description="边打包边写入单个 ZIP 文件（showSaveFilePicker），内存占用较低。"
                onChange={(checked) => setBatch('streamingZip', checked)}
              />
            )}

            {canBlobZip && (
              <BatchOption
                id={idBlobZip}
                checked={batch.blobZip}
                title="生成单个 ZIP 并触发下载"
                description={
                  <>
                    在内存中生成 ZIP 后触发一次浏览器下载。兼容性最好；ZIP 需整包驻留内存，建议合计不超过约
                    500MB~1GB（视设备可用内存而定，过大可能失败或卡顿）。
                  </>
                }
                onChange={(checked) => setBatch('blobZip', checked)}
              />
            )}
          </div>
        </>
      )}

      {canDirectWrite && (
        <>
          <h3 className={`text-xl font-semibold mb-2 ${showBatchDownload ? 'mt-8' : ''}`}>解密后自动保存</h3>
          <p className="text-sm text-base-content/80 mb-4">解密完成后直接保存到本机，无需再手动下载。</p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={idOutputMode} className="font-medium">
                保存位置
              </label>
              <select
                id={idOutputMode}
                className="select select-bordered select-sm w-full max-w-md"
                value={directWrite.outputMode}
                onChange={(e) =>
                  dispatch(updateDirectWriteSetting({ outputMode: e.target.value as DirectWriteOutputMode }))
                }
              >
                <option value="besideSource">原文件所在文件夹</option>
                <option value="fixedDirectory">指定文件夹</option>
              </select>
              <span className="text-sm text-base-content/70">
                {directWrite.outputMode === 'besideSource'
                  ? '解密后的文件保存在加密文件旁边。'
                  : '解密后的文件保存到下方指定的文件夹。'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={idFixedPath} className="font-medium">
                文件夹路径
              </label>
              <div className="flex flex-wrap items-center gap-2 max-w-xl">
                <input
                  id={idFixedPath}
                  type="text"
                  className="input input-bordered input-sm min-w-0 flex-1"
                  placeholder="/path/to/output"
                  value={directWrite.fixedDirectoryPath ?? ''}
                  disabled={directWrite.outputMode !== 'fixedDirectory'}
                  onChange={(e) =>
                    dispatch(
                      updateDirectWriteSetting({ fixedDirectoryPath: e.target.value === '' ? null : e.target.value }),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={pickingDirectory}
                  onClick={() => void handlePickDirectory()}
                >
                  {pickingDirectory ? '选择中…' : '选择文件夹'}
                </button>
              </div>
            </div>

            <BatchOption
              id={idDeleteSource}
              checked={directWrite.deleteSourceAfterDecrypt}
              title="保存成功后删除加密文件"
              description="仅在写出成功后删除；请先确认已有备份。"
              onChange={(checked) => dispatch(updateDirectWriteSetting({ deleteSourceAfterDecrypt: checked }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

type BatchOptionProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: ReactNode;
  onChange: (checked: boolean) => void;
};

function BatchOption({ id, checked, disabled, title, description, onChange }: BatchOptionProps) {
  return (
    <label className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        className="checkbox checkbox-sm mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-sm text-base-content/70">{description}</span>
      </span>
    </label>
  );
}
