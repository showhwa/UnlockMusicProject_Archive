import { Tab, TabList, makeStyles, tokens } from '@fluentui/react-components';
import { SETTINGS_SECTIONS, type SettingsSectionId } from '@/settings/labels';

export type SettingsNavProps = {
  activeId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    width: '10.5rem',
    paddingTop: tokens.spacingVerticalXS,
  },
  list: {
    width: '100%',
  },
});

export function SettingsNav({ activeId, onSelect }: SettingsNavProps) {
  const styles = useStyles();

  return (
    <nav className={styles.root} aria-label="设置分类">
      <TabList
        className={styles.list}
        vertical
        selectedValue={activeId}
        onTabSelect={(_, data) => {
          if (typeof data.value === 'string') {
            onSelect(data.value as SettingsSectionId);
          }
        }}
      >
        {SETTINGS_SECTIONS.map((section) => (
          <Tab key={section.id} value={section.id}>
            {section.label}
          </Tab>
        ))}
      </TabList>
    </nav>
  );
}
