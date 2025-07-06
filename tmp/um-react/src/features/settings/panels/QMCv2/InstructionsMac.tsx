import { RiFileCopyLine } from 'react-icons/ri';
import { toast } from 'react-toastify';
import { ExtLink } from '~/components/ExtLink';
import { FilePathBlock } from '~/components/FilePathBlock';
import { VQuote } from '~/components/HelpText/VQuote';
import { MacCommandKey } from '~/components/Key/MacCommandKey';
import { ShiftKey } from '~/components/Key/ShiftKey';

const MAC_CLIENT_URL =
  'https://web.archive.org/web/20230903/https://dldir1.qq.com/music/clntupate/mac/QQMusicMac_Mgr.dmg';
const MAC_CLIENT_TG_URL = 'https://t.me/um_lsr_ch/21';
const DB_PATH =
  '~/Library/Containers/com.tencent.QQMusicMac/Data/Library/Application Support/QQMusicMac/mmkv/MMKVStreamEncryptId';

export function InstructionsMac() {
  const copyDbPathToClipboard = () => {
    navigator.clipboard
      .writeText(DB_PATH)
      .then(() => {
        toast.success('已复制到剪贴板');
      })
      .catch((err) => {
        toast.error(`复制失败，请手动复制\n${err}`);
      });
  };

  return (
    <>
      <p>Mac 客户端使用 mmkv 数据库储存密钥。</p>
      <p>此外，你需要降级到 v8.8.0 版本的客户端 —— 更新的版本对密钥数据库进行了加密，目前无公开的获取方案。</p>

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

      <p className="mt-4">密钥文件通常存储在下述路径：</p>
      <FilePathBlock>{DB_PATH}</FilePathBlock>

      <h4 className="font-bold text-lg mt-4">导入密钥</h4>
      <ol className="list-decimal pl-6">
        <li>
          <button className="btn btn-sm btn-outline btn-accent mr-2" onClick={copyDbPathToClipboard}>
            <RiFileCopyLine className="text-xl" />
            <span>复制</span>
          </button>
          <code>MMKVStreamEncryptId</code> 文件路径
        </li>
        <li>
          点击上方的<VQuote>文件选择区域</VQuote>，打开<VQuote>文件选择框</VQuote>
        </li>
        <li>
          按下
          <VQuote>
            <ShiftKey className="mx-1" />
            {'+'}
            <MacCommandKey className="mx-1" />
            {'+'}
            <kbd className="kbd mx-1">G</kbd>
          </VQuote>
          组合键打开<VQuote>路径输入框</VQuote>
        </li>
        <li>
          粘贴之前复制的 <code>MMKVStreamEncryptId</code> 文件路径
        </li>
        <li>按下「回车键」确认。</li>
      </ol>
    </>
  );
}
