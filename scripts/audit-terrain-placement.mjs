// Read-only audit of the local retail map through the same Vite module as the game.
// Usage: node scripts/audit-terrain-placement.mjs [server URL] [output JSON]
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createServer } from 'vite';

const local = process.argv.includes('--local'),
  args = process.argv.slice(2).filter((a) => a !== '--local');
const server = local
  ? await createServer({
      configFile: 'apps/game/vite.config.ts',
      cacheDir: '../../tmp/terrain-audit-cache',
      server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, watch: null },
      clearScreen: false,
    })
  : null;
if (server) await server.listen();
const url = server ? server.resolvedUrls.local[0] : (args[0] ?? 'http://127.0.0.1:5173');
const output = (local ? args[0] : args[1]) ?? 'test-results/m1c1b/terrain-audit.json';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url);
  const report = await page.evaluate(async () => {
    const source = await fetch('/original/anuire.research.json').then((r) => {
      if (!r.ok) throw Error('Import the private original campaign/map first');
      return r.json();
    });
    // Vite serves workspace packages through /@fs rather than the app's public root.
    const appSource = await fetch('/src/MapPanel.tsx').then((r) => r.text());
    const renderer = appSource.match(
      /from\s+["']([^"']*packages\/rendering\/world-map\.ts[^"']*)["']/,
    )?.[1];
    if (!renderer) throw Error('Cannot locate the existing map renderer module');
    const moduleUrl = new URL(
      renderer.replace(/world-map\.ts.*$/, 'terrain-placement.ts'),
      location.href,
    );
    const { traceWater, traceTerrain, auditTerrainPlacement, terrainFrameBounds } = await import(
      /* @vite-ignore */ moduleUrl.href
    );
    const image = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(Error('Missing decoded LGMAP.PCX'));
      im.src = '/original/images/MAP/LGMAP.PCX.png';
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const aspects = {};
    for (const [kind, file] of [
      ['forest', 'woodland-atlas.png'],
      ['ridge', 'relief-atlas.png'],
    ]) {
      const atlas = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = '/art/anuire/' + file;
      });
      const c = document.createElement('canvas');
      c.width = atlas.width;
      c.height = atlas.height;
      const cx = c.getContext('2d');
      cx.drawImage(atlas, 0, 0);
      aspects[kind] = terrainFrameBounds(
        cx.getImageData(0, 0, c.width, c.height).data,
        c.width,
        c.height,
      ).map((b) => b.height / b.width);
    }
    const types = ['', 'forest', 'plains', 'mountains', 'heavy-mountains', 'swamp', 'hills'];
    const scenario = {
      provinces: source.campaign.provinces.map((p) => {
        const rings = source.map.geometries.find((g) => g.provinceIndex === p.index).rings;
        return { ...p, terrain: types[p.terrainCode], polygon: rings[0], rings };
      }),
    };
    const before = JSON.stringify(scenario),
      start = performance.now();
    const waterBodies = [],
      water = traceWater(pixels, image.width, image.height, scenario.provinces, waterBodies);
    const anchors = traceTerrain(pixels, image.width, image.height, scenario, water, aspects);
    const placementMs = performance.now() - start;
    const repeat = traceTerrain(pixels, image.width, image.height, scenario, water, aspects);
    const audit = auditTerrainPlacement(scenario, anchors);
    const locations = await fetch('/original/relief/locations.json').then((r) => r.json());
    const ports = locations.locations.map((p) => {
      let nearest = Infinity;
      for (let y = Math.max(0, p.y - 128); y < Math.min(image.height, p.y + 129); y++)
        for (let x = Math.max(0, p.x - 128); x < Math.min(image.width, p.x + 129); x++)
          if (water[y * image.width + x]) nearest = Math.min(nearest, Math.hypot(x - p.x, y - p.y));
      const province = source.campaign.provinces.find((d) => d.id === p.provinceId);
      return {
        ...p,
        name: province.name,
        realmIndex: province.realmIndex,
        nearestWater: Number.isFinite(nearest) ? nearest : null,
      };
    });
    const route = [173, 180, 178, 181, 179],
      range = route.slice(1).map((n, i) => {
        const a = anchors.filter(
            (a) => a.kind === 'ridge' && a.provinceId === `anuire-province-${route[i]}`,
          ),
          b = anchors.filter((a) => a.kind === 'ridge' && a.provinceId === `anuire-province-${n}`);
        let gap = Infinity;
        for (const aa of a)
          for (const bb of b) gap = Math.min(gap, Math.hypot(aa.x - bb.x, aa.y - bb.y));
        return { from: route[i], to: n, gap: Number.isFinite(gap) ? gap : null };
      });
    return {
      map: { width: image.width, height: image.height },
      source: source.sources,
      ...audit,
      ports,
      waterBodies,
      easternRange: range,
      // Small boundary outcrops are allowed, but remain a short review list.
      reviewOutcrops: audit.provinces
        .filter((p) => p.ridges && !['mountains', 'heavy-mountains'].includes(p.terrain))
        .map((p) => ({
          name: p.name,
          terrain: p.terrain,
          anchors: anchors.filter((a) => a.provinceId === p.id && a.kind === 'ridge'),
        })),
      deterministic: JSON.stringify(anchors) === JSON.stringify(repeat),
      sourceUnchanged: before === JSON.stringify(scenario),
      placementMs,
      anchors,
    };
  });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        output,
        provinces: report.provinces.length,
        objects: report.total,
        evidence: report.evidence,
        suspicious: report.suspicious,
        reviewedOutcrops: report.reviewOutcrops.map((p) => ({
          name: p.name,
          terrain: p.terrain,
          count: p.anchors.length,
        })),
        ports: report.ports,
        easternRange: report.easternRange,
        confirmedWaterBodies: report.waterBodies.filter((b) => b.water).length,
        outsideProvinces: report.outsideProvinces,
        fittedFootprints: report.footprintFits.length,
        deterministic: report.deterministic,
        sourceUnchanged: report.sourceUnchanged,
        placementMs: report.placementMs,
      },
      null,
      2,
    ),
  );
  if (
    !report.deterministic ||
    !report.sourceUnchanged ||
    report.outsideProvinces ||
    report.provinces.some((p) => p.incompatible.length) ||
    report.ports.some((p) => p.nearestWater === null || p.nearestWater > 20)
  )
    process.exitCode = 1;
} finally {
  await browser.close();
  if (server) await server.close();
}
