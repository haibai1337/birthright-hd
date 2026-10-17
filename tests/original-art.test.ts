import { expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import {
  decodePalette,
  decodeFlc,
  indexedPng,
  inspectWave,
} from '../packages/import-tools/original-art';
const palette = () => {
  const p = new Uint8Array(776),
    v = new DataView(p.buffer);
  v.setUint32(0, 776, true);
  v.setUint32(4, 0xb123, true);
  p[11] = 255;
  return p;
};
it('retains 8-bit COL colors and rejects incorrect palette headers', () => {
  expect(decodePalette(palette())[3]).toBe(255);
  const bad = palette();
  bad[0] = 0;
  expect(() => decodePalette(bad)).toThrow('COL');
});
it('writes indexed PNG scanlines without resampling, including zero-index transparency', () => {
  const png = indexedPng(2, 2, new Uint8Array([0, 1, 2, 3]), decodePalette(palette()), true);
  let at = 8;
  const chunks: Record<string, Buffer> = {};
  while (at < png.length) {
    const n = png.readUInt32BE(at),
      id = png.toString('ascii', at + 4, at + 8);
    chunks[id] = png.subarray(at + 8, at + 8 + n);
    at += 12 + n;
  }
  expect([...inflateSync(chunks.IDAT!)]).toEqual([0, 0, 1, 0, 2, 3]);
  expect([...chunks.tRNS!]).toEqual([0]);
  expect(chunks.IHDR!.readUInt32BE(0)).toBe(2);
  expect(() => indexedPng(2, 4, new Uint8Array(2), decodePalette(palette()))).toThrow('bounds');
});
function flc(underDeclared = 0) {
  const b = new Uint8Array(154),
    v = new DataView(b.buffer);
  v.setUint32(0, b.length, true);
  v.setUint16(4, 0xaf12, true);
  v.setUint16(6, 1, true);
  v.setUint16(8, 2, true);
  v.setUint16(10, 2, true);
  v.setUint16(12, 8, true);
  v.setUint32(16, 71, true);
  v.setUint32(128, 26, true);
  v.setUint16(132, 0xf1fa, true);
  v.setUint16(134, 1, true);
  v.setUint32(144, 10 - underDeclared, true);
  v.setUint16(148, 16, true);
  b.set([1, 2, 3, 4], 150);
  return b;
}
it('decodes complete FLC frames and the bounded original COPY-length variant', () => {
  for (const delta of [0, 2]) {
    const f = decodeFlc(flc(delta), decodePalette(palette()), true);
    expect([...f.frames[0]!.pixels]).toEqual([1, 2, 3, 4]);
    expect(f.frameMs).toBe(71);
  }
  expect(() => decodeFlc(flc(3), decodePalette(palette()))).toThrow('COPY'.toLowerCase());
});
it('rejects truncated FLC frame containers before reading pixels', () => {
  const b = flc();
  new DataView(b.buffer).setUint32(128, 1000, true);
  expect(() => decodeFlc(b, decodePalette(palette()))).toThrow('bounds');
});
it('reads PCM data chunks while retaining files with extra non-audio tails', () => {
  const b = Buffer.alloc(52);
  b.write('RIFF');
  b.writeUInt32LE(44, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(22050, 24);
  b.writeUInt32LE(44100, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(4, 40);
  b.fill(255, 48);
  expect(inspectWave(b)).toMatchObject({
    format: 1,
    rate: 22050,
    bits: 16,
    dataBytes: 4,
    duration: 4 / 44100,
  });
  b.writeUInt32LE(100, 40);
  expect(() => inspectWave(b)).toThrow('bounds');
});
