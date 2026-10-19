import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Scenario } from '../core/schema';
import { provinceRings } from '../core/geometry';
import { TiledTerrainBase } from './tiled-terrain';
import { shorelineDistance, type TerrainPilotPatch } from './base-terrain';
import { createThoralinarPilot, thoralinarPilot } from './terrain-pilot';
import { keepsReliefOverlay, type LandscapeMaterials } from './connected-terrain';
import { forestCharacterAt, isForestClearing } from './terrain-regions';
import landmarkSelections from '../import-tools/landmark-selections.json';

import {
  traceTerrain,
  traceWater,
  terrainFrameBounds,
  terrainFootprint,
  type TerrainAnchor,
} from './terrain-placement';
export { traceTerrain, traceWater } from './terrain-placement';
export type { TerrainAnchor } from './terrain-placement';

export const terrainAssets = {
  // Retained geometry master: new artwork must not retrace/shrink forest footprints.
  forest: '/art/anuire/woodland-atlas.png',
  ridge: '/art/anuire/relief-atlas.png',
  sites: '/art/anuire/settlement-atlas.png',
  ground: '/art/anuire/meadow-material.png',
};
const forestVariants = [
  '/art/anuire/woodland-fine-atlas.png',
  '/art/anuire/woodland-dread-atlas.png',
  '/art/anuire/woodland-blighted-atlas.png',
];
/** Shared atlas frames reference a single GPU texture; transparent margins are trimmed per cell. */
function atlasFrames(texture: Texture, columns: number, rows: number, findGaps = rows === 3) {
  const image = texture.source.resource as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = texture.width;
  canvas.height = texture.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return terrainFrameBounds(data, canvas.width, canvas.height, columns, rows, findGaps).map(
    (b) =>
      new Texture({ source: texture.source, frame: new Rectangle(b.x, b.y, b.width, b.height) }),
  );
}

