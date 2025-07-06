import type { FC } from 'react';
import { PanelQMCv2Key } from '~/features/settings/panels/PanelQMCv2Key.tsx';
import { PanelKWMv2Key } from '~/features/settings/panels/PanelKWMv2Key.tsx';
import { PanelKGGKey } from '~/features/settings/panels/PanelKGGKey.tsx';
import { PanelQingTing } from '~/features/settings/panels/PanelQingTing.tsx';

export const SETTINGS_TABS: Record<string, { name: string; Tab: FC }> = {
  qmc: { name: 'QMCv2 密钥', Tab: PanelQMCv2Key },
  kwm: { name: 'KWMv2 密钥', Tab: PanelKWMv2Key },
  kgg: { name: 'KGG 密钥', Tab: PanelKGGKey },
  qtfm: { name: '蜻蜓 FM', Tab: PanelQingTing },
  // misc: { name: '其它／待定', Tab: () => <p>这里空空如也～</p> },
} as const;
