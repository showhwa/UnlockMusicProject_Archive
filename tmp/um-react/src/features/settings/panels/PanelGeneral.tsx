import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '~/hooks';
import { selectStagingBatchDownloadSettings } from '../settingsSelector';
import { BatchDownloadSettings, updateBatchDownloadSetting } from '../settingsSlice';
import { supportsDirectoryPicker, supportsStreamingZipDownload } from '~/util/batchDownloadCapabilities';
import { clearRememberedDirectoryHandle, hasRememberedDirectoryHandle } from '~/util/downloadDirectoryHandle';
import { toast } from 'react-toastify';

export function PanelGeneral() {
  const dispatch = useAppDispatch();
  const batch = useAppSelector(selectStagingBatchDownloadSettings);
  const canDirectoryPicker = supportsDirectoryPicker();
  const canStreamingZip = supportsStreamingZipDownload();
  const [hasRememberedDir, setHasRememberedDir] = useState(false);

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

  const idDir = useId();
  const idRemember = useId();
  const idStreamZip = useId();
  const idBlobZip = useId();

  return (
    <div className="min-h-0 flex-col grow px-1">
      <h2 className="text-2xl font-bold mb-4">通用设置</h2>

      <h3 className="text-xl font-semibold mb-2">批量下载</h3>
      <p className="text-sm text-base-content/80 mb-4">
        点击「下载全部」时，将按下方勾选项的顺序依次尝试。若选中的模式均不可用或全部失败，会弹出提示。
      </p>

      <div className="flex flex-col gap-3">
        <BatchOption
          id={idDir}
          checked={batch.directoryPicker && canDirectoryPicker}
          disabled={!canDirectoryPicker}
          dimmed={!canDirectoryPicker}
          title="使用选择目录批量下载"
          description={
            canDirectoryPicker
              ? '通过 showDirectoryPicker 将解密文件直接写入所选目录（推荐，Chrome / Edge）。'
              : '当前浏览器不支持 showDirectoryPicker。'
          }
          onChange={(checked) => setBatch('directoryPicker', checked)}
        />

        <div className={`ml-6 flex flex-col gap-2 ${batch.directoryPicker && canDirectoryPicker ? '' : 'opacity-50'}`}>
          <BatchOption
            id={idRemember}
            checked={batch.rememberDirectory}
            disabled={!batch.directoryPicker || !canDirectoryPicker}
            title="记住输出目录"
            description="将目录句柄保存在本机；下次下载时可能仍需确认写入权限。"
            onChange={(checked) => setBatch('rememberDirectory', checked)}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base-content/70">{hasRememberedDir ? '已记住一个输出目录' : '尚未记住输出目录'}</span>
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

        <BatchOption
          id={idStreamZip}
          checked={batch.streamingZip && canStreamingZip}
          disabled={!canStreamingZip}
          dimmed={!canStreamingZip}
          title="流式生成 ZIP"
          description={
            canStreamingZip
              ? '边打包边写入单个 ZIP 文件（showSaveFilePicker），内存占用较低。'
              : '当前浏览器不支持 showSaveFilePicker，无法流式写出 ZIP。'
          }
          onChange={(checked) => setBatch('streamingZip', checked)}
        />

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
      </div>
    </div>
  );
}

type BatchOptionProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  dimmed?: boolean;
  title: string;
  description: ReactNode;
  onChange: (checked: boolean) => void;
};

function BatchOption({ id, checked, disabled, dimmed, title, description, onChange }: BatchOptionProps) {
  return (
    <label className={`flex items-start gap-2 ${dimmed ? 'opacity-50' : ''}`}>
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
