import { useEffect, useRef } from 'react';

import { FileInput } from '~/components/FileInput';

export interface ImportSecretModalProps {
  clientName?: React.ReactNode;
  children: React.ReactNode;
  show: boolean;
  onClose: () => void;
  onImport: (file: File) => void | Promise<void>;
}

export function ImportSecretModal({ clientName, children, show, onClose, onImport }: ImportSecretModalProps) {
  const handleFileReceived = (files: File[]) => {
    const promise = onImport(files[0]);
    if (promise instanceof Promise) {
      promise.catch((err) => {
        console.error('could not import: ', err);
      });
    }
    return promise;
  };

  const refModel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (show) {
      refModel.current?.showModal();
    } else {
      refModel.current?.close();
    }
  }, [show]);

  return (
    <dialog ref={refModel} className="modal">
      <div className="modal-box">
        <form method="dialog" onSubmit={() => onClose()}>
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 className="font-bold text-lg">从文件导入密钥</h3>
        <div className="py-4 flex flex-col gap-2 flex-1">
          <FileInput onReceiveFiles={handleFileReceived}>拖放或点我选择含有密钥的数据库文件</FileInput>

          <div className="mt-2">选择你的{clientName && <>「{clientName}」</>}客户端平台以查看对应说明：</div>
          <div>{children}</div>
        </div>
      </div>
    </dialog>
  );
}
