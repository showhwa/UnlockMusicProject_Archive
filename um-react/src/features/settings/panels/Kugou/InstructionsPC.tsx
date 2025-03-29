import { Code, Heading, ListItem, OrderedList, Text } from '@chakra-ui/react';
import { FilePathBlock } from '~/components/FilePathBlock.tsx';

export function InstructionsPC() {
  return (
    <>
      <Text>酷狗的 Windows 客户端使用 <abbr title="SQLite w/ SQLCipher">SQLite</abbr> 数据库储存密钥。</Text>
      <Text>该密钥文件通常存储在下述路径：</Text>
      <FilePathBlock>%APPDATA%\KuGou8\KGMusicV3.db</FilePathBlock>

      <Heading as="h3" size="md" mt="4">
        导入密钥
      </Heading>
      <OrderedList>
        <ListItem>
          <Text>
            选中并复制上述的 <Code>KGMusicV3.db</Code> 文件路径
          </Text>
        </ListItem>
        <ListItem>
          <Text>点击上方的「文件选择区域」，打开「文件选择框」</Text>
        </ListItem>
        <ListItem>
          <Text>
            在「文件名」输入框中粘贴之前复制的 <Code>KGMusicV3.db</Code> 文件路径
          </Text>
        </ListItem>
        <ListItem>
          <Text>按下「回车键」确认。</Text>
        </ListItem>
      </OrderedList>
    </>
  );
}
