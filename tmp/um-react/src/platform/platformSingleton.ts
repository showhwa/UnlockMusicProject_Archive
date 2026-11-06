import type { PlatformProvider } from './PlatformProvider';

/** Non-React callers (thunks / modules) after AppRoot finishes `init()` and publishes the singleton. */
let platformSingleton: PlatformProvider | null = null;

export function setPlatform(provider: PlatformProvider): void {
  platformSingleton = provider;
}

export function getPlatform(): PlatformProvider {
  if (!platformSingleton) {
    throw new Error('Platform provider is not ready. Call setPlatform() after provider.init() completes.');
  }
  return platformSingleton;
}
