export const toArrayBuffer = async (src: Blob | ArrayBuffer | Uint8Array<ArrayBufferLike>) =>
  src instanceof Blob ? await src.arrayBuffer() : src;
export const toBlob = (src: Blob | ArrayBuffer | Uint8Array<ArrayBufferLike>, mimeType?: string) =>
  src instanceof Blob ? src : new Blob([src], { type: mimeType ?? 'application/octet-stream' });

export function* chunkBuffer(buffer: Uint8Array, blockLen = 4096): Generator<[Uint8Array, number], void> {
  const len = buffer.byteLength;
  for (let i = 0; i < len; i += blockLen) {
    const idxEnd = Math.min(i + blockLen, len);
    const slice = buffer.subarray(i, idxEnd);
    yield [slice, i];
  }
}
