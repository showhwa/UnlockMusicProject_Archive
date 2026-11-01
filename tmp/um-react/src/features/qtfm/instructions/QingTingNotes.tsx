import { VQuote } from '~/components/HelpText/VQuote';
import { HiWord } from '~/components/HelpText/HiWord';
import { Ruby } from '~/components/Ruby';

/** File-location / naming notes for QingTing FM Android downloads. */
export function QingTingNotes() {
  return (
    <>
      <h3 className="text-xl font-bold my-2">注意事项</h3>
      <ul className="list-disc pl-6">
        <li>
          <p>
            下载的文件位于
            <VQuote>
              <code className="break-words">
                <HiWord>[内部储存]</HiWord>/<wbr />
                Android/
                <wbr />
                data/
                <wbr />
                fm.qingting.qtradio/
                <wbr />
                files/Music/
              </code>
            </VQuote>
          </p>
          <ul className="list-disc pl-6">
            <li>
              <p>
                你可能需要使用有
                <Ruby caption="root">特权</Ruby>
                的文件浏览器访问。
              </p>
            </li>
          </ul>
        </li>
        <li>
          <p>
            音频文件文件名为「<code>.p~!</code>」后缀。
          </p>
        </li>
        <li>
          <p>因为解密密钥与文件名相关，因此解密前请不要更改文件名。</p>
        </li>
      </ul>
    </>
  );
}
