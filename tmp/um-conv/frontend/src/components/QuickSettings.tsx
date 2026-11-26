import { Subtitle2, Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { SettingsRegular } from '@fluentui/react-icons';
import { Button } from '@/components/Button';
import { OutputProfileFields } from '@/components/OutputProfileFields';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100%',
    minHeight: 0,
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  title: {
    margin: 0,
    flexShrink: 0,
  },
  scroll: {
    display: 'flex',
    minHeight: 0,
    flex: 1,
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    overflowY: 'auto',
  },
  moreSettings: {
    display: 'flex',
    width: '100%',
    flexShrink: 0,
    justifyContent: 'center',
  },
});

export type QuickSettingsProps = {
  className?: string;
  onOpenSettings: () => void;
  settingsDisabled: boolean;
};

export function QuickSettings({ className, onOpenSettings, settingsDisabled }: QuickSettingsProps) {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.root, className)}>
      <Subtitle2 as="h2" className={styles.title}>
        快速设置
      </Subtitle2>

      <div className={styles.scroll}>
        <OutputProfileFields layout="compact" />
      </div>

      <div className={styles.moreSettings}>
        <Tooltip
          content={settingsDisabled ? '转换进行中，无法打开设置' : '打开全部设置'}
          relationship="description"
          withArrow
        >
          <Button icon={<SettingsRegular />} disabled={settingsDisabled} onClick={onOpenSettings}>
            更多设置
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
