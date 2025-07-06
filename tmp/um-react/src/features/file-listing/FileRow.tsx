import { DecryptedAudioFile, deleteFile, ProcessState } from './fileListingSlice';
import { useAppDispatch } from '~/hooks';
import { FileError } from './FileError';
import classNames from 'classnames';

interface FileRowProps {
  id: string;
  file: DecryptedAudioFile;
}

export function FileRow({ id, file }: FileRowProps) {
  const dispatch = useAppDispatch();
  const isDecrypted = file.state === ProcessState.COMPLETE;

  const decryptedName = file.cleanName + '.' + file.ext;

  return (
    <div className="card bg-base-100 dark:bg-gray-700 shadow-sm w-full md:w-[30%] " data-testid="file-row">
      <div className="card-body items-center text-center px-2">
        <h2 className="card-title max-w-full whitespace-nowrap flex gap-0" data-testid="audio-meta-song-name">
          <span className="grow overflow-hidden text-ellipsis" title={decryptedName}>
            {file.cleanName}
          </span>
          {isDecrypted && file.ext && <div className="ml-2 badge badge-accent">{file.ext}</div>}
        </h2>

        <div className="w-full grow">
          {file.state === ProcessState.ERROR && <FileError error={file.errorMessage} code={file.errorCode} />}
          {isDecrypted && (
            <audio className="w-full" aria-disabled={!file.decrypted} controls autoPlay={false} src={file.decrypted} />
          )}
        </div>

        <div className="card-actions justify-end">
          <a
            href={file.decrypted}
            download={decryptedName}
            title={`下载: ${decryptedName}`}
            className={classNames('btn', {
              'btn-primary': file.decrypted,
              'cursor-not-allowed pointer-events-none': !file.decrypted,
            })}
            data-testid="audio-download"
          >
            下载
          </a>
          <button type="button" className="btn btn-error" onClick={() => dispatch(deleteFile({ id }))}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
