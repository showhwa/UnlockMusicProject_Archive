import { useEffect, useRef } from 'react';

export interface DialogProps {
  closeButton?: boolean;
  backdropClose?: boolean;
  title?: React.ReactNode;
  children: React.ReactNode;
  show: boolean;
  onClose: () => void;
}

export function Dialog({ closeButton, backdropClose, title, children, show, onClose }: DialogProps) {
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
        {closeButton && (
          <form method="dialog" onSubmit={onClose}>
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
        )}
        <h3 className="font-bold text-lg pb-3">{title}</h3>
        {children}
      </div>
      {backdropClose && (
        <form method="dialog" className="modal-backdrop" onSubmit={onClose}>
          <button>close</button>
        </form>
      )}
    </dialog>
  );
}
