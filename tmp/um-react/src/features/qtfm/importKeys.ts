import type { GetQingTingFMDeviceKeyPayload } from '~/decrypt-worker/types.ts';

/**
 * Extract a hex device secret from clipboard / dump text.
 * Matches lines like `DEVICE_SECRET: deadbeef…` (from qtfm-device-id).
 */
export function parseQtfmDeviceSecretFromText(text: string): string | null {
  const match = text.match(/^DEVICE_SECRET: ([0-9a-fA-F]+)/m);
  return match?.[1] ?? null;
}

/**
 * Extract build.prop-style device fields for worker-side key derivation.
 * Returns null unless all required fields are present.
 */
export function parseQtfmDeviceInfoFromText(text: string): GetQingTingFMDeviceKeyPayload | null {
  const dataMap = Object.create(null) as GetQingTingFMDeviceKeyPayload;
  for (const [, key, value] of text.matchAll(/^(PRODUCT|DEVICE|MANUFACTURER|BRAND|BOARD|MODEL): (.+)/gim)) {
    dataMap[key.toLowerCase() as keyof GetQingTingFMDeviceKeyPayload] = value;
  }
  const { product, device, manufacturer, brand, board, model } = dataMap;
  if (product && device && manufacturer && brand && board && model) {
    return dataMap;
  }
  return null;
}
