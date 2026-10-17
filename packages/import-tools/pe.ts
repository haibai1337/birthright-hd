import { BinaryReader } from './binary.ts';
/** PE32 address translation only. This does not load, link, or execute the image. */
export function readPeStrings(bytes: Uint8Array) {
  const r = new BinaryReader(bytes);
  if (r.u16(0) !== 0x5a4d) throw new Error('Not an MZ/PE image');
  const pe = r.u32(60);
  if (r.u32(pe) !== 0x4550 || r.u16(pe + 24) !== 0x10b) throw new Error('Only PE32 is supported');
  const count = r.u16(pe + 6),
    optional = r.u16(pe + 20),
    base = r.u32(pe + 52);
  if (count < 1 || count > 96) throw new Error('Invalid PE section count');
  const sections = Array.from({ length: count }, (_, i) => {
    const at = pe + 24 + optional + i * 40;
    r.range(at, 40);
    return { rva: r.u32(at + 12), size: r.u32(at + 16), raw: r.u32(at + 20) };
  });
  return {
    base,
    stringAt(address: number) {
      const relative = address - base,
        section = sections.find((s) => relative >= s.rva && relative < s.rva + s.size);
      if (!section) throw new Error(`Unmapped PE string pointer ${address}`);
      const offset = section.raw + relative - section.rva;
      const text = r.string(offset, Math.min(128, section.size - relative + section.rva));
      return { text, offset };
    },
  };
}
