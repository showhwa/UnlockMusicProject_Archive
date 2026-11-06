import type { FC } from 'react';
import { PanelGeneral } from '~/features/settings/panels/PanelGeneral.tsx';
import { PanelOneClick } from '~/features/settings/panels/PanelOneClick.tsx';
import { PanelQMCv2Key } from '~/features/qmc/panel/PanelQMCv2Key.tsx';
import { PanelKWMv2Key } from '~/features/kwm/panel/PanelKWMv2Key.tsx';
import { PanelKGGKey } from '~/features/kugou/panel/PanelKGGKey.tsx';
import { PanelQingTing } from '~/features/qtfm/panel/PanelQingTing.tsx';
import { AndroidImportType } from '~/platform/capabilities';
import type { PlatformCapabilities } from '~/platform/types';

export type SettingsTabDef = { name: string; Tab: FC };

/**
 * Settings UI route ids → panels.
 *
 * Naming aliases (route vs Redux / persist):
 * - `qmc`  ↔ state `qmc2`
 * - `kwm`  ↔ state `kwm2`
 * - `kgg`  ↔ state `kugou` (persist key stays `kugou`)
 * - `qtfm` ↔ state `qtfm`
 * - `one-click` ↔ platform native / ADB key import (only when capable)
 */
export const ONE_CLICK_TAB_ID = 'one-click';

const CORE_SETTINGS_TABS: Record<string, SettingsTabDef> = {
  general: { name: '通用设置', Tab: PanelGeneral },
  qmc: { name: 'QMCv2 密钥', Tab: PanelQMCv2Key },
  kwm: { name: 'KWMv2 密钥', Tab: PanelKWMv2Key },
  kgg: { name: 'KGG 密钥', Tab: PanelKGGKey },
  qtfm: { name: '蜻蜓 FM', Tab: PanelQingTing },
};

const ONE_CLICK_TAB: SettingsTabDef = { name: '一键导入', Tab: PanelOneClick };

/** True when the platform can show the one-click import settings tab. */
export function hasOneClickImportCapability(capabilities: PlatformCapabilities): boolean {
  return capabilities.nativeKeyAccess.length > 0 || capabilities.androidKeyAccess === AndroidImportType.Adb;
}

/**
 * Settings tabs for the current platform.
 * Registers `one-click` only when `nativeKeyAccess` or ADB import is available.
 */
export function getSettingsTabs(capabilities: PlatformCapabilities): Record<string, SettingsTabDef> {
  if (!hasOneClickImportCapability(capabilities)) {
    return CORE_SETTINGS_TABS;
  }

  const { general, ...rest } = CORE_SETTINGS_TABS;
  return {
    general,
    [ONE_CLICK_TAB_ID]: ONE_CLICK_TAB,
    ...rest,
  };
}
