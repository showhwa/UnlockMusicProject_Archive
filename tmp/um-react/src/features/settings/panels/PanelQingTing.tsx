import {
  Box,
  Code,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  ListItem,
  Text,
  UnorderedList,
} from '@chakra-ui/react';

import { useAppDispatch, useAppSelector } from '~/hooks';
import { ExtLink } from '~/components/ExtLink';
import { ChangeEvent, ClipboardEvent } from 'react';
import { VQuote } from '~/components/HelpText/VQuote';
import { selectStagingQtfmAndroidKey } from '../settingsSelector';
import { qtfmAndroidUpdateKey } from '../settingsSlice';
import { workerClientBus } from '~/decrypt-worker/client.ts';
import { GetQingTingFMDeviceKeyPayload } from '~/decrypt-worker/types.ts';
import { DECRYPTION_WORKER_ACTION_NAME } from '~/decrypt-worker/constants.ts';

const QTFM_DEVICE_ID_URL = 'https://github.com/parakeet-rs/qtfm-device-id/releases/latest';

export function PanelQingTing() {
  const dispatch = useAppDispatch();
  const secretKey = useAppSelector(selectStagingQtfmAndroidKey);
  const setSecretKey = (secretKey: string) => {
    dispatch(qtfmAndroidUpdateKey({ deviceKey: secretKey }));
  };

  const handleDataPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const plainText = e.clipboardData.getData('text/plain');
    const matchDeviceSecret = plainText.match(/^DEVICE_SECRET: ([0-9a-fA-F]+)/m);
    if (matchDeviceSecret) {
      e.preventDefault();
      setSecretKey(matchDeviceSecret[1]);
      return;
    }

    const dataMap = Object.create(null);
    for (const [, key, value] of plainText.matchAll(/^(PRODUCT|DEVICE|MANUFACTURER|BRAND|BOARD|MODEL): (.+)/gim)) {
      dataMap[key.toLowerCase()] = value;
    }
    const { product, device, manufacturer, brand, board, model } = dataMap;

    if (product && device && manufacturer && brand && board && model) {
      e.preventDefault();
      workerClientBus
        .request<string, GetQingTingFMDeviceKeyPayload>(
          DECRYPTION_WORKER_ACTION_NAME.QINGTING_FM_GET_DEVICE_KEY,
          dataMap,
        )
        .then(setSecretKey)
        .catch((err) => {
          alert(`生成设备密钥时发生错误: ${err}`);
        });
    }
  };

  const handleDataInput = (e: ChangeEvent<HTMLInputElement>) => {
    setSecretKey(e.target.value);
  };

  return (
    <Flex minH={0} flexDir="column" flex={1}>
      <Heading as="h2" size="lg">
        <VQuote>蜻蜓 FM</VQuote>
        设备密钥
      </Heading>

      <Text>
        <VQuote>蜻蜓 FM</VQuote>的安卓版本需要获取设备密钥，并以此来生成解密密钥。
      </Text>
      <Box mt={3} mb={3}>
        <FormControl>
          <FormLabel>设备密钥</FormLabel>
          <Input type="text" onPaste={handleDataPaste} value={secretKey} onChange={handleDataInput} />
          <FormHelperText>
            {'粘贴含有设备密钥的信息的内容时将自动提取密钥（如通过 '}
            <ExtLink href={QTFM_DEVICE_ID_URL}>
              <Code>qtfm-device-id</Code>
            </ExtLink>
            {' 获取的设备信息）。'}
          </FormHelperText>
        </FormControl>
      </Box>

      <Heading as="h3" size="md" pt={3} pb={2}>
        注意事项
      </Heading>
      <UnorderedList>
        <ListItem>
          <Text>
            下载的文件位于
            <Code>[内部储存]/Android/data/fm.qingting.qtradio/files/Music/</Code>
          </Text>

          <UnorderedList>
            <ListItem>
              <Text>
                你可能需要使用有
                <ruby>
                  特权
                  <rp> (</rp>
                  <rt>root</rt>
                  <rp>)</rp>
                </ruby>
                的文件浏览器访问。
              </Text>
            </ListItem>
          </UnorderedList>
        </ListItem>
        <ListItem>
          <Text>
            音频文件文件名为「<Code>.p~!</Code>」前缀。
          </Text>
        </ListItem>
        <ListItem>
          <Text>因为解密密钥与文件名相关，因此解密前请不要更改文件名。</Text>
        </ListItem>
      </UnorderedList>
    </Flex>
  );
}
