import { Title2, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { Button } from '@/components/Button';
import { AboutSettingsSection } from '@/components/settings/AboutSettingsSection';
import { AdvancedSettingsSection } from '@/components/settings/AdvancedSettingsSection';
import { DecryptCoreSettingsSection } from '@/components/settings/DecryptCoreSettingsSection';
import { FFmpegSettingsSection } from '@/components/settings/FFmpegSettingsSection';
import { GeneralSettingsSection } from '@/components/settings/GeneralSettingsSection';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { useSectionScrollSpy } from '@/hooks/useSectionScrollSpy';
import { SETTINGS_SECTION_IDS } from '@/settings/labels';

export type SettingsPageProps = {
  onBack: () => void;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingInline: tokens.spacingHorizontalXXL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    margin: 0,
  },
  body: {
    display: 'flex',
    minHeight: 0,
    flex: 1,
    gap: tokens.spacingHorizontalXXL,
    marginInline: 'auto',
    width: '100%',
    maxWidth: '960px',
    paddingInline: tokens.spacingHorizontalXXL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalXL,
  },
  scroll: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXL,
    paddingRight: tokens.spacingHorizontalS,
    '& > *': {
      maxWidth: '36rem',
    },
  },
});

export function SettingsPage({ onBack }: SettingsPageProps) {
  const styles = useStyles();
  const { scrollRef, activeId, scrollTo } = useSectionScrollSpy({
    sectionIds: SETTINGS_SECTION_IDS,
    defaultId: 'general',
  });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Button
          variant="icon"
          icon={<ArrowLeftRegular />}
          aria-label="返回"
          title="返回"
          onClick={onBack}
        />
        <Title2 as="h1" className={styles.title}>
          更多设置
        </Title2>
      </header>

      <div className={styles.body}>
        <SettingsNav activeId={activeId} onSelect={scrollTo} />
        <div ref={scrollRef} className={styles.scroll}>
          <GeneralSettingsSection />
          <FFmpegSettingsSection />
          <DecryptCoreSettingsSection />
          <AdvancedSettingsSection />
          <AboutSettingsSection />
        </div>
      </div>
    </div>
  );
}
