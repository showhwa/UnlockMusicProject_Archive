// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { afterEach, expect, it, vi } from 'vitest';
import { Settings, SettingsState } from '~protocol';
import { AppSnapshot, ConvertService } from '~service/convert';
import { SettingsService } from '~service/settings';
import { ConvertProvider } from '@/hooks/useConvertStore';
import { createConvertStore, type ConvertApi } from '@/lib/convertStore';
import { AdvancedSettingsSection } from './AdvancedSettingsSection';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderAdvanced(overrides: Partial<ConvertApi> = {}) {
  const initialSettings = new Settings({ tempDir: 'C:/OldTemp' });
  const patchSettings = vi.fn(async (patch: { tempDir?: string }) => {
    return new SettingsState({
      revision: 2,
      settings: new Settings({ ...initialSettings, tempDir: patch.tempDir }),
    });
  });
  const openLogFile = vi.fn(async () => undefined);
  const openConfigFile = vi.fn(async () => undefined);
  const store = createConvertStore({
    ...ConvertService,
    ...SettingsService,
    GetState: () =>
      CancellablePromise.resolve(
        new AppSnapshot({ settingsRevision: 1, settings: initialSettings }),
      ),
    PatchSettings: patchSettings as unknown as ConvertApi['PatchSettings'],
    OpenLogFile: openLogFile as unknown as ConvertApi['OpenLogFile'],
    OpenConfigFile: openConfigFile as unknown as ConvertApi['OpenConfigFile'],
    ...overrides,
  });

  render(
    <ConvertProvider store={store}>
      <AdvancedSettingsSection />
    </ConvertProvider>,
  );

  return { store, patchSettings, openLogFile, openConfigFile };
}

it('persists the temporary directory through the tempDir setting', async () => {
  const { patchSettings } = renderAdvanced();

  const input = await screen.findByRole<HTMLInputElement>('textbox', { name: '临时目录' });
  fireEvent.change(input, { target: { value: 'D:/Work/Temp' } });
  fireEvent.blur(input);

  await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ tempDir: 'D:/Work/Temp' }));
  await waitFor(() => expect(input.value).toBe('D:/Work/Temp'));
});

it('opens log and config files via SettingsService and disables buttons while pending', async () => {
  let resolveLog!: () => void;
  const openLogFile = vi.fn(
    () =>
      new CancellablePromise<void>((resolve) => {
        resolveLog = resolve;
      }),
  );
  const { openConfigFile } = renderAdvanced({
    OpenLogFile: openLogFile as unknown as ConvertApi['OpenLogFile'],
  });

  const logButton = screen.getByRole<HTMLButtonElement>('button', { name: '查看日志' });
  const configButton = screen.getByRole<HTMLButtonElement>('button', { name: '查看配置文件' });

  fireEvent.click(logButton);
  expect(openLogFile).toHaveBeenCalledTimes(1);
  expect(logButton.disabled).toBe(true);
  expect(configButton.disabled).toBe(true);

  resolveLog();
  await waitFor(() => expect(logButton.disabled).toBe(false));
  expect(configButton.disabled).toBe(false);

  fireEvent.click(configButton);
  await waitFor(() => expect(openConfigFile).toHaveBeenCalledTimes(1));
});

it('shows inline error when opening fails and clears it on a subsequent success', async () => {
  const openLogFile = vi
    .fn()
    .mockRejectedValueOnce(new Error('日志文件不存在'))
    .mockResolvedValueOnce(undefined);
  const openConfigFile = vi.fn().mockRejectedValueOnce(new Error('无法打开配置文件'));
  const { store } = renderAdvanced({
    OpenLogFile: openLogFile as unknown as ConvertApi['OpenLogFile'],
    OpenConfigFile: openConfigFile as unknown as ConvertApi['OpenConfigFile'],
  });

  const logButton = screen.getByRole('button', { name: '查看日志' });
  const configButton = screen.getByRole('button', { name: '查看配置文件' });

  fireEvent.click(logButton);
  expect(await screen.findByText('日志文件不存在')).toBeTruthy();
  expect(store.getState().commandError).toBeNull();

  fireEvent.click(configButton);
  expect(await screen.findByText('无法打开配置文件')).toBeTruthy();
  expect(screen.queryByText('日志文件不存在')).toBeNull();

  fireEvent.click(logButton);
  await waitFor(() => expect(screen.queryByText('无法打开配置文件')).toBeNull());
});
