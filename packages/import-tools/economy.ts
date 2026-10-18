import { BinaryReader, bits } from './binary.ts';
import { decodeCampaignBlocks } from './campaign.ts';

/** Read-only economic survey. All offsets refer to the input, never an executed program. */
export function decodeEconomicRecords(bytes: Uint8Array) {
  const r = new BinaryReader(bytes),
    layout = decodeCampaignBlocks(bytes);
  const block = (name: string) => layout.blocks.find((b) => b.name === name)!;
  const pb = block('provinces'),
    hb = block('places'),
    rb = block('realms'),
    tb = block('tribute');
  const provinces = Array.from({ length: pb.count - 1 }, (_, n) => {
    const index = n + 1,
      offset = pb.offset + index * pb.stride;
    return { index, firstPlace: r.i16(offset + 30) };
  });
  const places = Array.from({ length: hb.count }, (_, index) => {
    const offset = hb.offset + index * hb.stride,
      a = r.u32(offset + 4),
      b = r.u32(offset + 8);
    return {
      index,
      offset,
      realmIndex: bits(a, 0, 7),
      iconCode: bits(a, 11, 7),
      route1: bits(a, 18, 10),
      route2: bits(b, 0, 10),
      route3: bits(b, 10, 10),
      next: r.i16(offset + 12),
    };
  });
  const locations = new Map<number, number>();
  for (const p of provinces) {
    let index = p.firstPlace;
    while (index) {
      if (index < 0 || index >= places.length || locations.has(index))
        throw Error(`Invalid/shared/cyclic place chain ${p.index}/${index}`);
      locations.set(index, p.index);
      const relative = places[index]!.next;
      index = relative ? p.firstPlace + relative : 0;
    }
  }
  const ports = places
    .filter((p) => [94, 95, 96].includes(p.iconCode))
    .map((p) => ({ ...p, provinceIndex: locations.get(p.index) ?? null }));
  if (ports.some((p) => p.provinceIndex === null || p.realmIndex < 1 || p.realmIndex >= rb.count))
    throw Error('Unresolved port ownership/location');
  const courts = Array.from({ length: rb.count - 1 }, (_, n) => {
    const index = n + 1,
      offset = rb.offset + index * rb.stride;
    return { realmIndex: index, offset, court: bits(r.u32(offset + 8), 28, 3) };
  });
  const tributes = [];
  for (let payer = 1; payer < tb.count; payer++)
    for (let recipient = 1; recipient < tb.stride; recipient++) {
      const amount = r.u8(tb.offset + payer * tb.stride + recipient);
      if (amount) tributes.push({ payer, recipient, amount });
    }
  return {
    ports,
    courts,
    guildRoutes: places
      .filter((p) => p.iconCode === 107)
      .map((p) => ({ ...p, provinceIndex: locations.get(p.index) ?? null })),
    tributes,
  };
}
