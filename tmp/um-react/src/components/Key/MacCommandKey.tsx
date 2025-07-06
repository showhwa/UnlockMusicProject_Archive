import { BsCommand } from 'react-icons/bs';
import { Ruby } from '../Ruby';

export function MacCommandKey({ className }: { className?: string }) {
  return (
    <Ruby caption="command" className={className}>
      <kbd className="kbd">
        <BsCommand className="text-sm" />
      </kbd>
    </Ruby>
  );
}
