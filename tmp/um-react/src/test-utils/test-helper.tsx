import { RenderOptions, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import type { BrowserCrypto } from '~/platform/browser/browserCrypto';
import { PlatformProviderHost } from '~/platform/PlatformContext';
import type { PlatformProvider } from '~/platform/PlatformProvider';
import { setPlatform } from '~/platform/platformSingleton';
import { AppStore, RootState, setupStore } from '~/store';

// Adapted from: https://redux.js.org/usage/writing-tests

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';

/** Default test crypto: no dynamic import of decrypt-worker (avoids teardown races). */
const defaultTestCrypto: BrowserCrypto = {
  request: () => Promise.resolve(null as never),
  enqueueDecrypt: () => Promise.reject(new Error('default test crypto: enqueueDecrypt not configured')),
};

export interface ExtendedRenderOptions extends RenderOptions {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
  /** Override platform backend (defaults to BrowserProvider with stub crypto). */
  platform?: PlatformProvider;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    platform = createBrowserProvider({ crypto: defaultTestCrypto }),
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  // Publish singleton only after init (matches AppRoot). Stub crypto resolves immediately.
  void platform.init().then(() => {
    setPlatform(platform);
  });

  function Wrapper({ children }: PropsWithChildren<unknown>): React.JSX.Element {
    return (
      <Provider store={store}>
        <PlatformProviderHost provider={platform}>{children}</PlatformProviderHost>
      </Provider>
    );
  }

  return { store, platform, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
