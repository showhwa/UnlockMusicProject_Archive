import { useEffect, useRef, useState } from 'react';
import { Field, makeStyles, tokens } from '@fluentui/react-components';
import { DocumentSettingsRegular, DocumentTextRegular } from '@fluentui/react-icons';
import { Button } from '@/components/Button';
import { DirectoryPathField } from '@/components/DirectoryPathField';
import { useConvertSelector, useSetting } from '@/hooks/useConvertStore';
import { useOptimisticSetting } from '@/hooks/useOptimisticSetting';
import { DropTargetIds } from '@/lib/fileDrop';
import { SettingsSection } from './SettingsSection';

const useStyles = makeStyles({
  fileActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
});

export function AdvancedSettingsSection() {
  const styles = useStyles();
  const tempDir = useOptimisticSetting(
    useSetting((settings) => settings.tempDir),
    (value) => ({ tempDir: value }),
  );
  const openLogFile = useConvertSelector((state) => state.openLogFile);
  const openConfigFile = useConvertSelector((state) => state.openConfigFile);
  const [opening, setOpening] = useState<'log' | 'config' | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleOpen = async (kind: 'log' | 'config', action: () => Promise<string | null>) => {
    if (opening !== null) return;
    setOpening(kind);
    setOpenError(null);
    const error = await action();
    if (!mountedRef.current) return;
    setOpening(null);
    if (error !== null) setOpenError(error);
  };

  return (
    <SettingsSection id="advanced">
      <Field label="临时目录" hint="转换产生的中间文件会存放在这里。">
        <DirectoryPathField
          dropTargetId={DropTargetIds.pathTempDir}
          setting={tempDir}
          placeholder="使用系统临时目录"
        />
      </Field>
      <Field
        label="日志与配置"
        hint="使用系统默认程序打开日志文件或配置文件。"
        validationState={openError ? 'error' : 'none'}
        validationMessage={openError ?? undefined}
      >
        <div className={styles.fileActions}>
          <Button
            icon={<DocumentTextRegular />}
            disabled={opening !== null}
            onClick={() => void handleOpen('log', openLogFile)}
          >
            查看日志
          </Button>
          <Button
            icon={<DocumentSettingsRegular />}
            disabled={opening !== null}
            onClick={() => void handleOpen('config', openConfigFile)}
          >
            查看配置文件
          </Button>
        </div>
      </Field>
    </SettingsSection>
  );
}
