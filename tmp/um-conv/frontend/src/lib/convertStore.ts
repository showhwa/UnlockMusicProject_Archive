import { dequal } from 'dequal';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { ConvertService, AppSnapshot, JobState } from '~service/convert';
import { SettingsService } from '~service/settings';
import {
  ProbeRequest,
  ProbeResult,
  Settings,
  type OutputProfile,
  type SettingsState,
} from '~protocol';
import type { FileEntry } from '~service/convert';
import { probeKey, type ProbeSnapshots } from '@/lib/probeCache';
import { mergeSettings } from '@/lib/settingsMerge';

export type ConvertApi = {
  GetState: typeof ConvertService.GetState;
  SelectFiles: typeof ConvertService.SelectFiles;
  SelectFolder: typeof ConvertService.SelectFolder;
  AddPaths: typeof ConvertService.AddPaths;
  RemoveFiles: typeof ConvertService.RemoveFiles;
  ClearFiles: typeof ConvertService.ClearFiles;
  StartConvert: typeof ConvertService.StartConvert;
  PlayFile: typeof ConvertService.PlayFile;
  OpenContainingFolder: typeof ConvertService.OpenContainingFolder;
  PatchSettings: typeof SettingsService.PatchSettings;
  ProbeExecutable: typeof SettingsService.ProbeExecutable;
  OpenLogFile: typeof SettingsService.OpenLogFile;
  OpenConfigFile: typeof SettingsService.OpenConfigFile;
  SelectDirectory: typeof ConvertService.SelectDirectory;
  SelectExecutable: typeof ConvertService.SelectExecutable;
};

export type ConvertState = {
  revision: number;
  settingsRevision: number;
  files: FileEntry[];
  settings: Settings;
  profiles: OutputProfile[];
  job: JobState;
  probes: ProbeSnapshots;
  commandError: string | null;
  applySnapshot: (snapshot: AppSnapshot) => void;
  hydrate: (signal?: AbortSignal) => Promise<void>;
  patchSettings: (patch: { [_ in string]?: unknown }) => Promise<boolean>;
  requestProbe: (exe: string, path: string, force?: boolean) => Promise<void>;
  addFiles: () => Promise<boolean>;
  addFolder: () => Promise<boolean>;
  addPaths: (paths: string[]) => Promise<boolean>;
  removeFiles: (paths: string[]) => Promise<boolean>;
  clearFiles: () => Promise<boolean>;
  startConvert: () => Promise<boolean>;
  playFile: (path: string) => Promise<boolean>;
  openContainingFolder: (path: string) => Promise<boolean>;
  openLogFile: () => Promise<string | null>;
  openConfigFile: () => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  selectExecutable: (title: string) => Promise<string | null>;
};

export type ConvertStore = StoreApi<ConvertState>;

const defaultApi: ConvertApi = {
  GetState: ConvertService.GetState,
  SelectFiles: ConvertService.SelectFiles,
  SelectFolder: ConvertService.SelectFolder,
  AddPaths: ConvertService.AddPaths,
  RemoveFiles: ConvertService.RemoveFiles,
  ClearFiles: ConvertService.ClearFiles,
  StartConvert: ConvertService.StartConvert,
  PlayFile: ConvertService.PlayFile,
  OpenContainingFolder: ConvertService.OpenContainingFolder,
  PatchSettings: SettingsService.PatchSettings,
  ProbeExecutable: SettingsService.ProbeExecutable,
  OpenLogFile: SettingsService.OpenLogFile,
  OpenConfigFile: SettingsService.OpenConfigFile,
  SelectDirectory: ConvertService.SelectDirectory,
  SelectExecutable: ConvertService.SelectExecutable,
};

/**
 * Merge backend files into the current list, reusing `FileEntry` references for
 * unchanged paths (and the array itself when nothing changed) so memoized rows
 * skip re-rendering on unrelated progress updates.
 */
export function mergeFiles(previous: FileEntry[], next: FileEntry[]): FileEntry[] {
  const previousByPath = new Map<string, FileEntry>();
  for (const file of previous) previousByPath.set(file.path, file);

  const merged = next.map((file) => {
    const old = previousByPath.get(file.path);
    return old && dequal(old, file) ? old : file;
  });
  const unchanged =
    merged.length === previous.length && merged.every((file, index) => file === previous[index]);
  return unchanged ? previous : merged;
}

function initialState() {
  return {
    revision: 0,
    settingsRevision: 0,
    files: [] as FileEntry[],
    settings: new Settings(),
    profiles: [] as OutputProfile[],
    // The idle message is owned by Go and arrives with the first snapshot.
    job: new JobState({ status: 'idle', message: '', percent: 0 }),
    probes: {} as ProbeSnapshots,
    commandError: null as string | null,
  };
}

