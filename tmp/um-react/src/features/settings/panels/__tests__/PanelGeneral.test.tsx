import userEvent from '@testing-library/user-event';
import { PanelGeneral } from '~/features/settings/panels/PanelGeneral';
import { BatchDownloadType } from '~/platform/capabilities';
import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import { renderWithProviders, screen } from '~/test-utils/test-helper';

const stubCrypto = {
  request: () => Promise.resolve(null as never),
  enqueueDecrypt: () => Promise.reject(new Error('unused')),
};

test('shows only capable batch-download options', () => {
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    downloadTypes: [BatchDownloadType.PackZip],
  });

  renderWithProviders(<PanelGeneral />, { platform });

  expect(screen.queryByLabelText(/使用选择目录批量下载/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/流式生成 ZIP/)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/生成单个 ZIP 并触发下载/)).toBeInTheDocument();
  expect(screen.getByLabelText(/生成单个 ZIP 并触发下载/)).not.toBeDisabled();
});

test('hides batch-download section when downloadTypes is empty', () => {
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    downloadTypes: [],
    directFsAccess: true,
  });

  renderWithProviders(<PanelGeneral />, { platform });

  expect(screen.queryByRole('heading', { name: '批量下载' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/使用选择目录批量下载/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/流式生成 ZIP/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/生成单个 ZIP 并触发下载/)).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '解密后自动保存' })).toBeInTheDocument();
});

test('hides DirectWrite section when directFsAccess is false', () => {
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    downloadTypes: [BatchDownloadType.PackZip],
    directFsAccess: false,
  });

  renderWithProviders(<PanelGeneral />, { platform });

  expect(screen.queryByRole('heading', { name: '解密后自动保存' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('保存位置')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('文件夹路径')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '选择文件夹' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/保存成功后删除加密文件/)).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '批量下载' })).toBeInTheDocument();
});

test('shows DirectWrite controls when directFsAccess is true', () => {
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    downloadTypes: [BatchDownloadType.PackZip],
    directFsAccess: true,
  });

  renderWithProviders(<PanelGeneral />, { platform });

  expect(screen.getByLabelText('保存位置')).not.toBeDisabled();
  // Path stays disabled until outputMode is fixedDirectory (default besideSource).
  expect(screen.getByLabelText('文件夹路径')).toBeDisabled();
  expect(screen.getByRole('button', { name: '选择文件夹' })).not.toBeDisabled();
  expect(screen.getByLabelText(/保存成功后删除加密文件/)).not.toBeDisabled();
});

test('pickDirectory button writes path into fixedDirectoryPath', async () => {
  const user = userEvent.setup();
  const pickDirectory = vi.fn().mockResolvedValue('/music/unlocked');
  const platform = createBrowserProvider({
    crypto: stubCrypto,
    downloadTypes: [BatchDownloadType.PackZip],
    directFsAccess: true,
    download: {
      saveOne: vi.fn(),
      saveMany: vi.fn(),
      pickDirectory,
    },
  });

  const { store } = renderWithProviders(<PanelGeneral />, { platform });

  await user.click(screen.getByRole('button', { name: '选择文件夹' }));

  expect(pickDirectory).toHaveBeenCalledOnce();
  expect(store.getState().settings.staging.general.directWrite).toEqual({
    outputMode: 'fixedDirectory',
    fixedDirectoryPath: '/music/unlocked',
    deleteSourceAfterDecrypt: false,
  });
  expect(screen.getByLabelText('文件夹路径')).toHaveValue('/music/unlocked');
});
