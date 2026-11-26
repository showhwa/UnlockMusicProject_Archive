import { Field, Subtitle2, Switch, makeStyles, tokens } from '@fluentui/react-components';
import { useCallback } from 'react';
import { ExecutablePathField } from '@/components/ExecutablePathField';
import { ExternalLink } from '@/components/ExternalLink';
import { useConvertSelector, useSetting } from '@/hooks/useConvertStore';
import { useExecutablePathProbe } from '@/hooks/useExecutablePathProbe';
import { useOptimisticSetting } from '@/hooks/useOptimisticSetting';
import { DropTargetIds } from '@/lib/fileDrop';
import { AdbPathField } from './AdbPathField';
import { SettingsSection } from './SettingsSection';

const useStyles = makeStyles({
  groupTitle: {
    margin: 0,
    marginTop: tokens.spacingVerticalS,
  },
});

export function DecryptCoreSettingsSection() {
  const styles = useStyles();
  const patchSettings = useConvertSelector((state) => state.patchSettings);
  const umPath = useSetting((settings) => settings.bin.um_cli_rs);
  const qmpcPath = useSetting((settings) => settings.bin['qmpc-mmkv-cli']);
  const allowAdbKeys = useOptimisticSetting(
    useSetting((settings) => settings.bin.allowAdbKeys),
    (value) => ({ bin: { allowAdbKeys: value } }),
  );

  const patchUm = useCallback(
    (value: string) => patchSettings({ bin: { um_cli_rs: value } }),
    [patchSettings],
  );
  const patchQmpc = useCallback(
    (value: string) => patchSettings({ bin: { 'qmpc-mmkv-cli': value } }),
    [patchSettings],
  );

  const umField = useExecutablePathProbe({
    exe: 'um_cli_rs',
    persistedPath: umPath,
    patchPath: patchUm,
  });
  const qmpcField = useExecutablePathProbe({
    exe: 'qmpc-mmkv-cli',
    persistedPath: qmpcPath,
    patchPath: patchQmpc,
  });

  return (
    <SettingsSection id="decrypt">
      <ExecutablePathField
        label="音乐解锁实现"
        dropTargetId={DropTargetIds.pathUmCliRs}
        hint={
          <>
            离线解密支持组件，可以从{' '}
            <ExternalLink href="https://git.um-react.app/um/lib_um_crypto_rust/releases/">
              lib_um_crypto_rust 项目
            </ExternalLink>
            获取。
          </>
        }
        placeholder="输入或选择可执行文件"
        {...umField}
      />

      <Field
        hint={
          <>
            通过安卓调试接口从已 root 的设备获取其储存的密钥。
            <br />
            目前支持 QQ 音乐和酷狗音乐的密钥获取。
          </>
        }
      >
        <Switch
          label="允许通过 ADB 获取设备上的密钥"
          checked={allowAdbKeys.value}
          onChange={(_, data) => void allowAdbKeys.commit(Boolean(data.checked))}
        />
      </Field>
      {allowAdbKeys.value ? <AdbPathField /> : null}

      <Subtitle2 as="h3" className={styles.groupTitle}>
        QQ 音乐
      </Subtitle2>
      <ExecutablePathField
        label="Windows 平台的 MMKV 密钥提取工具"
        dropTargetId={DropTargetIds.pathQmpc}
        hint={
          <>
            可以从{' '}
            <ExternalLink href="https://git.um-react.app/um/qmpc-mmkv/releases">
              qmpc-mmkv 项目
            </ExternalLink>
            获取。
          </>
        }
        placeholder="输入或选择可执行文件"
        {...qmpcField}
      />
    </SettingsSection>
  );
}
