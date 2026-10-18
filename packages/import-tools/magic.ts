import { validateAnuireResearch } from '../world-data/anuire-research.ts';
import { parseAvatarText } from './campaign.ts';

/** Text .INV inventories are one numeric item per non-comment line. No random additions. */
export function parseOriginalInventory(bytes: Uint8Array): number[] {
  const lines = new TextDecoder('windows-1252').decode(bytes).split('\x1a')[0]!.split(/\r?\n/);
  return lines.flatMap((line, i) => {
    const value = line.replace(/\/\/.*|#.*/, '').trim();
    if (!value) return [];
    if (!/^\d+$/.test(value) || Number(value) > 32767)
      throw Error(`Unsupported inventory record at line ${i + 1}`);
    return Number(value) > 0 ? [Number(value)] : [];
  });
}
export function extractMagicRecords(
  input: unknown,
  read: (name: string) => Uint8Array | undefined,
) {
  const data = validateAnuireResearch(input);
  const characters = data.campaign.regents.map((r) => {
    const inv = read(`SCENES/ID${r.avatarId}.INV`),
      ava = read(`SCENES/ID${r.avatarId}.AVA`);
    return {
      regentId: r.id,
      avatarId: r.avatarId,
      inventoryVerified: !!inv,
      itemIds: inv ? parseOriginalInventory(inv) : [],
      classes: ava ? parseAvatarText(ava).classes : [],
    };
  });
  const sources = data.campaign.holdings.filter((h) => h.type === 'source');
  const leyLines = sources.flatMap((h) =>
    [h.route1, h.route2, h.route3].filter(Boolean).map((index) => {
      const target = sources.find((s) => s.index === index);
      if (!target || target.realmIndex !== h.realmIndex || target.provinceIndex === h.provinceIndex)
        throw Error(`Unresolved original ley link ${h.index}/${index}`);
      return { realmIndex: h.realmIndex, fromHoldingId: h.id, toHoldingId: target.id };
    }),
  );
  return {
    format: 'birthright-hd-magic-research' as const,
    version: 1 as const,
    sourceSha256: data.sources.find((s) => s.id === 'cd-template')!.sha256,
    characters,
    leyLines,
  };
}
