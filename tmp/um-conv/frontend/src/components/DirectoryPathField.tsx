import { useCallback } from 'react';
import { Input, makeStyles, tokens } from '@fluentui/react-components';
import { FolderRegular } from '@fluentui/react-icons';
import { Button } from '@/components/Button';
import { FileDropTarget } from '@/components/FileDropTarget';
import { useConvertSelector } from '@/hooks/useConvertStore';
import type { OptimisticSetting } from '@/hooks/useOptimisticSetting';
import { firstDirectoryPath } from '@/lib/fileDrop';
import type { DroppedItem } from '~protocol';

export type DirectoryPathFieldProps = {
  /** Drop target id prefix registered with the native file-drop router. */
  dropTargetId: string;
  /** Optimistic string setting holding the directory path. */
  setting: OptimisticSetting<string>;
  placeholder: string;
  /** `icon` renders a compact icon-only browse button. */
  browseVariant?: 'text' | 'icon';
  /** Accessible name for the browse button when `browseVariant` is `icon`. */
  browseLabel?: string;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    minWidth: 0,
    alignItems: 'stretch',
    gap: tokens.spacingHorizontalXS,
  },
  input: {
    flex: 1,
    minWidth: 0,
  },
});

/** Directory text input with drop and browse support; commits only on explicit user intent. */
export function DirectoryPathField({
  dropTargetId,
  setting,
  placeholder,
  browseVariant = 'text',
  browseLabel = '浏览目录',
}: DirectoryPathFieldProps) {
  const styles = useStyles();
  const selectDirectory = useConvertSelector((state) => state.selectDirectory);
  const { commit, commitDraft, setDraft } = setting;

  const onDrop = useCallback(
    (items: DroppedItem[]) => {
      const dir = firstDirectoryPath(items);
      if (dir) void commit(dir);
    },
    [commit],
  );

  const onBrowse = useCallback(() => {
    void selectDirectory().then((path) => {
      if (path) void commit(path);
    });
  }, [commit, selectDirectory]);

  return (
    <FileDropTarget id={dropTargetId} className={styles.root} onDrop={onDrop}>
      <Input
        className={styles.input}
        value={setting.value}
        placeholder={placeholder}
        onChange={(_, data) => setDraft(data.value)}
        onBlur={() => void commitDraft()}
      />
      {browseVariant === 'icon' ? (
        <Button
          variant="icon"
          title="浏览"
          aria-label={browseLabel}
          icon={<FolderRegular />}
          onClick={onBrowse}
        />
      ) : (
        <Button icon={<FolderRegular />} onClick={onBrowse}>
          浏览
        </Button>
      )}
    </FileDropTarget>
  );
}
