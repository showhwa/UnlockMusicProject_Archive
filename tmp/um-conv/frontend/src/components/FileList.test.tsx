// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { afterEach, expect, it } from 'vitest';
import {
  AppSnapshot,
  ConvertService,
  FileEntry,
  FileStatus,
  JobState,
  OutputInfo,
  SourceInfo,
} from '~service/convert';
import { SettingsService } from '~service/settings';
import { ConvertProvider } from '@/hooks/useConvertStore';
import { createConvertStore } from '@/lib/convertStore';
import { FileList } from './FileList';

afterEach(() => cleanup());

function file(overrides: Partial<FileEntry> & { path: string; name: string }): FileEntry {
  return new FileEntry({
    size: '1.2 MB',
    status: FileStatus.FileStatusPending,
    source: new SourceInfo(),
    output: new OutputInfo(),
    ...overrides,
  });
}

function renderFiles(files: FileEntry[], job = new JobState({ status: 'idle', message: '' })) {
  const store = createConvertStore({
    ...ConvertService,
    ...SettingsService,
    GetState: () => CancellablePromise.resolve(new AppSnapshot({ revision: 1, files, job })),
  });
  const view = render(
    <ConvertProvider store={store}>
      <FileList />
    </ConvertProvider>,
  );
  return { store, ...view };
}

it('shows source detail lines for probed, encrypted, and plain files', async () => {
  const probed = file({
    name: 'song.flac',
    path: 'C:/music/song.flac',
    source: new SourceInfo({ ok: true, bitrateKbps: 1411, format: 'FLAC' }),
  });
  const encrypted = file({
    name: 'song.ncm',
    path: 'C:/music/song.ncm',
    source: new SourceInfo({ player: '网易云音乐' }),
  });
  const plain = file({ name: 'other.wav', path: 'C:/music/other.wav' });
  renderFiles([probed, encrypted, plain]);

  expect(await screen.findByText('1411kbps · FLAC · 1.2 MB')).toBeTruthy();
  expect(screen.getByText('网易云音乐 · 1.2 MB')).toBeTruthy();
  expect(screen.getByText('1.2 MB')).toBeTruthy();
});

it('shows conversion arrow only for successful files', async () => {
  const success = file({
    name: 'done.flac',
    path: 'C:/music/done.flac',
    status: FileStatus.FileStatusSuccess,
    outputPath: 'C:/out/done.mp3',
    source: new SourceInfo({ ok: true, bitrateKbps: 320, format: 'FLAC' }),
    output: new OutputInfo({ format: 'MP3', bitrateKbps: 320, size: '4.0 MB' }),
  });
  const skipped = file({
    name: 'skip.flac',
    path: 'C:/music/skip.flac',
    status: FileStatus.FileStatusSkipped,
    outputPath: 'C:/out/skip.mp3',
    source: new SourceInfo({ ok: true, bitrateKbps: 320, format: 'FLAC' }),
  });
  renderFiles([success, skipped]);

  expect(await screen.findByText('320kbps · FLAC · 1.2 MB → MP3 320kbps · 4.0 MB')).toBeTruthy();
  expect(screen.getByText('320kbps · FLAC · 1.2 MB')).toBeTruthy();
  expect(screen.queryAllByText(/→/)).toHaveLength(1);
});

it('exposes open actions only on successful rows', async () => {
  const success = file({
    name: 'song.wav',
    path: 'C:/source/song.wav',
    status: FileStatus.FileStatusSuccess,
    outputPath: 'C:/output/song.flac',
    source: new SourceInfo({ ok: true, bitrateKbps: 1411, format: 'WAV' }),
    output: new OutputInfo({ format: 'FLAC', bitrateKbps: 1411, size: '12 MB' }),
  });
  const failed = file({
    name: 'failed.wav',
    path: 'C:/source/failed.wav',
    status: FileStatus.FileStatusFailed,
    error: '不支持的文件类型',
  });
  renderFiles([success, failed]);

  expect(await screen.findByRole('button', { name: /打开 song.wav 的输出文件/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /打开 song.wav 的输出目录/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /打开 failed.wav/ })).toBeNull();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByText(/C:\\source/)).toBeNull();
  const failedDetail = screen.getByText('1.2 MB → 不支持的文件类型');
  expect(failedDetail.getAttribute('title')).toBe('1.2 MB → 不支持的文件类型');
});

it('falls back to source detail when a failed row has empty or whitespace error', async () => {
  const emptyError = file({
    name: 'empty.wav',
    path: 'C:/source/empty.wav',
    status: FileStatus.FileStatusFailed,
    error: '',
  });
  const whitespaceError = file({
    name: 'blank.wav',
    path: 'C:/source/blank.wav',
    status: FileStatus.FileStatusFailed,
    error: '   ',
  });
  renderFiles([emptyError, whitespaceError]);

  expect(await screen.findAllByText('1.2 MB')).toHaveLength(2);
  expect(screen.queryByText(/→/)).toBeNull();
});

it('shows per-row progress while running and disables delete', async () => {
  const pending = file({
    name: 'pending.wav',
    path: 'C:/music/pending.wav',
    progress: 35,
  });
  renderFiles([pending], new JobState({ status: 'running', message: 'working' }));

  const row = (await screen.findByText('pending.wav')).parentElement?.parentElement?.parentElement;
  expect(row).toBeTruthy();
  expect(within(row!).getByRole('progressbar')).toBeTruthy();
  const deleteBtn = screen.getByRole('button', { name: '从列表删除 pending.wav' });
  expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);
});

it('hides per-row progress when idle', async () => {
  const pending = file({ name: 'idle.wav', path: 'C:/music/idle.wav', progress: 20 });
  const { container } = renderFiles([pending], new JobState({ status: 'idle', message: '' }));
  await screen.findByText('idle.wav');
  expect(within(container).queryByRole('progressbar')).toBeNull();
});
