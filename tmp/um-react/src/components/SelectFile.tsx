import { FiUnlock } from 'react-icons/fi';

import { useAppDispatch } from '~/hooks';
import { addNewFile, processFile } from '~/features/file-listing/fileListingSlice';
import { nanoid } from 'nanoid';
import { FileInput } from './FileInput';

export function SelectFile() {
  const dispatch = useAppDispatch();
  const handleFileReceived = (files: File[]) => {
    console.debug(
      'react-dropzone/onDropAccepted(%o, %o)',
      files.length,
      files.map((x) => x.name),
    );

    for (const file of files) {
      const blobURI = URL.createObjectURL(file);
      const fileName = file.name;
      const fileId = 'file://' + nanoid();

      // FIXME: this should be a single action/thunk that first adds the item, then updates it.
      dispatch(
        addNewFile({
          id: fileId,
          blobURI,
          fileName,
        }),
      );
      dispatch(processFile({ fileId }));
    }
  };

  return (
    <FileInput multiple onReceiveFiles={handleFileReceived}>
      <FiUnlock className="size-8 mb-4" />
      <p className="text-center">
        拖放或
        <span className="text-teal-700 font-semibold">点我选择</span>
        需要解密的文件
      </p>
      <p className="text-sm opacity-50 m-0">在浏览器内对文件进行解锁，零上传</p>
    </FileInput>
  );
}
