import { BinaryReader, bits } from './binary.ts';
import { decodeCampaignBlocks } from './campaign.ts';

/** Compare stored blocks without trusting serialized pointers or executing a saved game. */
export function compareCampaigns(template: Uint8Array, other: Uint8Array) {
  const before = decodeCampaignBlocks(template),
    after = decodeCampaignBlocks(other);
  const a = new BinaryReader(template),
    b = new BinaryReader(other);
  const blocks = before.blocks.map((original) => {
    const saved = after.blocks.find((s) => s.name === original.name)!;
    const changedRows: number[] = [];
    for (let i = 0; i < Math.min(original.count, saved.count); i++) {
      const left = a.slice(original.offset + i * original.stride, original.stride),
        right = b.slice(saved.offset + i * saved.stride, saved.stride);
      if (left.some((v, n) => v !== right[n])) changedRows.push(i);
    }
    return {
      name: original.name,
      templateCount: original.count,
      savedCount: saved.count,
      changedRows,
    };
  });
  const provinceBlock = before.blocks.find((s) => s.name === 'provinces')!,
    savedProvinces = after.blocks.find((s) => s.name === 'provinces')!;
  const provinceChanges: { index: number; field: string; template: number; saved: number }[] = [];
  for (let i = 1; i < Math.min(provinceBlock.count, savedProvinces.count); i++) {
    const x = a.u32(provinceBlock.offset + i * 32 + 8),
      y = b.u32(savedProvinces.offset + i * 32 + 8);
    for (const [field, start, width] of [
      ['realmIndex', 0, 7],
      ['level', 7, 4],
      ['currentLevel', 11, 4],
      ['magic', 15, 4],
      ['tax', 19, 2],
      ['loyalty', 21, 2],
    ] as const) {
      const left = bits(x, start, width),
        right = bits(y, start, width);
      if (left !== right) provinceChanges.push({ index: i, field, template: left, saved: right });
    }
  }
  const templateRealms = before.blocks.find((s) => s.name === 'realms')!,
    savedRealms = after.blocks.find((s) => s.name === 'realms')!;
  const realmChanges: { index: number; field: string; template: number; saved: number }[] = [];
  for (let i = 1; i < Math.min(templateRealms.count, savedRealms.count); i++)
    for (const [field, offset] of [
      ['regency', 14],
      ['treasury', 16],
    ] as const) {
      const left = a.u16(templateRealms.offset + i * 20 + offset),
        right = b.u16(savedRealms.offset + i * 20 + offset);
      if (left !== right) realmChanges.push({ index: i, field, template: left, saved: right });
    }
  return {
    version: after.version,
    homeRealm: after.homeRealm,
    date: after.date,
    scenarioFlags: after.scenarioFlags,
    blocks,
    provinceChanges,
    realmChanges,
    characterTail: after.characterTail,
    note: 'Raw row differences include pointers, caches and runtime flags; semantic differences above exclude name pointers. Supplied quick-start saves are observations, not certified untouched New Game states.',
  };
}
