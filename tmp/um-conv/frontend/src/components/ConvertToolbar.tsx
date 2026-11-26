import { useState } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { AddRegular, DismissRegular, FolderRegular } from '@fluentui/react-icons';
import { useBusy, useConvertSelector, useFiles } from '@/hooks/useConvertStore';
import { Button } from './Button';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  spacer: {
    minWidth: tokens.spacingHorizontalS,
    flex: 1,
  },
});

export type ConvertToolbarProps = {
  className?: string;
};

export function ConvertToolbar({ className }: ConvertToolbarProps) {
  const styles = useStyles();
  const addFiles = useConvertSelector((state) => state.addFiles);
  const addFolder = useConvertSelector((state) => state.addFolder);
  const clearFiles = useConvertSelector((state) => state.clearFiles);
  const startConvert = useConvertSelector((state) => state.startConvert);
  const files = useFiles();
  const busy = useBusy();
  const [pendingStart, setPendingStart] = useState(false);
  const startDisabled = busy || pendingStart || !files.some((file) => !file.outputPath);

  const onStart = async () => {
    setPendingStart(true);
    try {
      await startConvert();
    } finally {
      setPendingStart(false);
    }
  };

  return (
    <div className={mergeClasses(styles.root, className)}>
      <Button icon={<AddRegular />} onClick={() => void addFiles()}>
        添加文件
      </Button>
      <Button icon={<FolderRegular />} onClick={() => void addFolder()}>
        添加目录
      </Button>
      <Button
        icon={<DismissRegular />}
        onClick={() => void clearFiles()}
        disabled={busy || pendingStart || files.length === 0}
      >
        清空
      </Button>
      <span className={styles.spacer} />
      <Button variant="primary" onClick={() => void onStart()} disabled={startDisabled}>
        {busy || pendingStart ? '转换中…' : '开始转换'}
      </Button>
    </div>
  );
}
