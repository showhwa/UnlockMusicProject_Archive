import classNames from 'classnames';
import type { RefAttributes } from 'react';
import { NavLink, type NavLinkProps } from 'react-router';

const tabClassNames = ({ isActive }: { isActive: boolean }) =>
  classNames(
    'link inline-flex text-nowrap mb-[-2px] no-underline w-full',
    'border-b-2 md:border-b-0 md:border-r-2',
    'tab md:grow',
    {
      'tab-active bg-accent/10 border-accent': isActive,
    },
  );

export function TabNavLink({ children, ...props }: NavLinkProps & RefAttributes<HTMLAnchorElement>) {
  return (
    <NavLink className={tabClassNames} role="tab" {...props}>
      {children}
    </NavLink>
  );
}
