import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import { renderWithProviders, screen } from '~/test-utils/test-helper';
import { untouchedFile } from './__fixture__/file-list';
import { FileRow } from '../FileRow';
import { completedFile } from './__fixture__/file-list';

test('should render basic title (ready)', () => {
  renderWithProviders(<FileRow id="file://ready" file={untouchedFile} />);

  expect(screen.getAllByTestId('file-row')).toHaveLength(1);
  expect(screen.getByTestId('audio-meta-song-name')).toHaveTextContent('ready');
});

test('should render basic title (done)', () => {
  renderWithProviders(<FileRow id="file://done" file={completedFile} />);

  expect(screen.getAllByTestId('file-row')).toHaveLength(1);
  expect(screen.getByTestId('audio-download')).toBeInTheDocument();
});

test('hides single-file download when platform has no downloadTypes', () => {
  const platform = createBrowserProvider({
    crypto: {
      request: () => Promise.resolve(null as never),
      enqueueDecrypt: () => Promise.reject(new Error('unused')),
    },
    downloadTypes: [],
  });

  renderWithProviders(<FileRow id="file://done" file={completedFile} />, { platform });

  expect(screen.queryByTestId('audio-download')).not.toBeInTheDocument();
});
