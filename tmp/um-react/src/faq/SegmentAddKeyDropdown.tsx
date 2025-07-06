import { MdFileUpload } from 'react-icons/md';

export function SegmentAddKeyDropdown() {
  return (
    <span className="inline-flex items-center flex-wrap">
      按下
      <button type="button" className="btn flex items-center gap-2">
        <MdFileUpload className="text-lg" />
        导入数据库…
      </button>
    </span>
  );
}
