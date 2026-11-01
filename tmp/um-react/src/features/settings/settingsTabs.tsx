import type { FC } from 'react';
import { PanelGeneral } from '~/features/settings/panels/PanelGeneral.tsx';
import { PanelQMCv2Key } from '~/features/qmc/panel/PanelQMCv2Key.tsx';
import { PanelKWMv2Key } from '~/features/kwm/panel/PanelKWMv2Key.tsx';
import { PanelKGGKey } from '~/features/kugou/panel/PanelKGGKey.tsx';
import { PanelQingTing } from '~/features/qtfm/panel/PanelQingTing.tsx';

/**
 * Settings UI route ids → panels.
 *
 * Naming aliases (route vs Redux / persist):
 * - `qmc`  ↔ state `qmc2`
 * - `kwm`  ↔ state `kwm2`
 * - `kgg`  ↔ state `kugou` (persist key stays `kugou`)
 * - `qtfm` ↔ state `qtfm`
 */
export const SETTINGS_TABS: Record<string, { name: string; Tab: FC }> = {
  general: { name: '通用设置', Tab: PanelGeneral },
  qmc: { name: 'QMCv2 密钥', Tab: PanelQMCv2Key },
  kwm: { name: 'KWMv2 密钥', Tab: PanelKWMv2Key },
  kgg: { name: 'KGG 密钥', Tab: PanelKGGKey },
  qtfm: { name: '蜻蜓 FM', Tab: PanelQingTing },
} as const;
