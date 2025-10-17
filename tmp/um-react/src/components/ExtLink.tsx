import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { FiExternalLink } from 'react-icons/fi';

export type ExtLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  icon?: ReactNode | true | false;
};

export function ExtLink({ className, icon = true, children, ...props }: ExtLinkProps) {
  return (
    <a rel="noreferrer noopener nofollow" target="_blank" className={`link ${className}`} {...props}>
      {children}
      {icon === true ? <FiExternalLink className="inline size-sm ml-1" /> : icon}
    </a>
  );
}
