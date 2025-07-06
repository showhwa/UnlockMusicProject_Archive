import { Header2, Header3 } from '~/components/HelpText/Headers';
import { VQuote } from '~/components/HelpText/VQuote';
import { SegmentTryOfficialPlayer } from './SegmentTryOfficialPlayer';
import { HiWord } from '~/components/HelpText/HiWord';
import { KWMv2AllInstructions } from '~/features/settings/panels/KWMv2/KWMv2AllInstructions';
import { SegmentKeyImportInstructions } from './SegmentKeyImportInstructions';
import { RiErrorWarningLine } from 'react-icons/ri';

export function KuwoFAQ() {
  return (
    <>
      <Header2>酷我音乐</Header2>
      <Header3 id="failed">解锁失败</Header3>
      <SegmentTryOfficialPlayer />
      <p className="mb-2">
        日前，仅<HiWord>手机客户端</HiWord>下载的
        <VQuote>
          <strong>至臻全景声</strong>
        </VQuote>
        及
        <VQuote>
          <strong>至臻母带</strong>
        </VQuote>
        音质的音乐文件采用新版加密。
      </p>
      <p className="mb-2">其他音质目前不需要提取密钥。</p>
      <p className="mb-2">PC平台暂未推出使用新版加密的音质。</p>

      <Header3 id="keys">导入密钥</Header3>
      <div className="alert alert-warning my-2">
        <RiErrorWarningLine className="text-2xl" />
        <div>
          <p>安卓用户提取密钥需要 root 权限，或注入文件提供器。</p>
          <p>
            <strong className="pr-2">注意</strong>已知部分第三方修改版会破坏密钥写入功能，导致无法提取密钥。
          </p>
          <p>
            <strong className="pr-2">注意</strong>
            项目组不提倡使用、也不提供第三方修改版。使用前请自行评估风险。请开通会员支持正版音乐。
          </p>
        </div>
      </div>

      <SegmentKeyImportInstructions tab="KWMv2 密钥" clientInstructions={<KWMv2AllInstructions />} />
    </>
  );
}
