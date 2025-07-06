import { HiWord } from '~/components/HelpText/HiWord';

export function InstructionsIOS() {
  return (
    <>
      <p>你需要越狱来访问 iOS 应用的私有数据。</p>
      <p>
        ⚠️ 请注意，越狱通常意味着你的设备
        <span className="text-red-600">将失去保修资格</span>。
      </p>
      <ol className="list-decimal pl-6">
        <li>
          访问设备的这个目录：
          <br />
          <code className="break-words">
            /var/mobile/Containers/Data/Application/<HiWord className="text-nowrap">{'<酷我数据目录>'}</HiWord>/mmkv
          </code>
        </li>
        <li>
          提取密钥数据库文件 <code>kw_ekey</code> 至浏览器可访问的目录，如下载目录。
        </li>
        <li>
          提交刚刚提取的 <code>kw_ekey</code> 密钥数据库。
        </li>
      </ol>
    </>
  );
}
