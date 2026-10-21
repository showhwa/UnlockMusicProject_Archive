import type { FC } from 'react';
import { PanelGeneral } from '~/features/settings/panels/PanelGeneral.tsx';
import { PanelQMCv2Key } from '~/features/settings/panels/PanelQMCv2Key.tsx';
import { PanelKWMv2Key } from '~/features/settings/panels/PanelKWMv2Key.tsx';
import { PanelKGGKey } from '~/features/settings/panels/PanelKGGKey.tsx';
import { PanelQingTing } from '~/features/settings/panels/PanelQingTing.tsx';

export const SETTINGS_TABS: Record<string, { name: string; Tab: FC }> = {
  general: { name: '通用设置', Tab: PanelGeneral },
  qmc: { name: 'QMCv2 密钥', Tab: PanelQMCv2Key },
  kwm: { name: 'KWMv2 密钥', Tab: PanelKWMv2Key },
  kgg: { name: 'KGG 密钥', Tab: PanelKGGKey },
  qtfm: { name: '蜻蜓 FM', Tab: PanelQingTing },
} as const;
