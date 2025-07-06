import React from 'react';

export interface RubyProps {
  caption: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Ruby(props: RubyProps) {
  const { caption, children, ...rest } = props;

  return (
    <ruby {...rest}>
      {children}
      <rp>(</rp>
      <rt>{caption}</rt>
      <rp>)</rp>
    </ruby>
  );
}
