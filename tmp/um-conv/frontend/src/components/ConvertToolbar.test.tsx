// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvertToolbar } from './ConvertToolbar';

const mocks = vi.hoisted(() => ({
  busy: false,
  files: [{ id: '1', outputPath: '' }] as Array<{ id: string; outputPath: string }>,
  startConvert: vi.fn<() => Promise<void>>(),
  clearFiles: vi.fn(),
}));

vi.mock('@/hooks/useConvertStore', () => ({
  useBusy: () => mocks.busy,
  useFiles: () => mocks.files,
  useConvertSelector: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      addFiles: vi.fn(),
      addFolder: vi.fn(),
      clearFiles: mocks.clearFiles,
      startConvert: mocks.startConvert,
    }),
}));

function clearButton() {
  return screen.getByRole('button', { name: /清空/ });
}

describe('ConvertToolbar', () => {
  beforeEach(() => {
    mocks.busy = false;
    mocks.files = [{ id: '1', outputPath: '' }];
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('enables Clear when idle with files', () => {
    render(<ConvertToolbar />);
    expect(clearButton().hasAttribute('disabled')).toBe(false);
  });

  it('disables Clear while busy', () => {
    mocks.busy = true;
    render(<ConvertToolbar />);
    expect(clearButton().hasAttribute('disabled')).toBe(true);
  });

  it('disables Clear while a start request is pending', async () => {
    let resolveStart!: () => void;
    mocks.startConvert.mockImplementation(
      () => new Promise<void>((resolve) => (resolveStart = resolve)),
    );
    render(<ConvertToolbar />);

    fireEvent.click(screen.getByRole('button', { name: /开始转换/ }));
    expect(clearButton().hasAttribute('disabled')).toBe(true);

    await act(async () => resolveStart());
    expect(clearButton().hasAttribute('disabled')).toBe(false);
  });
});
