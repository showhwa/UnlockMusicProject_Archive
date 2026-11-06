import { useAppDispatch, useAppSelector } from '~/hooks';
import { ExtLink } from '~/components/ExtLink';
import { ChangeEvent, ClipboardEvent, useId } from 'react';
import { VQuote } from '~/components/HelpText/VQuote';
import { selectStagingQtfmAndroidKey } from '~/features/qtfm/keyLookup';
import { parseQtfmDeviceInfoFromText, parseQtfmDeviceSecretFromText } from '~/features/qtfm/importKeys';
import { QingTingNotes } from '~/features/qtfm/instructions/QingTingNotes';
import { qtfmAndroidUpdateKey } from '~/features/settings/settingsSlice';
import { DECRYPTION_WORKER_ACTION_NAME } from '~/decrypt-worker/constants.ts';
import { usePlatform } from '~/platform/PlatformContext';
import { toast } from 'react-toastify';

const QTFM_DEVICE_ID_URL = 'https://github.com/parakeet-rs/qtfm-device-id/releases/latest';

export function PanelQingTing() {
  const dispatch = useAppDispatch();
  const { crypto } = usePlatform();
  const secretKey = useAppSelector(selectStagingQtfmAndroidKey);
  const setSecretKey = (secretKey: string) => {
    dispatch(qtfmAndroidUpdateKey({ deviceKey: secretKey }));
  };

  const handleDataPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const plainText = e.clipboardData.getData('text/plain');
    const deviceSecret = parseQtfmDeviceSecretFromText(plainText);
    if (deviceSecret) {
      e.preventDefault();
      setSecretKey(deviceSecret);
      return;
    }

    const dataMap = parseQtfmDeviceInfoFromText(plainText);
    if (dataMap) {
      e.preventDefault();
      crypto
        .request(DECRYPTION_WORKER_ACTION_NAME.QINGTING_FM_GET_DEVICE_KEY, dataMap)
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

      <QingTingNotes />
    </div>
  );
}
