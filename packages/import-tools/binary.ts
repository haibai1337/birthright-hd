/** Original bounded readers. Historical bytes are always data, never executable input. */
export class BinaryReader {
  readonly view: DataView;
  readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  range(offset: number, length: number): void {
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset + length > this.bytes.length
    )
      throw new Error(`Binary range outside input: ${offset}+${length}/${this.bytes.length}`);
  }
  u8(offset: number) {
    this.range(offset, 1);
    return this.view.getUint8(offset);
  }
  u16(offset: number) {
    this.range(offset, 2);
    return this.view.getUint16(offset, true);
  }
  i16(offset: number) {
    this.range(offset, 2);
    return this.view.getInt16(offset, true);
  }
  u32(offset: number) {
    this.range(offset, 4);
    return this.view.getUint32(offset, true);
  }
  slice(offset: number, length: number) {
    this.range(offset, length);
    return this.bytes.subarray(offset, offset + length);
  }
  string(offset: number, limit: number): string {
    this.range(offset, limit);
    let end = offset;
    while (end < offset + limit && this.bytes[end] !== 0) end++;
    if (end === offset + limit) throw new Error(`Unterminated string at ${offset}`);
    return new TextDecoder('windows-1252').decode(this.bytes.subarray(offset, end));
  }
}
export function bits(value: number, start: number, width: number) {
  return (value >>> start) & (2 ** width - 1);
}
