import { deflateSync } from 'node:zlib';
import { BinaryReader } from './binary.ts';

/** Sierra COL: two little-endian header words, then full 8-bit RGB triples. */
export function decodePalette(bytes: Uint8Array) {
  const r = new BinaryReader(bytes);
  if (bytes.length !== 776 || r.u32(0) !== 776 || r.u32(4) !== 0xb123)
    throw new Error('Unsupported COL palette');
  return bytes.slice(8);
}
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let bit = 0; bit < 8; bit++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
/** Original indexed pixels, top to bottom. No resampling or palette quantization. */
export function indexedPng(
  width: number,
  height: number,
  pixels: Uint8Array,
  palette: Uint8Array,
  transparent = false,
) {
  if (
    width < 1 ||
    height < 1 ||
    width * height !== pixels.length ||
    pixels.length > 32_000_000 ||
    palette.length !== 768
  )
    throw new Error('Invalid PNG image bounds');
  const chunk = (name: string, bytes: Uint8Array) => {
    const type = Buffer.from(name),
      payload = Buffer.concat([type, bytes]),
      result = Buffer.alloc(bytes.length + 12);
    result.writeUInt32BE(bytes.length, 0);
    payload.copy(result, 4);
    result.writeUInt32BE(crc32(payload), bytes.length + 8);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 3;
  const scan = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++)
    scan.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('PLTE', palette),
    ...(transparent ? [chunk('tRNS', new Uint8Array([0]))] : []),
    chunk('IDAT', deflateSync(scan)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** FLI/FLC frame decoder. Independently implemented from the public file format. */
export function decodeFlc(bytes: Uint8Array, basePalette: Uint8Array, allFrames = false) {
  const r = new BinaryReader(bytes),
    magic = r.u16(4),
    count = r.u16(6),
    width = r.u16(8),
    height = r.u16(10);
  if (
    ![0xaf11, 0xaf12].includes(magic) ||
    r.u32(0) !== bytes.length ||
    r.u16(12) !== 8 ||
    !count ||
    !width ||
    !height ||
    width * height > 4_000_000
  )
    throw new Error('Unsupported FLC header');
  const pixels = new Uint8Array(width * height),
    palette = basePalette.slice(),
    frames: { pixels: Uint8Array; palette: Uint8Array }[] = [];
  let at = 128;
  while (at < bytes.length && frames.length < (allFrames ? count : 1)) {
    const size = r.u32(at),
      frameType = r.u16(at + 4),
      chunks = r.u16(at + 6),
      end = at + size;
    if (size < 16 || end > bytes.length) throw new Error('Invalid FLC frame bounds');
    if (frameType !== 0xf1fa) {
      at = end;
      continue;
    }
    let p = at + 16;
    for (let c = 0; c < chunks; c++) {
      const n = r.u32(p),
        type = r.u16(p + 4),
        limit = p + n;
      let s = p + 6;
      if (n < 6 || limit > end) throw new Error('Invalid FLC chunk bounds');
      const byte = () => {
        if (s >= limit) throw new Error('Truncated FLC chunk');
        return r.u8(s++);
      };
      const word = () => byte() | (byte() << 8);
      const signed = () => {
        const b = byte();
        return b > 127 ? b - 256 : b;
      };
      const put = (index: number, value: number) => {
        if (index < 0 || index >= pixels.length) throw new Error('FLC pixel overflow');
        pixels[index] = value;
      };
      if (type === 4 || type === 11) {
        let index = 0;
        const packets = word();
        for (let k = 0; k < packets; k++) {
          index += byte();
          const colors = byte() || 256;
          if (index + colors > 256) throw new Error('FLC palette overflow');
          for (let i = 0; i < colors * 3; i++)
            palette[index * 3 + i] = Math.min(255, byte() * (type === 11 ? 4 : 1));
          index += colors;
        }
      }
      // Eleven supplied files under-declare their final COPY chunk by 1–2 bytes;
      // the complete pixels fit inside the enclosing frame's two-byte tail.
      else if (type === 16) {
        const missing = pixels.length - (limit - s);
        if (
          missing !== 0 &&
          !(c === chunks - 1 && missing >= 1 && missing <= 2 && limit + 2 === end)
        )
          throw new Error('FLC copy length mismatch');
        pixels.set(r.slice(s, pixels.length));
      } else if (type === 13) pixels.fill(0);
      else if (type === 15) {
        for (let y = 0; y < height; y++) {
          byte();
          let x = 0;
          while (x < width) {
            const run = signed();
            if (!run) throw new Error('Empty FLC run');
            if (run > 0) {
              const value = byte();
              for (let i = 0; i < run; i++) put(y * width + x++, value);
            } else for (let i = 0; i < -run; i++) put(y * width + x++, byte());
          }
          if (x !== width) throw new Error('FLC row overflow');
        }
      } else if (type === 12) {
        const start = word(),
          lines = word();
        for (let y = start; y < start + lines; y++) {
          let x = 0;
          const packets = byte();
          for (let k = 0; k < packets; k++) {
            x += byte();
            const run = signed();
            if (run >= 0) for (let i = 0; i < run; i++) put(y * width + x++, byte());
            else {
              const value = byte();
              for (let i = 0; i < -run; i++) put(y * width + x++, value);
            }
          }
        }
      } else if (type === 7) {
        let lines = word(),
          y = 0;
        while (lines > 0) {
          const packets = word();
          if ((packets & 0xc000) === 0xc000) {
            y += 0x10000 - packets;
            continue;
          }
          if ((packets & 0xc000) === 0x8000) {
            put(y * width + width - 1, packets & 255);
            continue;
          }
          let x = 0;
          for (let k = 0; k < packets; k++) {
            x += byte();
            const run = signed();
            if (run >= 0) for (let i = 0; i < run * 2; i++) put(y * width + x++, byte());
            else {
              const a = byte(),
                b = byte();
              for (let i = 0; i < -run; i++) {
                put(y * width + x++, a);
                put(y * width + x++, b);
              }
            }
          }
          y++;
          lines--;
        }
      } else if (![18].includes(type)) throw new Error(`Unsupported FLC chunk ${type}`);
      p = limit;
    }
    frames.push({ pixels: pixels.slice(), palette: palette.slice() });
    at = end;
  }
  if (frames.length !== (allFrames ? count : 1)) throw new Error('Incomplete FLC frame sequence');
  return {
    width,
    height,
    frameCount: count,
    frameMs: magic === 0xaf11 ? (r.u16(16) * 1000) / 70 : r.u32(16),
    frames,
  };
}

export function inspectWave(bytes: Uint8Array) {
  const r = new BinaryReader(bytes),
    text = (p: number, n: number) => new TextDecoder().decode(r.slice(p, n));
  if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE' || r.u32(4) + 8 > bytes.length)
    throw new Error('Invalid RIFF WAVE');
  let format = 0,
    channels = 0,
    rate = 0,
    bits = 0,
    dataBytes = 0;
  const end = r.u32(4) + 8;
  for (let at = 12; at + 8 <= end;) {
    const id = text(at, 4),
      n = r.u32(at + 4);
    if (at + 8 + n > end) throw new Error('WAV chunk exceeds RIFF bounds');
    r.range(at + 8, n);
    if (id === 'fmt ') {
      if (n < 16) throw new Error('Short WAV format');
      format = r.u16(at + 8);
      channels = r.u16(at + 10);
      rate = r.u32(at + 12);
      bits = r.u16(at + 22);
    }
    if (id === 'data') {
      dataBytes = n;
      break;
    }
    at += 8 + n + (n & 1);
  }
  if (!format || !channels || !rate || !bits || !dataBytes) throw new Error('Incomplete WAV');
  return {
    format,
    channels,
    rate,
    bits,
    dataBytes,
    duration: format === 1 ? dataBytes / ((rate * channels * bits) / 8) : null,
  };
}
