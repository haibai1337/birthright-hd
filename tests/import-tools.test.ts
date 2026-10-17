import { describe, expect, it } from 'vitest';
import { BinaryReader } from '../packages/import-tools/binary';
import { decodeStrings } from '../packages/import-tools/strings';
import {
  decodeLzss,
  decodeIndexedBitmap,
  decodeResourceDirectory,
} from '../packages/import-tools/resources';
import { decodeCampaignBlocks, parseAvatarText } from '../packages/import-tools/campaign';
import { readPeStrings } from '../packages/import-tools/pe';
import {
  rasterAdjacency,
  traceProvinceGeometry,
  signedArea,
} from '../packages/import-tools/geometry';
import { mergeGuideWindows, parsePcGuide } from '../packages/import-tools/guide';
import { parseAtlasProvinceRows } from '../packages/import-tools/atlas';
import { compareCampaigns } from '../packages/import-tools/compare-campaigns';

describe('bounded original-format readers with synthetic fixtures', () => {
  it('rejects out-of-bounds and unterminated binary reads', () => {
    const r = new BinaryReader(Uint8Array.of(65, 66));
    expect(() => r.u32(0)).toThrow('range');
    expect(() => r.string(0, 2)).toThrow('Unterminated');
    expect(() => r.range(-1, 1)).toThrow();
  });
  it('decodes literal, overlapping back-reference, and terminating LZSS tokens', () => {
    // Flags: literal A, literal B, backref 2 bytes with a six-byte run, EOS.
    const bytes = Uint8Array.of(0, 192, 65, 66, 1, 12, 0, 0, 0, 0);
    expect(new TextDecoder().decode(decodeLzss(bytes, 8))).toBe('ABABABAB');
    expect(() => decodeLzss(bytes, 7)).toThrow();
    expect(() => decodeLzss(Uint8Array.of(0, 0, 1, 0), 3)).toThrow('back reference');
    expect(() => decodeLzss(bytes.subarray(0, 6), 8)).toThrow();
    expect(() => decodeLzss(Uint8Array.from([...bytes, 1]), 8)).toThrow('terminator');
  });
  it('decodes exactly indexed bitmaps and rejects incompatible dimensions', () => {
    const bytes = new Uint8Array(14),
      v = new DataView(bytes.buffer);
    v.setInt16(0, 2, true);
    v.setInt16(2, 2, true);
    v.setInt16(8, 11, true);
    bytes.set([1, 2, 3, 4], 10);
    expect(decodeIndexedBitmap(bytes).pixels).toEqual(Uint8Array.of(1, 2, 3, 4));
    v.setInt16(0, 3, true);
    expect(() => decodeIndexedBitmap(bytes)).toThrow();
  });
  it('reads string IDs from the actual two-level group format, including partial final groups', () => {
    const text = new TextEncoder().encode('North\0South\0'),
      bytes = new Uint8Array(446 + 404 + text.length),
      v = new DataView(bytes.buffer);
    v.setUint32(0, 2, true);
    bytes[4] = 65;
    v.setUint16(44, 0, true);
    v.setUint32(46, 446, true);
    v.setUint32(446, text.length, true);
    v.setUint32(450, 0, true);
    v.setUint32(454, 6, true);
    bytes.set(text, 850);
    const result = decodeStrings(bytes);
    expect(result.entries.map((e) => e.text)).toEqual(['North', 'South']);
    expect(result.trailingBytes).toBe(0);
    v.setUint32(454, 999, true);
    expect(() => decodeStrings(bytes)).toThrow('outside group');
  });
  it('rejects malicious resource and PE headers', () => {
    expect(() => decodeResourceDirectory(new Uint8Array(12))).toThrow('header');
    expect(() => readPeStrings(new Uint8Array(64))).toThrow('MZ');
  });
  it('records serialized table dimensions rather than assuming a fixed unit pool', () => {
    const strides = [20, 14, 52, 52, 32, 20, 14, 56, 1, 52, 16],
      bytes = new Uint8Array(89 + strides.reduce((n, s) => n + 8 + s, 0)),
      v = new DataView(bytes.buffer);
    v.setUint32(0, 0x20051, true);
    let at = 89;
    for (const stride of strides) {
      v.setUint32(at, stride, true);
      v.setUint32(at + 4, 1, true);
      at += 8 + stride;
    }
    const result = decodeCampaignBlocks(bytes);
    expect(compareCampaigns(bytes, bytes).blocks.every((b) => b.changedRows.length === 0)).toBe(
      true,
    );
    expect(result.blocks[6]?.count).toBe(1);
    expect(result.characterTail.length).toBe(0);
    v.setUint32(89, 5000000, true);
    expect(() => decodeCampaignBlocks(bytes)).toThrow('layout');
  });
  it('parses textual character names and numeric tuples without evaluating input', () => {
    const lines = [
      '0',
      '99',
      '0',
      '11',
      '14',
      '13',
      '14',
      '14',
      '15',
      '4',
      'Synthetic Regent',
      '4',
      '0',
      '5',
      '38',
      '0',
      '14',
      '9',
      '18',
      '0',
      '0',
      '(0 0 0) (0 0 0)',
      '(0 0 0)',
      '0',
      '0 5 0',
      '-1 0 0',
      '1',
    ];
    const bytes = new TextEncoder().encode(lines.join('\n'));
    const a = parseAvatarText(bytes);
    expect(a.name).toBe('Synthetic Regent');
    expect(a.attributes.charisma).toBe(15);
    expect(a.classes[0]?.level).toBe(5);
    lines[3] = 'process.exit()';
    expect(() => parseAvatarText(new TextEncoder().encode(lines.join('\n')))).toThrow();
  });
});
describe('reproducible map digitization', () => {
  it('preserves a concave region and its exact area', () => {
    const map = { width: 3, height: 3, pixels: Uint8Array.of(1, 1, 0, 1, 0, 0, 1, 1, 1) };
    const g = traceProvinceGeometry(map, 1, [0, 0], 1);
    expect(g.pixelArea).toBe(6);
    expect(g.rings).toHaveLength(1);
    expect(signedArea(g.rings[0]!)).toBe(6);
    expect(g.centerValue).toBe(1);
  });
  it('preserves holes and disconnected islands instead of drawing imaginary connections', () => {
    const map = {
      width: 5,
      height: 3,
      pixels: Uint8Array.of(1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0),
    };
    const g = traceProvinceGeometry(map, 1, [0, 0], 1);
    expect(g.rings).toHaveLength(3);
    expect(g.pixelArea).toBe(9);
    expect(g.rings.reduce((n, r) => n + signedArea(r), 0)).toBe(9);
    expect(g.rings.some((r) => signedArea(r) < 0)).toBe(true);
  });
  it('does not interpret corner touches as a shared border', () => {
    const map = { width: 2, height: 2, pixels: Uint8Array.of(1, 0, 0, 2) };
    expect(rasterAdjacency(map, new Set([1, 2]))).toEqual([]);
    const edges = rasterAdjacency(
      { width: 2, height: 2, pixels: Uint8Array.of(1, 2, 1, 2) },
      new Set([1, 2]),
    );
    expect(edges).toEqual([{ provinces: [1, 2], sharedPixels: 2 }]);
  });
});
describe('secondary-source factual row parser', () => {
  it('extracts tabletop table facts separately, retaining unmapped holding abbreviations', () => {
    const data = parseAtlasProvinceRows(
      '<script>throw 1</script><tr><td>North (3/4)</td><td>MR (1)</td><td>IHH (2)</td><td>X (1)</td><td>RA (3)</td></tr><tr><td>Some prose (9/9)</td></tr>',
      'Fixture',
      'https://example.test/atlas',
    );
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      level: 3,
      sourcePotential: 4,
      confidence: 'SECONDARY_TABLETOP_ONLY',
      holdingCells: ['MR (1)', 'IHH (2)', 'X (1)', 'RA (3)'],
    });
  });
  it('merges overlap, retains line attribution, ignores prose and tutorial variants', () => {
    const rows = mergeGuideWindows([
      'L400: ==SYNTHETIC==\nL401:  North 3/4\nL402:  North, Law 2',
      'L402:  North, Law 2\nL403: prose\nL404: ==SYNTHETIC (Beginner Tutorial)==\nL405:  North 9/9',
    ]);
    const data = parsePcGuide(rows);
    expect(data.provinces).toHaveLength(1);
    expect(data.provinces[0]).toMatchObject({ line: 401, level: 3, magic: 4 });
    expect(data.holdings).toHaveLength(1);
    expect(() => mergeGuideWindows(['L400: A', 'L400: B'])).toThrow('Inconsistent');
  });
  it('requires the character stat heading before recognizing a semicolon as a name', () => {
    const data = parsePcGuide(
      mergeGuideWindows([
        'L3245: ==SYNTHETIC==\nL3246:  A warning; prose\nL3247:  More prose\nL3250:  Test Regent; description\nL3251: \nL3252:  Gender: Female\nL3253:  Strength: 14',
      ]),
    );
    expect(data.characters).toHaveLength(1);
    expect(data.characters[0]?.fields.Strength).toBe(14);
  });
});
