import type { MouseEventHandler, ReactElement, ReactNode } from 'react';
import {
  Button as FluentButton,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';

export type BtnVariant = 'primary' | 'secondary' | 'icon' | 'iconDanger';

export type ButtonProps = {
  variant?: BtnVariant;
  className?: string;
  children?: ReactNode;
  icon?: ReactElement;
  title?: string;
  'aria-label'?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

const useStyles = makeStyles({
  primary: {
    minWidth: '120px',
  },
  iconDanger: {
    color: tokens.colorPaletteRedForeground1,
    ':hover': {
      color: tokens.colorPaletteRedForeground1,
      backgroundColor: tokens.colorPaletteRedBackground1,
    },
  },
});

export function Button({
  variant = 'secondary',
  className,
  children,
  icon,
  ...props
}: ButtonProps) {
  const styles = useStyles();
  const iconOnly = variant === 'icon' || variant === 'iconDanger';

  return (
    <FluentButton
      as="button"
      type="button"
      appearance={variant === 'primary' ? 'primary' : iconOnly ? 'subtle' : 'secondary'}
      size={iconOnly ? 'small' : 'medium'}
      icon={icon}
      className={mergeClasses(
        variant === 'primary' && styles.primary,
        variant === 'iconDanger' && styles.iconDanger,
        className,
      )}
      {...props}
    >
      {iconOnly ? undefined : children}
    </FluentButton>
  );
}
