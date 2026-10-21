import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileInput } from '../FileInput';

test('receives multiple files from the file picker', async () => {
  const onReceiveFiles = vi.fn();
  const files = [new File(['first'], 'first.qmc3'), new File(['second'], 'second.mflac')];
  const { container } = render(<FileInput onReceiveFiles={onReceiveFiles}>Choose files</FileInput>);
  const input = container.querySelector('input');
  if (!input) throw new Error('File input is missing');

  await userEvent.upload(input, files);

  await waitFor(() => expect(onReceiveFiles).toHaveBeenCalledOnce());
  expect(onReceiveFiles.mock.calls[0][0]).toEqual(files);
});

test('receives multiple dropped files', async () => {
  const onReceiveFiles = vi.fn();
  const files = [new File(['first'], 'first.kgm'), new File(['second'], 'second.ncm')];
  render(<FileInput onReceiveFiles={onReceiveFiles}>Drop files</FileInput>);

  fireEvent.drop(screen.getByText('Drop files'), {
    dataTransfer: {
      files,
      items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
      types: ['Files'],
    },
  });

  await waitFor(() => expect(onReceiveFiles).toHaveBeenCalledOnce());
  expect(onReceiveFiles.mock.calls[0][0]).toEqual(files);
});
