import { nanoid } from 'nanoid';

/** QMCv2 staging key row (QQ Music / Douban FM). */
export interface StagingQMCv2Key {
  id: string;
  name: string;
  ekey: string;
}

export type ProductionQMCv2Keys = Record<string /* filename */, string /* ekey */>;

export const qmc2StagingToProductionKey = (key: StagingQMCv2Key) => key.name.normalize();
export const qmc2StagingToProductionValue = (key: StagingQMCv2Key) => key.ekey.trim();
export const qmc2ProductionToStaging = (
  key: keyof ProductionQMCv2Keys,
  value: ProductionQMCv2Keys[keyof ProductionQMCv2Keys],
): StagingQMCv2Key => {
  return {
    id: nanoid(),
    name: key.normalize(),
    ekey: value.trim(),
  };
};
