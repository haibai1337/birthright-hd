import { mkdir, writeFile } from 'node:fs/promises';
// Original 32x32 BGRA icon; a shield and crown with no external artwork.
const size = 32,
  bitmap = Buffer.alloc(40 + size * size * 4 + size * 4);
bitmap.writeUInt32LE(40, 0);
bitmap.writeInt32LE(size, 4);
bitmap.writeInt32LE(size * 2, 8);
bitmap.writeUInt16LE(1, 12);
bitmap.writeUInt16LE(32, 14);
bitmap.writeUInt32LE(size * size * 4, 20);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const shield =
      x >= 5 && x <= 26 && y >= 3 && y < 23 && Math.abs(x - 15.5) < (y < 18 ? 11 : 33 - y);
    const border =
      shield && (x === 5 || x === 26 || y === 3 || (y >= 19 && Math.abs(x - 15.5) > 31 - y));
    const crown =
      shield &&
      y >= 10 &&
      y <= 20 &&
      x >= 9 &&
      x <= 22 &&
      (y >= 16 || (y <= 16 && (x < 12 || x > 19 || Math.abs(x - 15.5) < (17 - y) / 2)));
    const c = border || crown ? [132, 192, 222, 255] : shield ? [75, 64, 38, 255] : [0, 0, 0, 0];
    const at = 40 + ((size - 1 - y) * size + x) * 4;
    for (let i = 0; i < 4; i++) bitmap[at + i] = c[i];
  }
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = size;
header[7] = size;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(bitmap.length, 14);
header.writeUInt32LE(22, 18);
await mkdir('apps/game/src-tauri/icons', { recursive: true });
await writeFile('apps/game/src-tauri/icons/icon.ico', Buffer.concat([header, bitmap]));
