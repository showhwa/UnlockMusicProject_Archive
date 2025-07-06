import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ImportSecretModal } from '~/components/ImportSecretModal';
import { parseAndroidKuwoEKey, parseIosKuwoEKey } from '~/util/mmkv/kuwo';

import { kwm2AddKey, kwm2ClearKeys, kwm2ImportKeys } from '../settingsSlice';
import { selectStagingKWMv2Keys } from '../settingsSelector';
import { KWMv2EKeyItem } from './KWMv2/KWMv2EKeyItem';
import type { StagingKWMv2Key } from '../keyFormats';
import { KWMv2AllInstructions } from './KWMv2/KWMv2AllInstructions';
import { AddKey } from '~/components/AddKey';
import { KeyListContainer } from '~/components/KeyListContainer';
import { toastImportResult } from '~/util/toastImportResult';

export function PanelKWMv2Key() {
  const dispatch = useDispatch();
  const kwm2Keys = useSelector(selectStagingKWMv2Keys);
  const [showImportModal, setShowImportModal] = useState(false);

  const addKey = () => dispatch(kwm2AddKey());
  const clearAll = () => dispatch(kwm2ClearKeys());
  const handleSecretImport = async (file: File) => {
    let keys: Omit<StagingKWMv2Key, 'id'>[] | null = null;
    if (/cn\.kuwo\.player\.mmkv/i.test(file.name)) {
      keys = parseAndroidKuwoEKey(new DataView(await file.arrayBuffer()));
    } else if (/kw_ekey/.test(file.name)) {
      keys = parseIosKuwoEKey(new DataView(await file.arrayBuffer()));
    }

    if (keys && keys.length > 0) {
      dispatch(kwm2ImportKeys(keys));
      setShowImportModal(false);
    }
    toastImportResult(file.name, keys);
  };

  const refKeyContainer = useRef<HTMLDivElement>(null);
  return (
    <div className="container flex flex-col grow min-h-0 w-full">
      <h2 className="text-2xl font-bold">酷我解密密钥（KwmV2）</h2>
      <p>
        酷我安卓版本的「臻品音质」已经换用 V2 版，表现为加密文件的后缀名为 <code>mflac</code> 或 <code>mgg</code>。
      </p>
      <p>该格式需要提取密钥后才能正常解密。</p>

      <h3 className="mt-2 text-xl font-bold">密钥管理</h3>
      <AddKey
        addKey={addKey}
        refContainer={refKeyContainer}
        importKeyFromFile={() => setShowImportModal(true)}
        clearKeys={clearAll}
      />

      <KeyListContainer ref={refKeyContainer} keys={kwm2Keys}>
        {kwm2Keys.map(({ id, ekey, quality, rid }, i) => (
          <KWMv2EKeyItem key={id} id={id} ekey={ekey} quality={quality} rid={rid} i={i} />
        ))}
      </KeyListContainer>

      <ImportSecretModal
        clientName="酷我音乐"
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleSecretImport}
      >
        <KWMv2AllInstructions />
      </ImportSecretModal>
    </div>
  );
}
