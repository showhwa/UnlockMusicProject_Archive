import { makeStyles, tokens } from '@fluentui/react-components';

export type DropdownOptionLabelProps = {
  text: string;
  hint: string;
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  text: {
    flexShrink: 0,
  },
  hint: {
    marginLeft: 'auto',
    minWidth: 0,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    textAlign: 'right',
  },
});

export function DropdownOptionLabel({ text, hint }: DropdownOptionLabelProps) {
  const styles = useStyles();
  return (
    <span className={styles.root}>
      <span className={styles.text}>{text}</span>
      <span className={styles.hint}>{hint}</span>
    </span>
  );
}
