import { SDKVersion } from './SDKVersion';
import { CurrentYear } from './CurrentYear';

export function Footer() {
  const appVersionShort = '__APP_VERSION_SHORT__';
  return (
    <footer className="flex flex-col text-center p-4 bg-base-200">
      <p className="flex flex-row justify-center items-center h-[1em]">
        <a className="link link-info mr-1" href="https://git.unlock-music.dev/um/um-react">
          音乐解锁
        </a>
        (
        <a
          title="使用 MIT 授权协议"
          className="link link-info"
          href="https://git.unlock-music.dev/um/um-react/src/branch/main/LICENSE"
        >
          MIT
        </a>
        , v{appVersionShort}
        <SDKVersion />)
      </p>
      <p>
        {'© 2019 - '}
        <CurrentYear />
        <a className="ml-1 link link-info" href="https://git.unlock-music.dev/um">
          Unlock Music
        </a>
      </p>
    </footer>
  );
}
