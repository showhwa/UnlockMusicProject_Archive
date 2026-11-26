import { useEffect, useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { useBusy } from '@/hooks/useConvertStore';
import { ConvertPage } from '@/pages/ConvertPage';
import { SettingsPage } from '@/pages/SettingsPage';

type AppPage = 'convert' | 'settings';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
  },
});

/** Page switcher; settings are unavailable while a conversion is running. */
export function AppShell() {
  const styles = useStyles();
  const busy = useBusy();
  const [page, setPage] = useState<AppPage>('convert');

  useEffect(() => {
    if (busy && page === 'settings') {
      setPage('convert');
    }
  }, [busy, page]);

  return (
    <div className={styles.root}>
      {page === 'settings' ? (
        <SettingsPage onBack={() => setPage('convert')} />
      ) : (
        <ConvertPage onOpenSettings={() => setPage('settings')} settingsDisabled={busy} />
      )}
    </div>
  );
}
