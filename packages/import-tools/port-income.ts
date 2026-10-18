import { BinaryReader } from './binary.ts';

/** Narrow static x86 recognizer; reads PE32 code as bytes, never loads or executes it.
 * Refuse other instruction layouts instead of inferring behavior from nearby constants.
 */
export function inspectPortIncome(bytes: Uint8Array) {
  const r = new BinaryReader(bytes);
  if (r.u16(0) !== 0x5a4d) throw Error('Not an MZ image');
  const pe = r.u32(60);
  if (r.u32(pe) !== 0x4550 || r.u16(pe + 24) !== 0x10b) throw Error('Expected PE32');
  const count = r.u16(pe + 6),
    optionalSize = r.u16(pe + 20),
    base = r.u32(pe + 52);
  if (count < 1 || count > 96) throw Error('Invalid PE section count');
  const matches = [];
  for (let s = 0; s < count; s++) {
    const header = pe + 24 + optionalSize + s * 40;
    r.range(header, 40);
    if (!(r.u32(header + 36) & 0x20000000)) continue;
    const raw = r.u32(header + 20),
      size = r.u32(header + 16),
      rva = r.u32(header + 12);
    r.range(raw, size);
    const has = (at: number, expected: number[]) => expected.every((v, i) => bytes[at + i] === v);
    for (let at = raw; at + 68 <= raw + size; at++) {
      // cmp r32,94; je collect; cmp same-r32,96; jne skip; collect: ...
      if (
        bytes[at] !== 0x83 ||
        r.u8(at + 1) < 0xf8 ||
        r.u8(at + 1) > 0xff ||
        r.u8(at + 2) !== 94 ||
        bytes[at + 3] !== 0x74 ||
        bytes[at + 5] !== 0x83 ||
        bytes[at + 6] !== bytes[at + 1] ||
        bytes[at + 7] !== 96 ||
        !has(at + 8, [0x0f, 0x85])
      )
        continue;
      const collect = at + 5 + ((r.u8(at + 4) << 24) >> 24),
        skip = at + 14 + (r.u32(at + 10) | 0);
      if (collect !== at + 14 || skip < at + 68 || skip >= raw + size) continue;
      // Exact register operations: province record stride 32; read flags; extract
      // bits 7..10 with shl 21 / shr 28; add to, then store, the same accumulator.
      const p = collect;
      if (
        !has(p, [0x31, 0xc0, 0x8a, 0x85]) ||
        !has(p + 8, [0xc1, 0xe0, 5, 0x8b, 0x80]) ||
        !has(p + 17, [0xc1, 0xe0, 21, 0x8b, 0x15]) ||
        !has(p + 26, [0xc1, 0xe8, 28, 0x01, 0xc2]) ||
        !has(p + 31, [0x8b, 0x5d]) ||
        !has(p + 34, [0x89, 0x15]) ||
        r.u32(p + 22) !== r.u32(p + 36)
      )
        continue;
      const address = (offset: number) => base + rva + offset - raw;
      matches.push({
        selectorFileOffset: at,
        selectorAddress: address(at),
        collectAddress: address(collect),
        skipAddress: address(skip),
        acceptedIconCodes: [94, 96],
        excludedPortIconCodes: [95],
        provinceRecordStride: 32,
        provinceFlagsAddress: r.u32(p + 13),
        levelField: { bitOffset: 7, width: 4 },
        tradeAccumulatorAddress: r.u32(p + 22),
        acceptedPortContribution: 'province-level',
        excludedPortContribution: 0,
      });
    }
  }
  if (matches.length !== 1)
    throw Error(`Unsupported/ambiguous accounting layout: ${matches.length} sites`);
  return matches[0]!;
}
