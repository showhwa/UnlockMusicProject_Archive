import { Box, Flex, Heading, List, Text, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ImportSecretModal } from '~/components/ImportSecretModal';

import { kugouAddKey, kugouClearKeys, kugouImportKeys } from '../settingsSlice';
import { selectStagingKugouV5Keys } from '../settingsSelector';
import type { StagingKugouKey } from '../keyFormats';
import { AddKey } from '~/components/AddKey.tsx';
import { KugouEKeyItem } from '~/features/settings/panels/Kugou/KugouEKeyItem.tsx';
import { KugouAllInstructions } from '~/features/settings/panels/Kugou/KugouAllInstructions.tsx';
import { parseAndroidKugouMMKV } from '~/util/mmkv/kugou.ts';
import { DatabaseKeyExtractor } from '~/util/DatabaseKeyExtractor.ts';

export function PanelKGGKey() {
  const toast = useToast();
  const dispatch = useDispatch();
  const kugouKeys = useSelector(selectStagingKugouV5Keys);
  const [showImportModal, setShowImportModal] = useState(false);

  const addKey = () => dispatch(kugouAddKey());
  const clearAll = () => dispatch(kugouClearKeys());
  const handleSecretImport = async (file: File) => {
    let keys: Omit<StagingKugouKey, 'id'>[] | null = null;
    if (/mggkey_multi_process/i.test(file.name)) {
      keys = parseAndroidKugouMMKV(new DataView(await file.arrayBuffer()));
    } else if (/^KGMusicV3\.db$/.test(file.name)) {
      const extractor = await DatabaseKeyExtractor.getInstance();
      keys = extractor.extractKugouKeyFromEncryptedDb(await file.arrayBuffer());
    }

    if (keys?.length === 0) {
      toast({
        title: '未导入密钥',
        description: '选择的密钥数据库文件未发现任何可用的密钥。',
        isClosable: true,
        status: 'warning',
      });
    } else if (keys) {
      dispatch(kugouImportKeys(keys));
      setShowImportModal(false);
      toast({
        title: `导入完成，共导入了 ${keys.length} 个密钥。`,
        description: '记得按下「保存」来应用。',
        isClosable: true,
        status: 'success',
      });
    } else {
      toast({
        title: `不支持的文件：${file.name}`,
        isClosable: true,
        status: 'error',
      });
    }
  };

  return (
    <Flex minH={0} flexDir="column" flex={1}>
      <Heading as="h2" size="lg">
        酷狗解密密钥 (KGG / KGM v5)
      </Heading>

      <Text>酷狗已经升级了加密方式，现在使用 KGG / KGM v5 加密。</Text>

      <AddKey addKey={addKey} importKeyFromFile={() => setShowImportModal(true)} clearKeys={clearAll} />

      <Box flex={1} minH={0} overflow="auto" pr="4">
        <List spacing={3}>
          {kugouKeys.map(({ id, audioHash, ekey }, i) => (
            <KugouEKeyItem key={id} id={id} ekey={ekey} audioHash={audioHash} i={i} />
          ))}
        </List>
        {kugouKeys.length === 0 && <Text>还没有添加密钥。</Text>}
      </Box>

      <ImportSecretModal
        clientName="酷狗音乐"
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleSecretImport}
      >
        <KugouAllInstructions />
      </ImportSecretModal>
    </Flex>
  );
}
