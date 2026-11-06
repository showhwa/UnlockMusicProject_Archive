import { MdInfoOutline } from 'react-icons/md';
import { DECRYPTION_WORKER_ACTION_NAME } from '~/decrypt-worker/constants';
import { usePlatform } from '~/platform/PlatformContext';
import { useEffect, useRef, useState } from 'react';

export function SDKVersion() {
  const { crypto } = usePlatform();
  const refDialog = useRef<HTMLDialogElement>(null);
  const [sdkVersion, setSdkVersion] = useState('...');
  useEffect(() => {
    crypto.request(DECRYPTION_WORKER_ACTION_NAME.VERSION, null).then(setSdkVersion, () => setSdkVersion('N/A'));
  }, [crypto]);

  return (
    <>
      <span className="btn btn-ghost inline-flex p-0" onClick={() => refDialog.current?.showModal()}>
        <MdInfoOutline />
      </span>

      <dialog ref={refDialog} className="modal text-left">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg">详细信息</h3>

          <p>App: __APP_VERSION__</p>
          <p>
            SDK: <span data-testid="sdk-version">{sdkVersion}</span>
          </p>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>关闭</button>
        </form>
      </dialog>
    </>
  );
}
