/// <reference types="vite/client" />

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
