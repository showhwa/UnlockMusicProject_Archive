import { MMKVParser } from '../MMKVParser';

const makeViewFromBuffer = (buff: Buffer<ArrayBuffer>) =>
  new DataView(buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength));

test('throw error on broken file', () => {
  const view = makeViewFromBuffer(
    Buffer.from([0x27, 0x00, 0x00, 0x00, 0x7f, 0x03, 0x6b, 0x65, 0x79, 0x06, 0x07, 0x62, 0x61, 0x64, 0xff, 0xff]),
  );

  expect(() => {
    const parser = new MMKVParser(view);
    parser.readKey();
    parser.readStringValue();
  }).toThrow(/offset mismatch/i);
});

test('able to handle empty value', () => {
  const view = makeViewFromBuffer(
    Buffer.from([0x0b, 0x00, 0x00, 0x00, 0x7f, 0x03, 0x6b, 0x65, 0x79, 0x00, 0x01, 0x31, 0x02, 0x01, 0x32, 0xff]),
  );

  const parser = new MMKVParser(view);
  expect(parser.readKey()).toEqual('key');
  expect(parser.readStringValue()).toEqual(null);
  expect(parser.readKey()).toEqual('1');
  expect(parser.readStringValue()).toEqual('2');
});

describe('eof payload boundary', () => {
  // Small string records: "a" -> "one" and "b" -> "two".
  const firstRecord = Buffer.from([0x01, 0x61, 0x04, 0x03, 0x6f, 0x6e, 0x65]);
  const secondRecord = Buffer.from([0x01, 0x62, 0x04, 0x03, 0x74, 0x77, 0x6f]);
  const payload = Buffer.concat([Buffer.from([0x7f]), firstRecord, secondRecord]);
  const allEntries = [
    ['a', 'one'],
    ['b', 'two'],
  ];

  const makeView = (payloadLength: number) => {
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payloadLength);
    return makeViewFromBuffer(Buffer.concat([header, payload]));
  };

  const readEntries = (parser: MMKVParser) => {
    const entries: [string, string | null][] = [];
    while (!parser.eof) {
      entries.push([parser.readKey(), parser.readStringValue()]);
    }
    return entries;
  };

  test.each([payload.byteLength + 4, 0xffffffff])('clamps oversized payload length %i to the view', (payloadLength) => {
    const parser = new MMKVParser(makeView(payloadLength));

    expect(readEntries(parser)).toEqual(allEntries);
    expect(parser.eof).toBe(true);
  });

  test('reads all records when the payload length is exact', () => {
    const parser = new MMKVParser(makeView(payload.byteLength));

    expect(readEntries(parser)).toEqual(allEntries);
    expect(parser.eof).toBe(true);
  });

  test('stops at the declared payload boundary with another valid record remaining', () => {
    const parser = new MMKVParser(makeView(1 + firstRecord.byteLength));

    expect(readEntries(parser)).toEqual([allEntries[0]]);
    expect(parser.eof).toBe(true);
  });

  test('clamps to the DataView length with another valid record outside the view', () => {
    const fullView = makeView(payload.byteLength + 4);
    const view = new DataView(fullView.buffer, 0, 4 + 1 + firstRecord.byteLength);
    const parser = new MMKVParser(view);

    expect(readEntries(parser)).toEqual([allEntries[0]]);
    expect(parser.eof).toBe(true);
  });
});
