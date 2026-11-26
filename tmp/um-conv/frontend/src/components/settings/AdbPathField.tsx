import { useCallback } from 'react';
import { ExecutablePathField } from '@/components/ExecutablePathField';
import { ExternalLink } from '@/components/ExternalLink';
import { useConvertSelector, useSetting } from '@/hooks/useConvertStore';
import { useExecutablePathProbe } from '@/hooks/useExecutablePathProbe';
import { DropTargetIds } from '@/lib/fileDrop';

/**
 * ADB executable path with live probing. Mount only while ADB key extraction is
 * enabled so a disabled feature never spawns the executable.
 */
export function AdbPathField() {
  const patchSettings = useConvertSelector((state) => state.patchSettings);
  const adbPath = useSetting((settings) => settings.bin.adb);

  const patchAdb = useCallback(
    (value: string) => patchSettings({ bin: { adb: value } }),
    [patchSettings],
  );

  const field = useExecutablePathProbe({
    exe: 'adb',
    persistedPath: adbPath,
    patchPath: patchAdb,
  });

  return (
    <ExecutablePathField
      label="ADB 路径"
      dropTargetId={DropTargetIds.pathAdb}
      hint={
        <>
          ADB 可执行文件可以从
          <ExternalLink href="https://developer.android.com/studio/releases/platform-tools#downloads">
            安卓开发者平台
          </ExternalLink>
          获取。
        </>
      }
      placeholder="输入或选择可执行文件"
      {...field}
    />
  );
}
