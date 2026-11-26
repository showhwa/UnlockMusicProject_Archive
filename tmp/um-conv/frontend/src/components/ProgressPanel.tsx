import { Body1, ProgressBar, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useCommandError, useJob } from '@/hooks/useConvertStore';

const useStyles = makeStyles({
  root: {
    flexShrink: 0,
    overflow: 'hidden',
    paddingBottom: tokens.spacingVerticalS,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
  },
  percent: {
    width: '4em',
    textAlign: 'right',
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: 'tabular-nums',
  },
  message: {
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  messageError: {
    color: tokens.colorPaletteRedForeground1,
  },
  status: {
    fontWeight: tokens.fontWeightSemibold,
  },
  idle: {
    color: tokens.colorNeutralForeground3,
  },
  running: {
    color: tokens.colorBrandForeground1,
  },
  done: {
    color: tokens.colorPaletteGreenForeground1,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
  },
  cancelled: {
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
});

export type ProgressPanelProps = {
  className?: string;
};

export function ProgressPanel({ className }: ProgressPanelProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const job = useJob();
  const commandError = useCommandError();

  const status = commandError ? 'error' : job.status || 'idle';
  const message = commandError ?? job.message;
  const percent = job.percent;
  const barColor =
    status === 'error'
      ? 'error'
      : status === 'done'
        ? 'success'
        : status === 'cancelled'
          ? 'warning'
          : 'brand';

  const statusClass =
    status === 'running'
      ? styles.running
      : status === 'done'
        ? styles.done
        : status === 'error'
          ? styles.error
          : status === 'cancelled'
            ? styles.cancelled
            : styles.idle;

  return (
    <footer className={mergeClasses(styles.root, className)}>
      <div className={styles.row}>
        <Body1 className={styles.percent}>{Math.floor(percent)}%</Body1>
        <Body1
          className={mergeClasses(styles.message, status === 'error' && styles.messageError)}
          title={message}
        >
          {message}
        </Body1>
        <Body1 className={mergeClasses(styles.status, statusClass)}>
          {t(`status.${status}`, { defaultValue: status })}
        </Body1>
      </div>
      <ProgressBar
        value={Math.min(100, Math.max(0, percent)) / 100}
        color={barColor}
        thickness="medium"
      />
    </footer>
  );
}
