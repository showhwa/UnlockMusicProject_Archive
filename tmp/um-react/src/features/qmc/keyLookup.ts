import type { RootState } from '~/store';
import { closestByLevenshtein } from '~/util/levenshtein';
import { hasOwn } from '~/util/objects';

export const selectStagingQMCv2Settings = (state: RootState) => state.settings.staging.qmc2;
export const selectFinalQMCv2Settings = (state: RootState) => state.settings.production.qmc2;

export const selectQMCv2KeyByFileName = (state: RootState, name: string): string | undefined => {
  const normalizedName = name.normalize();

  let ekey: string | undefined;
  const { keys, allowFuzzyNameSearch } = selectFinalQMCv2Settings(state);
  if (hasOwn(keys, normalizedName)) {
    ekey = keys[normalizedName];
  } else if (allowFuzzyNameSearch) {
    const qmc2KeyStoreNames = Object.keys(keys);
    if (qmc2KeyStoreNames.length > 0) {
      const closestName = closestByLevenshtein(normalizedName, qmc2KeyStoreNames);
      console.debug('qmc2: key db could not find %o, using closest %o instead.', normalizedName, closestName);
      ekey = keys[closestName];
    }
  }

  return ekey;
};
