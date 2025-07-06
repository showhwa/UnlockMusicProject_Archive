import { RiFileCopyLine } from 'react-icons/ri';
import { toast } from 'react-toastify';
import { ExtLink } from '~/components/ExtLink';
import { FilePathBlock } from '~/components/FilePathBlock.tsx';

export function InstructionsPC() {
  const DB_PATH = '%APPDATA%\\KuGou8\\KGMusicV3.db';
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
      <p>
        酷狗的 Windows 客户端使用魔改的
        <ExtLink className="link-info px-1" href="https://www.zetetic.net/sqlcipher/">
          SQLCipher
        </ExtLink>
        来加密储存密钥。
      </p>
      <p>该密钥数据库通常位于下述路径：</p>
      <FilePathBlock>{DB_PATH}</FilePathBlock>

      <h3 className="font-bold text-xl mt-4">导入密钥</h3>
      <ol className="list-decimal pl-6">
        <li>
          <button className="btn btn-sm btn-outline btn-accent mr-2" onClick={copyDbPathToClipboard}>
            <RiFileCopyLine className="text-xl" />
            <span>复制</span>
          </button>
          <code>KGMusicV3.db</code> 文件路径
        </li>
        <li>点击上方的「文件选择区域」，打开「文件选择框」</li>
        <li>
          在「文件名」输入框中粘贴之前复制的 <code>KGMusicV3.db</code> 文件路径
        </li>
        <li>按下「回车键」确认。</li>
      </ol>
    </>
  );
}
