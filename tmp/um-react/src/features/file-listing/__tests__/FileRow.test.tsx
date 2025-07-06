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
});
