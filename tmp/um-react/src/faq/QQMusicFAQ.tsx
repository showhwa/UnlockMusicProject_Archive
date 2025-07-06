import { Header2, Header3 } from '~/components/HelpText/Headers';
import { SegmentTryOfficialPlayer } from './SegmentTryOfficialPlayer';
import { QMCv2QQMusicAllInstructions } from '~/features/settings/panels/QMCv2/QMCv2QQMusicAllInstructions';

export function QQMusicFAQ() {
  return (
    <>
      <Header2>QQ 音乐</Header2>
      <Header3 id="failed">解锁失败</Header3>
      <SegmentTryOfficialPlayer />
      <p className="mb-2">新版本的 QQ 音乐客户端下载的文件通常都需要导入密钥数据库。</p>
      <p className="mb-2">每一个资源（即一首歌的某个音质）都有独立的密钥，下载音乐时会被写出到密钥数据库中。</p>
      <p className="mb-2">因此若是解密失败，很有可能是因为你需要导入密钥，或降级客户端。</p>

      <Header3 id="about-download">关于下载</Header3>
      <p>重复下载同一首的歌曲不重复扣下载配额，但是同一首歌的两个版本会重复扣下载配额，请仔细分辨。</p>
      <p className="my-2">
        部分平台获取的加密文件未包含密钥。选择你<strong>下载文件时</strong>使用的客户端来查看说明。
      </p>

      <Header3 id="keys-or-downgrade">导入密钥或降级客户端</Header3>
      <QMCv2QQMusicAllInstructions />
    </>
  );
}
