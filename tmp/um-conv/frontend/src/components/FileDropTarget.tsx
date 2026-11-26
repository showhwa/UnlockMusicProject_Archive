import { useEffect, useId, useRef, type ReactNode } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { registerFileDropHandler } from '@/lib/fileDrop';
import type { DroppedItem } from '~protocol';

export type FileDropTargetProps = {
  id: string;
  className?: string;
  children: ReactNode;
  onDrop: (items: DroppedItem[]) => void;
};

const useStyles = makeStyles({
  root: {
    '&.file-drop-target-active': {
      outline: `2px dashed ${tokens.colorBrandStroke1}`,
      outlineOffset: '-2px',
      backgroundColor: tokens.colorBrandBackground2,
    },
  },
});

export function FileDropTarget({ id, className, children, onDrop }: FileDropTargetProps) {
  const styles = useStyles();
  const instanceId = useId().replace(/:/g, '');
  const targetId = `${id}-${instanceId}`;
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    return registerFileDropHandler(targetId, (items) => {
      onDropRef.current(items);
    });
  }, [targetId]);

  return (
    <div id={targetId} data-file-drop-target="" className={mergeClasses(styles.root, className)}>
      {children}
    </div>
  );
}
