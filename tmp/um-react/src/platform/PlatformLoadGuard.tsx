import { use, type PropsWithChildren, type ReactNode } from 'react';

/**
 * Suspends children until `ready` fulfills (e.g. `provider.init()` + `setPlatform`).
 * Must be wrapped in `<Suspense fallback={...}>`.
 */
export function PlatformLoadGuard({ ready, children }: PropsWithChildren<{ ready: Promise<unknown> }>): ReactNode {
  use(ready);
  return children;
}
