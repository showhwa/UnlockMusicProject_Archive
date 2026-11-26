import { describe, expect, it, vi } from 'vitest';
import { AppSnapshot, FileEntry, JobState } from '~service/convert';
import {
  AACEncoder,
  OGGEncoder,
  OutputProfile,
  ProbeResult,
  Settings,
  SettingsState,
} from '~protocol';
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

function snapshot(revision: number, settingsRevision: number, settings: Settings, percent = 0) {
  return new AppSnapshot({
    revision,
    settingsRevision,
    files: [],
    profiles: [new OutputProfile({ id: 'mp3' })],
    settings,
    job: new JobState({ status: 'running', percent }),
  });
}

describe('convert store', () => {
  it('rejects stale snapshots independently for session and settings state', () => {
    const store = createConvertStore(fakeApi());
    const current = new Settings({ outputFormat: 'flac', outputDir: 'new' });
    store.getState().applySnapshot(snapshot(10, 8, current, 80));

    store
      .getState()
      .applySnapshot(snapshot(9, 7, new Settings({ outputFormat: 'wav', outputDir: 'old' }), 10));

    expect(store.getState().revision).toBe(10);
    expect(store.getState().settingsRevision).toBe(8);
    expect(store.getState().job.percent).toBe(80);
    expect(store.getState().settings.outputDir).toBe('new');
  });

  it('preserves references for unchanged branches and nested settings objects', () => {
    const store = createConvertStore(fakeApi());
    const before = new Settings({
      outputFormat: 'mp3',
      outputDir: 'before',
      bin: { um_cli_rs: 'um', 'qmpc-mmkv-cli': 'qmpc', adb: '', allowAdbKeys: false },
      ffmpeg: {
        path: 'ffmpeg',
        aacEncoder: AACEncoder.AACEncoderAuto,
        aacFdkWithVBR: true,
        oggEncoder: OGGEncoder.OGGEncoderAuto,
      },
    });
    store.getState().applySnapshot(snapshot(1, 1, before));
    const previous = store.getState();

    const after = new Settings({ ...before, outputDir: 'after' });
    store.getState().applySnapshot(snapshot(2, 2, after));
    const next = store.getState();

    expect(next.settings).not.toBe(previous.settings);
    expect(next.settings.bin).toBe(previous.settings.bin);
    expect(next.settings.ffmpeg).toBe(previous.settings.ffmpeg);
    expect(next.files).toBe(previous.files);
    expect(next.profiles).toBe(previous.profiles);
    expect(next.job).toBe(previous.job);
  });

  it('keeps unchanged FileEntry references when one file progresses', () => {
    const store = createConvertStore(fakeApi());
    const entry = (path: string, progress: number) => new FileEntry({ path, name: path, progress });
    const withFiles = (revision: number, files: FileEntry[]) =>
      new AppSnapshot({ ...snapshot(revision, 1, new Settings()), files });

    store.getState().applySnapshot(withFiles(1, [entry('a', 0), entry('b', 0), entry('c', 0)]));
    const before = store.getState().files;

    // Fresh instances, as produced by AppSnapshot.createFrom on each event.
    store.getState().applySnapshot(withFiles(2, [entry('a', 0), entry('b', 50), entry('c', 0)]));
    const after = store.getState().files;

    expect(after).not.toBe(before);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(after[1].progress).toBe(50);
    expect(after[2]).toBe(before[2]);

    store.getState().applySnapshot(withFiles(3, [entry('a', 0), entry('b', 50), entry('c', 0)]));
    expect(store.getState().files).toBe(after);
  });

  it('serializes setting patches and applies Go-confirmed values', async () => {
    const resolvers: Array<(state: SettingsState) => void> = [];
    const patch = vi.fn(() => new Promise<SettingsState>((resolve) => resolvers.push(resolve)));
    const store = createConvertStore(
      fakeApi({ PatchSettings: patch as unknown as ConvertApi['PatchSettings'] }),
    );

    const first = store.getState().patchSettings({ outputDir: 'one' });
    const second = store.getState().patchSettings({ outputDir: 'two' });
    await vi.waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    resolvers[0](
      new SettingsState({ revision: 2, settings: new Settings({ outputDir: 'one-normalized' }) }),
    );
    await expect(first).resolves.toBe(true);
    await vi.waitFor(() => expect(patch).toHaveBeenCalledTimes(2));

    resolvers[1](
      new SettingsState({ revision: 3, settings: new Settings({ outputDir: 'two-normalized' }) }),
    );
    await expect(second).resolves.toBe(true);
    expect(store.getState().settings.outputDir).toBe('two-normalized');
    expect(store.getState().settingsRevision).toBe(3);
  });

  it('ignores a patch response older than the current settings revision', async () => {
    const store = createConvertStore(
      fakeApi({
        PatchSettings: (async () =>
          new SettingsState({
            revision: 4,
            settings: new Settings({ outputDir: 'stale' }),
          })) as unknown as ConvertApi['PatchSettings'],
      }),
    );
    store.getState().applySnapshot(snapshot(1, 9, new Settings({ outputDir: 'fresh' })));

    await expect(store.getState().patchSettings({ outputDir: 'x' })).resolves.toBe(true);

    expect(store.getState().settings.outputDir).toBe('fresh');
    expect(store.getState().settingsRevision).toBe(9);
  });

  it('keeps the settings queue alive after a failed patch', async () => {
    const patch = vi
      .fn<ConvertApi['PatchSettings']>()
      .mockRejectedValueOnce(new Error('invalid') as never)
      .mockResolvedValueOnce(
        new SettingsState({ revision: 2, settings: new Settings({ outputDir: 'ok' }) }) as never,
      );
    const store = createConvertStore(fakeApi({ PatchSettings: patch }));

    await expect(store.getState().patchSettings({ outputDir: 'bad' })).resolves.toBe(false);
    expect(store.getState().commandError).toContain('invalid');

    await expect(store.getState().patchSettings({ outputDir: 'ok' })).resolves.toBe(true);
    expect(store.getState().commandError).toBeNull();
    expect(store.getState().settings.outputDir).toBe('ok');
  });

  it('records a failed probe as an unavailable ProbeResult', async () => {
    const store = createConvertStore(
      fakeApi({
        ProbeExecutable: (async () => {
          throw new Error('spawn failed');
        }) as unknown as ConvertApi['ProbeExecutable'],
      }),
    );

    await store.getState().requestProbe('ffmpeg', 'C:/missing.exe', true);

    const [entry] = Object.values(store.getState().probes);
    expect(entry.status).toBe('ready');
    expect(entry.result).toBeInstanceOf(ProbeResult);
    expect(entry.result?.ok).toBe(false);
    expect(entry.result?.error).toContain('spawn failed');
  });

  it('deduplicates concurrent probes for the same executable and path', async () => {
    let resolve!: (result: ProbeResult) => void;
    const probe = vi.fn(() => new Promise<ProbeResult>((done) => (resolve = done)));
    const store = createConvertStore(
      fakeApi({ ProbeExecutable: probe as unknown as ConvertApi['ProbeExecutable'] }),
    );

    const first = store.getState().requestProbe('ffmpeg', 'C:/ffmpeg.exe', true);
    const second = store.getState().requestProbe('ffmpeg', 'C:/ffmpeg.exe', true);
    expect(probe).toHaveBeenCalledTimes(1);
    resolve(new ProbeResult({ ok: true, version: '7.0' }));
    await Promise.all([first, second]);

    const entries = Object.values(store.getState().probes);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      status: 'ready',
      result: expect.objectContaining({ ok: true, version: '7.0' }),
    });
  });

  it('opens log and config files and returns errors without setting commandError', async () => {
    const openLogFile = vi.fn(async () => undefined);
    const openConfigFile = vi.fn(async () => {
      throw new Error('config missing');
    });
    const store = createConvertStore(
      fakeApi({
        OpenLogFile: openLogFile as unknown as ConvertApi['OpenLogFile'],
        OpenConfigFile: openConfigFile as unknown as ConvertApi['OpenConfigFile'],
      }),
    );

    await expect(store.getState().openLogFile()).resolves.toBeNull();
    expect(openLogFile).toHaveBeenCalledTimes(1);
    expect(store.getState().commandError).toBeNull();

    await expect(store.getState().openConfigFile()).resolves.toBe('config missing');
    expect(openConfigFile).toHaveBeenCalledTimes(1);
    expect(store.getState().commandError).toBeNull();

    const failLog = vi.fn(async () => {
      throw 'log unavailable';
    });
    const logErrStore = createConvertStore(
      fakeApi({ OpenLogFile: failLog as unknown as ConvertApi['OpenLogFile'] }),
    );
    await expect(logErrStore.getState().openLogFile()).resolves.toBe('log unavailable');
    expect(logErrStore.getState().commandError).toBeNull();
  });
});
