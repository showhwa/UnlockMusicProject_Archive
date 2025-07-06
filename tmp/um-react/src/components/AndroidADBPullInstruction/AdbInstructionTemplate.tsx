import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import hljsStyleGitHub from 'react-syntax-highlighter/dist/esm/styles/hljs/github';
import { ExtLink } from '../ExtLink';
import PowerShellAdbDumpCommandTemplate from './adb_dump.ps1?raw';
import ShellAdbDumpCommandTemplate from './adb_dump.sh?raw';
import { applyTemplate } from '~/util/applyTemplate';

export interface AdbInstructionTemplateProps {
  dir: string;
  file: string;
  platform: 'win32' | 'linux';
}

const URL_USB_DEBUGGING = 'https://developer.android.com/studio/debug/dev-options?hl=zh-cn#Enable-debugging';

const LANGUAGE_MAP = {
  win32: { language: 'ps1', template: PowerShellAdbDumpCommandTemplate },
  linux: { language: 'sh', template: ShellAdbDumpCommandTemplate },
};

export function AdbInstructionTemplate({ dir, file, platform }: AdbInstructionTemplateProps) {
  const { language, template } = LANGUAGE_MAP[platform];
  const command = applyTemplate(template, { dir, file });

  return (
    <ol className="list-decimal pl-4">
      <li>
        <p>
          确保 <code>adb</code> 命令可用。
        </p>

        {platform === 'win32' && (
          <div>
            <span>
              💡 如果没有，可以
              <ExtLink href="https://scoop.sh/#/apps?q=adb">使用 Scoop 安装</ExtLink>。
            </span>
          </div>
        )}
      </li>
      <li>启动终端，进入 PowerShell 环境。</li>
      <li>
        在手机<ExtLink href={URL_USB_DEBUGGING}>启用 USB 调试</ExtLink>
      </li>
      <li>将安卓设备连接到电脑。</li>
      <li>
        <p>粘贴执行下述代码执行。若设备提示「是否允许 USB 调试」或「超级用户请求」，选择允许：</p>
        <SyntaxHighlighter language={language} style={hljsStyleGitHub}>
          {command}
        </SyntaxHighlighter>
        <br />※ 安卓模拟器可能需要额外操作，如
        <ExtLink className="text-nowrap" href="https://g.126.fm/04jewvw">
          网易 MuMu 模拟器
        </ExtLink>
        需要提前使用 <code>adb connect ...</code> 指令连接模拟器。详细请参考官方说明文档并调整上述脚本。
      </li>
      <li>
        提交当前目录下的 <code>{file}</code> 文件。
      </li>
    </ol>
  );
}
