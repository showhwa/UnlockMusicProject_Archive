import { makeStyles, tokens } from '@fluentui/react-components';
import { ConvertToolbar } from '@/components/ConvertToolbar';
import { FileList } from '@/components/FileList';
import { Header } from '@/components/Header';
import { ProgressPanel } from '@/components/ProgressPanel';
import { QuickSettings } from '@/components/QuickSettings';

export type ConvertPageProps = {
  onOpenSettings: () => void;
  settingsDisabled: boolean;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  content: {
    marginInline: 'auto',
    display: 'flex',
    minHeight: 0,
    width: '100%',
    maxWidth: '960px',
    flex: 1,
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    paddingInline: tokens.spacingHorizontalXXL,
    paddingBlock: tokens.spacingVerticalXL,
    paddingBottom: 0,
  },
  workspace: {
    display: 'grid',
    flex: 1,
    minHeight: 0,
    gridTemplateColumns: 'minmax(0, 1fr) clamp(240px, 32%, 360px)',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    gap: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
  },
  toolbar: {
    gridColumn: '1 / -1',
  },
  list: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'auto',
  },
  side: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  statusBar: {
    gridColumn: '1 / -1',
  },
});

export function ConvertPage({ onOpenSettings, settingsDisabled }: ConvertPageProps) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <Header />
        <div className={styles.workspace}>
          <ConvertToolbar className={styles.toolbar} />
          <FileList className={styles.list} />
          <QuickSettings
            className={styles.side}
            onOpenSettings={onOpenSettings}
            settingsDisabled={settingsDisabled}
          />
          <ProgressPanel className={styles.statusBar} />
        </div>
      </div>
    </div>
  );
}
