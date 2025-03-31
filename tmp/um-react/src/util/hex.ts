export function formatHex(value: number, len = 8) {
  return '0x' + (value | 0).toString(16).padStart(len, '0');
}

export function hex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function unhex(value: string): Uint8Array {
  const bytes = [];
  for (const [byte] of value.matchAll(/[0-9a-fA-F]{2}/g)) {
    bytes.push(parseInt(byte, 16));
  }
  return new Uint8Array(bytes);
}
