import type { ReactNode } from 'react';
import { Title3, makeStyles, tokens } from '@fluentui/react-components';
import { settingsSectionLabel, type SettingsSectionId } from '@/settings/labels';

export type SettingsSectionProps = {
  id: SettingsSectionId;
  children: ReactNode;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    scrollMarginTop: tokens.spacingVerticalL,
    paddingBottom: '4rem',
  },
  title: {
    margin: 0,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
});

export function SettingsSection({ id, children }: SettingsSectionProps) {
  const styles = useStyles();
  const titleId = `settings-${id}-title`;

  return (
    <section id={id} className={styles.root} aria-labelledby={titleId}>
      <Title3 as="h2" id={titleId} className={styles.title}>
        {settingsSectionLabel(id)}
      </Title3>
      <div className={styles.stack}>{children}</div>
    </section>
  );
}
