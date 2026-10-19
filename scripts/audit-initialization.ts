import { readFile, writeFile } from 'node:fs/promises';
import { auditInitialization } from '../packages/import-tools/initialization.ts';
const report = auditInitialization(
  JSON.parse(await readFile('reference/extracted/anuire/anuire.research.json', 'utf8')),
  await readFile('reference/extracted/disc/RLMSTART.DAT'),
);
const output = 'reference/extracted/anuire/initialization.research.json';
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({
    output,
    verifiedRealms: report.realms.length,
    startingTreasuriesGB: [...new Set(report.realms.map((r) => r.treasuryGB))],
    nativeTreasuryMaximumGB: report.nativeTreasuryMaximumGB,
  }),
);
