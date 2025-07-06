import classnames from 'classnames';
import { useDropzone } from 'react-dropzone';

export interface FileInputProps {
  onReceiveFiles: (files: File[]) => void;
  multiple?: boolean;
  children: React.ReactNode;
}

export function FileInput({ children, onReceiveFiles }: FileInputProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    onDropAccepted: onReceiveFiles,
  });

  return (
    <div
      {...getRootProps()}
      className={classnames(
        'w-full max-w-xl border rounded-lg transition duration-500 p-6 border-base-300 mx-auto',
        'cursor-pointer flex flex-col items-center bg-base-200 hover:border-gray-400 hover:bg-gray-50 hover:dark:bg-gray-800',
        {
          'bg-blue-50 dark:bg-blue-900 border-blue-700': isDragActive,
        },
      )}
      tabIndex={0}
    >
      <input {...getInputProps()} />
      {children}
    </div>
  );
}
