import type { ReactNode } from 'react';
import { ExtLink } from './ExtLink';
import { IoMdArchive } from 'react-icons/io';

export type DownloadBase64Props = {
  data: string;
  filename: string;
  mimetype?: string;
  className?: string;
  icon?: ReactNode | true | false;
  children?: ReactNode;
};

export function DownloadBase64({
  className,
  children,
  data,
  filename,
  icon,
  mimetype = 'application/octet-stream',
}: DownloadBase64Props) {
  return (
    <ExtLink
      icon={icon ?? <IoMdArchive className="inline size-sm ml-1" />}
      className={className ?? 'link-info mx-1'}
      download={filename}
      href={`data:${mimetype};base64,${data}`}
    >
      {children ?? <code>{filename}</code>}
    </ExtLink>
  );
}
