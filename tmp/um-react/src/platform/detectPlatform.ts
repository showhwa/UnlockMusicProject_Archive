export type PlatformRuntime = 'browser' | 'tauri';

type TauriWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

/**
 * Detect whether the app is running inside a Tauri webview.
 * Checks `import.meta.env.TAURI_ENV_PLATFORM` (Tauri 2 Vite) and window globals.
 */
export function detectPlatformRuntime(): PlatformRuntime {
  const envPlatform = import.meta.env.TAURI_ENV_PLATFORM;
  if (typeof envPlatform === 'string' && envPlatform.length > 0) {
    return 'tauri';
  }

  if (typeof window === 'undefined') {
    return 'browser';
  }

  const w = window as TauriWindow;
  if (w.__TAURI_INTERNALS__ != null || w.__TAURI__ != null) {
    return 'tauri';
  }

  return 'browser';
}
