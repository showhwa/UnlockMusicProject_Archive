import { Title2, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  title: {
    margin: 0,
  },
});

export function Header() {
  const styles = useStyles();

  return (
    <header className={styles.root}>
      <Title2 as="h1" className={styles.title}>
        音乐解锁 - 音频转换器
      </Title2>
    </header>
  );
}
