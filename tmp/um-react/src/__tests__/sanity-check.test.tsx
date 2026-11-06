import { act, renderWithProviders, screen } from '~/test-utils/test-helper';
import { AppRoot } from '~/components/AppRoot';

// Must match the dynamic import specifier used by browserCrypto (`~/decrypt-worker/client`).
// Plain functions: vitest `mockReset` clears vi.fn mockResolvedValue between tests.
vi.mock('~/decrypt-worker/client', () => {
  return {
    workerClientBus: {
      request: () => Promise.resolve('dummy'),
    },
    decryptionQueue: {
      add: () => Promise.resolve({ decrypted: 'blob://dummy', ext: 'flac' }),
    },
  };
});

test('should be able to render App', async () => {
  await act(async () => {
    renderWithProviders(<AppRoot />);
    // Flush Suspense retry after platform.init() (dynamic import) settles.
    await Promise.resolve();
  });

  // Platform Suspense gate + SDK version fetch
  expect(await screen.findByTestId('sdk-version')).toBeInTheDocument();

  // Quick sanity check of known strings.
  expect(screen.getByText(/音乐解锁/i)).toBeInTheDocument();
  expect(screen.getByText(/Unlock Music/i)).toBeInTheDocument();
  expect(screen.getByText(/MIT/i)).toBeInTheDocument();
});
