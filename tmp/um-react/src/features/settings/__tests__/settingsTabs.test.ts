import { AndroidImportType, BatchDownloadType, NativeImportType } from '~/platform/capabilities';
import type { PlatformCapabilities } from '~/platform/types';
import { getSettingsTabs, hasOneClickImportCapability, ONE_CLICK_TAB_ID } from '../settingsTabs';

const baseCaps = (overrides: Partial<PlatformCapabilities> = {}): PlatformCapabilities => ({
  downloadTypes: [BatchDownloadType.PackZip],
  directFsAccess: false,
  androidKeyAccess: AndroidImportType.None,
  nativeKeyAccess: [],
  ...overrides,
});

describe('settingsTabs', () => {
  test('hasOneClickImportCapability is false for browser defaults', () => {
    expect(hasOneClickImportCapability(baseCaps())).toBe(false);
  });

  test('hasOneClickImportCapability is true with nativeKeyAccess', () => {
    expect(hasOneClickImportCapability(baseCaps({ nativeKeyAccess: [NativeImportType.QQMusic] }))).toBe(true);
  });

  test('hasOneClickImportCapability is true with Adb', () => {
    expect(hasOneClickImportCapability(baseCaps({ androidKeyAccess: AndroidImportType.Adb }))).toBe(true);
  });

  test('getSettingsTabs omits one-click without capability', () => {
    const tabs = getSettingsTabs(baseCaps());
    expect(Object.keys(tabs)).toEqual(['general', 'qmc', 'kwm', 'kgg', 'qtfm']);
    expect(tabs[ONE_CLICK_TAB_ID]).toBeUndefined();
  });

  test('getSettingsTabs inserts one-click after general when capable', () => {
    const tabs = getSettingsTabs(baseCaps({ nativeKeyAccess: [NativeImportType.Kugou] }));
    expect(Object.keys(tabs)).toEqual(['general', ONE_CLICK_TAB_ID, 'qmc', 'kwm', 'kgg', 'qtfm']);
    expect(tabs[ONE_CLICK_TAB_ID]?.name).toBe('一键导入');
  });
});
