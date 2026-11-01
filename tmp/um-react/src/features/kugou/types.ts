import { nanoid } from 'nanoid';

/**
 * KuGou / KGG (kgm v5).
 * UI settings tab route: `kgg`. Redux + localStorage production field: `kugou`.
 */
export interface StagingKugouKey {
  id: string;
  audioHash: string;
  ekey: string;
}

export type ProductionKugouKey = Record<string /* audioHash */, string /* ekey */>;
export const kugouStagingToProductionKey = (key: StagingKugouKey) => key.audioHash.normalize();
export const kugouStagingToProductionValue = (key: StagingKugouKey) => key.ekey.normalize();
export const kugouProductionToStaging = (
  key: keyof ProductionKugouKey,
  value: ProductionKugouKey[keyof ProductionKugouKey],
): null | StagingKugouKey => {
  if (typeof value !== 'string') return null;
  return { id: nanoid(), audioHash: key.normalize(), ekey: value };
};
