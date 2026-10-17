import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

// Refresh six review records and the existing gallery; never generate or modify artwork.
const root = path.resolve('reference/assets');
const enhanced = path.join(root, 'enhanced');
const previous = JSON.parse(readFileSync(path.join(enhanced, 'mapping.json'), 'utf8'));
const selections = JSON.parse(readFileSync('packages/import-tools/art-selections.json', 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const selected = [
  [
    'SCRLBTN0',
    'Plain parchment scroll',
    { width: 256, height: 48 },
    [0, 153, 2164, 405.75],
    'Flat face and drawn outlines replaced the original rolled folds, texture and shadow depth.',
    'Restored fibrous face, worn rim and shaded roll. Slight edge-shape differences remain at 256 × 48.',
  ],
  [
    'SCRLBTN1',
    'Parchment scroll · purple ribbon',
    { width: 256, height: 48 },
    [0, 151, 2164, 405.75],
    'Geometric ribbon and beige fill lost the cloth, parchment folds and gold stud texture.',
    'Restored parchment and cloth grain with the original narrow purple band. Stud and ribbon geometry differ slightly from the source.',
  ],
  [
    'GOLD03_A',
    'Gold · three stacks',
    { width: 46, height: 32 },
    null,
    'Uniform ellipses and cylinders lost the original concentrated sparkle and irregular metallic shading.',
    'The earlier technical review noted coarse pixel blocks and silhouette differences at 46 × 32. The user has explicitly accepted this variant.',
  ],
  [
    'DTURN_BK',
    'Council parchment · embossed Birthright B',
    { width: 440, height: 600 },
    null,
    'Faint simplified monogram, artificial fibers and a generic braid lost the original embossed letter and complex ornament.',
    'Preserves the original B silhouette, bevels and narrow interlace in textured raster form. Red/gold saturation and relief are stronger than the source; this version is accepted by the user.',
  ],
  [
    'FILLPANL',
    'Dark woven leather',
    { width: 480, height: 360 },
    null,
    'Repeating geometric diamonds replaced irregular hide, deep crevices and the original vignette.',
    'Restored uneven leather grain, overlap shadows and the original central glow/dark corners. Fine grain is AI-interpreted; weave spacing and edge fidelity still need review.',
  ],
  [
    'CROWN_TL',
    'Embossed antique-brass crown',
    { width: 48, height: 48 },
    null,
    'Clean crown geometry and a smooth tile discarded the irregular engraved relief and brushed-metal field.',
    'Retains olive/brass hues, dark engraved edges and diagonal brushed shading. Small raised marks and point contours remain interpretive; compare at 48 × 48.',
  ],
];
const assets = {};
for (const [name, title, display, crop, previousReason, assessment] of selected) {
  const id = `UI/${name}.PCX`;
  const source = previous.assets[id];
  if (!source) throw Error(`Missing original mapping: ${id}`);
  if (sha(readFileSync(path.join(root, source.sourceFile))) !== source.sourceSha256)
    throw Error(`Original changed: ${id}`);
  const file = `restoration/${name}.png`;
  const selection = selections.assets[id];
  if (selection && selection.file !== file) throw Error(`Selection does not match this trial: ${id}`);
  const bytes = readFileSync(path.join(enhanced, file));
  assets[id] = {
    ...source,
    title,
    display,
    previousStatus: 'rejected',
    previousReason,
    restoration: {
      file,
      nativeSize: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) },
      sourceRect: crop,
      masterSha256: sha(bytes),
      status: selection?.status ?? 'pending-review',
      selection,
      method:
        'AI-assisted conservative raster restoration from the exact original PNG; no vector reconstruction or procedural replacement texture.',
      assessment,
      recommendedFile: selection ? `enhanced/${selection.file}` : source.sourceFile,
      limitation:
        'New fine detail is an artistic interpretation, not recovered source information. Originals are preserved; strategic UI adoption is a separate implementation step.',
    },
  };
}
const review = {
  version: 1,
  milestone: 'M1D-0B',
  originalAssetCount: previous.originalAssetCount,
  approvedForGame: Object.values(assets).filter(asset => asset.restoration.status === 'approved').length,
  awaitingArtReview: Object.values(assets).filter(asset => asset.restoration.status === 'pending-review').length,
  rejectedNewTrials: Object.values(assets).filter(asset => asset.restoration.status === 'rejected').length,
  adoptedByStrategicUI: false,
  retainedPortraits: {},
  assets,
};
for (const id of ['UI/LGLORDF2.PCX', 'UI/LGLORDM1.PCX']) {
  const portrait = previous.assets[id];
  if (sha(readFileSync(path.join(enhanced, portrait.file))) !== portrait.masterSha256)
    throw Error('Portrait master changed: ' + id);
  const selection = selections.assets[id];
  if (selection?.retainExisting && selection.file === portrait.file) review.retainedPortraits[id] = selection;
}
copyFileSync('packages/import-tools/art-selections.json', path.join(enhanced, 'selections.json'));
writeFileSync(path.join(enhanced, 'restorations.json'), JSON.stringify(review, null, 2) + '\n');
copyFileSync('packages/import-tools/enhancement-gallery.html', path.join(enhanced, 'index.html'));
writeFileSync(
  path.join(enhanced, 'README.md'),
  `# Artwork reviews\n\nUser selection: M1D-0B plain and purple-ribbon scrolls, the parchment/B panel and gold are approved. The gold decision explicitly overrides the earlier negative technical assessment. Both successful M1D-0 HD portraits are retained unchanged. Leather, crown and all other unlisted elements require individual selection by quality; no automatic adoption. Strategic UI integration has not been performed.\n\nThe default gallery compares six enlarged originals, rejected M1D-0 proposals and M1D-0B raster trials at equal dimensions. The original 24-item review remains available. Fine AI-painted detail is interpretation, not recovered evidence. All original assets and previous studies remain intact.\n\npackages/import-tools/art-selections.json is the persistent source for user decisions; selections.json is its local gallery copy. mapping.json preserves original source mappings; restorations.json adds review statuses and crop/display coordinates. Master PNGs and imagegen prompts are in restoration/. Transparent scroll margins are cropped only in browser presentation. Run node scripts/review-restorations.mjs to refresh review metadata and the gallery.\n`,
);
console.log(
  `Updated review: ${review.approvedForGame} restorations approved, ${review.awaitingArtReview} await individual review, ${Object.keys(review.retainedPortraits).length} HD portraits retained. No artwork modified.`,
);
