import type { AnchorHTMLAttributes } from 'react';
import { FiExternalLink } from 'react-icons/fi';

export type ExtLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  icon?: boolean;
};

export function ExtLink({ className, icon = true, children, ...props }: ExtLinkProps) {
  return (
    <a rel="noreferrer noopener nofollow" target="_blank" className={`link ${className}`} {...props}>
      {children}
      {icon && <FiExternalLink className="inline size-sm ml-1" />}
    </a>
  );
}
