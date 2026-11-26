// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Format, OutputProfile, Settings, SettingsState } from '~protocol';
import { AppSnapshot, ConvertService } from '~service/convert';
import { SettingsService } from '~service/settings';
import { ConvertProvider } from '@/hooks/useConvertStore';
import { createConvertStore, type ConvertApi } from '@/lib/convertStore';
import { GeneralSettingsSection } from './GeneralSettingsSection';

const profiles = [
  new OutputProfile({ id: 'mp3_cbr', name: 'MP3', format: Format.FormatMP3 }),
  new OutputProfile({ id: 'flac', name: 'FLAC', format: Format.FormatFLAC }),
];

function renderSection(enableParallel = true, parallel = 4) {
  let currentSettings = new Settings({ enableParallel, parallel, outputFormat: 'mp3_cbr' });
  let revision = 1;
  const patchSettings = vi.fn(async (patch: Record<string, unknown>) => {
    revision += 1;
    currentSettings = new Settings({ ...currentSettings, ...patch });
    return new SettingsState({
      revision,
      settings: currentSettings,
    });
  });
  const store = createConvertStore({
    ...ConvertService,
    ...SettingsService,
    GetState: () =>
      CancellablePromise.resolve(
        new AppSnapshot({ settingsRevision: 1, settings: currentSettings, profiles }),
      ),
    PatchSettings: patchSettings as unknown as ConvertApi['PatchSettings'],
  });
  render(
    <ConvertProvider store={store}>
      <GeneralSettingsSection />
    </ConvertProvider>,
  );
  return { patchSettings };
}

describe('GeneralSettingsSection', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows parallel count when enabled', async () => {
    renderSection(true, 4);
    const input = await screen.findByLabelText<HTMLInputElement>('并行数量');
    expect(input.value).toBe('4');
  });

  it('unmounts parallel count when disabled', async () => {
    renderSection(false, 0);
    await waitFor(() =>
      expect(screen.getByRole<HTMLInputElement>('switch', { name: '启用并行转换' }).checked).toBe(
        false,
      ),
    );
    expect(screen.queryByLabelText('并行数量')).toBeNull();
  });

  it('unmounts parallel count and patches when switch is turned off', async () => {
    const { patchSettings } = renderSection(true, 4);
    await screen.findByLabelText('并行数量');

    fireEvent.click(screen.getByRole('switch', { name: '启用并行转换' }));

    await waitFor(() => expect(screen.queryByLabelText('并行数量')).toBeNull());
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ enableParallel: false }));
  });

  it('commits typed positive, zero, negative, and large counts on blur and Enter', async () => {
    const { patchSettings } = renderSection(true, 2);
    const input = await screen.findByLabelText<HTMLInputElement>('并行数量');

    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.blur(input);
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ parallel: 4 }));
    expect(input.value).toBe('4');

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ parallel: 0 }));
    expect(input.value).toBe('0');

    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.blur(input);
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ parallel: -1 }));
    expect(input.value).toBe('-1');

    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    await waitFor(() => expect(patchSettings).toHaveBeenCalledWith({ parallel: 999 }));
    expect(input.value).toBe('999');
    expect(patchSettings).toHaveBeenCalledTimes(4);
  });

  it('rejects empty and invalid input without committing and restores current value', async () => {
    const { patchSettings } = renderSection(true, 4);
    const input = await screen.findByLabelText<HTMLInputElement>('并行数量');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input.value).toBe('4');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('4');

    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(input.value).toBe('4');

    expect(patchSettings).not.toHaveBeenCalled();
  });
});
