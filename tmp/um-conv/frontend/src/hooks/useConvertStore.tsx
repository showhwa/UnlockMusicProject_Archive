import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { Events } from '@wailsio/runtime';
import type { AppSnapshot, FileEntry, JobState } from '~service/convert';
import { AppSnapshot as AppSnapshotModel } from '~service/convert';
import { ConvertState } from '~events';
import { Format, type OutputProfile, type Settings } from '~protocol';
import type { ConvertState as StoreState, ConvertStore } from '@/lib/convertStore';
import { getProbeSnapshot, type ExecutableProbeSnapshot } from '@/lib/probeCache';
import { useFileDropRouter } from '@/hooks/useFileDropRouter';

const ConvertStoreContext = createContext<ConvertStore | null>(null);

function useConvertBootstrap(store: ConvertStore): void {
  useEffect(() => {
    const off = Events.On(ConvertState, (event: { data?: AppSnapshot }) => {
      if (event?.data) store.getState().applySnapshot(AppSnapshotModel.createFrom(event.data));
    });
    return () => {
      if (typeof off === 'function') off();
    };
  }, [store]);

  useEffect(() => {
    const ac = new AbortController();
    store
      .getState()
      .hydrate(ac.signal)
      .catch((error) => {
        if (!ac.signal.aborted) console.error('GetState failed', error);
      });
    return () => ac.abort();
  }, [store]);
}

export type ConvertProviderProps = {
  store: ConvertStore;
  children: ReactNode;
};

export function ConvertProvider({ store, children }: ConvertProviderProps) {
  useConvertBootstrap(store);
  useFileDropRouter();
  return <ConvertStoreContext.Provider value={store}>{children}</ConvertStoreContext.Provider>;
}

function useStoreApi(): ConvertStore {
  const store = useContext(ConvertStoreContext);
  if (!store) throw new Error('Store hooks must be used within ConvertProvider');
  return store;
}

export function useConvertSelector<T>(selector: (state: StoreState) => T): T {
  return useStore(useStoreApi(), selector);
}

export function useFiles(): FileEntry[] {
  return useConvertSelector((state) => state.files);
}

export function useSetting<T>(selector: (settings: Settings) => T): T {
  return useConvertSelector((state) => selector(state.settings));
}

export function useProfiles(): OutputProfile[] {
  return useConvertSelector((state) => state.profiles);
}

/** Profiles the user can pick as an output format (excludes the "none" passthrough profile). */
export function useSelectableProfiles(): OutputProfile[] {
  const profiles = useProfiles();
  return useMemo(
    () => profiles.filter((profile) => profile.format !== Format.FormatNone),
    [profiles],
  );
}

export function useJob(): JobState {
  return useConvertSelector((state) => state.job);
}

export function useBusy(): boolean {
  return useConvertSelector((state) => state.job.status === 'running');
}

export function useCommandError(): string | null {
  return useConvertSelector((state) => state.commandError);
}

export function useProbe(exe: string, path: string): ExecutableProbeSnapshot {
  return useConvertSelector((state) => getProbeSnapshot(state.probes, exe, path));
}
