import { Header2, Header3 } from '~/components/HelpText/Headers';
import { FaRust } from 'react-icons/fa';

export function FAQAboutProject() {
  return (
    <div className="flex flex-col gap-4">
      <Header2>关于项目</Header2>

      <Header3 id="failed">um-react 是什么</Header3>
      <p>
        um-react 是由
        <a className="mx-1 link link-info" href="https://git.um-react.app/um">
          Unlock Music
        </a>
        基于 React 框架制作的一款用于移除已购音乐的加密保护的小工具，使用
        <a className="mx-1 link link-info" href="https://git.um-react.app/um/um-react/src/branch/main/LICENSE">
          MIT
        </a>
        授权协议。
      </p>
      <p>
        它的解密核心由 <FaRust className="inline" />
        <a className="mx-1 link link-info" href="https://git.um-react.app/um/lib_um_crypto_rust">
          <code>lib_um_crypto_rust</code>
        </a>
        驱动，使用
        <a
          className="mx-1 link link-info"
          href="https://git.um-react.app/um/lib_um_crypto_rust/src/branch/main/LICENSE_MIT"
        >
          MIT
        </a>
        +
        <a
          className="mx-1 link link-info"
          href="https://git.um-react.app/um/lib_um_crypto_rust/src/branch/main/LICENSE_APACHE"
        >
          Apache
        </a>
        双协议。
      </p>
      <p>这意味着你可以自由地使用、修改和分发这个软件，但请注意遵守相应的授权协议。</p>
    </div>
  );
}
