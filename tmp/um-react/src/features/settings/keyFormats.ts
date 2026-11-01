import { objectify } from 'radash';

/** Generic map↔list helpers shared by format feature types. */
export function productionKeyToStaging<S, P extends Record<string, unknown>>(
  src: P,
  make: (k: keyof P, v: P[keyof P]) => null | S,
): S[] {
  const result: S[] = [];
  for (const [key, value] of Object.entries(src)) {
    const item = make(key, value as P[keyof P]);
    if (item) {
      result.push(item);
    }
  }
  return result;
}

export function stagingKeyToProduction<S, P>(src: S[], toKey: (s: S) => keyof P, toValue: (s: S) => P[keyof P]): P {
  return objectify(src, toKey, toValue) as P;
}
