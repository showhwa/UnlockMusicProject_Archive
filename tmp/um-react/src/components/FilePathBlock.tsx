import type { ReactNode } from 'react';

export function FilePathBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap break-all">
      <code>{children}</code>
    </pre>
  );
}
