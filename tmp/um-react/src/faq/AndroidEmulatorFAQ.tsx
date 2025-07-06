import { ExtLink } from '~/components/ExtLink';
import { Header2, Header3, Header4 } from '~/components/HelpText/Headers';
import { VQuote } from '~/components/HelpText/VQuote';
import { RiErrorWarningLine } from 'react-icons/ri';

import LdPlayerSettingsMisc2x from './assets/ld_settings_misc@2x.webp';
import MumuSettingsMisc2x from './assets/mumu_settings_misc@2x.webp';
import { ImageFigure } from '~/components/ImageFigure';

export function AndroidEmulatorFAQ() {
  return (
    <>
      <Header2>安卓模拟器</Header2>
      <p className="mb-2">目前市面上主流的可以很方便 root 的安卓模拟器有两个：</p>

      <ul className="list-disc pl-6 mb-2">
        <li>
          <ExtLink href="https://mumu.163.com/">网易 MuMu 模拟器（安卓 12）</ExtLink> - Hyper-V 兼容较好
        </li>
        <li>
          <ExtLink href="https://www.ldmnq.com/">雷电模拟器（安卓 9）</ExtLink>
        </li>
      </ul>

      <p className="mb-2">上述两款模拟器均包含广告，使用时请注意。</p>

      <div className="my-2 alert alert-warning">
        <RiErrorWarningLine className="text-lg" />
        <p>
          根据应用的风控策略，使用模拟器登录的账号<strong>有可能会导致账号被封锁</strong>。
        </p>
      </div>
      <p className="mb-2">读者在使用前请自行评估风险。</p>

      <Header3 id="enable-root">启用 root</Header3>
      <p className="mb-2">上述的两款模拟器都有提供比较直接的启用 root 的方法。</p>

      <Header4 id="root-mumu">网易 MuMu 模拟器</Header4>
      <ul className="list-disc pl-6">
        <li>
          打开<VQuote>设置中心</VQuote>
        </li>
        <li>
          选择<VQuote>其他</VQuote>
        </li>
        <li>
          勾选<VQuote>开启手机Root权限</VQuote>
        </li>
      </ul>
      <div>
        <ImageFigure className="ml-2" alt="网易木木模拟器设置界面" loading="lazy" srcSet={`${MumuSettingsMisc2x} 2x`}>
          网易木木模拟器设置界面
        </ImageFigure>
      </div>

      <Header4 id="root-ld">雷电模拟器</Header4>
      <ul className="list-disc pl-6">
        <li>
          打开<VQuote>模拟器设置</VQuote>
        </li>
        <li>
          选择<VQuote>其他</VQuote>
        </li>
        <li>
          设置<VQuote>ROOT 权限</VQuote>为<VQuote>开启</VQuote>状态
        </li>
      </ul>
      <div>
        <ImageFigure className="ml-2" alt="雷电模拟器设置界面" loading="lazy" srcSet={`${LdPlayerSettingsMisc2x} 2x`}>
          雷电模拟器设置界面
        </ImageFigure>
      </div>
    </>
  );
}
