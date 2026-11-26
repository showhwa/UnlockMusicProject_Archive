import { useEffect, useState } from 'react';
import { Badge, Body1, Caption1, Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import { ExternalLink } from '@/components/ExternalLink';
import { useSelectableProfiles } from '@/hooks/useConvertStore';
import appIcon from '../../../../app/assets/icon.svg';
import { AppInfo, type AppInfo as AppInfoType } from '~protocol';
import { AppInfoService } from '~service/appinfo';
import { SettingsSection } from './SettingsSection';

let appInfoRequest: Promise<AppInfoType> | undefined;

function loadAppInfo(): Promise<AppInfoType> {
  if (appInfoRequest) return appInfoRequest;
  const request = AppInfoService.GetAppInfo().catch((error) => {
    appInfoRequest = undefined;
    throw error;
  });
  appInfoRequest = request;
  return request;
}

const useStyles = makeStyles({
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
  },
  icon: {
    width: '72px',
    height: '72px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusLarge,
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  name: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    fontWeight: tokens.fontWeightSemibold,
  },
  description: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
  details: {
    display: 'grid',
    gridTemplateColumns: '5rem minmax(0, 1fr)',
    margin: 0,
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalM,
  },
  term: {
    color: tokens.colorNeutralForeground2,
  },
  value: {
    margin: 0,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  formatList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
});

export function AboutSettingsSection() {
  const styles = useStyles();
  const [info, setInfo] = useState<AppInfoType>(() => new AppInfo());
  const outputFormats = useSelectableProfiles();

  useEffect(() => {
    let active = true;
    void loadAppInfo().then(
      (next) => {
        if (active) setInfo(next);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  const version = info.version || '—';
  const versionText = info.commit ? `${version} (${info.commit})` : version;

  return (
    <SettingsSection id="about">
      <div className={styles.summary}>
        <img className={styles.icon} src={appIcon} alt="应用图标" />
        <div className={styles.identity}>
          <h3 className={styles.name}>{info.name}</h3>
          <Caption1>版本 {versionText}</Caption1>
        </div>
      </div>

      <Body1 as="p" className={styles.description}>
        一个支持将主流音频、音乐、视频格式批量转换为 MP3 等格式。
      </Body1>

      <dl className={styles.details}>
        <dt className={styles.term}>软件名称</dt>
        <dd className={styles.value}>{info.name}</dd>
        <dt className={styles.term}>版本号</dt>
        <dd className={styles.value}>{versionText}</dd>
        <dt className={styles.term}>输入格式</dt>
        <dd className={styles.value}>
          <ul className={styles.formatList} aria-label="常用输入格式">
            {info.inputFormats.map((group) => (
              <li key={group.name}>
                <Tooltip
                  content={
                    <ul className={styles.formatList} aria-label={`${group.name}格式`}>
                      {group.formats.map((format) => (
                        <li key={format}>
                          <Badge appearance="tint" color="brand">
                            {format}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  }
                  relationship="description"
                  withArrow
                >
                  <Badge appearance="outline" tabIndex={0}>
                    {group.name}
                  </Badge>
                </Tooltip>
              </li>
            ))}
          </ul>
        </dd>
        <dt className={styles.term}>输出格式</dt>
        <dd className={styles.value}>
          <ul className={styles.formatList} aria-label="支持的输出格式">
            {outputFormats.map((profile) => (
              <li key={profile.id}>
                <Badge appearance="outline">{profile.name}</Badge>
              </li>
            ))}
          </ul>
        </dd>
        <dt className={styles.term}>项目链接</dt>
        <dd className={styles.value}>
          {info.projectURL ? (
            <ExternalLink href={info.projectURL}>{info.projectURL}</ExternalLink>
          ) : (
            '—'
          )}
        </dd>
      </dl>
    </SettingsSection>
  );
}
