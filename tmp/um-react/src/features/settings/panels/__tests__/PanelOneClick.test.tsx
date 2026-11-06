import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'react-toastify';
import { AndroidImportType, BatchDownloadType, NativeImportType } from '~/platform/capabilities';
import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import type { NativeImportResult } from '~/platform/types';
import { renderWithProviders, screen, waitFor } from '~/test-utils/test-helper';
import { PanelOneClick } from '../PanelOneClick';
import { Settings } from '~/features/settings/Settings';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

const stubCrypto = {
  request: () => Promise.resolve(null as never),
  enqueueDecrypt: () => Promise.reject(new Error('unused')),
};

function renderPanel(platform = createBrowserProvider({ crypto: stubCrypto })) {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/settings/one-click']}>
      <Routes>
        <Route path="/settings/one-click" element={<PanelOneClick />} />
        <Route path="/settings/general" element={<div>通用设置页</div>} />
      </Routes>
    </MemoryRouter>,
    { platform },
  );
}

test('redirects to general when platform has no one-click capability', async () => {
  renderPanel();
  expect(await screen.findByText('通用设置页')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '一键导入' })).not.toBeInTheDocument();
});

test('renders native checkboxes, commits production, and reports import count', async () => {
  const user = userEvent.setup();
  const importNative = vi.fn().mockImplementation((targets: readonly NativeImportType[]) => {
    const result: NativeImportResult = {};
    if (targets.includes(NativeImportType.QQMusic)) {
      result.qmc2 = [{ name: 'a.mflac', ekey: 'ekey-1' }];
    }
    if (targets.includes(NativeImportType.Kugou)) {
      result.kugou = [{ audioHash: 'hash-1', ekey: 'ekey-2' }];
    }
    if (targets.includes(NativeImportType.QingTing)) {
      result.qtfm = { android: 'deadbeef' };
    }
    return Promise.resolve(result);
  });
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    downloadTypes: [BatchDownloadType.PackZip],
    nativeKeyAccess: [NativeImportType.QQMusic, NativeImportType.Kugou, NativeImportType.QingTing],
    keys: {
      importNative,
      importAndroidAdb: vi.fn(),
    },
  });

  const { store } = renderPanel(platform);

  expect(screen.getByRole('heading', { name: '一键导入' })).toBeInTheDocument();
  expect(screen.getByLabelText('QQ 音乐')).toBeChecked();
  expect(screen.getByLabelText('酷狗音乐')).toBeChecked();
  expect(screen.getByLabelText('蜻蜓 FM')).toBeChecked();
  expect(screen.queryByRole('button', { name: '从 ADB 导入' })).not.toBeInTheDocument();

  await user.click(screen.getByLabelText('酷狗音乐'));
  await user.click(screen.getByRole('button', { name: '开始导入' }));

  await waitFor(() => {
    expect(importNative).toHaveBeenCalledWith([NativeImportType.QQMusic, NativeImportType.QingTing]);
  });

  await waitFor(() => {
    expect(store.getState().settings.production.qmc2.keys).toMatchObject({ 'a.mflac': 'ekey-1' });
  });
  expect(store.getState().settings.production.kugou.keys).toEqual({});
  expect(store.getState().settings.production.qtfm.android).toBe('deadbeef');
  expect(store.getState().settings.dirty).toBe(false);
  expect(toast.success).toHaveBeenCalledWith('成功导入 2 项密钥');
});

test('shows ADB block, auto-saves importAndroidAdb result', async () => {
  const user = userEvent.setup();
  const importAndroidAdb = vi.fn().mockResolvedValue({
    kwm2: [{ rid: '1', quality: '2000', ekey: 'k' }],
  } satisfies NativeImportResult);
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    androidKeyAccess: AndroidImportType.Adb,
    nativeKeyAccess: [NativeImportType.Kuwo],
    keys: {
      importNative: vi.fn(),
      importAndroidAdb,
    },
  });

  const { store } = renderPanel(platform);

  expect(screen.getByRole('button', { name: '从 ADB 导入' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '从 ADB 导入' }));

  await waitFor(() => {
    expect(importAndroidAdb).toHaveBeenCalledWith({ targets: [NativeImportType.Kuwo] });
  });
  await waitFor(() => {
    expect(store.getState().settings.production.kwm2.keys).toMatchObject({ '1-2000': 'k' });
  });
  expect(store.getState().settings.dirty).toBe(false);
  expect(toast.success).toHaveBeenCalledWith('成功导入 1 项密钥');
});

test('settings sidebar omits 一键导入 without capability and includes it when capable', () => {
  const without = createBrowserProvider({ crypto: stubCrypto });
  const { unmount } = renderWithProviders(
    <MemoryRouter initialEntries={['/settings/general']}>
      <Routes>
        <Route path="/settings" element={<Settings />}>
          <Route path="general" element={<div />} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { platform: without },
  );

  expect(screen.queryByRole('tab', { name: '一键导入' })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '通用设置' })).toBeInTheDocument();
  unmount();

  const withNative = createBrowserProvider({
    crypto: stubCrypto,
    nativeKeyAccess: [NativeImportType.QQMusic],
  });
  renderWithProviders(
    <MemoryRouter initialEntries={['/settings/general']}>
      <Routes>
        <Route path="/settings" element={<Settings />}>
          <Route path="general" element={<div />} />
          <Route path="one-click" element={<div />} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { platform: withNative },
  );

  expect(screen.getByRole('tab', { name: '一键导入' })).toBeInTheDocument();
});
