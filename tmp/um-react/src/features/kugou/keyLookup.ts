import type { RootState } from '~/store';
import type { ParseKugouHeaderResponse } from '~/decrypt-worker/types.ts';
import { hasOwn } from '~/util/objects';

/** Staging KuGou/KGG keys (`state.settings.staging.kugou`; UI tab `kgg`). */
export const selectStagingKugouV5Keys = (state: RootState) => state.settings.staging.kugou.keys;
/** Production KuGou/KGG keys (`state.settings.production.kugou`; persist key `kugou`). */
export const selectFinalKugouV5Keys = (state: RootState) => state.settings.production.kugou.keys;

export const selectKugouKey = (state: RootState, hdr: ParseKugouHeaderResponse): string | undefined => {
  if (!hdr) {
    return;
  }

  const keys = selectFinalKugouV5Keys(state);
  const lookupKey = hdr.audioHash;

  return hasOwn(keys, lookupKey) ? keys[lookupKey] : undefined;
};
