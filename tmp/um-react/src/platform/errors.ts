/**
 * Thrown when a provider method is declared or expected but not wired yet.
 * Distinct from {@link NotSupportedMethod} (platform does not support this call).
 */
export class NotImplementedError extends Error {
  readonly code = 'NOT_IMPLEMENTED' as const;

  constructor(
    readonly capability: string,
    message?: string,
  ) {
    super(message ?? `Capability not implemented: ${capability}`);
    this.name = 'NotImplementedError';
  }
}

/**
 * Thrown when `crypto.*` (or other init-gated APIs) is used before `provider.init()` completes.
 * Distinct from {@link NotImplementedError} (not wired) and {@link NotSupportedMethod} (unsupported).
 */
export class PlatformNotInitializedError extends Error {
  readonly code = 'NOT_INITIALIZED' as const;

  constructor(
    readonly capability: string,
    message?: string,
  ) {
    super(message ?? `Platform not initialized; call init() before using ${capability}`);
    this.name = 'PlatformNotInitializedError';
  }
}

/**
 * Thrown when the current platform explicitly does not support a method / mode
 * (e.g. Browser `keys.importNative`, or `saveMany(type)` when `type` ∉ `downloadTypes`).
 * Callers should use `instanceof` / `code` — never treat as a silent no-op.
 */
export class NotSupportedMethod extends Error {
  readonly code = 'NOT_SUPPORTED' as const;

  constructor(
    readonly capability: string,
    message?: string,
  ) {
    super(message ?? `Capability not supported: ${capability}`);
    this.name = 'NotSupportedMethod';
  }
}
