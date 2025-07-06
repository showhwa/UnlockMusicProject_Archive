import { selectFiles } from './fileListingSlice';
import { useAppSelector } from '~/hooks';
import { FileRow } from './FileRow';

export function FileListing() {
  const files = useAppSelector(selectFiles);

  return (
    <div className="flex flex-row flex-wrap gap-8">
      {Object.entries(files).map(([id, file]) => (
        <FileRow key={id} id={id} file={file} />
      ))}
    </div>
  );
}
