import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Scenario } from '../core/schema';
import {
  TERRAIN_CACHE_BYTES,
  TERRAIN_GUTTER,
  terrainPageKey,
  visibleTerrainPages,
  type TerrainMaterial,
  type TerrainPage,
  type TerrainPilotPatch,
} from './base-terrain';
import type { TerrainWorkerReply, TerrainWorkerRequest } from './base-terrain.worker';
import type { TerrainAnchor } from './terrain-placement';
import type { LandscapeMaterials } from './connected-terrain';

interface CachedPage {
  page: TerrainPage;
  ground: Sprite;
  water: Sprite | null;
  bitmaps: ImageBitmap[];
  textures: Texture[];
  bytes: number;
  used: number;
}
/** Two detail levels, one background worker, bounded LRU. The complete painted
 * overview is always present, so a cold page never leaves a hole in the map. */
export class TiledTerrainBase {
  readonly ground = new Container();
  readonly water = new Container();
  waterTexture: Texture | null = null;
  oceanTexture: Texture | null = null;
  private preview: CachedPage | null = null;
  private fallbackWater = new Map<string, Sprite>();
  private fallbackTextures: Texture[] = [];
  private worker: Worker | null = null;
  private cache = new Map<string, CachedPage>();
  private wanted = new Map<string, TerrainPage>();
  private active: string | null = null;
  private stopped = false;
  private clock = 0;
  private width = 0;
  private height = 0;
  private failure = '';
  private rejectLoad: ((error: Error) => void) | null = null;
  stats = {
    opaque: true,
    resident: 0,
    visible: 0,
    bytes: 0,
    pending: 0,
    resolution: 1,
    generated: 0,
    initMs: 0,
    lastPageMs: 0,
    error: '',
    pilot: false,
    terrainFirst: false,
    woodlandLowlands: false,
    landscapeLinks: 0,
    crossProvinceLinks: 0,
  };
  constructor(private changed: () => void) {}

