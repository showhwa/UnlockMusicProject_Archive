import { FiMenu, FiMoreVertical } from 'react-icons/fi';
import { Header5 } from '../HelpText/Headers';
import { Ruby } from '../Ruby';
import { VQuote } from '../HelpText/VQuote';

export function RootExplorerGuide() {
  return (
    <div className="@container inline-flex flex-col items-start w-full pl-4">
      <div className="flex flex-col items-start gap-4 @md:flex-row">
        <div>
          <Header5 className="[&]:mt-0 [&]:pt-0">Amaze 文件浏览器</Header5>
          <ul className="ml-2 list-disc list-inside">
            <li>
              <div className="inline-flex items-center gap-1">
                点触主界面左上角的 <FiMenu /> 打开侧边栏
              </div>
            </li>
            <li>
              滑动到最底端，点触
              <VQuote>
                <Ruby caption="Settings">设置</Ruby>
              </VQuote>
            </li>
            <li>
              点触
              <VQuote>
                <Ruby caption="Behaviour">行为</Ruby>
              </VQuote>
            </li>
            <li>
              找到
              <VQuote>
                <Ruby caption="Advanced">高级</Ruby>
              </VQuote>
              ，勾选
              <VQuote>
                <Ruby caption="Root Explorer">根目录浏览器</Ruby>
              </VQuote>
            </li>
          </ul>
        </div>
        <div>
          <Header5 className="[&]:mt-0 [&]:pt-0">MT 管理器</Header5>
          <ul className="ml-2 list-disc list-inside">
            <li>
              <div className="inline-flex items-center gap-1">
                点触主界面左上角的 <FiMenu /> 打开侧边栏
              </div>
            </li>
            <li>
              <div className="inline-flex items-center">
                点触侧边栏右上方的 <FiMoreVertical className="ml-1" />
                ，点触<VQuote>设置</VQuote>
              </div>
            </li>
            <li>
              勾选<VQuote>请求 Root 权限</VQuote>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
