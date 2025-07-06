import { ExtLink } from '~/components/ExtLink';
import { HiWord } from '~/components/HelpText/HiWord';
import NoopExecutable from './assets/noop.exe?base64';
import NoopExecutableSource from './assets/noop.asm.txt?base64';

const PC_CLIENT_URL = 'https://web.archive.org/web/2023/https://dldir1v6.qq.com/music/clntupate/QQMusic_Setup_1951.exe';
const PC_CLIENT_TG_URL = 'https://t.me/um_lsr_ch/24';

export function InstructionsPC() {
  return (
    <>
      <p className="mt-2">
        使用 <span className="text-error">19.57 或更高版本</span>下载的歌曲文件
        <HiWord>需要导入密钥</HiWord>。
        <br />
        目前未公开密钥获取方式，因此不支持。
      </p>

      <p className="mt-4">
        使用 <span className="text-primary">19.51 或更低版本</span>下载的歌曲文件
        <HiWord>无需密钥</HiWord>。
      </p>

      <p className="mt-4">
        获取 QQ 音乐 Windows <HiWord>19.51</HiWord> 客户端：
      </p>
      <ul className="list-disc pl-6">
        <li>
          <ExtLink className="link-info" href={PC_CLIENT_URL}>
            通过 <code>Archive.org</code> 缓存下载（慢）
          </ExtLink>
        </li>
        <li>
          <ExtLink className="link-info" href={PC_CLIENT_TG_URL}>
            通过 Telegram 下载（需要账号）
          </ExtLink>
        </li>
      </ul>

      <p className="mt-4">
        安装完成后可以覆盖 QQ 音乐安装目录下的
        <a
          className="link link-info mx-1"
          download="QQMusicUp.exe"
          href={`data:application/vnd.microsoft.portable-executable;base64,${NoopExecutable}`}
        >
          <code>QQMusicUp.exe</code>
        </a>
        同名文件，屏蔽自动更新（
        <a
          className="link"
          download="QQMusicUp.asm"
          href={`data:text/x-asm;charset=utf-8;base64,${NoopExecutableSource}`}
        >
          源码
        </a>
        ）。
      </p>
      <p className="mt-2">降级后需要删除新版本下载的文件并重新使用旧版本下载。</p>
    </>
  );
}
