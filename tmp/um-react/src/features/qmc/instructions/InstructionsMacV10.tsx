import { ExtLink } from '~/components/ExtLink';

import {
  commandName as DUMP_COMMAND_NAME,
  tarName as DUMP_COMMAND_TARBALL_NAME,
  tarball as DUMP_COMMAND_BASE64,
} from './assets/qqmusic_v10.7_dump.command?&name=QQ 音乐 Mac v10 密钥提取.command&mac-command';
import { DownloadBase64 } from '~/components/DownloadBase64';
import { VQuote } from '~/components/HelpText/VQuote';
import { InSecretImportModalContext } from '~/context/InSecretImportModal';
import { useContext } from 'react';

const MAC_CLIENT_URL =
  'https://c.y.qq.com/cgi-bin/file_redirect.fcg?bid=dldir&file=ecosfile%2Fmusic_clntupate%2Fmac%2Fother%2FQQMusicMac10.7.1Build00.dmg&sign=1-0cb9ee4c40e7447e2113cfdee2dc11c88487b0e31fe37cfe1c59e12c20956dce-689e9373';
const MAC_CLIENT_TG_URL = 'https://t.me/um_lsr_ch/30';

export function InstructionsMacV10() {
  const inSecretImportModal = useContext(InSecretImportModalContext);
  return (
    <>
      <p className="mt-4">获取 QQ 音乐 Mac 客户端 10.7.1:</p>
      <ul className="list-disc pl-6">
        <li>
          <ExtLink className="link-info" href={MAC_CLIENT_URL}>
            通过 QQ 音乐官网下载（高速，但可能失效）
          </ExtLink>
        </li>
        <li>
          <ExtLink className="link-info" href={MAC_CLIENT_TG_URL}>
            通过 Telegram 下载（缓存，需要账号）
          </ExtLink>
        </li>
      </ul>

      <h4 className="font-bold text-lg mt-4">导入密钥</h4>
      <ol className="list-decimal pl-6">
        <li>
          下载 <DownloadBase64 data={DUMP_COMMAND_BASE64} filename={DUMP_COMMAND_TARBALL_NAME}></DownloadBase64>
          ，打开得到 <code>{DUMP_COMMAND_NAME}</code>。
        </li>
        <li>
          <p>
            双击 <code>{DUMP_COMMAND_NAME}</code> 执行。
          </p>
          <p>
            ※ 若是提示文件来自未知开发者，请右键点击该文件，选择菜单第一项
            <VQuote>打开</VQuote>，在警告窗口再次选择<VQuote>打开</VQuote>。
          </p>
        </li>
        <li>
          运行后会在脚本当前目录生成 <code>qqmusic-mac-*.mmkv</code> 文件，其中 <code>*</code> 是一串随机字符。
        </li>
        {inSecretImportModal ? (
          <li>
            上传刚生成的 <code>qqmusic-mac-*.mmkv</code> 文件到上方的<VQuote>文件选择区域</VQuote>。
          </li>
        ) : (
          <li>
            前往设定页面，提交生成的 <code>qqmusic-mac-*.mmkv</code> 文件。
          </li>
        )}
      </ol>
    </>
  );
}
