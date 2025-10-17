import { ExtLink } from '~/components/ExtLink';
import { Header2, Header3, Header4 } from '~/components/HelpText/Headers';

import { NavLink } from 'react-router';

export function OtherFAQ() {
  return (
    <>
      <Header2>其它问题</Header2>
      <Header3 id="metadata">解密后没有封面等信息</Header3>
      <p>该项目进行解密处理。如果加密前的资源没有内嵌元信息或封面，解密的文件也没有。</p>
      <p>请使用第三方工具进行编辑或管理元信息。</p>

      <Header3 id="android-browsers">安卓: 浏览器支持说明</Header3>
      <p>⚠️ 手机端浏览器支持有限，请使用最新版本的 Chrome 或 Firefox 官方浏览器。</p>
      <div className="flex flex-col md:flex-row gap-2 md:gap-8">
        <div>
          <Header4>已知有问题的浏览器</Header4>
          <ul className="list-disc pl-8">
            <li>Via 浏览器</li>
            <li>夸克浏览器</li>
            <li>UC 浏览器</li>
          </ul>
        </div>

        <div>
          <Header4>可能会遇到的问题包括</Header4>
          <ul className="list-disc pl-8">
            <li>网页白屏</li>
            <li>无法下载解密后内容</li>
            <li>下载的文件名错误</li>
          </ul>
        </div>
      </div>

      <Header3 id="android-root">安卓 root</Header3>
      <p>
        对安卓设备获取 root 特权通常会破坏系统的完整性并导致部分功能无法使用。
        例如部分厂商的安卓设备会在解锁后丧失保修资格，或导致无法使用 NFC 移动支付等限制。
      </p>
      <p className="my-2">
        如果希望不破坏系统完整性，你可以考虑在电脑上使用
        <NavLink className="link link-info" to="/questions/android-emu">
          安卓模拟器
        </NavLink>
        。
      </p>

      <Header3 id="projects">相关项目</Header3>
      <ul className="list-disc pl-6">
        <li>
          <p>
            <ExtLink className="mr-2" href="https://github.com/CarlGao4/um-react-electron">
              <strong>
                <code>um-react-electron</code>
              </strong>
            </ExtLink>
            利用 Electron 框架打包的本地版，提供适用于 Windows、Linux 和 Mac 平台的可执行文件。
          </p>
          <ul className="list-disc pl-6">
            <li>
              <p>
                <ExtLink href="https://github.com/CarlGao4/um-react-electron/releases/latest">GitHub 下载</ExtLink>
              </p>
            </li>
          </ul>
        </li>
        <li>
          <p>
            <ExtLink className="mr-2" href="https://git.um-react.app/um/um-react-wry">
              <strong>
                <code>um-react-wry</code>
              </strong>
            </ExtLink>
            使用 WRY 框架封装的 Win64 单文件（需要
            <ExtLink href="https://go.microsoft.com/fwlink/p/?LinkId=2124703">安装 Edge WebView2 运行时</ExtLink>
            {'，Win10+ 操作系统自带）'}
          </p>
          <ul className="list-disc pl-6">
            <li>
              <p>
                <ExtLink href="https://git.um-react.app/um/um-react/releases/latest">仓库下载</ExtLink>
                {' | 寻找文件名为 '}
                <code>um-react-win64-</code> 开头的附件
              </p>
            </li>
          </ul>
        </li>
      </ul>

      <Header3 id="more-questions">有更多问题？</Header3>
      <p className="flex flex-row gap-1">
        欢迎加入
        <ExtLink href={'https://t.me/unlock_music_chat'}>“音乐解锁-交流” 交流群</ExtLink>
        一起讨论。
      </p>
    </>
  );
}
