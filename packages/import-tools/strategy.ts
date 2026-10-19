import { createHash } from 'node:crypto';
import { validateAnuireResearch } from '../world-data/anuire-research.ts';

/** Read original packed records; the historical executable is never loaded or run. */
export function extractStrategyRecords(input: unknown, bytes: Uint8Array) {
  const raw = validateAnuireResearch(input),
    source = raw.sources.find((s) => s.id === 'cd-template')!;
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== source.sha256) throw Error('Strategy source differs from the campaign template');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const troops = raw.campaign.troops
    .filter((t) => t.kind === 'military')
    .map((t) => {
      const offset = t.offset;
      if (
        typeof offset !== 'number' ||
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset + 14 > bytes.length
      )
        throw Error(`Invalid original unit offset for ${t.id}`);
      const word = view.getUint32(offset, true),
        icon = (word >>> 22) & 127;
      if (view.getInt16(offset + 8, true) !== t.typeCode || ((word >>> 8) & 127) !== t.realmIndex)
        throw Error(`Military record identity mismatch at ${offset}`);
      if (icon < 1 || icon > 29) throw Error(`Unsupported military icon ${icon} at ${t.offset}`);
      return {
        id: t.id,
        nativeTypeCode: t.typeCode,
        icon,
        blessed: Boolean((view.getUint32(offset + 4, true) >>> 3) & 1),
        offset,
      };
    });
  return {
    format: 'birthright-hd-strategy-research' as const,
    version: 1 as const,
    sourceSha256: hash,
    troops,
  };
}
