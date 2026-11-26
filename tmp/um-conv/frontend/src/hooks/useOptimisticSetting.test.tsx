// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSnapshot } from '~service/convert';
import { ProbeResult, Settings, SettingsState } from '~protocol';
import { ConvertProvider, useSetting } from '@/hooks/useConvertStore';
import { useOptimisticSetting } from '@/hooks/useOptimisticSetting';
import { createConvertStore, type ConvertApi } from '@/lib/convertStore';

type Deferred = { resolve: (state: SettingsState) => void; reject: (error: unknown) => void };

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

function confirmed(revision: number, outputDir: string): SettingsState {
  return new SettingsState({ revision, settings: new Settings({ outputDir }) });
}

function setup(patchSettings: ConvertApi['PatchSettings']) {
  const store = createConvertStore(fakeApi({ PatchSettings: patchSettings }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ConvertProvider store={store}>{children}</ConvertProvider>
  );
  const hook = renderHook(
    () =>
      useOptimisticSetting(
        useSetting((settings) => settings.outputDir),
        (value) => ({ outputDir: value }),
      ),
    { wrapper },
  );
  return { store, ...hook };
}

function deferredPatch() {
  const pending: Deferred[] = [];
  const patch = vi.fn(
    () => new Promise<SettingsState>((resolve, reject) => pending.push({ resolve, reject })),
  );
  return { patch: patch as unknown as ConvertApi['PatchSettings'], calls: patch, pending };
}

describe('useOptimisticSetting', () => {
  it('shows the draft while committing and clears it once Go confirms', async () => {
    const { patch, pending } = deferredPatch();
    const { result, store } = setup(patch);

    let committed!: Promise<boolean>;
    act(() => {
      committed = result.current.commit('D:/out');
    });
    expect(result.current.value).toBe('D:/out');
    expect(result.current.pending).toBe(true);

    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => {
      pending[0].resolve(confirmed(1, 'D:/out'));
      await committed;
    });
    expect(await committed).toBe(true);
    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBe('D:/out');
    expect(store.getState().settings.outputDir).toBe('D:/out');
  });

  it('keeps the latest value across rapid commits', async () => {
    const { patch, pending, calls } = deferredPatch();
    const { result } = setup(patch);

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.commit('A');
      second = result.current.commit('B');
    });
    expect(result.current.value).toBe('B');

    // The store serialises patches; resolve them in order.
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(1));
    await act(async () => {
      pending[0].resolve(confirmed(1, 'A'));
      await first;
    });
    // The older commit finishing must not clear the newer draft.
    expect(result.current.value).toBe('B');
    expect(result.current.pending).toBe(true);

    await waitFor(() => expect(calls).toHaveBeenCalledTimes(2));
    await act(async () => {
      pending[1].resolve(confirmed(2, 'B'));
      await second;
    });
    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBe('B');
  });

  it('rolls back to the authoritative value when the commit fails', async () => {
    const { patch, pending } = deferredPatch();
    const { result, store } = setup(patch);
    act(() =>
      store
        .getState()
        .applySnapshot(
          new AppSnapshot({ settingsRevision: 5, settings: new Settings({ outputDir: 'C:/old' }) }),
        ),
    );
    expect(result.current.value).toBe('C:/old');

    let committed!: Promise<boolean>;
    act(() => {
      committed = result.current.commit('D:/new');
    });
    expect(result.current.value).toBe('D:/new');

    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => {
      pending[0].reject(new Error('rejected'));
      await committed;
    });
    expect(await committed).toBe(false);
    expect(result.current.pending).toBe(false);
    expect(result.current.value).toBe('C:/old');
  });

  it('does not clear a newer draft when an in-flight commit finishes', async () => {
    const { patch, pending } = deferredPatch();
    const { result } = setup(patch);

    let committed!: Promise<boolean>;
    act(() => {
      committed = result.current.commit('A');
    });
    act(() => result.current.setDraft('typing'));
    expect(result.current.value).toBe('typing');

    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => {
      pending[0].resolve(confirmed(1, 'A'));
      await committed;
    });
    expect(result.current.value).toBe('typing');
    expect(result.current.pending).toBe(true);
  });

  it('commitDraft skips untouched controls and commits edited drafts', async () => {
    const patch = vi.fn(async () => confirmed(1, 'E:/edited'));
    const { result } = setup(patch as unknown as ConvertApi['PatchSettings']);

    await act(async () => {
      expect(await result.current.commitDraft()).toBe(true);
    });
    expect(patch).not.toHaveBeenCalled();

    act(() => result.current.setDraft('E:/edited'));
    await act(async () => {
      expect(await result.current.commitDraft()).toBe(true);
    });
    expect(patch).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
  });

  it('commits the latest draft when setDraft and commitDraft run in the same tick', async () => {
    const patch = vi.fn(async () => confirmed(1, 'E:/same-tick'));
    const { result } = setup(patch as unknown as ConvertApi['PatchSettings']);

    await act(async () => {
      result.current.setDraft('E:/same-tick');
      expect(await result.current.commitDraft()).toBe(true);
    });

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith({ outputDir: 'E:/same-tick' });
    expect(result.current.pending).toBe(false);
  });

  it('keeps commit callbacks stable while the value changes', () => {
    const { patch } = deferredPatch();
    const { result } = setup(patch);
    const { commit, setDraft, commitDraft } = result.current;

    act(() => result.current.setDraft('typing'));
    expect(result.current.commit).toBe(commit);
    expect(result.current.setDraft).toBe(setDraft);
    expect(result.current.commitDraft).toBe(commitDraft);
  });
});
