import type { RootState } from '~/store';
import type { ParseKuwoHeaderResponse } from '~/decrypt-worker/types.ts';
import { hasOwn } from '~/util/objects';
import { kwm2StagingToProductionKey } from './types';

export const selectStagingKWMv2Keys = (state: RootState) => state.settings.staging.kwm2.keys;
export const selectFinalKWMv2Keys = (state: RootState) => state.settings.production.kwm2.keys;

export const selectKWMv2Key = (state: RootState, hdr: ParseKuwoHeaderResponse): string | undefined => {
  if (!hdr) {
    return;
  }

  const quality = String(hdr.qualityId);
  const rid = String(hdr.resourceId);

  const keys = selectFinalKWMv2Keys(state);
  const lookupKey = kwm2StagingToProductionKey({ id: '', ekey: '', quality, rid });

  let ekey: string | undefined;
  if (hasOwn(keys, lookupKey)) {
    ekey = keys[lookupKey];
  }

  return ekey;
};
