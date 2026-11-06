import { DownloadAll } from '~/components/DownloadAll';
import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import { renderWithProviders, screen } from '~/test-utils/test-helper';

test('hides download-all control when platform has no downloadTypes', () => {
  const platform = createBrowserProvider({
    crypto: {
      request: () => Promise.resolve(null as never),
      enqueueDecrypt: () => Promise.reject(new Error('unused')),
    },
    downloadTypes: [],
  });

  renderWithProviders(<DownloadAll />, { platform });

  expect(screen.queryByTitle('下载全部')).not.toBeInTheDocument();
  expect(document.getElementById('downloadAll')).toBeNull();
});

test('renders download-all control when PackZip is available', () => {
  renderWithProviders(<DownloadAll />);

  expect(screen.getByTitle('下载全部')).toBeInTheDocument();
  expect(document.getElementById('downloadAll')).not.toBeNull();
});
