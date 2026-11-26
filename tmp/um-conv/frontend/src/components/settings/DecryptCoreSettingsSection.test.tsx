// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProbeResult, Settings, SettingsState } from '~protocol';
import { AppSnapshot, ConvertService } from '~service/convert';
import { SettingsService } from '~service/settings';
import { ConvertProvider } from '@/hooks/useConvertStore';
import { createConvertStore, type ConvertApi } from '@/lib/convertStore';
import { DecryptCoreSettingsSection } from './DecryptCoreSettingsSection';

function renderSection(allowAdbKeys: boolean) {
  const settings = new Settings({
    bin: { um_cli_rs: 'um', 'qmpc-mmkv-cli': 'qmpc', adb: 'C:/adb.exe', allowAdbKeys },
  });
  const probe = vi.fn(async () => new ProbeResult({ ok: true, version: '1.0' }));
  const patchSettings = vi.fn(
    async (patch: { bin?: { allowAdbKeys?: boolean } }) =>
      new SettingsState({
        revision: 2,
        settings: new Settings({
          bin: { ...settings.bin, ...patch.bin },
        }),
      }),
  );
  const store = createConvertStore({
    ...ConvertService,
    ...SettingsService,
    GetState: () => CancellablePromise.resolve(new AppSnapshot({ settingsRevision: 1, settings })),
    ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'],
    PatchSettings: patchSettings as unknown as ConvertApi['PatchSettings'],
  });
  render(
    <ConvertProvider store={store}>
      <DecryptCoreSettingsSection />
    </ConvertProvider>,
  );
  return { probe, patchSettings };
}

const probedExes = (probe: ReturnType<typeof renderSection>['probe']) =>
  (probe.mock.calls as unknown as Array<[{ exe: string }]>).map(([request]) => request.exe);

describe('DecryptCoreSettingsSection', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not probe or render ADB while ADB keys are disabled', async () => {
    const { probe } = renderSection(false);

    await waitFor(() => expect(probedExes(probe)).toContain('um_cli_rs'));
    await act(async () => undefined);

    expect(probedExes(probe)).not.toContain('adb');
    expect(screen.queryByText('ADB 路径')).toBeNull();
  });

  it('probes ADB once enabled', async () => {
    const { probe } = renderSection(true);

    await waitFor(() => expect(probedExes(probe)).toContain('adb'));
    expect(screen.getByText('ADB 路径')).toBeTruthy();
  });

  it('mounts the ADB probe after the switch is turned on', async () => {
    const { probe, patchSettings } = renderSection(false);
    await waitFor(() => expect(probedExes(probe)).toContain('um_cli_rs'));

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() =>
      expect(patchSettings).toHaveBeenCalledWith({ bin: { allowAdbKeys: true } }),
    );
    await waitFor(() => expect(probedExes(probe)).toContain('adb'));
  });

  it('lists only backend-supported ADB key sources', () => {
    renderSection(false);
    expect(screen.getByText(/QQ 音乐和酷狗音乐/)).toBeTruthy();
    expect(screen.queryByText(/酷我/)).toBeNull();
  });
});
