import type { RefObject } from 'react';
import { MdAdd, MdDeleteForever, MdFileUpload } from 'react-icons/md';

export interface AddKeyProps {
  addKey: () => void;
  importKeyFromFile?: () => void;
  clearKeys?: () => void;
  refContainer?: RefObject<HTMLElement | null>;
}

export function AddKey({ addKey, refContainer, importKeyFromFile, clearKeys }: AddKeyProps) {
  const scrollToLastKey = () => {
    const container = refContainer?.current;
    if (container) {
      const inputs = container.querySelectorAll('input[data-name="key-input--name"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement | null;
      if (lastInput) {
        lastInput.focus({ preventScroll: true });
        lastInput.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  const handleAddKey = () => {
    addKey();
    setTimeout(scrollToLastKey);
  };

  return (
    <div className="flex flex-row justify-between items-center">
      <div className="join">
        <button type="button" className="join-item btn flex items-center gap-2" onClick={handleAddKey}>
          <MdAdd className="text-lg" /> 添加一条
        </button>
        <button type="button" className="join-item btn flex items-center gap-2" onClick={importKeyFromFile}>
          <MdFileUpload className="text-lg" />
          导入数据库…
        </button>
        <button type="button" className="join-item btn flex items-center gap-2 btn-error" onClick={clearKeys}>
          <MdDeleteForever className="text-lg" />
          清空密钥
        </button>
      </div>
    </div>
  );
}
