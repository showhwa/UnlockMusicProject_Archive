import { Suspense } from 'react';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';

import { AppLayout } from '~/components/AppLayout';
import { persistSettings } from '~/features/settings/persistSettings';
import { createPlatformProvider } from '~/platform/createPlatformProvider';
import { PlatformLoadGuard } from '~/platform/PlatformLoadGuard';
import { PlatformProviderHost } from '~/platform/PlatformContext';
import { setPlatform } from '~/platform/platformSingleton';
import { setupStore } from '~/store';

// Private to this file only.
const store = setupStore();
const platform = createPlatformProvider();

const platformReady = platform.init().then(() => {
  setPlatform(platform);
  persistSettings(store, platform);
});

function AppBootFallback() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-0" role="status" aria-live="polite">
      <span className="loading loading-spinner loading-lg text-primary" />
      <span className="sr-only">加载中</span>
    </div>
  );
}

export function AppRoot() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Provider store={store}>
        <PlatformProviderHost provider={platform}>
          <Suspense fallback={<AppBootFallback />}>
            <PlatformLoadGuard ready={platformReady}>
              <AppLayout />
            </PlatformLoadGuard>
          </Suspense>
        </PlatformProviderHost>
      </Provider>
    </BrowserRouter>
  );
}