  async load(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    water: Uint8Array,
    provinces: Scenario['provinces'],
    material: TerrainMaterial,
    anchors: TerrainAnchor[],
    pilot?: TerrainPilotPatch,
    landscape?: LandscapeMaterials,
  ) {
    this.stats.pilot = Boolean(pilot);
    this.stats.terrainFirst = Boolean(landscape);
    this.stats.woodlandLowlands = Boolean(landscape?.ground);
    this.width = width;
    this.height = height;
    const worker = new Worker(new URL('./base-terrain.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker = worker;
    await new Promise<void>((resolve, reject) => {
      this.rejectLoad = reject;
      worker.onerror = (e) => this.fail(e.message);
      worker.onmessage = ({ data }: MessageEvent<TerrainWorkerReply>) => {
        if (data.type === 'error') {
          this.fail(data.message);
          return;
        }
        if (this.stopped) {
          data.ground.close();
          data.water?.close();
          return;
        }
        if (data.type === 'ready') {
          this.preview = this.install(data, false);
          this.waterTexture = this.preview.water?.texture ?? null;
          // A small seamless open-sea material, rather than repeating a cropped
          // map fragment containing transparent coastal pixels outside the world.
          const sea = document.createElement('canvas');
          sea.width = sea.height = 128;
          const context = sea.getContext('2d')!,
            image = context.createImageData(128, 128);
          for (let y = 0; y < 128; y++)
            for (let x = 0; x < 128; x++) {
              const phase = (Math.PI * 2) / 128;
              const light =
                Math.sin(x * phase + Math.cos(y * phase)) * 0.8 +
                Math.cos((x + y * 2) * phase) * 0.6;
              const i = (y * 128 + x) * 4;
              image.data.set([37 + light, 72 + light, 79 + light, 255], i);
            }
          context.putImageData(image, 0, 0);
          this.oceanTexture = Texture.from(sea);
          if (this.preview.water) {
            this.preview.water.visible = false;
            // Separate views of one shared overview texture let completed detail
            // pages replace the water mask, including transparent riverbanks.
            for (let y = 0; y < height; y += 256)
              for (let x = 0; x < width; x += 256) {
                const w = Math.min(256, width - x),
                  h = Math.min(256, height - y);
                const texture = new Texture({
                  source: this.waterTexture!.source,
                  frame: new Rectangle(x, y, w, h),
                });
                const sprite = new Sprite(texture);
                sprite.position.set(x, y);
                this.water.addChild(sprite);
                this.fallbackWater.set(`${x}:${y}`, sprite);
                this.fallbackTextures.push(texture);
              }
          }
          this.stats.initMs = data.ms;
          this.stats.landscapeLinks = data.landscapeLinks ?? 0;
          this.stats.crossProvinceLinks = data.crossProvinceLinks ?? 0;
          this.rejectLoad = null;
          resolve();
          return;
        }
        this.active = null;
        this.stats.generated++;
        this.stats.lastPageMs = data.ms;
        if (data.key && this.wanted.has(data.key))
          this.cache.set(data.key, this.install(data, true));
        else {
          data.ground.close();
          data.water?.close();
        }
        this.trim();
        this.updateStats();
        this.changed();
        this.pump();
      };
      const request: TerrainWorkerRequest = {
        type: 'init',
        pixels: pixels.slice(),
        width,
        height,
        water: water.slice(),
        provinces,
        material,
        anchors,
        pilot,
        landscape,
      };
      worker.postMessage(request, [
        request.pixels.buffer,
        request.water.buffer,
        material.pixels.buffer,
        ...(pilot ? [pilot.material.pixels.buffer, pilot.mask.buffer] : []),
        ...(landscape ? [landscape.hills.pixels.buffer, landscape.granite.pixels.buffer] : []),
        ...(landscape?.ground
          ? [landscape.ground.lowlands.pixels.buffer, landscape.ground.woodland.pixels.buffer]
          : []),
      ]);
    });
  }
  private install(
    data: Exclude<TerrainWorkerReply, { type: 'error' }>,
    tiled: boolean,
  ): CachedPage {
    const textures: Texture[] = [],
      bitmaps = [data.ground, ...(data.water ? [data.water] : [])];
    const sprite = (bitmap: ImageBitmap, host: Container) => {
      const full = Texture.from(bitmap);
      full.source.scaleMode = 'linear';
      const texture = tiled
        ? new Texture({
            source: full.source,
            frame: new Rectangle(
              TERRAIN_GUTTER,
              TERRAIN_GUTTER,
              data.page.width * data.page.resolution,
              data.page.height * data.page.resolution,
            ),
          })
        : full;
      if (tiled) full.destroy(false);
      textures.push(texture);
      const s = new Sprite(texture);
      s.position.set(data.page.x, data.page.y);
      s.width = data.page.width;
      s.height = data.page.height;
      host.addChild(s);
      return s;
    };
    return {
      page: data.page,
      ground: sprite(data.ground, this.ground),
      water: data.water ? sprite(data.water, this.water) : null,
      textures,
      bitmaps,
      bytes: bitmaps.reduce((n, b) => n + b.width * b.height * 4, 0),
      used: ++this.clock,
    };
  }
  private fail(message: string) {
    this.failure = message;
    this.stats.error = message;
    this.active = null;
    this.rejectLoad?.(Error(message));
    this.rejectLoad = null;
    this.worker?.terminate();
    this.worker = null;
    this.changed();
  }
  private release(page: CachedPage) {
    if (!page.ground.destroyed) page.ground.destroy();
    if (page.water && !page.water.destroyed) page.water.destroy();
    for (const texture of page.textures) texture.destroy(true);
    for (const bitmap of page.bitmaps) bitmap.close();
  }
  private trim() {
    let bytes = [...this.cache.values()].reduce((n, p) => n + p.bytes, 0);
    for (const [key, page] of [...this.cache].sort((a, b) => a[1].used - b[1].used)) {
      if (bytes <= TERRAIN_CACHE_BYTES) break;
      if (this.wanted.has(key)) continue;
      this.release(page);
      this.cache.delete(key);
      bytes -= page.bytes;
    }
  }
  private updateStats() {
    this.stats.resident = this.cache.size;
    this.stats.visible = [...this.cache].filter(([key]) => this.wanted.has(key)).length;
    this.stats.bytes = [...this.cache.values()].reduce((n, p) => n + p.bytes, 0);
    this.stats.pending = [...this.wanted.keys()].filter((key) => !this.cache.has(key)).length;
  }
  private pump() {
    if (this.active || !this.worker || this.stopped || this.failure) return;
    const next = [...this.wanted].find(([key]) => !this.cache.has(key));
    if (!next) return;
    this.active = next[0];
    const request: TerrainWorkerRequest = { type: 'page', key: next[0], page: next[1] };
    this.worker.postMessage(request);
  }
  view(x: number, y: number, scale: number, width: number, height: number) {
    if (!this.preview || this.stopped) return;
    const pages = visibleTerrainPages(this.width, this.height, x, y, scale, width, height);
    const cx = (width / 2 - x) / scale,
      cy = (height / 2 - y) / scale;
    pages.sort(
      (a, b) =>
        Math.hypot(a.x + a.width / 2 - cx, a.y + a.height / 2 - cy) -
        Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy),
    );
    this.wanted = new Map(pages.map((p) => [terrainPageKey(p), p]));
    this.preview.ground.visible =
      pages.length === 0 || pages.some((p) => !this.cache.has(terrainPageKey(p)));
    this.stats.resolution = pages[0]?.resolution ?? 1;
    const complete = new Set<string>();
    for (const [key, page] of this.cache) {
      const visible = this.wanted.has(key);
      page.ground.visible = visible;
      if (page.water) page.water.visible = visible;
      if (visible) {
        page.used = ++this.clock;
        complete.add(`${page.page.x}:${page.page.y}`);
      }
    }
    for (const [key, sprite] of this.fallbackWater) sprite.visible = !complete.has(key);
    this.trim();
    this.updateStats();
    this.pump();
  }
  destroy() {
    this.stopped = true;
    this.worker?.terminate();
    this.worker = null;
    this.rejectLoad?.(Error('Terrain renderer disposed'));
    this.rejectLoad = null;
    for (const page of this.cache.values()) this.release(page);
    for (const sprite of this.fallbackWater.values()) {
      if (!sprite.destroyed) sprite.destroy();
    }
    for (const texture of this.fallbackTextures) texture.destroy(false);
    this.fallbackTextures = [];
    this.fallbackWater.clear();
    this.cache.clear();
    if (this.preview) this.release(this.preview);
    this.preview = null;
    this.waterTexture = null;
    this.oceanTexture?.destroy(true);
    this.oceanTexture = null;
    for (const c of [this.ground, this.water]) if (!c.destroyed) c.destroy({ children: true });
  }
}
