// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { CancellablePromise } from '@wailsio/runtime';
import { afterEach, describe, expect, it } from 'vitest';
import { AppSnapshot, ConvertService, JobState } from '~service/convert';
import { SettingsService } from '~service/settings';
import { ConvertProvider } from '@/hooks/useConvertStore';
import '@/i18n';
import { createConvertStore, type ConvertApi } from '@/lib/convertStore';
import { ProgressPanel } from './ProgressPanel';

function renderPanel(job: JobState, apiOverrides: Partial<ConvertApi> = {}) {
  const store = createConvertStore({
    ...ConvertService,
    ...SettingsService,
    GetState: () => CancellablePromise.resolve(new AppSnapshot({ job })),
    ...apiOverrides,
  });
  const view = render(
    <ConvertProvider store={store}>
      <ProgressPanel />
    </ConvertProvider>,
  );
  return { store, ...view };
}

function getPanelParts(container: HTMLElement, statusText: string, messageText: string) {
  const status = screen.getByText(statusText);
  const message = screen.getByText(messageText);
  const bar = container.querySelector<HTMLElement>('.fui-ProgressBar__bar');
  expect(bar).toBeTruthy();
  return { status, message, bar: bar! };
}

function appliedCss(element: HTMLElement): string {
  const classes = new Set(Array.from(element.classList));
  const matched: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText.startsWith('.') &&
        classes.has(rule.selectorText.slice(1))
      ) {
        matched.push(rule.cssText);
      }
    }
  }
  return matched.join('\n');
}

describe('ProgressPanel', () => {
  afterEach(() => cleanup());

  it('labels cancelled without error styling while error applies error styling', async () => {
    const cancelledView = renderPanel(
      new JobState({ status: 'cancelled', message: '转换已取消', percent: 50 }),
    );
    await waitFor(() => expect(screen.getByText('已取消')).toBeTruthy());
    expect(screen.getByText('50%')).toBeTruthy();
    const cancelled = getPanelParts(cancelledView.container, '已取消', '转换已取消');
    const cancelledClasses = {
      status: cancelled.status.className,
      message: cancelled.message.className,
      bar: cancelled.bar.className,
    };
    expect(appliedCss(cancelled.status)).toContain('colorPaletteDarkOrangeForeground1');
    expect(appliedCss(cancelled.status)).not.toContain('colorPaletteRedForeground1');
    expect(appliedCss(cancelled.message)).not.toContain('colorPaletteRedForeground1');
    expect(appliedCss(cancelled.bar)).toContain('colorPaletteDarkOrangeBackground3');
    expect(appliedCss(cancelled.bar)).not.toContain('colorPaletteRedBackground3');

    cleanup();

    const errorView = renderPanel(new JobState({ status: 'error', message: '失败', percent: 100 }));
    await waitFor(() => expect(screen.getByText('错误')).toBeTruthy());
    const error = getPanelParts(errorView.container, '错误', '失败');
    expect(error.status.className).not.toBe(cancelledClasses.status);
    expect(error.message.className).not.toBe(cancelledClasses.message);
    expect(error.bar.className).not.toBe(cancelledClasses.bar);
    expect(appliedCss(error.status)).toContain('colorPaletteRedForeground1');
    expect(appliedCss(error.message)).toContain('colorPaletteRedForeground1');
    expect(appliedCss(error.bar)).toContain('colorPaletteRedBackground3');
  });

  it('labels running state with non-error styling', async () => {
    const { container } = renderPanel(
      new JobState({
        status: 'running',
        message: '已处理 1/2 个文件，成功 1，跳过 0，错误 0',
        percent: 40,
      }),
    );
    await waitFor(() => expect(screen.getByText('转换中')).toBeTruthy());
    expect(screen.getByText('40%')).toBeTruthy();
    const running = getPanelParts(container, '转换中', '已处理 1/2 个文件，成功 1，跳过 0，错误 0');
    expect(appliedCss(running.status)).toContain('colorBrandForeground1');
    expect(appliedCss(running.message)).not.toContain('colorPaletteRedForeground1');
    expect(appliedCss(running.bar)).toContain('colorCompoundBrandBackground');
    expect(appliedCss(running.bar)).not.toContain('colorPaletteRedBackground3');
  });

  it('renders commandError as error even when job status is cancelled', async () => {
    const { store, container } = renderPanel(
      new JobState({ status: 'cancelled', message: '转换已取消', percent: 50 }),
      {
        StartConvert: () => CancellablePromise.reject(new Error('启动失败')),
      },
    );
    await waitFor(() => expect(screen.getByText('已取消')).toBeTruthy());

    await act(async () => {
      await store.getState().startConvert();
    });

    await waitFor(() => expect(screen.getByText('错误')).toBeTruthy());
    expect(screen.queryByText('已取消')).toBeNull();
    const overridden = getPanelParts(container, '错误', 'Error: 启动失败');
    expect(appliedCss(overridden.status)).toContain('colorPaletteRedForeground1');
    expect(appliedCss(overridden.message)).toContain('colorPaletteRedForeground1');
    expect(appliedCss(overridden.bar)).toContain('colorPaletteRedBackground3');
  });
});
