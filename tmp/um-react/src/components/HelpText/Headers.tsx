import React from 'react';
import { HeaderAnchor } from './HeaderAnchor';

export interface HeaderProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const commonHeaderClasses = 'relative flex items-center pt-3 pb-1 font-bold';

export function Header2({ children, className, id }: HeaderProps) {
  return (
    <h2 id={id} className={`${commonHeaderClasses} text-3xl border-b border-base-300 ${className}`}>
      {id && <HeaderAnchor id={id} />}
      {children}
    </h2>
  );
}
export function Header3({ children, className, id }: HeaderProps) {
  return (
    <h3 id={id} className={`${commonHeaderClasses} text-2xl border-b border-base-300 ${className}`}>
      {id && <HeaderAnchor id={id} />}
      {children}
    </h3>
  );
}

export function Header4({ children, className, id }: HeaderProps) {
  return (
    <h4 id={id} className={`${commonHeaderClasses} text-xl ${className}`}>
      {id && <HeaderAnchor id={id} />}
      {children}
    </h4>
  );
}

export function Header5({ children, className, id }: HeaderProps) {
  return (
    <h5 id={id} className={`${commonHeaderClasses} text-lg ${className}`}>
      {id && <HeaderAnchor id={id} />}
      {children}
    </h5>
  );
}
