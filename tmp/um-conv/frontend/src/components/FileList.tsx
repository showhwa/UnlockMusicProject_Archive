import { useCallback } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { DroppedItem } from '~protocol';
import { FileDropTarget } from '@/components/FileDropTarget';
import { FileListItem } from '@/components/FileListItem';
import { DropTargetIds } from '@/lib/fileDrop';
import { useBusy, useConvertSelector, useFiles } from '@/hooks/useConvertStore';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    minHeight: 0,
    flex: 1,
    flexDirection: 'column',
  },
  panel: {
    display: 'flex',
    minHeight: 0,
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  empty: {
    display: 'flex',
    minHeight: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  list: {
    minHeight: 0,
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
});

export type FileListProps = {
  className?: string;
};

export function FileList({ className }: FileListProps) {
  const styles = useStyles();
  const addPaths = useConvertSelector((state) => state.addPaths);
  const removeFiles = useConvertSelector((state) => state.removeFiles);
  const playFile = useConvertSelector((state) => state.playFile);
  const openContainingFolder = useConvertSelector((state) => state.openContainingFolder);
  const files = useFiles();
  const busy = useBusy();

  const onFilesDrop = useCallback(
    (items: DroppedItem[]) => {
      const paths = items.map((item) => item.path).filter(Boolean);
      if (paths.length > 0) void addPaths(paths);
    },
    [addPaths],
  );
  const onPlay = useCallback((path: string) => void playFile(path), [playFile]);
  const onOpenFolder = useCallback(
    (path: string) => void openContainingFolder(path),
    [openContainingFolder],
  );
  const onRemove = useCallback((path: string) => void removeFiles([path]), [removeFiles]);

  return (
    <section className={mergeClasses(styles.root, className)}>
      <FileDropTarget id={DropTargetIds.fileList} className={styles.panel} onDrop={onFilesDrop}>
        {files.length === 0 ? (
          <div className={styles.empty}>
            拖放文件或目录到此处
            <br />
            或使用上方按钮添加
          </div>
        ) : (
          <div className={styles.list}>
            {files.map((file, index) => (
              <FileListItem
                key={file.path}
                file={file}
                index={index}
                busy={busy}
                onPlay={onPlay}
                onOpenFolder={onOpenFolder}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </FileDropTarget>
    </section>
  );
}
