import { createBrowserProvider } from './browser/BrowserProvider';
import { detectPlatformRuntime, type PlatformRuntime } from './detectPlatform';
import type { PlatformProvider } from './PlatformProvider';
import { createTauriProvider } from './tauri/TauriProvider';

export interface CreatePlatformProviderOptions {
  /** Override runtime detection (tests). Defaults to {@link detectPlatformRuntime}. */
  runtime?: PlatformRuntime;
}

/**
 * Resolve the active platform backend.
 * Defaults to Browser; switches to the Tauri stub when the Tauri runtime is detected
 * (or when `runtime: 'tauri'` is passed explicitly).
 */
export function createPlatformProvider(options: CreatePlatformProviderOptions = {}): PlatformProvider {
  const runtime = options.runtime ?? detectPlatformRuntime();
  if (runtime === 'tauri') {
    return createTauriProvider();
  }
  return createBrowserProvider();
}
