import { createContext, useContext, type PropsWithChildren } from 'react';
import type { PlatformProvider } from './PlatformProvider';

const PlatformReactContext = createContext<PlatformProvider | null>(null);

export function PlatformProviderHost({
  provider,
  children,
}: PropsWithChildren<{ provider: PlatformProvider }>): React.JSX.Element {
  return <PlatformReactContext.Provider value={provider}>{children}</PlatformReactContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with context host
export function usePlatform(): PlatformProvider {
  const provider = useContext(PlatformReactContext);
  if (!provider) {
    throw new Error('usePlatform() must be used within PlatformProviderHost');
  }
  return provider;
}
