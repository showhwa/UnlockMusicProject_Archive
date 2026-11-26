import { Children, isValidElement, type ReactNode } from 'react';
import {
  Dropdown as FluentDropdown,
  type DropdownProps as FluentDropdownProps,
} from '@fluentui/react-components';

export type DropdownProps = Omit<FluentDropdownProps, 'value' | 'selectedOptions'> & {
  /** Selected option key (`Option`'s `value`). Display text is resolved from children. */
  value?: string;
};

/** Prefer below; Fluent flips above when the viewport lacks space (unless `pinned`). */
const DEFAULT_POSITIONING = {
  position: 'below',
  align: 'start',
} as const;

function resolvePositioning(
  positioning: FluentDropdownProps['positioning'],
): NonNullable<FluentDropdownProps['positioning']> {
  if (typeof positioning === 'string') {
    return positioning;
  }
  return {
    ...DEFAULT_POSITIONING,
    ...positioning,
  };
}

type OptionLikeProps = {
  value?: string;
  text?: string;
  children?: ReactNode;
};

function resolveOptionText(children: ReactNode, value: string | undefined): string {
  if (!value) return '';

  let text = '';
  Children.forEach(children, (child) => {
    if (!isValidElement<OptionLikeProps>(child)) return;
    const optionValue = child.props.value;
    if (optionValue !== value) return;
    text =
      child.props.text ?? (typeof child.props.children === 'string' ? child.props.children : value);
  });
  return text || value;
}

export function Dropdown({ positioning, value, children, ...props }: DropdownProps) {
  const displayValue = resolveOptionText(children, value);
  return (
    <FluentDropdown
      {...props}
      positioning={resolvePositioning(positioning)}
      value={displayValue}
      selectedOptions={value ? [value] : []}
    >
      {children}
    </FluentDropdown>
  );
}
