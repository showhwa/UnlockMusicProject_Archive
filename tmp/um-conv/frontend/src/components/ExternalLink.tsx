import type { MouseEvent, ReactNode } from 'react';
import { Link } from '@fluentui/react-components';
import { Browser } from '@wailsio/runtime';

export type ExternalLinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
};

export function ExternalLink({ href, className, children }: ExternalLinkProps) {
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    void Browser.OpenURL(href);
  };

  return (
    <Link href={href} className={className} onClick={open}>
      {children}
    </Link>
  );
}
