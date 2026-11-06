/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Present when bundled under Tauri 2 Vite (`TAURI_ENV_PLATFORM`). */
  readonly TAURI_ENV_PLATFORM?: string;
  readonly VITE_ENABLE_PERF_LOG?: string;
}

module 'virtual:pwa-register' {
  /**
   * See: {@link https://vite-pwa-org.netlify.app/guide/prompt-for-update.html}
   */
  declare function registerSW(_opts: unknown): () => void;
}

declare module '*?base64' {
  const content: string;
  export default content;
}

declare module '*&mac-command' {
  export const tarball: string;
  export const commandName: string;
  export const tarName: string;
}
