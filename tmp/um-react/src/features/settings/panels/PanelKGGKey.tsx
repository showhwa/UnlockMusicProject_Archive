import { useRef, useState } from 'react';
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
import { KeyListContainer } from '~/components/KeyListContainer';
import { toastImportResult } from '~/util/toastImportResult';

export function PanelKGGKey() {
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

    if (keys && keys.length > 0) {
      dispatch(kugouImportKeys(keys));
      setShowImportModal(false);
    }
    toastImportResult(file.name, keys);
  };

  const refKeyContainer = useRef<HTMLDivElement>(null);

  return (
    <div className="container flex flex-col grow min-h-0 w-full">
      <h2 className="text-2xl font-bold">酷狗解密密钥 (KGG / KGM v5)</h2>

      <p>酷狗已经升级了加密方式，现在最新版本的客户端使用 KGG / KGM v5 加密。</p>

      <h3 className="mt-2 text-xl font-bold">密钥管理</h3>
      <AddKey
        addKey={addKey}
        refContainer={refKeyContainer}
        importKeyFromFile={() => setShowImportModal(true)}
        clearKeys={clearAll}
      />

      <KeyListContainer ref={refKeyContainer} keys={kugouKeys}>
        {kugouKeys.map(({ id, audioHash, ekey }, i) => (
          <KugouEKeyItem key={id} id={id} ekey={ekey} audioHash={audioHash} i={i} />
        ))}
      </KeyListContainer>

      <ImportSecretModal
        clientName="酷狗音乐"
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleSecretImport}
      >
        <KugouAllInstructions />
      </ImportSecretModal>
    </div>
  );
}
