import type { ReactNode, RefObject } from 'react';

export interface KeyListContainerProps {
  keys: unknown[];
  children?: ReactNode;
  ref?: RefObject<HTMLDivElement | null>;
}

export function KeyListContainer({ keys, children, ref }: KeyListContainerProps) {
  const count = keys.length;
  return (
    <div ref={ref} className="flex grow min-h-0 pr-4 pt-3">
      {count > 0 && (
        <ul className="list bg-base-100 rounded-box shadow-sm border border-base-300 w-full min-h-0 overflow-auto">
          {children}
        </ul>
      )}
      {count === 0 && <p>还没有添加密钥。</p>}
    </div>
  );
}
