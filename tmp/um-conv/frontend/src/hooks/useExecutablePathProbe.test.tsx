// @vitest-environment jsdom

import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSnapshot } from '~service/convert';
import { ProbeResult, SettingsState } from '~protocol';
import { ConvertProvider, useConvertSelector } from '@/hooks/useConvertStore';
import { useExecutablePathProbe } from '@/hooks/useExecutablePathProbe';
import { createConvertStore, type ConvertApi } from '@/lib/convertStore';

function fakeApi(overrides: Partial<ConvertApi> = {}): ConvertApi {
  const nothing = async () => undefined;
  return {
    GetState: async () => new AppSnapshot(),
    SelectFiles: nothing,
    SelectFolder: nothing,
    AddPaths: nothing,
    RemoveFiles: nothing,
    ClearFiles: nothing,
    StartConvert: nothing,
    PlayFile: nothing,
    OpenContainingFolder: nothing,
    PatchSettings: async () => new SettingsState(),
    ProbeExecutable: async () => new ProbeResult(),
    OpenLogFile: nothing,
    OpenConfigFile: nothing,
    SelectDirectory: async () => '',
    SelectExecutable: async () => '',
    ...overrides,
  } as ConvertApi;
}

describe('useExecutablePathProbe', () => {
  it('keeps a selected action stable across unrelated state updates', () => {
    const store = createConvertStore(fakeApi());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ConvertProvider store={store}>{children}</ConvertProvider>
    );
    const { result } = renderHook(() => useConvertSelector((state) => state.requestProbe), {
      wrapper,
    });
    const selected = result.current;

    act(() => store.setState({ commandError: 'unrelated update' }));

    expect(result.current).toBe(selected);
    expect(result.current).toBe(store.getState().requestProbe);
  });

  it('deduplicates two fields observing the same executable path', async () => {
    const resolvers: Array<(result: ProbeResult) => void> = [];
    const probe = vi.fn(() => new Promise<ProbeResult>((resolve) => resolvers.push(resolve)));
    const store = createConvertStore(
      fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
    );
    const patchPath = vi.fn(async () => true);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <ConvertProvider store={store}>{children}</ConvertProvider>
      </StrictMode>
    );

    const { result } = renderHook(
      () => {
        const first = useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: 'C:/ffmpeg.exe',
          patchPath,
        });
        const second = useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: 'C:/ffmpeg.exe',
          patchPath,
        });
        return { first, second };
      },
      { wrapper },
    );

    await waitFor(() => expect(probe).toHaveBeenCalledTimes(1));
    act(() => resolvers[0](new ProbeResult({ ok: true, version: '7.0' })));
    await waitFor(() => {
      expect(result.current.first.probeResult?.ok).toBe(true);
      expect(result.current.second.probeResult?.ok).toBe(true);
    });
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('does not re-probe a stable path when probe state updates in StrictMode', async () => {
    const resolvers: Array<(result: ProbeResult) => void> = [];
    const probe = vi.fn(() => new Promise<ProbeResult>((resolve) => resolvers.push(resolve)));
    const store = createConvertStore(
      fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
    );
    const patchPath = vi.fn(async () => true);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <ConvertProvider store={store}>{children}</ConvertProvider>
      </StrictMode>
    );

    const { result, rerender } = renderHook(
      ({ path }) =>
        useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: path,
          patchPath,
        }),
      { initialProps: { path: 'C:/ffmpeg.exe' }, wrapper },
    );

    await waitFor(() => expect(probe).toHaveBeenCalledTimes(1));
    act(() => resolvers[0](new ProbeResult({ ok: true, version: '7.0' })));
    await waitFor(() => expect(result.current.probeResult?.ok).toBe(true));
    rerender({ path: 'C:/ffmpeg.exe' });
    await act(async () => undefined);
    expect(probe).toHaveBeenCalledTimes(1);

    rerender({ path: 'D:/ffmpeg.exe' });
    await waitFor(() => expect(probe).toHaveBeenCalledTimes(2));
    act(() => resolvers[1](new ProbeResult({ ok: true, version: '8.0' })));
  });

  it('forces a fresh probe when committing a draft path', async () => {
    const resolvers: Array<(result: ProbeResult) => void> = [];
    const probe = vi.fn(() => new Promise<ProbeResult>((resolve) => resolvers.push(resolve)));
    const store = createConvertStore(
      fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
    );
    const patchPath = vi.fn(async () => true);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ConvertProvider store={store}>{children}</ConvertProvider>
    );

    const { result, rerender } = renderHook(
      ({ path }) =>
        useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: path,
          patchPath,
          debounceMs: 1,
        }),
      { initialProps: { path: 'C:/ffmpeg.exe' }, wrapper },
    );

    await waitFor(() => expect(probe).toHaveBeenCalledTimes(1));
    act(() => resolvers[0](new ProbeResult({ ok: true, version: '7.0' })));
    await waitFor(() => expect(result.current.probeResult?.version).toBe('7.0'));

    act(() => result.current.onValueChange('D:/ffmpeg.exe'));
    await waitFor(() => expect(probe).toHaveBeenCalledTimes(2));
    act(() => resolvers[1](new ProbeResult({ ok: true, version: '8.0' })));
    await waitFor(() => expect(result.current.probeResult?.version).toBe('8.0'));

    act(() => result.current.onBlur());
    await waitFor(() => expect(patchPath).toHaveBeenCalledWith('D:/ffmpeg.exe'));
    await waitFor(() => expect(probe).toHaveBeenCalledTimes(3));
    act(() => resolvers[2](new ProbeResult({ ok: true, version: '8.0' })));
    rerender({ path: 'D:/ffmpeg.exe' });
    await act(async () => undefined);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it('forces a fresh probe when re-applying the same path', async () => {
    const resolvers: Array<(result: ProbeResult) => void> = [];
    const probe = vi.fn(() => new Promise<ProbeResult>((resolve) => resolvers.push(resolve)));
    const store = createConvertStore(
      fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
    );
    const patchPath = vi.fn(async () => true);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ConvertProvider store={store}>{children}</ConvertProvider>
    );

    const { result } = renderHook(
      () =>
        useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: 'C:/ffmpeg.exe',
          patchPath,
        }),
      { wrapper },
    );

    await waitFor(() => expect(probe).toHaveBeenCalledTimes(1));
    act(() => resolvers[0](new ProbeResult({ ok: false, error: '不支持' })));
    await waitFor(() => expect(result.current.probeResult?.ok).toBe(false));

    act(() => result.current.applyPath('C:/ffmpeg.exe'));
    await waitFor(() => expect(patchPath).toHaveBeenCalledWith('C:/ffmpeg.exe'));
    await waitFor(() => expect(probe).toHaveBeenCalledTimes(2));
    act(() => resolvers[1](new ProbeResult({ ok: true, version: '8.0' })));
    await waitFor(() => {
      expect(result.current.probeResult?.ok).toBe(true);
      expect(result.current.probeResult?.version).toBe('8.0');
    });
  });

  it('does not patch settings when blurring an unmodified path', async () => {
    const probe = vi.fn(async () => new ProbeResult({ ok: true, version: '7.0' }));
    const store = createConvertStore(
      fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
    );
    const patchPath = vi.fn(async () => true);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ConvertProvider store={store}>{children}</ConvertProvider>
    );

    const { result } = renderHook(
      () =>
        useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: 'C:/ffmpeg.exe',
          patchPath,
          debounceMs: 50,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.probeResult?.ok).toBe(true));

    act(() => result.current.onBlur());
    // Reverting an edit back to the persisted value is also not a change.
    act(() => result.current.onValueChange('D:/other.exe'));
    act(() => result.current.onValueChange('C:/ffmpeg.exe'));
    act(() => result.current.onBlur());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 120)));

    expect(patchPath).not.toHaveBeenCalled();
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('only rolls back the draft for the latest failed commit', async () => {
    const patches: Array<(ok: boolean) => void> = [];
    const patchPath = vi.fn(() => new Promise<boolean>((resolve) => patches.push(resolve)));
    const store = createConvertStore(fakeApi());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ConvertProvider store={store}>{children}</ConvertProvider>
    );

    const { result } = renderHook(
      () =>
        useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: 'C:/ffmpeg.exe',
          patchPath,
        }),
      { wrapper },
    );

    act(() => result.current.applyPath('D:/first.exe'));
    await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(1));
    act(() => result.current.applyPath('E:/second.exe'));
    await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(2));
    expect(result.current.value).toBe('E:/second.exe');

    // The older commit failing must not clobber the newer draft.
    await act(async () => patches[0](false));
    expect(result.current.value).toBe('E:/second.exe');

    await act(async () => patches[1](false));
    expect(result.current.value).toBe('C:/ffmpeg.exe');
  });

  it('keeps a newer typed draft when an earlier commit fails', async () => {
    const patches: Array<(ok: boolean) => void> = [];
    const patchPath = vi.fn(() => new Promise<boolean>((resolve) => patches.push(resolve)));
    const store = createConvertStore(fakeApi());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ConvertProvider store={store}>{children}</ConvertProvider>
    );

    const { result } = renderHook(
      () =>
        useExecutablePathProbe({
          exe: 'ffmpeg',
          persistedPath: 'C:/ffmpeg.exe',
          patchPath,
          debounceMs: 60_000,
        }),
      { wrapper },
    );

    act(() => result.current.applyPath('D:/first.exe'));
    await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(1));
    act(() => result.current.onValueChange('D:/typing'));

    await act(async () => patches[0](false));
    expect(result.current.value).toBe('D:/typing');
  });

  describe('in-flight commit races', () => {
    function setupRace() {
      const patches: Array<(ok: boolean) => void> = [];
      const patchPath = vi.fn(() => new Promise<boolean>((resolve) => patches.push(resolve)));
      const probe = vi.fn(async () => new ProbeResult({ ok: true, version: '7.0' }));
      const store = createConvertStore(
        fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
      );
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ConvertProvider store={store}>{children}</ConvertProvider>
      );
      const hook = renderHook(
        ({ path }) =>
          useExecutablePathProbe({
            exe: 'ffmpeg',
            persistedPath: path,
            patchPath,
            debounceMs: 60_000,
          }),
        { initialProps: { path: 'C:/ffmpeg.exe' }, wrapper },
      );
      const probedPaths = () =>
        probe.mock.calls.map((call) => (call as unknown as [{ path: string }])[0].path);
      return { ...hook, patches, patchPath, probedPaths };
    }

    it('commits a revert to the persisted path while an earlier commit is in flight', async () => {
      const { result, rerender, patches, patchPath } = setupRace();

      act(() => result.current.applyPath('D:/first.exe'));
      await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(1));
      act(() => result.current.onValueChange('C:/ffmpeg.exe'));
      act(() => result.current.onBlur());
      await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(2));
      expect(patchPath).toHaveBeenLastCalledWith('C:/ffmpeg.exe');

      // The older commit lands first and must not overwrite the reverted draft.
      await act(async () => patches[0](true));
      rerender({ path: 'D:/first.exe' });
      expect(result.current.value).toBe('C:/ffmpeg.exe');

      await act(async () => patches[1](true));
      rerender({ path: 'C:/ffmpeg.exe' });
      expect(result.current.value).toBe('C:/ffmpeg.exe');
    });

    it('does not overwrite a dirty draft when a stale commit persists late', async () => {
      const { result, rerender, patches, patchPath } = setupRace();

      act(() => result.current.applyPath('D:/first.exe'));
      await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(1));
      act(() => result.current.onValueChange('D:/typing'));

      await act(async () => patches[0](true));
      rerender({ path: 'D:/first.exe' });
      await act(async () => undefined);

      expect(result.current.value).toBe('D:/typing');
    });

    it('does not force a probe for a superseded commit', async () => {
      const { result, patches, patchPath, probedPaths } = setupRace();

      act(() => result.current.applyPath('D:/first.exe'));
      await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(1));
      act(() => result.current.applyPath('E:/second.exe'));
      await waitFor(() => expect(patchPath).toHaveBeenCalledTimes(2));

      await act(async () => patches[0](true));
      expect(probedPaths()).not.toContain('D:/first.exe');

      await act(async () => patches[1](true));
      await waitFor(() => expect(probedPaths()).toContain('E:/second.exe'));
    });
  });
});
