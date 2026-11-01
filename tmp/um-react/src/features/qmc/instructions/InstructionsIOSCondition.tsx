import iosAllowBackup from './iosAllowBackup.webp';
import { FilePathBlock } from '~/components/FilePathBlock';
import { HiWord } from '~/components/HelpText/HiWord';

const EXAMPLE_MEDIA_ID = '0011wjLv1bIkvv';
const EXAMPLE_NAME_IOS = '333407709-0011wjLv1bIkvv-1.mgalaxy';
const EXAMPLE_NAME_DB = 'Q0M00011wjLv1bIkvv.mflac';

export function InstructionsIOSCondition({ jailbreak }: { jailbreak: boolean }) {
  const useJailbreak = jailbreak;
  const useBackup = !jailbreak;

  const pathPrefix = jailbreak ? (
    <>
      /var/mobile/Containers/Data/Application/<HiWord className="text-nowrap">[随机字符]</HiWord>/
    </>
  ) : (
    '/AppDomain-'
  );

  return (
    <>
      <h4 className="text-lg font-semibold">获取密钥数据库文件</h4>
      <ol className="list-decimal pl-4">
        {useBackup && (
          <li>
            首先需要在 iOS 客户端的设定允许备份：
            <br />
            <img src={iosAllowBackup}></img>
          </li>
        )}
        {useBackup && <li>使用你喜欢的备份软件对 iOS 设备进行完整备份</li>}
        <li>
          {useBackup && <span>打开备份文件，并导航到下述目录：</span>}
          {useJailbreak && <span>访问下述目录：</span>}
          <FilePathBlock>{pathPrefix}com.tencent.QQMusic/Documents/mmkv/</FilePathBlock>
        </li>
        <li>
          提取或导出密钥数据库文件 <code>filenameEkeyMap</code>
        </li>
        <li>
          提交导出的 <code>filenameEkeyMap</code> 文件
        </li>
        <li>按下「保存」来应用更改。</li>
      </ol>

      <h3 className="text-lg font-semibold mt-3">获取离线文件</h3>
      <section>
        <p>访问下述目录：</p>
        <FilePathBlock>
          {pathPrefix}com.tencent.QQMusic/Library/Application Support/com.tencent.QQMusic/iData/iMusic
        </FilePathBlock>
        <p>
          该目录又存在数个子目录，其子目录下保存的「<code>[字符].m[字符]</code>」文件则是最终的加密文件。
        </p>
        <p>
          格式：<code>[song_id]-[mid]-[随机数字].m[后缀]</code>
        </p>
        <p>
          &#x3000;例：<code>{EXAMPLE_NAME_IOS}</code>
        </p>
      </section>

      <h4 className="text-lg font-semibold mt-3">解密离线文件</h4>
      <p>勾选设定界面的「使用近似文件名匹配」可跳过该节内容。</p>
      <p>⚠ 注意：若密钥过多，匹配过程可能会造成浏览器卡顿或无响应。</p>
      <ol className="list-decimal pl-4 mt-1">
        <li>
          提取文件的 <code>[mid]</code> 部分，如 <code>{EXAMPLE_MEDIA_ID}</code>
        </li>
        <li>
          查找密钥表，得到文件名「<code>{EXAMPLE_NAME_DB}</code>」
        </li>
        <li>
          将文件更名为对应的文件名，如
          <br />
          <code>{EXAMPLE_NAME_IOS}</code>
          <br />➔ <code>{EXAMPLE_NAME_DB}</code>
        </li>
        <li>
          回到主界面，提交文件「<code>{EXAMPLE_NAME_DB}</code>」。
        </li>
      </ol>
    </>
  );
}
