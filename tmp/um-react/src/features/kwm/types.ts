import { nanoid } from 'nanoid';

/** KWMv2 staging key row (Kuwo). */
export interface StagingKWMv2Key {
  id: string;
  /**
   * Resource ID
   */
  rid: string;
  /**
   * Quality String
   */
  quality: string;
  ekey: string;
}

export type ProductionKWMv2Keys = Record<string /* `${rid}-${quality}` */, string /* ekey */>;

export const parseKwm2ProductionKey = (key: string): null | { rid: string; quality: string } => {
  const m = key.match(/^(\d+)-(\w+)$/);
  if (!m) return null;
  const [_, rid, quality] = m;

  return { rid, quality };
};
export const kwm2StagingToProductionKey = (key: StagingKWMv2Key) => `${key.rid}-${key.quality.replace(/\D/g, '')}`;
export const kwm2StagingToProductionValue = (key: StagingKWMv2Key) => key.ekey;
export const kwm2ProductionToStaging = (
  key: keyof ProductionKWMv2Keys,
  value: ProductionKWMv2Keys[keyof ProductionKWMv2Keys],
): null | StagingKWMv2Key => {
  if (typeof value !== 'string') return null;

  const parsed = parseKwm2ProductionKey(key);
  if (!parsed) return null;
  const { quality, rid } = parsed;

  return { id: nanoid(), rid, quality, ekey: value };
};