export class TerrainIllustration {
  readonly objects = new Container();
  private readonly base = new TiledTerrainBase(() => this.changed());
  readonly ground = this.base.ground;
  readonly water = this.base.water;
  anchors: TerrainAnchor[] = [];
  locations: { sourceId: string; provinceId: string; x: number; y: number; icon: number }[] = [];
  get waterTexture() {
    return this.base.waterTexture;
  }
  get oceanTexture() {
    return this.base.oceanTexture;
  }
  get baseStats() {
    return this.base.stats;
  }
  constructor(private changed: () => void = () => {}) {}
  private buildings: Texture[] = [];
  private landmarks = new Map<string, Texture>();
  private blendedTrees = new Map<string, Texture>();
  private environmental: {
    sprite: Sprite;
    bounds: Pick<ReturnType<typeof terrainFootprint>, 'left' | 'right' | 'top' | 'bottom'>;
  }[] = [];
  private smallTreeCanopy(source: Texture, trees: Texture[], anchor: TerrainAnchor) {
    // Spiderfell's approved crowns come from roughly 46-world-unit groups.
    // Fill the SAME alpha silhouette with groups at that scale, rather than
    // shrinking a whole forest sprite and exposing its ground coverage.
    const density = Math.max(1, Math.round((anchor.width / 46) * 2) / 2);
    if (density === 1) return source;
    const key = `small-crowns-${anchor.variant}-${density}`;
    const cached = this.blendedTrees.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(46 * density * 4);
    canvas.height = Math.round((canvas.width * source.height) / source.width);
    const cx = canvas.getContext('2d')!;
    cx.fillStyle = '#30422b';
    cx.fillRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width / density,
      h = (w * source.height) / source.width;
    const variants = [0, 1, 2, 4, 6, 9, 11];
    for (let row = -3; row * h * 0.34 < canvas.height + h; row++)
      for (let column = -3; column * w * 0.38 < canvas.width + w; column++) {
        let seed =
          Math.imul(row + 71 + anchor.variant, 374761393) ^ Math.imul(column + 29, 668265263);
        seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
        const hash = (seed ^ (seed >>> 16)) >>> 0,
          tree = trees[variants[hash % variants.length]!]!,
          f = tree.frame;
        const x = column * w * 0.38 + ((hash % 17) / 100) * w,
          y = row * h * 0.34 + (((hash >>> 8) % 17) / 100) * h;
        cx.drawImage(
          tree.source.resource as HTMLImageElement,
          f.x,
          f.y,
          f.width,
          f.height,
          x - w / 2,
          y - h * 0.64,
          w,
          h,
        );
      }
    const f = source.frame;
    cx.globalCompositeOperation = 'destination-in';
    cx.drawImage(
      source.source.resource as HTMLImageElement,
      f.x,
      f.y,
      f.width,
      f.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    this.blendedTrees.set(key, texture);
    return texture;
  }
  /** The requested continuous Spiderfell canopy is a local HD override. Bake
   * overlapping, clearing-free small crowns once; the native polygon and water
   * mask trim its extent without changing either source data or other forests.
   */
  private spiderfellCanopy(
    scenario: Scenario,
    frames: Texture[],
    water: Uint8Array,
    worldWidth: number,
  ) {
    const province = scenario.provinces.find((p) => p.id === 'anuire-province-025');
    if (!province) return false;
    const rings = provinceRings(province),
      points = rings.flat();
    const left = Math.floor(Math.min(...points.map((p) => p[0]))) - 8,
      top = Math.floor(Math.min(...points.map((p) => p[1]))) - 8,
      width = Math.ceil(Math.max(...points.map((p) => p[0]))) - left + 8,
      height = Math.ceil(Math.max(...points.map((p) => p[1]))) - top + 8;
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const mc = mask.getContext('2d', { willReadFrequently: true })!;
    mc.beginPath();
    for (const ring of rings) {
      ring.forEach(([x, y], i) =>
        i ? mc.lineTo(x - left, y - top) : mc.moveTo(x - left, y - top),
      );
      mc.closePath();
    }
    mc.fillStyle = '#fff';
    mc.fill('evenodd');
    const maskPixels = mc.getImageData(0, 0, width, height),
      outside = new Uint8Array(width * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        outside[i] = Number(
          maskPixels.data[i * 4 + 3]! < 128 || Boolean(water[(top + y) * worldWidth + left + x]),
        );
      }
    const distance = shorelineDistance(outside, width, height);
    for (let i = 0; i < outside.length; i++)
      maskPixels.data[i * 4 + 3] = outside[i]
        ? 0
        : Math.round(Math.min(1, Math.max(0, distance[i]! / 4)) * 255);
    mc.putImageData(maskPixels, 0, 0);

    const canvas = document.createElement('canvas'),
      resolution = 4;
    canvas.width = width * resolution;
    canvas.height = height * resolution;
    const cx = canvas.getContext('2d')!;
    cx.scale(resolution, resolution);
    cx.fillStyle = '#263229';
    cx.fillRect(0, 0, width, height);
    // Solid-canopy atlas cells only: overlapping rows cover the old open gaps.
    const variants = [0, 1, 2, 4, 6, 9, 11];
    for (let row = -2; row * 10 < height + 24; row++)
      for (let column = -2; column * 14 < width + 24; column++) {
        let seed = Math.imul(row + 91, 374761393) ^ Math.imul(column + 137, 668265263);
        seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
        const hash = (seed ^ (seed >>> 16)) >>> 0,
          texture = frames[variants[hash % variants.length]!]!,
          f = texture.frame,
          w = 42 + (hash % 9),
          h = ((w * texture.height) / texture.width) * 0.72,
          x = column * 14 + (row % 2) * 7 + ((hash >>> 8) % 14),
          y = row * 10 + ((hash >>> 16) % 10);
        cx.drawImage(
          texture.source.resource as HTMLImageElement,
          f.x,
          f.y,
          f.width,
          f.height,
          x - w / 2,
          y - h * 0.64,
          w,
          h,
        );
      }
    cx.globalCompositeOperation = 'destination-in';
    cx.drawImage(mask, 0, 0);
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    this.blendedTrees.set('spiderfell-continuous-canopy', texture);
    const sprite = new Sprite(texture);
    sprite.position.set(left, top);
    sprite.width = width;
    sprite.height = height;
    sprite.zIndex = top;
    this.objects.addChild(sprite);
    this.environmental.push({
      sprite,
      bounds: { left, top, right: left + width, bottom: top + height },
    });
    return true;
  }
  private forestTexture(frames: Texture[][], anchor: TerrainAnchor) {
    const character = forestCharacterAt(anchor.x, anchor.y),
      level = Math.round(Math.abs(character) * 4),
      kind = character < 0 ? 1 : 2,
      healthy = frames[0]![anchor.variant]!,
      altered = frames[kind]![anchor.variant]!;
    if (!level) return this.smallTreeCanopy(healthy, frames[0]!, anchor);
    if (level === 4) return altered;
    const key = `${kind}-${anchor.variant}-${level}`;
    const existing = this.blendedTrees.get(key);
    if (existing) return existing;
    // Bake a few shared crossfades once, retaining one sprite per original anchor.
    // No per-frame filters, extra tree objects, or reduced woodland footprints.
    const canvas = document.createElement('canvas');
    canvas.width = healthy.width;
    canvas.height = healthy.height;
    const context = canvas.getContext('2d')!;
    for (const [texture, opacity] of [
      [healthy, 1 - level / 4],
      [altered, level / 4],
    ] as const) {
      const f = texture.frame;
      context.globalAlpha = opacity;
      context.globalCompositeOperation = 'lighter';
      context.drawImage(
        texture.source.resource as HTMLImageElement,
        f.x,
        f.y,
        f.width,
        f.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    this.blendedTrees.set(key, texture);
    return texture;
  }
  private clearForestEdges(
    source: Texture,
    anchor: TerrainAnchor,
    clearings: Scenario['provinces'],
  ) {
    const bounds = terrainFootprint(anchor),
      overlaps = clearings.filter((p) => {
        const points = provinceRings(p).flat();
        return (
          Math.min(...points.map((p) => p[0])) < bounds.right &&
          Math.max(...points.map((p) => p[0])) > bounds.left &&
          Math.min(...points.map((p) => p[1])) < bounds.bottom &&
          Math.max(...points.map((p) => p[1])) > bounds.top
        );
      });
    if (!overlaps.length) return source;
    // Bake incompatible terrain transitions once, retaining continuity between
    // neighboring forest provinces. No per-frame masks or political divisions.
    const canvas = document.createElement('canvas'),
      resolution = 4;
    canvas.width = Math.ceil(anchor.width * resolution);
    canvas.height = Math.ceil(bounds.height * resolution);
    const cx = canvas.getContext('2d')!,
      f = source.frame;
    cx.drawImage(
      source.source.resource as HTMLImageElement,
      f.x,
      f.y,
      f.width,
      f.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    cx.scale(canvas.width / anchor.width, canvas.height / bounds.height);
    cx.translate(-bounds.left, -bounds.top);
    cx.globalCompositeOperation = 'destination-out';
    cx.fillStyle = '#fff';
    for (const p of overlaps) {
      cx.beginPath();
      for (const ring of provinceRings(p)) {
        ring.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y)));
        cx.closePath();
      }
      cx.fill('evenodd');
    }
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    this.blendedTrees.set(`cleared-${anchor.x}-${anchor.y}`, texture);
    return texture;
  }
  private pilotCrest(source: Texture, landscape = false) {
    // Preserve an elevated painted crest, feathering away its old ground pedestal.
    const frame = source.frame,
      key = `${landscape ? 'landscape' : 'thoralinar'}-crest-${frame.x}-${frame.y}`;
    const cached = this.blendedTrees.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const cx = canvas.getContext('2d')!;
    cx.drawImage(
      source.source.resource as HTMLImageElement,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const image = cx.getImageData(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      const t = Math.max(
          0,
          Math.min(1, (y / canvas.height - (landscape ? 0.45 : 0.28)) / (landscape ? 0.49 : 0.32)),
        ),
        alpha = 1 - t * t * (3 - 2 * t);
      for (let x = 0; x < canvas.width; x++) image.data[(y * canvas.width + x) * 4 + 3]! *= alpha;
    }
    cx.putImageData(image, 0, 0);
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'linear';
    this.blendedTrees.set(key, texture);
    return texture;
  }
  async load(base: Texture, scenario: Scenario) {
    const locations = await fetch('/original/relief/locations.json');
    if (locations.ok) {
      const input = await locations.json();
      const raw = scenario.originalData as
        { sources?: { id: string; sha256: string }[] } | undefined;
      if (
        input.sourceSha256 === raw?.sources?.find((s) => s.id === 'cd-template')?.sha256 &&
        input.width === base.width &&
        input.height === base.height
      )
        this.locations = input.locations.filter(
          (p: { x: number; y: number; provinceId: string }) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            scenario.provinces.some((d) => d.id === p.provinceId),
        );
    }
    const [forest, ridge, buildings, ground, ...woodland] = await Promise.all(
      [...Object.values(terrainAssets), ...forestVariants].map((url) => Assets.load<Texture>(url)),
    );
    for (const t of [forest!, ridge!, buildings!, ...woodland]) t.source.scaleMode = 'linear';
    const trees = atlasFrames(forest!, 4, 3),
      rocks = atlasFrames(ridge!, 4, 3),
      treeArt = woodland.map((t) => atlasFrames(t, 4, 3));
    this.buildings = atlasFrames(buildings!, 4, 2);
    const castleDefinition = landmarkSelections.ordinaryCastles;
    const castleAtlas = await Assets.load<Texture>('/art/anuire/' + castleDefinition.file);
    castleAtlas.source.scaleMode = 'linear';
    const castles = atlasFrames(castleAtlas, castleDefinition.columns, castleDefinition.rows, true);
    castleDefinition.tiers.forEach((tier, index) =>
      this.landmarks.set(tier.texture, castles[index]!),
    );
    const landmarkFiles = new Map(
      landmarkSelections.landmarks.map((l) => [l.hd.texture, l.hd.file]),
    );
    await Promise.all(
      [...landmarkFiles].map(async ([key, file]) => {
        const texture = await Assets.load<Texture>('/art/anuire/' + file);
        texture.source.scaleMode = 'linear';
        this.landmarks.set(key, atlasFrames(texture, 1, 1)[0]!);
      }),
    );
    const canvas = document.createElement('canvas');
    canvas.width = base.width;
    canvas.height = base.height;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(base.source.resource as HTMLImageElement, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const water = traceWater(pixels, canvas.width, canvas.height, scenario.provinces);
    this.anchors = traceTerrain(pixels, canvas.width, canvas.height, scenario, water, {
      forest: trees.map((t) => t.height / t.width),
      ridge: rocks.map((t) => t.height / t.width),
    });
    const materialCanvas = document.createElement('canvas');
    materialCanvas.width = ground!.width;
    materialCanvas.height = ground!.height;
    const materialContext = materialCanvas.getContext('2d', { willReadFrequently: true })!;
    materialContext.drawImage(ground!.source.resource as HTMLImageElement, 0, 0);
    let pilot: TerrainPilotPatch | undefined;
    let landscape: LandscapeMaterials | undefined;
    const query = new URLSearchParams(window.location.search);
    if (
      canvas.width === 1920 &&
      canvas.height === 2234 &&
      scenario.provinces.some((p) => p.id === 'anuire-province-070') &&
      query.get('terrainFirst') !== 'off'
    ) {
      const readMaterial = async (url: string) => {
        const art = await Assets.load<Texture>(url),
          patch = document.createElement('canvas');
        patch.width = art.width;
        patch.height = art.height;
        const cx = patch.getContext('2d', { willReadFrequently: true })!;
        cx.drawImage(art.source.resource as HTMLImageElement, 0, 0);
        return {
          width: patch.width,
          height: patch.height,
          pixels: cx.getImageData(0, 0, patch.width, patch.height).data,
        };
      };
      // A load failure restores the complete previous presentation together,
      // never a half-converted map with missing hill overlays.
      try {
        const [hills, granite] = await Promise.all([
          readMaterial('/art/anuire/connected-hills-material-v1.png'),
          readMaterial('/art/anuire/connected-granite-material-v1.png'),
        ]);
        landscape = { hills, granite };
        if (query.get('woodlandLowlands') !== 'off') {
          try {
            const [lowlands, woodland] = await Promise.all([
              readMaterial('/art/anuire/connected-lowlands-material-v1.png'),
              readMaterial('/art/anuire/connected-woodland-floor-v1.png'),
            ]);
            landscape.ground = { lowlands, woodland };
          } catch {
            /* Keep the approved relief and all original canopies if ground art is absent. */
          }
        }
      } catch {
        /* Existing art remains a complete fallback. */
      }
    }
    const pilotProvince = scenario.provinces.find((p) => p.id === thoralinarPilot.provinceId);
    if (
      !landscape &&
      thoralinarPilot.enabled &&
      pilotProvince?.terrain === 'hills' &&
      canvas.width === 1920 &&
      canvas.height === 2234 &&
      new URLSearchParams(window.location.search).get('thoralinarTerrain') !== 'off'
    ) {
      try {
        const art = await Assets.load<Texture>(thoralinarPilot.file),
          patch = document.createElement('canvas');
        patch.width = art.width;
        patch.height = art.height;
        const cx = patch.getContext('2d', { willReadFrequently: true })!;
        cx.drawImage(art.source.resource as HTMLImageElement, 0, 0);
        pilot = createThoralinarPilot(pilotProvince, {
          width: patch.width,
          height: patch.height,
          pixels: cx.getImageData(0, 0, patch.width, patch.height).data,
        });
      } catch {
        // An unavailable experimental plate retains all three existing hill sprites.
      }
    }
    await this.base.load(
      pixels,
      canvas.width,
      canvas.height,
      water,
      scenario.provinces,
      {
        width: materialCanvas.width,
        height: materialCanvas.height,
        pixels: materialContext.getImageData(0, 0, materialCanvas.width, materialCanvas.height)
          .data,
      },
      this.anchors,
      pilot,
      landscape,
    );
    this.objects.sortableChildren = true;
    const continuousSpiderfell = this.spiderfellCanopy(scenario, treeArt[1]!, water, canvas.width);
    const clearings = scenario.provinces.filter(isForestClearing);
    const pilotHills = pilot
      ? this.anchors.filter(
          (a) => a.kind === 'hills' && a.provinceId === thoralinarPilot.provinceId,
        )
      : [];
    for (const anchor of this.anchors) {
      if (landscape && !keepsReliefOverlay(anchor)) continue;
      if (pilotHills.includes(anchor) && anchor !== pilotHills[0]) continue;
      if (
        continuousSpiderfell &&
        anchor.kind === 'forest' &&
        anchor.provinceId === 'anuire-province-025'
      )
        continue;
      const province = scenario.provinces.find((p) => p.id === anchor.provinceId),
        lowRelief =
          landscape &&
          anchor.kind !== 'forest' &&
          (province?.original?.realmIndex === 19 || province?.original?.realmIndex === 30),
        rock = rocks[lowRelief ? 4 + (anchor.variant % 4) : anchor.variant]!;
      const sprite = new Sprite(
        anchor.kind === 'forest'
          ? this.clearForestEdges(this.forestTexture(treeArt, anchor), anchor, clearings)
          : landscape
            ? this.pilotCrest(rock, true)
            : anchor === pilotHills[0]
              ? this.pilotCrest(rock)
              : rock,
      );
      // Rock extraction locates the depicted feature's center, not its southern
      // foot. A 0.76 anchor displaced tall peaks north into neighboring lowlands.
      const footprint = terrainFootprint(anchor);
      sprite.anchor.set(0.5, footprint.anchorY);
      sprite.position.set(anchor.x, anchor.y);
      sprite.width = anchor.width;
      sprite.height = footprint.height * (lowRelief ? 0.72 : 1);
      sprite.zIndex = anchor.y + (anchor.kind === 'forest' ? 0 : sprite.height * 0.24);
      this.objects.addChild(sprite);
      this.environmental.push({ sprite, bounds: footprint });
    }
  }
  site(
    index: number | string,
    x: number,
    y: number,
    width: number,
    anchorY = 0.82,
    existing?: Sprite,
  ) {
    const texture = typeof index === 'string' ? this.landmarks.get(index)! : this.buildings[index]!;
    const sprite = existing ?? new Sprite(texture);
    sprite.texture = texture;
    sprite.anchor.set(0.5, anchorY);
    sprite.position.set(x, y);
    sprite.width = width;
    sprite.height = (width * sprite.texture.height) / sprite.texture.width;
    sprite.zIndex = y;
    return sprite;
  }
  cull(x: number, y: number, scale: number, width: number, height: number) {
    if (this.ground.visible) this.base.view(x, y, scale, width, height);
    for (const { sprite, bounds: f } of this.environmental) {
      sprite.visible =
        f.right * scale + x > 0 &&
        f.left * scale + x < width &&
        f.bottom * scale + y > 0 &&
        f.top * scale + y < height;
    }
  }
  destroy() {
    this.base.destroy();
    if (!this.objects.destroyed) this.objects.destroy({ children: true });
    for (const texture of this.blendedTrees.values()) texture.destroy(true);
    this.blendedTrees.clear();
  }
}
