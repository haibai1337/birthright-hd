import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { BinaryReader } from './binary.ts';
export interface DiscEntry {
  name: string;
  extent: number;
  bytes: number;
  directory: boolean;
}
export class OriginalDisc {
  private fd: number;
  private size: number;
  readonly entries: DiscEntry[] = [];
  readonly volume: string;
  private raw: boolean;
  constructor(file: string, raw = true) {
    this.raw = raw;
    this.fd = openSync(file, 'r');
    this.size = fstatSync(this.fd).size;
    try {
      const pvd = new BinaryReader(this.read(16 * 2048, 2048));
      if (new TextDecoder().decode(pvd.slice(1, 5)) !== 'CD001' || pvd.u8(0) !== 1)
        throw new Error('Not a primary ISO9660 volume');
      this.volume = new TextDecoder().decode(pvd.slice(40, 32)).trim();
      const visited = new Set<number>();
      const walk = (extent: number, length: number, prefix: string, depth: number) => {
        if (depth > 16 || this.entries.length > 100000 || length > 16_000_000)
          throw new Error('ISO traversal limits exceeded');
        if (visited.has(extent)) return;
        visited.add(extent);
        const r = new BinaryReader(this.read(extent * 2048, length));
        for (let at = 0; at < length;) {
          const n = r.u8(at);
          if (n === 0) {
            at = (Math.floor(at / 2048) + 1) * 2048;
            continue;
          }
          if (n < 34) throw new Error('Invalid ISO record');
          r.range(at, n);
          const nameLength = r.u8(at + 32);
          if (33 + nameLength > n) throw new Error('Invalid ISO filename length');
          const name = new TextDecoder().decode(r.slice(at + 33, nameLength)).replace(/;\d+$/, '');
          const item = {
            name: prefix + name,
            extent: r.u32(at + 2),
            bytes: r.u32(at + 10),
            directory: Boolean(r.u8(at + 25) & 2),
          };
          at += n;
          if (name === '\0' || name === '\x01') continue;
          if (name === '.' || name === '..' || /[\\/:]/.test(name))
            throw new Error('Unsafe ISO path');
          this.entries.push(item);
          if (item.directory) walk(item.extent, item.bytes, item.name + '/', depth + 1);
        }
      };
      walk(pvd.u32(158), pvd.u32(166), '', 0);
    } catch (e) {
      closeSync(this.fd);
      throw e;
    }
  }
  read(offset: number, length: number): Uint8Array {
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(length) ||
      offset < 0 ||
      length < 0 ||
      length > 256_000_000
    )
      throw new Error('Invalid disc read');
    const data = new Uint8Array(length);
    let done = 0;
    while (done < length) {
      const sector = Math.floor((offset + done) / 2048),
        within = (offset + done) % 2048,
        n = Math.min(length - done, 2048 - within),
        physical = this.raw ? sector * 2352 + 16 + within : offset + done;
      if (physical + n > this.size || readSync(this.fd, data, done, n, physical) !== n)
        throw new Error('Truncated disc data');
      done += n;
    }
    return data;
  }
  file(name: string) {
    const entry = this.entries.find(
      (e) => !e.directory && e.name.toUpperCase() === name.toUpperCase(),
    );
    if (!entry) throw new Error(`Missing CD member: ${name}`);
    return this.read(entry.extent * 2048, entry.bytes);
  }
  filePrefix(name: string, length: number) {
    const entry = this.entries.find(
      (e) => !e.directory && e.name.toUpperCase() === name.toUpperCase(),
    );
    if (!entry) throw new Error(`Missing CD member: ${name}`);
    return this.read(entry.extent * 2048, Math.min(length, entry.bytes));
  }
  close() {
    closeSync(this.fd);
  }
}
