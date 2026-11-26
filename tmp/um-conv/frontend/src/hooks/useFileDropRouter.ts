import { useEffect } from 'react';
import { Events } from '@wailsio/runtime';
import { FilesDropped } from '~events';
import { FilesDroppedPayload } from '~protocol';
import { dispatchFileDrop } from '@/lib/fileDrop';

/** Subscribe once to native `files:dropped` and dispatch by target id. */
export function useFileDropRouter(): void {
  useEffect(() => {
    const off = Events.On(FilesDropped, (event: { data?: FilesDroppedPayload }) => {
      if (!event?.data) return;
      dispatchFileDrop(FilesDroppedPayload.createFrom(event.data));
    });
    return () => {
      if (typeof off === 'function') off();
    };
  }, []);
}
