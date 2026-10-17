import { BinaryReader } from './binary.ts';
export interface ResourceEntry {
  name: string;
  offset: number;
  hash: number;
  extension: number;
  flags: number;
  compression: number;
  packedSize: number;
  unpackedSize: number;
  totalSize: number;
  payload: Uint8Array;
}
export function decodeResourceDirectory(bytes: Uint8Array): ResourceEntry[] {
  const r = new BinaryReader(bytes),
    directory = r.u32(4),
    count = r.u32(8);
  if (r.u32(0) !== 0x400 || count > 100000 || directory < 12)
    throw new Error('Unsupported resource header');
  r.range(directory, count * 22);
  const entries: ResourceEntry[] = [];
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    const at = directory + i * 22,
      hash = r.u32(at),
      offset = r.u32(at + 4),
      extension = r.u8(at + 8),
      name = r.string(at + 9, 13);
    if (names.has(name) || !name || /[\\/:]/.test(name))
      throw new Error('Invalid/duplicate resource name');
    names.add(name);
    r.range(offset, 36);
    if (
      r.u32(offset) !== 0x43525352 ||
      r.u32(offset + 16) !== hash ||
      r.u8(offset + 22) !== extension ||
      r.string(offset + 23, 13) !== name
    )
      throw new Error('Resource header/index mismatch');
    const totalSize = r.u32(offset + 4),
      packedSize = r.u32(offset + 8),
      unpackedSize = r.u32(offset + 12);
    if (
      totalSize !== packedSize + 36 ||
      offset < 12 ||
      offset + totalSize > directory ||
      unpackedSize > 64_000_000
    )
      throw new Error('Invalid resource bounds');
    entries.push({
      name,
      offset,
      hash,
      extension,
      flags: r.u8(offset + 20),
      compression: r.u8(offset + 21),
      packedSize,
      unpackedSize,
      totalSize,
      payload: r.slice(offset + 36, packedSize),
    });
  }
  const intervals = entries
    .map((e) => [e.offset, e.offset + e.totalSize] as const)
    .sort((a, b) => a[0] - b[0]);
  if (intervals.some((v, i) => i > 0 && v[0] < (intervals[i - 1]?.[1] ?? 0)))
    throw new Error('Overlapping resource payloads');
  return entries;
}
/** Format facts: 16 MSB-first flags, literals or 10-bit back-distance / 6-bit length. */
export function decodeLzss(bytes: Uint8Array, expected: number): Uint8Array {
  if (!Number.isSafeInteger(expected) || expected < 0 || expected > 64_000_000)
    throw new Error('Unsafe LZSS output size');
  const r = new BinaryReader(bytes),
    output = new Uint8Array(expected);
  let source = 0,
    target = 0,
    ended = false;
  while (source < bytes.length && !ended) {
    const flags = r.u16(source);
    source += 2;
    for (let bit = 15; bit >= 0; bit--) {
      if (flags & (1 << bit)) {
        if (target >= expected) throw new Error('LZSS output overflow');
        output[target++] = r.u8(source++);
      } else {
        const word = r.u16(source);
        source += 2;
        if (word === 0) {
          ended = true;
          break;
        }
        const distance = (word & 1023) + 1,
          length = (word >>> 10) + 3;
        if (distance > target || target + length > expected)
          throw new Error('Invalid LZSS back reference');
        for (let n = 0; n < length; n++) {
          output[target] = output[target - distance] ?? 0;
          target++;
        }
      }
    }
  }
  // All three supplied MAP.RES members have a two-byte zero pad following EOS.
  if (!ended || target !== expected || bytes.subarray(source).some((b) => b !== 0))
    throw new Error('LZSS terminator/length mismatch');
  return output;
}
export function unpackResource(entry: ResourceEntry) {
  if (entry.compression === 0) {
    if (entry.payload.length !== entry.unpackedSize)
      throw new Error('Raw resource length mismatch');
    return entry.payload.slice();
  }
  if (entry.compression !== 2) throw new Error(`Unsupported resource codec ${entry.compression}`);
  return decodeLzss(entry.payload, entry.unpackedSize);
}
export function decodeIndexedBitmap(bytes: Uint8Array) {
  const r = new BinaryReader(bytes),
    width = r.i16(0),
    height = r.u16(2);
  if (width < 1 || height < 1 || width * height + 10 !== bytes.length || r.i16(8) !== 11)
    throw new Error('Unsupported indexed bitmap');
  return { width, height, scale: r.i16(4), center: r.i16(6), pixels: r.slice(10, width * height) };
}
