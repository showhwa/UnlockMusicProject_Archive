import { BsShift } from 'react-icons/bs';
import { Ruby } from '../Ruby';

export function ShiftKey({ className }: { className?: string }) {
  return (
    <Ruby caption="shift" className={className}>
      <kbd className="kbd">
        <BsShift className="text-sm" />
      </kbd>
    </Ruby>
  );
}
