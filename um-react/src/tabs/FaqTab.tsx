import { FC, Fragment } from 'react';
import { Center, Container, Heading, Link, ListItem, UnorderedList } from '@chakra-ui/react';
import { Header3 } from '~/components/HelpText/Headers';
import { KuwoFAQ } from '~/faq/KuwoFAQ';
import { OtherFAQ } from '~/faq/OtherFAQ';
import { QQMusicFAQ } from '~/faq/QQMusicFAQ';
import { KugouFAQ } from '~/faq/KugouFAQ.tsx';

type FAQEntry = {
  id: string;
  title: string;
  Help: FC;
};

const faqEntries: FAQEntry[] = [
  { id: 'qqmusic', title: 'QQ 音乐', Help: QQMusicFAQ },
  { id: 'kuwo', title: '酷我音乐', Help: KuwoFAQ },
  { id: 'kugou', title: '酷狗音乐', Help: KugouFAQ },
  { id: 'other', title: '其它问题', Help: OtherFAQ },
];

export function FaqTab() {
  return (
    <Container pb={10} maxW="container.md">
      <Center>
        <Heading as="h2">常见问题解答</Heading>
      </Center>
      <Header3>答疑目录</Header3>
      <UnorderedList>
        {faqEntries.map(({ id, title }) => (
          <ListItem key={id}>
            <Link href={`#faq-${id}`}>{title}</Link>
          </ListItem>
        ))}
      </UnorderedList>
      {faqEntries.map(({ id, title, Help }) => (
        <Fragment key={id}>
          <Header3 id={`faq-${id}`}>{title}</Header3>
          <Help />
        </Fragment>
      ))}
    </Container>
  );
}
