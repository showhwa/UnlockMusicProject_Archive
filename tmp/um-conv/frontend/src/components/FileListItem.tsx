import { memo } from 'react';
import {
  Caption1,
  ProgressBar,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircleFilled,
  DismissCircleFilled,
  DismissRegular,
  FolderOpenRegular,
  MusicNote2Regular,
  PlayRegular,
  WarningFilled,
} from '@fluentui/react-icons';
import type { FileEntry } from '~service/convert';
import { FileStatus } from '~service/convert';
import { Button } from './Button';

const useStyles = makeStyles({
  item: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  itemOdd: {
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },
  itemEven: {
    backgroundColor: tokens.colorNeutralBackground2,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground2Pressed,
    },
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
  },
  icon: {
    flexShrink: 0,
    fontSize: '20px',
  },
  iconNeutral: {
    color: tokens.colorNeutralForeground2,
  },
  iconSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
  iconFailed: {
    color: tokens.colorPaletteRedForeground1,
  },
  iconSkipped: {
    color: tokens.colorPaletteYellowForeground1,
  },
  text: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  detail: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
  },
  progress: {
    padding: `0 ${tokens.spacingHorizontalM} ${tokens.spacingVerticalXS}`,
  },
});

function fileDetail(file: FileEntry): string {
  let source: string;
  const info = file.source;
  if (info.ok) {
    source = `${info.bitrateKbps}kbps · ${info.format} · ${file.size}`;
  } else if (info.player) {
    source = `${info.player} · ${file.size}`;
  } else {
    source = file.size;
  }
  if (file.status === FileStatus.FileStatusSuccess) {
    const out = file.output;
    if (out.bitrateKbps > 0) {
      return `${source} → ${out.format} ${out.bitrateKbps}kbps · ${out.size}`;
    }
    return `${source} → ${out.format} · ${out.size}`;
  }
  if (file.status === FileStatus.FileStatusFailed) {
    const err = file.error?.trim();
    if (err) {
      return `${source} → ${err}`;
    }
  }
  return source;
}

function statusIcon(status: FileStatus) {
  switch (status) {
    case FileStatus.FileStatusSuccess:
      return CheckmarkCircleFilled;
    case FileStatus.FileStatusFailed:
      return DismissCircleFilled;
    case FileStatus.FileStatusSkipped:
      return WarningFilled;
    default:
      return MusicNote2Regular;
  }
}

function iconClass(status: FileStatus, styles: ReturnType<typeof useStyles>) {
  switch (status) {
    case FileStatus.FileStatusSuccess:
      return styles.iconSuccess;
    case FileStatus.FileStatusFailed:
      return styles.iconFailed;
    case FileStatus.FileStatusSkipped:
      return styles.iconSkipped;
    default:
      return styles.iconNeutral;
  }
}

function progressColor(status: FileStatus): 'brand' | 'success' | 'error' {
  if (status === FileStatus.FileStatusFailed) return 'error';
  if (status === FileStatus.FileStatusSuccess || status === FileStatus.FileStatusSkipped) {
    return 'success';
  }
  return 'brand';
}

export type FileListItemProps = {
  file: FileEntry;
  /** Zero-based row index; drives zebra striping. */
  index: number;
  busy: boolean;
  onPlay: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onRemove: (path: string) => void;
};

export const FileListItem = memo(function FileListItem({
  file,
  index,
  busy,
  onPlay,
  onOpenFolder,
  onRemove,
}: FileListItemProps) {
  const styles = useStyles();
  const Icon = statusIcon(file.status);
  const value = Math.min(100, Math.max(0, file.progress)) / 100;
  const detail = fileDetail(file);

  return (
    <div className={mergeClasses(styles.item, index % 2 === 0 ? styles.itemOdd : styles.itemEven)}>
      <div className={styles.main}>
        <Icon className={mergeClasses(styles.icon, iconClass(file.status, styles))} />
        <div className={styles.text}>
          <div className={styles.name} title={file.name}>
            {file.name}
          </div>
          <Caption1 className={styles.detail} title={detail}>
            {detail}
          </Caption1>
        </div>
        <div className={styles.actions}>
          {file.status === FileStatus.FileStatusSuccess && file.outputPath ? (
            <>
              <Button
                variant="icon"
                title="打开"
                aria-label={`打开 ${file.name} 的输出文件`}
                icon={<PlayRegular />}
                onClick={() => onPlay(file.outputPath)}
              />
              <Button
                variant="icon"
                title="打开输出目录"
                aria-label={`打开 ${file.name} 的输出目录`}
                icon={<FolderOpenRegular />}
                onClick={() => onOpenFolder(file.outputPath)}
              />
            </>
          ) : null}
          <Button
            variant="icon"
            title="删除"
            aria-label={`从列表删除 ${file.name}`}
            icon={<DismissRegular />}
            disabled={busy}
            onClick={() => onRemove(file.path)}
          />
        </div>
      </div>
      {busy ? (
        <div className={styles.progress}>
          <ProgressBar value={value} color={progressColor(file.status)} />
        </div>
      ) : null}
    </div>
  );
});
