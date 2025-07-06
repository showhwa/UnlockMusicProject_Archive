import { Dialog } from '~/components/Dialog.tsx';
import React, { useState } from 'react';

interface InfoModalProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export function InfoModal(props: InfoModalProps) {
  const { title, description, children } = props;

  const [showModal, setShowModal] = useState(false);
  return (
    <div>
      <button className="btn btn-info btn-sm" type="button" onClick={() => setShowModal(true)}>
        {children || '这是什么?'}
      </button>

      <Dialog closeButton backdropClose show={showModal} onClose={() => setShowModal(false)} title={title}>
        {description}
      </Dialog>
    </div>
  );
}
