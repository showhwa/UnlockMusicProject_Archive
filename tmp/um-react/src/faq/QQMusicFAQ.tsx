import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box } from '@chakra-ui/react';
import { Alert, AlertIcon, Container, Flex, ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { Header4 } from '~/components/HelpText/Headers';
import { SegmentTryOfficialPlayer } from './SegmentTryOfficialPlayer';
import { SegmentKeyImportInstructions } from './SegmentKeyImportInstructions';
import { ExtLink } from '~/components/ExtLink';
import { AndroidADBPullInstruction } from '~/components/AndroidADBPullInstruction/AndroidADBPullInstruction';
import { InstructionsIOS } from '~/features/settings/panels/QMCv2/InstructionsIOS';
import { InstructionsMac } from '~/features/settings/panels/QMCv2/InstructionsMac';

export function QQMusicFAQ() {
  return (
    <>
      <Header4>解锁失败</Header4>
      <SegmentTryOfficialPlayer />
      <Text>重复下载同一首的歌曲不重复扣下载配额，但是同一首歌的两个版本会重复扣下载配额，请仔细分辨。</Text>
      <Text>
        部分平台获取的加密文件未包含密钥。选择你<strong>下载文件时</strong>使用的客户端来查看说明。
      </Text>
      <Accordion allowToggle my={2}>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Windows
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Text>
              目前 Windows 客户端 19.51 或更低版本下载的歌曲文件无需密钥，其余平台的官方正式版本均需要提取密钥。
            </Text>
            <Text>你可以通过下方的链接获取 QQ 音乐 Windows 客户端 v19.51 的安装程序：</Text>
            <UnorderedList pl={3}>
              <ListItem>
                <Text>
                  <ExtLink href="https://dldir1v6.qq.com/music/clntupate/QQMusic_Setup_1951.exe">
                    <code>qq.com</code> 官方下载地址（推荐）
                  </ExtLink>
                </Text>
              </ListItem>
              <ListItem>
                <Text>
                  <ExtLink href="https://web.archive.org/web/2023/https://dldir1v6.qq.com/music/clntupate/QQMusic_Setup_1951.exe">
                    <code>Archive.org</code> 存档
                  </ExtLink>
                </Text>
              </ListItem>
            </UnorderedList>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                Mac
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Container p={2}>
              <Alert status="warning" borderRadius={5}>
                <AlertIcon />
                <Flex flexDir="column">
                  <Text>Mac 需要降级到 8.8.0 或以下版本。</Text>
                  <Text>
                    <ExtLink href="https://web.archive.org/web/20230903/https://dldir1.qq.com/music/clntupate/mac/QQMusicMac_Mgr.dmg">
                      <code>Archive.org</code> 存档
                    </ExtLink>
                  </Text>
                </Flex>
              </Alert>
            </Container>

            <SegmentKeyImportInstructions
              tab="QMCv2 密钥"
              keyInstructionText="查看密钥提取说明："
              clientInstructions={
                <Box p={2}>
                  <InstructionsMac />
                </Box>
              }
            />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                安卓 (Android)
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Container p={2}>
              <Alert status="warning" borderRadius={5}>
                <AlertIcon />
                <Flex flexDir="column">
                  <Text>安卓提取密钥需要 root 特权，建议用电脑操作。</Text>
                </Flex>
              </Alert>
            </Container>

            <Text>QQ 音乐官方版本需要提取密钥才能解密。</Text>
            <Text>
              你也可以尝试使用【QQ 音乐简洁版】或 OEM 定制版（如小米、魅族定制版）。简洁、定制版本目前不需要提取密钥。
            </Text>

            <SegmentKeyImportInstructions
              tab="QMCv2 密钥"
              keyInstructionText="查看密钥提取说明："
              clientInstructions={
                <Box p={2}>
                  <AndroidADBPullInstruction dir="/data/data/com.tencent.qqmusic/databases" file="player_process_db" />
                </Box>
              }
            />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                iOS (iPhone, iPad)
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Container p={2}>
              <Alert status="warning" borderRadius={5}>
                <AlertIcon />
                <Flex flexDir="column">
                  <Text>iOS 用户提取歌曲困难，建议换用电脑操作；</Text>
                </Flex>
              </Alert>
            </Container>

            <SegmentKeyImportInstructions
              tab="QMCv2 密钥"
              keyInstructionText="查看密钥提取说明："
              clientInstructions={
                <Box p={2}>
                  <InstructionsIOS />
                </Box>
              }
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
}
