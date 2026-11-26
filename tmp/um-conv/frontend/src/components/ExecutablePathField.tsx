import { useCallback } from 'react';
import { Field, Input, makeStyles, tokens, type FieldProps } from '@fluentui/react-components';
import { WindowConsoleRegular } from '@fluentui/react-icons';
import { Button } from '@/components/Button';
import { FileDropTarget } from '@/components/FileDropTarget';
import { firstFilePath } from '@/lib/fileDrop';
import type { DroppedItem } from '~protocol';

export type ExecutablePathFieldProps = {
  label: string;
  hint?: FieldProps['hint'];
  value: string;
  placeholder?: string;
  dropTargetId: string;
  onValueChange: (value: string) => void;
  onSelect: () => void;
  applyPath: (path: string) => void;
  onBlur?: () => void;
  validationState?: FieldProps['validationState'];
  validationMessage?: FieldProps['validationMessage'];
};

const useStyles = makeStyles({
  root: {
    width: '100%',
  },
  pathGroup: {
    display: 'flex',
    width: '100%',
    alignItems: 'stretch',
    gap: tokens.spacingHorizontalXS,
  },
  pathInput: {
    flex: 1,
    minWidth: 0,
  },
});

export function ExecutablePathField({
  label,
  hint,
  value,
  placeholder,
  dropTargetId,
  onValueChange,
  onSelect,
  applyPath,
  onBlur,
  validationState,
  validationMessage,
}: ExecutablePathFieldProps) {
  const styles = useStyles();

  const onDrop = useCallback(
    (items: DroppedItem[]) => {
      const path = firstFilePath(items);
      if (path) applyPath(path);
    },
    [applyPath],
  );

  return (
    <Field
      label={label}
      hint={hint}
      className={styles.root}
      validationState={validationState || 'none'}
      validationMessage={validationMessage}
    >
      <FileDropTarget id={dropTargetId} className={styles.pathGroup} onDrop={onDrop}>
        <Input
          className={styles.pathInput}
          value={value}
          placeholder={placeholder}
          onChange={(_, data) => onValueChange(data.value)}
          onBlur={onBlur}
        />
        <Button icon={<WindowConsoleRegular />} onClick={onSelect}>
          选择
        </Button>
      </FileDropTarget>
    </Field>
  );
}