export function createConvertStore(api: ConvertApi = defaultApi): ConvertStore {
  let settingsQueue: Promise<void> = Promise.resolve();
  const probeRequests = new Map<string, Promise<void>>();

  return createStore<ConvertState>()((set, get) => {
    const setCommandError = (message: string | null) => {
      if (get().commandError !== message) set({ commandError: message });
    };

    const runCommand = async (fn: () => Promise<unknown>): Promise<boolean> => {
      try {
        await fn();
        setCommandError(null);
        return true;
      } catch (error) {
        setCommandError(String(error));
        return false;
      }
    };

    const runFileOpen = async (fn: () => Promise<unknown>): Promise<string | null> => {
      try {
        await fn();
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };

    const applySettingsState = (next: SettingsState) => {
      set((state) => {
        if (next.revision < state.settingsRevision) return state;
        const settings = mergeSettings(state.settings, next.settings);
        if (next.revision === state.settingsRevision && settings === state.settings) return state;
        return { settingsRevision: next.revision, settings };
      });
    };

    return {
      ...initialState(),

      applySnapshot: (next) => {
        set((state) => {
          const acceptSession = next.revision >= state.revision;
          const acceptSettings = next.settingsRevision >= state.settingsRevision;
          if (!acceptSession && !acceptSettings) return state;

          const files = acceptSession ? mergeFiles(state.files, next.files) : state.files;
          const profiles =
            acceptSession && !dequal(state.profiles, next.profiles)
              ? next.profiles
              : state.profiles;
          const job = acceptSession && !dequal(state.job, next.job) ? next.job : state.job;
          const settings = acceptSettings
            ? mergeSettings(state.settings, next.settings)
            : state.settings;
          const revision = acceptSession ? next.revision : state.revision;
          const settingsRevision = acceptSettings ? next.settingsRevision : state.settingsRevision;

          if (
            files === state.files &&
            profiles === state.profiles &&
            job === state.job &&
            settings === state.settings &&
            revision === state.revision &&
            settingsRevision === state.settingsRevision
          ) {
            return state;
          }
          return { files, profiles, job, settings, revision, settingsRevision };
        });
      },

      hydrate: async (signal) => {
        const snapshot = await api.GetState();
        if (!signal?.aborted) get().applySnapshot(snapshot);
      },

      patchSettings: (patch) => {
        let resolve!: (ok: boolean) => void;
        const result = new Promise<boolean>((done) => {
          resolve = done;
        });
        settingsQueue = settingsQueue.then(async () => {
          try {
            const confirmed = await api.PatchSettings(patch);
            applySettingsState(confirmed);
            setCommandError(null);
            resolve(true);
          } catch (error) {
            setCommandError(String(error));
            resolve(false);
          }
        });
        return result;
      },

      requestProbe: (exe, path, force = false) => {
        const key = probeKey(exe, path);
        const pending = probeRequests.get(key);
        if (pending) return pending;
        if (!force && get().probes[key]?.status === 'ready') return Promise.resolve();

        set((state) => ({
          probes: {
            ...state.probes,
            [key]: { status: 'probing', result: state.probes[key]?.result ?? null },
          },
        }));
        const request = api
          .ProbeExecutable(new ProbeRequest({ exe, path }))
          .then((result) => {
            set((state) => ({
              probes: { ...state.probes, [key]: { status: 'ready', result } },
            }));
          })
          .catch((error: unknown) => {
            set((state) => ({
              probes: {
                ...state.probes,
                [key]: {
                  status: 'ready',
                  result: new ProbeResult({ ok: false, error: String(error) }),
                },
              },
            }));
          })
          .finally(() => probeRequests.delete(key));
        probeRequests.set(key, request);
        return request;
      },

      addFiles: () => runCommand(() => api.SelectFiles()),
      addFolder: () => runCommand(() => api.SelectFolder()),
      addPaths: (paths) => runCommand(() => api.AddPaths(paths)),
      removeFiles: (paths) => runCommand(() => api.RemoveFiles(paths)),
      clearFiles: () => runCommand(() => api.ClearFiles()),
      startConvert: () => runCommand(() => api.StartConvert('', '')),
      playFile: (path) => runCommand(() => api.PlayFile(path)),
      openContainingFolder: (path) => runCommand(() => api.OpenContainingFolder(path)),
      openLogFile: () => runFileOpen(() => api.OpenLogFile()),
      openConfigFile: () => runFileOpen(() => api.OpenConfigFile()),
      selectDirectory: async () => {
        try {
          const path = await api.SelectDirectory();
          setCommandError(null);
          return path || null;
        } catch (error) {
          setCommandError(String(error));
          return null;
        }
      },
      selectExecutable: async (title) => {
        try {
          const path = await api.SelectExecutable(title);
          setCommandError(null);
          return path || null;
        } catch (error) {
          setCommandError(String(error));
          return null;
        }
      },
    };
  });
}
