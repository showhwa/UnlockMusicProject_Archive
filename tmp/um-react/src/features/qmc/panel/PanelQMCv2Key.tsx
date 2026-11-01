import { useDispatch, useSelector } from 'react-redux';
import { qmc2AddKey, qmc2AllowFuzzyNameSearch, qmc2ClearKeys, qmc2ImportKeys } from '~/features/settings/settingsSlice';
import { selectStagingQMCv2Settings } from '~/features/qmc/keyLookup';
import React, { useRef, useState } from 'react';
import { QMCv2EKeyItem } from './QMCv2EKeyItem';
import { ImportSecretModal } from '~/components/ImportSecretModal';
import { importQMCv2KeysFromFile } from '~/features/qmc/importKeys';
import { QMCv2QQMusicAllInstructions } from '~/features/qmc/instructions/QMCv2QQMusicAllInstructions';
import { QMCv2DoubanAllInstructions } from '~/features/qmc/instructions/QMCv2DoubanAllInstructions';
import { AddKey } from '~/components/AddKey';
import { InfoModal } from '~/components/InfoModal.tsx';
import { Ruby } from '~/components/Ruby.tsx';
import { ExtLink } from '~/components/ExtLink.tsx';
import { KeyListContainer } from '~/components/KeyListContainer';
import { toastImportResult } from '~/util/toastImportResult';

export function PanelQMCv2Key() {
  const dispatch = useDispatch();
  const { keys: qmc2Keys, allowFuzzyNameSearch } = useSelector(selectStagingQMCv2Settings);
  const [showImportModal, setShowImportModal] = useState(false);
  const [secretType, setSecretType] = useState<'qm' | 'douban'>('qm');

  const addKey = () => dispatch(qmc2AddKey());
  const clearAll = () => dispatch(qmc2ClearKeys());

  const handleAllowFuzzyNameSearchCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(qmc2AllowFuzzyNameSearch({ enable: e.target.checked }));
  };

  const handleSecretImport = async (file: File) => {
    try {
      const keys = await importQMCv2KeysFromFile(file);

      if (keys && keys.length > 0) {
        dispatch(qmc2ImportKeys(keys));
        setShowImportModal(false);
      }

      toastImportResult(file.name, keys);
    } catch (e) {
      console.error('error during import: ', e);
      alert(`导入数据库时发生错误：${e as Error}`);
    }
  };

  const refKeyContainer = useRef<HTMLDivElement>(null);

  return (
    <>
      <h2 className="text-2xl font-bold">QMCv2 解密密钥</h2>

      <p>QQ 音乐、豆瓣 FM 目前采用的加密方案（QMCv2）。</p>
      <p>「QQ 音乐」安卓、Mac 或 iOS 客户端，或「豆瓣 FM」安卓客户端会将密钥存储在外部的数据库文件内。</p>

      <div className="flex flex-row gap-2 items-center my-2">
        <label className="label">
          <input
            className="checkbox"
            type="checkbox"
            checked={allowFuzzyNameSearch}
            onChange={handleAllowFuzzyNameSearchCheckbox}
          />
          允许匹配相似文件名
        </label>
        <InfoModal
          title="莱文斯坦距离"
          description={
            <div>
              <p>若文件名匹配失败，则使用相似文件名的密钥。</p>
              <p>
                该匹配使用「
                <ExtLink href="https://zh.wikipedia.org/zh-cn/%E8%90%8A%E6%96%87%E6%96%AF%E5%9D%A6%E8%B7%9D%E9%9B%A2">
                  <Ruby caption="Levenshtein distance">莱文斯坦距离</Ruby>
                </ExtLink>
                」算法来计算文件名的相似程度。
              </p>
              <p>若密钥数量过多，匹配时可能会造成浏览器卡顿或无响应一段时间。</p>
              <p>若不确定，请勾选该项。</p>
            </div>
          }
        >
          这是什么?
        </InfoModal>
      </div>

      <h3 className="mt-2 text-xl font-bold">密钥管理</h3>
      <AddKey
        addKey={addKey}
        refContainer={refKeyContainer}
        importKeyFromFile={() => setShowImportModal(true)}
        clearKeys={clearAll}
      />

      <KeyListContainer ref={refKeyContainer} keys={qmc2Keys}>
        {qmc2Keys.map(({ id, ekey, name }, i) => (
          <QMCv2EKeyItem key={id} id={id} ekey={ekey} name={name} i={i} />
        ))}
      </KeyListContainer>

      <ImportSecretModal
        clientName={
          <select
            value={secretType}
            onChange={(e) => setSecretType(e.target.value as 'qm' | 'douban')}
            className="inline mx-1 px-1 border-b border-accent/50 bg-base-100"
          >
            <option value="qm">QQ 音乐</option>
            <option value="douban">豆瓣 FM</option>
          </select>
        }
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleSecretImport}
      >
        {secretType === 'qm' && <QMCv2QQMusicAllInstructions />}
        {secretType === 'douban' && <QMCv2DoubanAllInstructions />}
      </ImportSecretModal>
    </>
  );
}
