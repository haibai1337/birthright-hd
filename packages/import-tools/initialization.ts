import { createHash } from 'node:crypto';
import { validateAnuireResearch } from '../world-data/anuire-research.ts';

/** Read-only audit: stored tenths are retained alongside their displayed GB interpretation. */
export function auditInitialization(input: unknown, bytes: Uint8Array) {
  const raw = validateAnuireResearch(input);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== raw.sources.find((s) => s.id === 'cd-template')?.sha256)
    throw Error('Initialization source differs from the recovered campaign template');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const realms = raw.campaign.realms.map((r) => {
    if (
      typeof r.offset !== 'number' ||
      !Number.isInteger(r.offset) ||
      r.offset < 0 ||
      r.offset + 20 > bytes.length
    )
      throw Error(`Invalid realm record offset: ${r.id}`);
    const treasuryTenths = view.getUint16(r.offset + 16, true);
    const regency = view.getUint16(r.offset + 14, true);
    if (treasuryTenths !== r.treasury || regency !== r.regency)
      throw Error(`Realm record accounting mismatch: ${r.id}`);
    return {
      id: r.id,
      index: r.index,
      offset: r.offset,
      treasuryTenths,
      treasuryGB: treasuryTenths / 10,
      regency,
      court: r.court,
      originallyPlayable: r.playable,
    };
  });
  return {
    format: 'birthright-hd-initialization-audit',
    version: 1,
    sourceSha256: hash,
    evidence: {
      commit: 'fc47055002c4b776bfb1e8737b5aaf7f6d43edce',
      initialization:
        'CHARSEL.CPP::NewGameConfirmed/NewGameConfirmed2/BeginRule2; LOADSAVE.CPP::LoadGameFiles',
      scale:
        'REALM.HXX::Treasury; MAPAI.CPP::CanAfford (Treasury / 10); action payments use GB * 10',
      limitation:
        'Historical source trace; not certification of retail execution or every difficulty branch.',
    },
    realms,
    nativeTreasuryMaximumGB: 6553.5,
    nativeRegencyMaximum: 65535,
  };
}
