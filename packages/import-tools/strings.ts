import { BinaryReader } from './binary.ts';
export interface OriginalString {
  id: number;
  text: string;
  offset: number;
  group: number;
}
export interface StringCatalog {
  count: number;
  build: string;
  groups: number;
  entries: OriginalString[];
  trailingBytes: number;
}
export function decodeStrings(bytes: Uint8Array): StringCatalog {
  const r = new BinaryReader(bytes),
    count = r.u32(0),
    lastGroup = r.u16(44);
  if (count < 1 || count > 10000 || lastGroup >= 100 || lastGroup !== Math.floor((count - 1) / 100))
    throw new Error('Unsupported string catalog header');
  r.range(46, (lastGroup + 1) * 4);
  const entries: OriginalString[] = [];
  let previousEnd = 0;
  for (let group = 0; group <= lastGroup; group++) {
    const start = r.u32(46 + group * 4),
      size = r.u32(start),
      data = start + 404;
    if (start < 446 || start < previousEnd || size > bytes.length)
      throw new Error('Invalid string group offset');
    r.range(start, 404 + size);
    if (group < lastGroup && data + size !== r.u32(46 + (group + 1) * 4))
      throw new Error('Noncontiguous string group');
    for (let slot = 0; slot < Math.min(100, count - group * 100); slot++) {
      const relative = r.u32(start + 4 + slot * 4);
      if (relative >= size) throw new Error('String offset outside group');
      entries.push({
        id: group * 100 + slot,
        text: r.string(data + relative, size - relative),
        offset: data + relative,
        group,
      });
    }
    previousEnd = data + size;
  }
  return {
    count,
    build: r.string(4, 40),
    groups: lastGroup + 1,
    entries,
    trailingBytes: bytes.length - previousEnd,
  };
}
