import { readFile } from 'node:fs/promises';
import { validateAnuireResearch } from '../world-data/anuire-research.ts';

const input = process.argv[2] ?? 'reference/extracted/anuire/anuire.research.json';
const data = validateAnuireResearch(JSON.parse(await readFile(input, 'utf8')));
console.log(
  JSON.stringify(
    {
      valid: true,
      provinces: data.campaign.provinces.length,
      realms: data.campaign.realms.length,
      regents: data.campaign.regents.length,
      holdings: data.campaign.holdings.length,
      geometries: data.map.geometries.length,
      warnings: data.validation.warnings,
      originalBehaviorUnresolved: data.validation.readinessBlockers,
    },
    null,
    2,
  ),
);
