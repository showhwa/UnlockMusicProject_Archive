import classNames from 'classnames';
import { useRef } from 'react';

export interface ImageFigureProps {
  srcSet: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  children?: React.ReactNode;
}
export function ImageFigure({ alt, srcSet, children, className, loading }: ImageFigureProps) {
  const refDialog = useRef<HTMLDialogElement>(null);

  return (
    <figure className={classNames(className, 'inline-flex flex-col items-center')}>
      <img
        className={`rounded-md cursor-pointer border border-base-300 max-h-48`}
        loading={loading}
        srcSet={srcSet}
        alt={alt}
        onClick={() => refDialog?.current?.showModal()}
      />
      {children && <figcaption className="text-sm text-base-content/70">{children}</figcaption>}

      <dialog ref={refDialog} className="modal text-left">
        <div className="modal-box max-w-[50vw]">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg">查看图片</h3>

          <figure className="flex flex-col justify-center text-center">
            <img srcSet={srcSet} alt={alt} />
            {children && <figcaption className="text-sm text-base-content/70">{children}</figcaption>}
          </figure>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>关闭</button>
        </form>
      </dialog>
    </figure>
  );
}
