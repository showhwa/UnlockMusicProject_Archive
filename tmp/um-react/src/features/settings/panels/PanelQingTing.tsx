import { useAppDispatch, useAppSelector } from '~/hooks';
import { ExtLink } from '~/components/ExtLink';
import { ChangeEvent, ClipboardEvent, useId } from 'react';
import { VQuote } from '~/components/HelpText/VQuote';
import { selectStagingQtfmAndroidKey } from '../settingsSelector';
import { qtfmAndroidUpdateKey } from '../settingsSlice';
import { workerClientBus } from '~/decrypt-worker/client.ts';
import { GetQingTingFMDeviceKeyPayload } from '~/decrypt-worker/types.ts';
import { DECRYPTION_WORKER_ACTION_NAME } from '~/decrypt-worker/constants.ts';
import { Ruby } from '~/components/Ruby';
import { HiWord } from '~/components/HelpText/HiWord';
import { toast } from 'react-toastify';

const QTFM_DEVICE_ID_URL = 'https://github.com/parakeet-rs/qtfm-device-id/releases/latest';

export function PanelQingTing() {
  const dispatch = useAppDispatch();
  const secretKey = useAppSelector(selectStagingQtfmAndroidKey);
  const setSecretKey = (secretKey: string) => {
    dispatch(qtfmAndroidUpdateKey({ deviceKey: secretKey }));
  };

  const handleDataPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const plainText = e.clipboardData.getData('text/plain');
    const matchDeviceSecret = plainText.match(/^DEVICE_SECRET: ([0-9a-fA-F]+)/m);
    if (matchDeviceSecret) {
      e.preventDefault();
      setSecretKey(matchDeviceSecret[1]);
      return;
    }

    const dataMap = Object.create(null) as GetQingTingFMDeviceKeyPayload;
    for (const [, key, value] of plainText.matchAll(/^(PRODUCT|DEVICE|MANUFACTURER|BRAND|BOARD|MODEL): (.+)/gim)) {
      dataMap[key.toLowerCase() as keyof GetQingTingFMDeviceKeyPayload] = value;
    }
    const { product, device, manufacturer, brand, board, model } = dataMap;

    if (product && device && manufacturer && brand && board && model) {
      e.preventDefault();
      workerClientBus
        .request<
          string,
          GetQingTingFMDeviceKeyPayload
        >(DECRYPTION_WORKER_ACTION_NAME.QINGTING_FM_GET_DEVICE_KEY, dataMap)
        .then(setSecretKey, (err) => toast.error(`生成设备密钥时发生错误: ${err}`));
    }
  };

  const handleDataInput = (e: ChangeEvent<HTMLInputElement>) => {
    setSecretKey(e.target.value);
  };

  const idSecretKey = useId();

  return (
    <div className="min-h-0 flex-col grow px-1">
      <h2 className="text-2xl font-bold mb-4">蜻蜓 FM</h2>

      <p>
        <VQuote>蜻蜓 FM</VQuote>的安卓版本需要获取设备密钥，并以此来生成解密密钥。
      </p>

      <div className="my-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-lg">
            <label htmlFor={idSecretKey}>设备密钥</label>
          </legend>
          <input
            id={idSecretKey}
            type="text"
            className="input font-mono"
            onPaste={handleDataPaste}
            value={secretKey}
            onChange={handleDataInput}
          />
          <p className="label flex-wrap">
            粘贴含有设备密钥的信息的内容时将自动提取密钥（如通过
            <ExtLink href={QTFM_DEVICE_ID_URL}>
              <code>qtfm-device-id</code>
            </ExtLink>
            获取的设备信息），不需要 root。
          </p>
        </fieldset>
      </div>

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
            音频文件文件名为「<code>.p~!</code>」前缀。
          </p>
        </li>
        <li>
          <p>因为解密密钥与文件名相关，因此解密前请不要更改文件名。</p>
        </li>
      </ul>
    </div>
  );
}
