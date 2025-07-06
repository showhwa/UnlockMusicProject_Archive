import { ExtLink } from '../ExtLink';
import { Ruby } from '../Ruby';
import { useId } from 'react';
import { RootExplorerGuide } from './RootExplorerGuide';
import { AdbInstructionTemplate } from './AdbInstructionTemplate';
import { HiWord } from '../HelpText/HiWord';

export interface AndroidADBPullInstructionProps {
  dir: string;
  file: string;
}

const URL_AMAZE = 'https://github.com/TeamAmaze/AmazeFileManager/releases/latest';
const URL_MT2 = 'https://mt2.cn/download/';

export function AndroidADBPullInstruction({ dir, file }: AndroidADBPullInstructionProps) {
  const androidInstructionId = useId();

  return (
    <>
      <p>
        你需要<Ruby caption="root">超级管理员</Ruby>访问权限来访问安卓应用的私有数据。
      </p>
      <p>
        ⚠️ 请注意，获取管理员权限通常意味着你的安卓设备
        <HiWord>将失去保修资格</HiWord>。
      </p>

      <div className="join join-vertical bg-base-100 mt-2 max-w-full">
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={androidInstructionId} />
          <div className="collapse-title font-semibold">在安卓手机端操作</div>
          <div className="collapse-content text-sm min-w-0">
            <ol className="list-decimal pl-4">
              <li>
                启动支持 <code>root</code> 特权的文件浏览器，如 <ExtLink href={URL_AMAZE}>Amaze 文件浏览器</ExtLink>、
                <ExtLink href={URL_MT2}>MT 管理器</ExtLink> 等。
              </li>
              <li>
                ※ 记得启用 root 特权！
                <RootExplorerGuide />
              </li>
              <li>
                <p>
                  访问 <code>{dir}/</code> 目录。
                </p>
                <p>※ 从侧边栏选择根目录开始。</p>
              </li>
              <li>
                将文件 <code>{file}</code> 复制到浏览器可访问的目录（例如下载目录）。
              </li>
              <li>提交该数据库文件。</li>
            </ol>
          </div>
        </div>
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={androidInstructionId} />
          <div className="collapse-title font-semibold">在 PC 端操作（使用 ADB / PowerShell）</div>
          <div className="collapse-content text-sm min-w-0">
            <AdbInstructionTemplate dir={dir} file={file} platform="win32" />
          </div>
        </div>
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={androidInstructionId} />
          <div className="collapse-title font-semibold">在 Linux / Mac 系统下操作（使用 ADB / Shell）</div>
          <div className="collapse-content text-sm min-w-0">
            <AdbInstructionTemplate dir={dir} file={file} platform="linux" />
          </div>
        </div>
      </div>
    </>
  );
}
