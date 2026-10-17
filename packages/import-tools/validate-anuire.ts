import { readFile } from 'node:fs/promises';
import {
  validateAnuireResearch,
  projectVerifiedProvinceDefinitions,
} from '../world-data/anuire-research.ts';

const input = process.argv[2] ?? 'reference/extracted/anuire/anuire.research.json';
const data = validateAnuireResearch(JSON.parse(await readFile(input, 'utf8')));
const projection = projectVerifiedProvinceDefinitions(data);
console.log(
  JSON.stringify(
    {
      valid: true,
      provinces: data.campaign.provinces.length,
      realms: data.campaign.realms.length,
      regents: data.campaign.regents.length,
      holdings: data.campaign.holdings.length,
      geometries: data.map.geometries.length,
      projection: { accepted: projection.converted.length, blocked: projection.blocked.length },
      playable: false,
      blockers: data.validation.readinessBlockers,
    },
    null,
    2,
  ),
);
