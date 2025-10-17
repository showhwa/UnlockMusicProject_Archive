import { RiFileCopyLine } from 'react-icons/ri';
import { ExtLink } from '~/components/ExtLink';
import { FilePathBlock } from '~/components/FilePathBlock';
import { VQuote } from '~/components/HelpText/VQuote';
import { MacCommandKey } from '~/components/Key/MacCommandKey';
import { ShiftKey } from '~/components/Key/ShiftKey';
import { copyToClipboard } from '~/util/clipboard';

import {
  commandName as BLOCK_UPDATE_COMAND,
  tarName as BLOCK_UPDATE_TAR_NAME,
  tarball as BLOCK_UPDATE_BASE64,
} from './assets/qqmusic_v8.8.0_patch_update.command?&name=QQ 音乐 Mac v8.8.0 屏蔽更新.command&mac-command';
import { DownloadBase64 } from '~/components/DownloadBase64';
import { useContext } from 'react';
import { InSecretImportModalContext } from '~/context/InSecretImportModal';

const MAC_CLIENT_URL =
  'https://web.archive.org/web/20230903/https://dldir1.qq.com/music/clntupate/mac/QQMusicMac_Mgr.dmg';
const MAC_CLIENT_TG_URL = 'https://t.me/um_lsr_ch/21';
const DB_PATH =
  '~/Library/Containers/com.tencent.QQMusicMac/Data/Library/Application Support/QQMusicMac/mmkv/MMKVStreamEncryptId';

export function InstructionsMacV8() {
  const inSecretImportModal = useContext(InSecretImportModalContext);

  return (
    <>
      <p className="mt-4">获取 QQ 音乐 Mac 客户端 8.8.0:</p>
      <ul className="list-disc pl-6">
        <li>
          <ExtLink className="link-info" href={MAC_CLIENT_URL}>
            通过 <code>Archive.org</code> 缓存下载（慢）
          </ExtLink>
        </li>
        <li>
          <ExtLink className="link-info" href={MAC_CLIENT_TG_URL}>
            通过 Telegram 下载（需要账号）
          </ExtLink>
        </li>
      </ul>

      <p className="mt-4">
        部分用户可能会被强制要求更新。你可以下载
        <DownloadBase64 filename={BLOCK_UPDATE_TAR_NAME} data={BLOCK_UPDATE_BASE64}></DownloadBase64>
        并执行 <code>{BLOCK_UPDATE_COMAND}</code>。
        <span>其原理是修改 QQ 音乐的版本号，让其认为自己是最新版本，从而达到屏蔽更新的效果。</span>
      </p>
      <p>
        ※ 若是提示文件来自未知开发者，请右键点击该文件，选择菜单第一项
        <VQuote>打开</VQuote>，在警告窗口再次选择<VQuote>打开</VQuote>。
      </p>

      <p className="mt-4">密钥文件通常存储在下述路径：</p>
      <FilePathBlock>{DB_PATH}</FilePathBlock>

      <h4 className="font-bold text-lg mt-4">导入密钥</h4>
      <ol className="list-decimal pl-6">
        <li>
          <button className="btn btn-sm btn-outline btn-accent mr-2" onClick={() => copyToClipboard(DB_PATH)}>
            <RiFileCopyLine className="text-xl" />
            <span>复制</span>
          </button>
          <code>MMKVStreamEncryptId</code> 文件路径
        </li>
        <li>
          {inSecretImportModal ? (
            <p>
              点击上方的<VQuote>文件选择区域</VQuote>，打开<VQuote>文件选择框</VQuote>
            </p>
          ) : (
            <p>前往设定页面，提交该密钥文件。</p>
          )}
          <p>
            ※ 你可以在文件选择对话框按下
            <VQuote>
              <ShiftKey className="mx-1" />
              {'+'}
              <MacCommandKey className="mx-1" />
              {'+'}
              <kbd className="kbd mx-1">G</kbd>
            </VQuote>
            组合键打开<VQuote>路径输入框</VQuote>，粘贴文件路径并回车提交。
          </p>
        </li>
      </ol>
    </>
  );
}
