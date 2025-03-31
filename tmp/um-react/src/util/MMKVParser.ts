import { bytesToUTF8String } from '~/decrypt-worker/util/utf8Encoder';
import { formatHex } from './hex.ts';

export class MMKVParser {
  private offset = 4;
  private length: number;

  constructor(private view: DataView) {
    const payloadLength = view.getUint32(0, true);
    this.length = 4 + payloadLength;

    // skip unused str
    this.readInt();
  }

  toString() {
    const offset = formatHex(this.offset, 8);
    const length = formatHex(this.length, 8);
    return `<MMKVParser offset=${offset} len=${length}>`;
  }

  get eof() {
    return this.offset >= this.length;
  }

  public readByte() {
    return this.view.getUint8(this.offset++);
  }

  public readBigInt() {
    let value = 0n;
    let shift = 0n;

    let b: number;
    do {
      b = this.readByte();
      value |= BigInt(b & 0x7f) << shift;
      shift += 7n;
    } while ((b & 0x80) !== 0);

    return value;
  }

  public readInt() {
    const value = this.readBigInt();

    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error('Runtime Error: BigInt too large to cast as number');
    }

    return Number(value);
  }

  public readBytes(n: number) {
    const offset = this.offset;
    const end = offset + n;
    this.offset = end;
    return new Uint8Array(this.view.buffer.slice(offset, end));
  }

  public readString() {
    // String [
    //   len: int,
    //   data: byte[int], # utf-8
    // ]
    const strByteLen = this.readInt();
    const data = this.readBytes(strByteLen);
    return bytesToUTF8String(data).normalize();
  }

  public readKey() {
    return this.readString();
  }

  public readStringValue(): string | null {
    // Container [
    //   len: int,
    //   data: variant
    // ]
    const containerLen = this.readInt();
    if (containerLen === 0) {
      return null;
    }
    const newOffset = this.offset + containerLen;
    const result = this.readString();
    if (newOffset !== this.offset) {
      const expected = formatHex(newOffset);
      const actual = formatHex(this.offset);
      throw new Error(`readVariantString failed: offset mismatch (expect: ${expected}, actual: ${actual})`);
    }
    return result;
  }

  public skipContainer() {
    // Container [
    //   len: int,
    //   data: variant
    // ]
    const containerLen = this.readInt();
    this.offset += containerLen;
  }
}
