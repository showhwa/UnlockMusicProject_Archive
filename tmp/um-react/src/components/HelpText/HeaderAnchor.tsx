import { RiLink } from 'react-icons/ri';

export function HeaderAnchor({ id }: { id: string }) {
  return (
    <a href={`#${id}`} data-anchor={id} className="absolute -left-6 opacity-10 transition-opacity duration-200">
      <RiLink className="max-h-[.75em]" />
    </a>
  );
}
