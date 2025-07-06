import { Header2, Header3 } from '~/components/HelpText/Headers';
import { SegmentKeyImportInstructions } from './SegmentKeyImportInstructions';
import { KugouAllInstructions } from '~/features/settings/panels/Kugou/KugouAllInstructions.tsx';
import { RiErrorWarningLine } from 'react-icons/ri';

export function KugouFAQ() {
  return (
    <>
      <Header2>酷狗音乐</Header2>
      <Header3 id="failed">解锁失败</Header3>
      <p className="mb-2">
        酷狗现在对部分用户推送了 <code>kgg</code> 加密格式（安卓、Windows 客户端）。
      </p>
      <p className="mb-2">根据平台不同，你需要提取密钥数据库。</p>

      <div className="alert alert-warning mb-2">
        <RiErrorWarningLine className="size-6" />
        <p>安卓用户提取密钥需要 root 权限，或注入文件提供器。</p>
      </div>

      <Header3 id="keys">导入密钥</Header3>
      <SegmentKeyImportInstructions tab="酷狗密钥" clientInstructions={<KugouAllInstructions />} />
    </>
  );
}
