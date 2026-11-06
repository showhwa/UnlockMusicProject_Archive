import { useId, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { toast } from 'react-toastify';

import { useAppDispatch } from '~/hooks';
import { applyNativeImportResult } from '~/features/settings/applyNativeImportResult';
import { commitStagingChange } from '~/features/settings/settingsSlice';
import { hasOneClickImportCapability } from '~/features/settings/settingsTabs';
import { AndroidImportType, NativeImportType } from '~/platform/capabilities';
import { usePlatform } from '~/platform/PlatformContext';

const NATIVE_IMPORT_LABELS: Record<NativeImportType, string> = {
  [NativeImportType.QQMusic]: 'QQ 音乐',
  [NativeImportType.Kuwo]: '酷我音乐',
  [NativeImportType.Kugou]: '酷狗音乐',
  [NativeImportType.QingTing]: '蜻蜓 FM',
};

function selectedFromCaps(types: readonly NativeImportType[]): Record<NativeImportType, boolean> {
  return {
    [NativeImportType.QQMusic]: types.includes(NativeImportType.QQMusic),
    [NativeImportType.Kuwo]: types.includes(NativeImportType.Kuwo),
    [NativeImportType.Kugou]: types.includes(NativeImportType.Kugou),
    [NativeImportType.QingTing]: types.includes(NativeImportType.QingTing),
  };
}

export function PanelOneClick() {
  const dispatch = useAppDispatch();
  const { capabilities, keys } = usePlatform();
  const nativeTypes = capabilities.nativeKeyAccess;
  const canAdb = capabilities.androidKeyAccess === AndroidImportType.Adb;
  const canShow = hasOneClickImportCapability(capabilities);

  const [selected, setSelected] = useState(() => selectedFromCaps(nativeTypes));
  const [importingNative, setImportingNative] = useState(false);
  const [importingAdb, setImportingAdb] = useState(false);

  const nativeTargets = useMemo(() => nativeTypes.filter((type) => selected[type]), [nativeTypes, selected]);

  const idNative = useId();
  const idAdb = useId();

  if (!canShow) {
    return <Navigate to="/settings/general" replace />;
  }

  const finishImport = (count: number, emptyMessage: string) => {
    if (count === 0) {
      toast.info(emptyMessage);
      return;
    }
    dispatch(commitStagingChange());
    toast.success(`成功导入 ${count} 项密钥`);
  };

  const handleImportNative = async () => {
    if (nativeTargets.length === 0) {
      toast.warning('请至少勾选一个客户端');
      return;
    }
    setImportingNative(true);
    try {
      const result = await keys.importNative(nativeTargets);
      finishImport(applyNativeImportResult(dispatch, result), '未导入到新密钥');
    } catch (e) {
      toast.error(`一键导入失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImportingNative(false);
    }
  };

  const handleImportAdb = async () => {
    setImportingAdb(true);
    try {
      const targets = nativeTargets.length > 0 ? nativeTargets : undefined;
      const result = await keys.importAndroidAdb({ targets });
      finishImport(applyNativeImportResult(dispatch, result), 'ADB 未导入到新密钥');
    } catch (e) {
      toast.error(`ADB 导入失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImportingAdb(false);
    }
  };

  return (
    <div className="min-h-0 flex-col grow px-1">
      <h2 className="text-2xl font-bold mb-4">一键导入</h2>
      <p className="text-sm text-base-content/80 mb-4">
        从本机已安装的客户端读取密钥并立即保存生效。各格式页的「导入数据库…」仍可单独使用。
      </p>

      {nativeTypes.length > 0 && (
        <section className="mb-8" aria-labelledby={idNative}>
          <h3 id={idNative} className="text-xl font-semibold mb-2">
            本机客户端
          </h3>
          <div className="flex flex-col gap-3 mb-4">
            {nativeTypes.map((type) => {
              const checkboxId = `${idNative}-${type}`;
              return (
                <label key={type} className="flex items-start gap-2" htmlFor={checkboxId}>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="checkbox checkbox-sm mt-0.5"
                    checked={selected[type]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [type]: e.target.checked }))}
                  />
                  <span className="font-medium">{NATIVE_IMPORT_LABELS[type]}</span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={importingNative || nativeTargets.length === 0}
            onClick={() => void handleImportNative()}
          >
            {importingNative ? '导入中…' : '开始导入'}
          </button>
        </section>
      )}

      {canAdb && (
        <section aria-labelledby={idAdb}>
          <h3 id={idAdb} className="text-xl font-semibold mb-2">
            Android ADB
          </h3>
          <p className="text-sm text-base-content/70 mb-4">
            通过 ADB 从已连接设备拉取密钥。若上方已勾选客户端，将仅导入对应格式；未勾选时导入全部支持项。
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={importingAdb}
            onClick={() => void handleImportAdb()}
          >
            {importingAdb ? '导入中…' : '从 ADB 导入'}
          </button>
        </section>
      )}
    </div>
  );
}
