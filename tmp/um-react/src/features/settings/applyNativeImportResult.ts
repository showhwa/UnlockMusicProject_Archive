import {
  kugouImportKeys,
  kwm2ImportKeys,
  qmc2ImportKeys,
  qtfmAndroidUpdateKey,
} from '~/features/settings/settingsSlice';
import type { NativeImportResult } from '~/platform/types';
import type { AppDispatch } from '~/store';

/** Apply native/ADB import payload into staging. Caller may commit immediately (one-click import). */
export function applyNativeImportResult(dispatch: AppDispatch, result: NativeImportResult): number {
  let count = 0;
  if (result.qmc2?.length) {
    dispatch(qmc2ImportKeys(result.qmc2));
    count += result.qmc2.length;
  }
  if (result.kwm2?.length) {
    dispatch(kwm2ImportKeys(result.kwm2));
    count += result.kwm2.length;
  }
  if (result.kugou?.length) {
    dispatch(kugouImportKeys(result.kugou));
    count += result.kugou.length;
  }
  if (result.qtfm?.android !== undefined) {
    dispatch(qtfmAndroidUpdateKey({ deviceKey: result.qtfm.android }));
    count += 1;
  }
  return count;
}
