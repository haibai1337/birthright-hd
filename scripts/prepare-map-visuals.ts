import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extractMapLocations } from '../packages/import-tools/map-visuals.ts';
import { OriginalDisc } from '../packages/import-tools/disc.ts';
const disc = new OriginalDisc(process.argv[2] ?? 'reference/original/RPGBGA.BIN');
try {
  const data = extractMapLocations(
    JSON.parse(await readFile('reference/extracted/anuire/anuire.research.json', 'utf8')),
    await readFile('reference/extracted/disc/RLMSTART.DAT'),
    disc.file('RESFILES/UI.RES'),
  );
  await mkdir('reference/assets/relief', { recursive: true });
  await writeFile('reference/assets/relief/locations.json', JSON.stringify(data, null, 2) + '\n');
  console.log(
    JSON.stringify({
      locations: data.locations.length,
      ports: data.locations.filter((p) => p.icon !== 93).length,
      structures: data.structures.length,
      graphics: data.graphics,
      output: 'reference/assets/relief/locations.json',
    }),
  );
} finally {
  disc.close();
}
