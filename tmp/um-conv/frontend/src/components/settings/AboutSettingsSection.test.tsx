// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { expect, it, vi } from 'vitest';
import { Format, OutputProfile } from '~protocol';
import { AppSnapshot, ConvertService } from '~service/convert';
import { SettingsService } from '~service/settings';
import { ConvertProvider } from '@/hooks/useConvertStore';
import { createConvertStore } from '@/lib/convertStore';
import { AboutSettingsSection } from './AboutSettingsSection';

vi.mock('~service/appinfo', () => ({
  AppInfoService: {
    GetAppInfo: () =>
      Promise.resolve({
        name: '音乐解锁 - 音频转换器',
        version: '1.2.3',
        commit: 'abc123',
        projectURL: 'https://example.com',
        inputFormats: [
          { name: 'QQ 音乐', formats: ['mgg*', 'mflac*', 'mmp4'] },
          { name: '网易云', formats: ['ncm'] },
        ],
      }),
  },
}));

it('lists backend-provided input and output formats', async () => {
  const profiles = [
    new OutputProfile({ id: 'flac', name: 'FLAC', format: Format.FormatFLAC }),
    new OutputProfile({ id: 'none', name: '不转换', format: Format.FormatNone }),
  ];
  const store = createConvertStore({
    ...ConvertService,
    ...SettingsService,
    GetState: () => CancellablePromise.resolve(new AppSnapshot({ revision: 1, profiles })),
  });

  render(
    <ConvertProvider store={store}>
      <AboutSettingsSection />
    </ConvertProvider>,
  );

  const inputFormats = screen.getByRole('list', { name: '常用输入格式' });
  const outputFormats = screen.getByRole('list', { name: '支持的输出格式' });
  await waitFor(() => expect(within(inputFormats).getByText('QQ 音乐')).toBeTruthy());
  expect(within(inputFormats).getByText('网易云')).toBeTruthy();
  expect(within(inputFormats).queryByText('mgg*')).toBeNull();

  const category = within(inputFormats).getByText('QQ 音乐');
  const tooltipId = category.getAttribute('aria-describedby');
  const tooltip = document.getElementById(tooltipId ?? '');
  expect(tooltip?.textContent).toContain('mgg*');
  expect(tooltip?.textContent).toContain('mflac*');
  const hiddenClassName = tooltip?.className ?? '';

  fireEvent.pointerEnter(category);
  await waitFor(() => expect(tooltip?.className).not.toBe(hiddenClassName));

  await waitFor(() => expect(within(outputFormats).getByText('FLAC')).toBeTruthy());
  expect(within(outputFormats).queryByText('不转换')).toBeNull();
});
