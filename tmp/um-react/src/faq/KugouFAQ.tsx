import { Alert, AlertIcon, Container, Flex, List, ListItem, Text } from '@chakra-ui/react';
import { Header4 } from '~/components/HelpText/Headers';
import { SegmentKeyImportInstructions } from './SegmentKeyImportInstructions';
import { KugouAllInstructions } from '~/features/settings/panels/Kugou/KugouAllInstructions.tsx';

export function KugouFAQ() {
  return (
    <>
      <Header4>解锁失败</Header4>
      <List spacing={2}>
        <ListItem>
          <Text>
            酷狗现在对部分用户推送了 <code>kgg</code> 加密格式（安卓、Windows 客户端）。
          </Text>
          <Text>根据平台不同，你需要提取密钥数据库。</Text>

          <Container p={2}>
            <Alert status="warning" borderRadius={5}>
              <AlertIcon />
              <Flex flexDir="column">
                <Text>安卓用户提取密钥需要 root 权限，或注入文件提供器。</Text>
              </Flex>
            </Alert>
          </Container>

          <SegmentKeyImportInstructions tab="酷狗密钥" clientInstructions={<KugouAllInstructions />} />
        </ListItem>
      </List>
    </>
  );
}
