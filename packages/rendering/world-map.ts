import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import type { Campaign, Scenario } from '../core/schema';
import { insideProvince, insideRing, provinceRings } from '../core/geometry';
import { sourcePotential } from '../core/selectors';
import type { MapCallbacks, MapView } from './types';
import type { AnuireResearch } from '../world-data/anuire-research';
interface OriginalMapArt {
  map?: string;
  images: Record<string, string>;
  icons: readonly string[];
  troopIcons?: Record<number, string>;
}
const sourcePoint = (point: unknown, fallback: [number, number]): [number, number] =>
  Array.isArray(point) &&
  point.length === 2 &&
  point.every((v) => typeof v === 'number' && Number.isFinite(v))
    ? (point as [number, number])
    : fallback;

/** Cached large-world renderer. Geometry is built once; selection never rebuilds the map. */
export class WorldMap {
  private app: Application | null = null;
  private world = new Container();
  private markers = new Container();
  private highlights = new Graphics();
  private observer: ResizeObserver | null = null;
  private stopped = false;
  private ready = false;
  private scale = 1;
  private minimum = 1;
  private state: Campaign | null = null;
  private view: MapView = { selected: '', overlay: 'political', labels: true };
  private lastState: Campaign | null = null;
  private overlay = '';
  private drag: { x: number; y: number; wx: number; wy: number; distance: number } | null = null;
  private hovered: string | null = null;
  private shapes = new Map<
    string,
    { graphics: Graphics; label: Text; tint: number; bounds: number[]; center: [number, number] }
  >();
  private realmLabels: Text[] = [];
  private originalArt: OriginalMapArt | null = null;
  private textures = new Map<string, Texture>();
  setOriginalArt(art: OriginalMapArt) {
    this.originalArt = art;
  }
  constructor(
    private host: HTMLElement,
    private scenario: Scenario,
    private callbacks: MapCallbacks,
  ) {}
  private get size() {
    return this.scenario.map ?? { width: 1400, height: 940 };
  }
  private text(text: string, x: number, y: number, size = 16, color = '#f2e9cf') {
    const t = new Text({
      text,
      style: {
        fontFamily: 'Georgia, serif',
        fontWeight: this.originalArt ? 'bold' : 'normal',
        fontSize: size,
        fill: color,
        stroke: { color: '#253a35', width: 3 },
        align: 'center',
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    return t;
  }
  async init() {
    const app = new Application();
    try {
      await app.init({
        resizeTo: this.host,
        preference: 'webgl',
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        background: this.originalArt ? '#8e8591' : '#365157',
        autoStart: false,
      });
      if (this.stopped) {
        app.destroy(true, { children: true });
        return;
      }
      this.app = app;
      this.host.appendChild(app.canvas);
      app.canvas.setAttribute('role', 'img');
      app.canvas.setAttribute(
        'aria-label',
        'Strategic province map. Use the province list for keyboard selection.',
      );
      app.stage.addChild(this.world);
      this.world.addChild(
        new Graphics()
          .rect(0, 0, this.size.width, this.size.height)
          .fill(this.originalArt ? '#8e8591' : '#365157'),
      );
      if (this.originalArt?.map) {
        const texture = await Assets.load<Texture>(this.originalArt.map);
        if (this.stopped) {
          app.destroy(true, { children: true });
          return;
        }
        texture.source.scaleMode = 'linear';
        const background = new Sprite(texture);
        background.width = this.size.width;
        background.height = this.size.height;
        this.world.addChild(background);
        this.host.dataset.originalMap = 'aligned-1-to-1';
        const names = [
          ...new Set([
            ...this.originalArt.icons,
            ...Object.values(this.originalArt.troopIcons ?? {}),
            'A_INF',
          ]),
        ];
        void Promise.allSettled(
          names.map(async (name) => {
            const url = this.originalArt?.images[`UI/${name}.PCX`];
            if (url) {
              const t = await Assets.load<Texture>(url);
              t.source.scaleMode = 'linear';
              this.textures.set(name, this.trimSprite(t));
            }
          }),
        ).then((results) => {
          if (this.stopped) return;
          this.host.dataset.originalIcons = results.every((r) => r.status === 'fulfilled')
            ? 'ready'
            : 'partial';
          if (this.ready && this.state) {
            this.lastState = null;
            this.update(this.state, this.view);
          }
        });
      }
      for (const p of this.scenario.provinces) {
        const graphics = new Graphics(),
          text = this.text(
            p.name,
            p.center[0],
            p.center[1] + 12,
            16,
            this.originalArt ? '#211a10' : '#f2e9cf',
          ),
          points = provinceRings(p).flat();
        this.shapes.set(p.id, {
          graphics,
          label: text,
          tint: -1,
          center: p.center,
          bounds: [
            Math.min(...points.map((p) => p[0])),
            Math.min(...points.map((p) => p[1])),
            Math.max(...points.map((p) => p[0])),
            Math.max(...points.map((p) => p[1])),
          ],
        });
        if (this.originalArt) text.style.stroke = { color: '#dccb9e', width: 1.5 };
        this.world.addChild(graphics, text);
      }
      for (const r of this.scenario.realms) {
        const provinces = this.scenario.initial.provinces
          .filter((p) => p.owner === r.id)
          .map((p) => this.scenario.provinces.find((d) => d.id === p.id)!);
        if (!provinces.length) continue;
        const raw = r.original?.labelPosition;
        const x = Array.isArray(raw)
          ? Number(raw[0])
          : provinces.reduce((n, p) => n + p.center[0], 0) / provinces.length;
        const y = Array.isArray(raw)
          ? Number(raw[1])
          : provinces.reduce((n, p) => n + p.center[1], 0) / provinces.length;
        const text = this.text(
          r.name.toUpperCase(),
          x,
          y,
          19,
          this.originalArt ? '#211a10' : '#f2e9cf',
        );
        if (this.originalArt) text.style.stroke = { color: '#d9cba3', width: 1 };
        this.realmLabels.push(text);
        text.label = r.id;
        this.world.addChild(text);
      }
      this.world.addChild(this.markers);
      // Keep names readable above unit/place sprites and below selection outlines.
      for (const item of this.shapes.values()) this.world.addChild(item.label);
      for (const label of this.realmLabels) this.world.addChild(label);
      this.world.addChild(this.highlights);
      this.host.dataset.sceneBuilds = '1';
      this.host.dataset.provinces = String(this.shapes.size);
      this.ready = true;
      this.host.addEventListener('pointerdown', this.down);
      this.host.addEventListener('pointermove', this.move);
      this.host.addEventListener('pointerup', this.up);
      this.host.addEventListener('pointercancel', this.cancel);
      this.host.addEventListener('pointerleave', this.leave);
      this.host.addEventListener('wheel', this.wheel, { passive: false });
      let viewportWidth = this.host.clientWidth,
        viewportHeight = this.host.clientHeight;
      this.observer = new ResizeObserver(() => {
        if (viewportWidth === this.host.clientWidth && viewportHeight === this.host.clientHeight)
          return;
        if (!this.host.clientWidth || !this.host.clientHeight) return;
        const center = [
          (viewportWidth / 2 - this.world.x) / this.scale,
          (viewportHeight / 2 - this.world.y) / this.scale,
        ];
        const fitted = Math.abs(this.scale - this.minimum) < 0.001;
        viewportWidth = this.host.clientWidth;
        viewportHeight = this.host.clientHeight;
        if (this.app) {
          this.app.renderer.resize(this.host.clientWidth, this.host.clientHeight);
          if (fitted) this.fit();
          else {
            this.minimum =
              Math.min(viewportWidth / this.size.width, viewportHeight / this.size.height) * 0.94;
            this.scale = Math.max(this.minimum * 0.8, this.scale);
            this.world.scale.set(this.scale);
            this.world.position.set(
              viewportWidth / 2 - center[0]! * this.scale,
              viewportHeight / 2 - center[1]! * this.scale,
            );
            this.labels();
            this.highlight();
          }
        }
      });
      this.observer.observe(this.host);
      this.fit();
      if (this.state) this.update(this.state, this.view);
      if (this.originalArt) {
        this.zoom(Math.max(1.4, this.host.clientWidth / (this.size.width * this.minimum)));
        const center = this.scenario.provinces.find((p) => p.id === this.view.selected)?.center ?? [
          this.size.width / 2,
          this.size.height / 2,
        ];
        this.world.position.set(
          (this.host.clientWidth - this.size.width * this.scale) / 2,
          Math.max(
            this.host.clientHeight - this.size.height * this.scale,
            Math.min(0, this.host.clientHeight / 2 - center[1]! * this.scale),
          ),
        );
        this.labels();
        this.highlight();
      }
      this.callbacks.ready();
    } catch (error) {
      if (!this.stopped)
        this.callbacks.error(error instanceof Error ? error.message : 'Unable to initialize map');
    }
  }
  private render() {
    this.host.dataset.cameraX = String(this.world.x);
    this.host.dataset.cameraY = String(this.world.y);
    this.app?.render();
  }
  fit = () => {
    this.minimum =
      Math.min(this.host.clientWidth / this.size.width, this.host.clientHeight / this.size.height) *
      0.94;
    this.scale = this.minimum;
    this.world.scale.set(this.scale);
    this.world.position.set(
      (this.host.clientWidth - this.size.width * this.scale) / 2,
      (this.host.clientHeight - this.size.height * this.scale) / 2,
    );
    this.labels();
    this.highlight();
  };
  zoom(factor: number, x = this.host.clientWidth / 2, y = this.host.clientHeight / 2) {
    const old = this.scale;
    this.scale = Math.max(this.minimum * 0.8, Math.min(this.minimum * 14, this.scale * factor));
    this.world.position.set(
      x - ((x - this.world.x) * this.scale) / old,
      y - ((y - this.world.y) * this.scale) / old,
    );
    this.world.scale.set(this.scale);
    this.labels();
    this.highlight();
  }
  focus(id: string) {
    const p = this.scenario.provinces.find((p) => p.id === id);
    if (!p) return;
    this.scale = this.minimum * 7;
    this.world.scale.set(this.scale);
    this.world.position.set(
      this.host.clientWidth / 2 - p.center[0] * this.scale,
      this.host.clientHeight / 2 - p.center[1] * this.scale,
    );
    this.labels();
    this.highlight();
  }
  private location(event: PointerEvent | WheelEvent) {
    const b = this.host.getBoundingClientRect();
    return [event.clientX - b.left, event.clientY - b.top];
  }
  private hit(x: number, y: number) {
    const wx = (x - this.world.x) / this.scale,
      wy = (y - this.world.y) / this.scale;
    return (
      this.scenario.provinces.find((p) => {
        const b = this.shapes.get(p.id)!.bounds;
        return (
          wx >= b[0]! && wy >= b[1]! && wx <= b[2]! && wy <= b[3]! && insideProvince(wx, wy, p)
        );
      })?.id ?? null
    );
  }
  private down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const [x, y] = this.location(e);
    this.drag = { x: x!, y: y!, wx: this.world.x, wy: this.world.y, distance: 0 };
    this.host.setPointerCapture(e.pointerId);
  };
  private move = (e: PointerEvent) => {
    const [x, y] = this.location(e);
    if (this.drag) {
      this.drag.distance = Math.hypot(x! - this.drag.x, y! - this.drag.y);
      if (this.drag.distance > 4) {
        this.world.position.set(this.drag.wx + x! - this.drag.x, this.drag.wy + y! - this.drag.y);
        this.labels();
        this.render();
      }
      return;
    }
    const id = this.hit(x!, y!);
    if (id !== this.hovered) {
      this.hovered = id;
      this.host.style.cursor = id ? 'pointer' : 'grab';
      this.callbacks.hover(id);
      this.highlight();
    }
  };
  private up = (e: PointerEvent) => {
    if (this.drag && this.drag.distance <= 4) {
      const [x, y] = this.location(e),
        id = this.hit(x!, y!);
      if (id) this.callbacks.select(id);
    }
    this.cancel(e);
  };
  private cancel = (e: PointerEvent) => {
    this.drag = null;
    if (this.host.hasPointerCapture(e.pointerId)) this.host.releasePointerCapture(e.pointerId);
  };
  private leave = () => {
    if (!this.drag) {
      this.hovered = null;
      this.callbacks.hover(null);
      this.highlight();
    }
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    const [x, y] = this.location(e);
    this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y);
  };
  private labels() {
    const compact = this.host.clientWidth < 1150 || this.host.clientHeight < 650;
    const provinceDetail = this.originalArt ? this.scale >= 0.95 : this.scale > this.minimum * 2.7;
    const closeDetail = this.originalArt ? this.scale > 1.1 : this.scale > this.minimum * 3;
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    const overlaps = (box: (typeof occupied)[number]) =>
      occupied.some(
        (other) =>
          Math.abs(other.x - box.x) < (other.w + box.w) / 2 + 8 &&
          Math.abs(other.y - box.y) < (other.h + box.h) / 2 + 5,
      );
    const place = (text: Text, pixels: number, force = false) => {
      text.style.fontSize = pixels / this.scale;
      text.style.stroke = {
        color: this.originalArt ? '#f4e4bc' : '#243931',
        width: 2.4 / this.scale,
      };
      const box = {
        x: this.world.x + text.x * this.scale,
        y: this.world.y + text.y * this.scale,
        w: text.width * this.scale,
        h: pixels + 4,
      };
      text.visible =
        this.view.labels &&
        box.x + box.w / 2 > 8 &&
        box.x - box.w / 2 < this.host.clientWidth - 8 &&
        box.y > 12 &&
        box.y < this.host.clientHeight - 12 &&
        (force || !overlaps(box));
      if (text.visible) occupied.push(box);
    };
    for (const child of this.markers.children) {
      if (child instanceof Sprite)
        child.scale.set(
          (child.label === 'army' ? (compact ? 30 : 34) : compact ? 20 : 24) /
            (Math.max(child.texture.width, child.texture.height) * this.scale),
        );
      if (child instanceof Text) {
        child.style.fontSize = (compact ? 16 : 18) / this.scale;
        child.style.stroke = { color: '#2b2015', width: 2.5 / this.scale };
        const army = (child.label ?? '').startsWith('army-');
        const province = army ? this.shapes.get(child.label.split(':')[1]!) : undefined;
        if (province)
          child.position.set(
            province.center[0] + 38 / this.scale,
            province.center[1] - 14 / this.scale,
          );
        const box = {
          x: this.world.x + child.x * this.scale,
          y: this.world.y + child.y * this.scale,
          w: child.width * this.scale,
          h: 22,
        };
        child.visible =
          (army
            ? child.label.startsWith('army-friendly:') ||
              child.label.endsWith(':' + this.view.selected) ||
              this.view.overlay === 'military' ||
              closeDetail
            : this.view.overlay !== 'political' || closeDetail) && !overlaps(box);
        if (child.visible) occupied.push(box);
      }
    }
    // Selection has first claim on label space. Remaining labels are culled in screen pixels.
    const priority = (id: string) => (id === this.view.selected ? 0 : id === this.hovered ? 1 : 2);
    for (const [id, item] of [...this.shapes].sort(([a], [b]) => priority(a) - priority(b))) {
      item.label.position.set(item.center[0], item.center[1] + 24 / this.scale);
      if (!provinceDetail && id !== this.view.selected && id !== this.hovered) {
        item.label.visible = false;
        continue;
      }
      place(
        item.label,
        id === this.view.selected ? (compact ? 19 : 21) : compact ? 17 : 18,
        id === this.view.selected,
      );
    }
    for (const text of [...this.realmLabels].sort(
      (a, b) =>
        Number(b.label === this.state?.playerRealm) - Number(a.label === this.state?.playerRealm),
    )) {
      if (provinceDetail) {
        text.visible = false;
        continue;
      }
      place(text, compact ? 18 : 20);
    }
    this.host.dataset.visibleLabels = String(
      [...this.shapes.values()].filter((s) => s.label.visible).length,
    );
    this.host.dataset.mapScale = String(this.scale);
  }
  /** Crop transparent padding at texture upload; source images stay untouched. */
  private trimSprite(texture: Texture) {
    const image = texture.source.resource;
    if (
      !(image instanceof HTMLImageElement) &&
      !(typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
    )
      return texture;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
      canvas.height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return texture;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width,
        top = canvas.height,
        right = -1,
        bottom = -1;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++)
          if (pixels[(y * canvas.width + x) * 4 + 3]! > 16) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
      return right >= left
        ? new Texture({
            source: texture.source,
            frame: new Rectangle(left, top, right - left + 1, bottom - top + 1),
          })
        : texture;
    } catch {
      return texture;
    }
  }
  private path(g: Graphics, p: Scenario['provinces'][number], tint: number, alpha = 1, width = 1) {
    const rings = provinceRings(p),
      area = (r: typeof p.polygon) =>
        r.reduce((sum, a, i) => {
          const b = r[(i + 1) % r.length]!;
          return sum + a[0] * b[1] - a[1] * b[0];
        }, 0);
    for (const outer of rings.filter((r) => area(r) > 0)) {
      g.poly(outer.flat()).fill({ color: tint, alpha });
      for (const hole of rings.filter((r) => area(r) < 0 && insideRing(r[0]![0], r[0]![1], outer)))
        g.poly(hole.flat()).cut();
    }
    for (const ring of rings) g.poly(ring.flat()).stroke({ color: 0x253b36, width, alpha: 0.9 });
  }
  update(state: Campaign, view: MapView) {
    this.state = state;
    this.view = view;
    if (!this.app || !this.ready) return;
    if (state !== this.lastState || view.overlay !== this.overlay) {
      const provinces = new Map(state.provinces.map((p) => [p.id, p])),
        realms = new Map(this.scenario.realms.map((r) => [r.id, r]));
      const military = new Map<string, number>();
      for (const a of state.armies)
        military.set(a.provinceId, (military.get(a.provinceId) ?? 0) + a.units.length);
      for (const def of this.scenario.provinces) {
        const p = provinces.get(def.id)!,
          item = this.shapes.get(def.id)!;
        let tint = Number.parseInt(
          (realms.get(p.occupiedBy ?? p.owner)?.color ?? '#aaaa88').slice(1),
          16,
        );
        if (view.overlay === 'economic')
          tint = [0xb4ae81, 0xa6aa79, 0x8e9e6e, 0x6d8c62, 0x467858][
            Math.min(4, Math.floor(p.level / 2))
          ]!;
        if (view.overlay === 'magical')
          tint = sourcePotential(this.scenario, p.id, p.level) > 3 ? 0x9d8bb5 : 0xb4aaa2;
        if (view.overlay === 'military') tint = military.has(p.id) ? 0xb28266 : 0x82977b;
        if (tint !== item.tint) {
          item.graphics.clear();
          this.path(
            item.graphics,
            def,
            tint,
            this.originalArt ? (view.overlay === 'political' ? 0.035 : 0.38) : 1,
          );
          item.tint = tint;
        }
      }
      for (const child of this.markers.removeChildren()) child.destroy({ children: true });
      for (const def of this.scenario.provinces) {
        const p = provinces.get(def.id)!,
          count = military.get(p.id) ?? 0,
          characters = state.characters?.filter((c) => c.provinceId === p.id).length ?? 0;
        const g = new Graphics();
        g.circle(...def.center, 2).fill('#fff2c8');
        if (p.fort > 0) g.rect(def.center[0] - 6, def.center[1] - 8, 12, 8).fill('#e6d5a5');
        if (p.occupiedBy) g.circle(def.center[0] + 8, def.center[1], 4).fill('#e4a665');
        this.markers.addChild(g);
        if (this.originalArt) {
          const sprite = (name: string, x: number, y: number, army = false) => {
            const t = this.textures.get(name);
            if (!t) return;
            const s = new Sprite(t);
            s.anchor.set(0.5, 1);
            s.position.set(x, y);
            s.scale.set(0.5);
            s.label = army ? 'army' : 'site';
            this.markers.addChild(s);
          };
          const raw = this.scenario.originalData as unknown as AnuireResearch | undefined;
          for (const f of state.fortifications?.filter((f) => f.provinceId === p.id) ?? []) {
            const source = raw?.campaign.forts.find(
                (s) => `anuire-place-${s.index}` === f.sourceId,
              ),
              center = sourcePoint(source?.center, def.center);
            const name = source ? this.originalArt.icons[Number(source.iconCode)] : 'CASTLE1';
            if (name) sprite(name, center[0], center[1]);
          }
          if (count) {
            const unit = state.armies.find((a) => a.provinceId === p.id)?.units[0],
              type = Number(
                this.scenario.units.find((u) => u.id === unit?.type)?.original?.typeCode,
              );
            sprite(
              this.originalArt.troopIcons?.[type] ?? 'A_INF',
              def.center[0] + 12,
              def.center[1],
              true,
            );
          }
          if (view.overlay === 'economic' || view.overlay === 'magical')
            for (const h of state.holdings.filter(
              (h) =>
                h.provinceId === p.id &&
                !h.destroyed &&
                h.level > 0 &&
                (h.type === 'source') === (view.overlay === 'magical'),
            )) {
              const source = raw?.campaign.holdings.find((s) => s.id === h.sourceId),
                center = sourcePoint(source?.center, def.center),
                name = source
                  ? this.originalArt.icons[Number(source.iconCode)]
                  : h.type.toUpperCase() + '1';
              if (name) sprite(name, center[0], center[1]);
            }
        }
        if (count || characters) {
          const marker = this.text(
            count ? String(count) : `${characters} regent${characters === 1 ? '' : 's'}`,
            def.center[0] + 22,
            def.center[1] - 26 / this.scale,
            12,
          );
          marker.label = count
            ? `army-${state.armies.some((a) => a.provinceId === p.id && a.realmId === state.playerRealm) ? 'friendly' : 'foreign'}:${p.id}`
            : 'characters';
          this.markers.addChild(marker);
        }
        if (view.overlay === 'economic' || view.overlay === 'magical') {
          const holdings = state.holdings
            .filter(
              (h) =>
                h.provinceId === p.id &&
                !h.destroyed &&
                !h.contested &&
                (view.overlay === 'economic' ? h.type !== 'source' : h.type === 'source'),
            )
            .reduce((n, h) => n + h.level, 0);
          this.markers.addChild(
            this.text(
              `${holdings} H${p.fort ? ' · F' + p.fort : ''}`,
              def.center[0],
              def.center[1] + 28,
              12,
            ),
          );
        }
      }
      this.lastState = state;
      this.overlay = view.overlay;
      this.host.dataset.stateUpdates = String(Number(this.host.dataset.stateUpdates ?? 0) + 1);
    }
    this.labels();
    this.highlight();
  }
  private highlight() {
    if (!this.app) return;
    this.highlights.clear();
    for (const [id, hover] of [
      [this.view.selected, false],
      [this.hovered, true],
    ] as const) {
      const p = this.scenario.provinces.find((p) => p.id === id);
      if (!p) continue;
      for (const ring of provinceRings(p))
        this.highlights.poly(ring.flat()).stroke({
          color: hover ? 0xffffff : 0xffe2a2,
          width: (hover ? 1.5 : 2.5) / this.scale,
          alpha: 0.95,
        });
      if (!hover)
        for (const edge of p.movement ?? []) {
          const to = this.scenario.provinces.find((n) => n.id === edge.to)!;
          const [x, y] = p.center,
            [tx, ty] = to.center,
            angle = Math.atan2(ty - y, tx - x),
            length = 6 / this.scale;
          this.highlights
            .moveTo(x, y)
            .lineTo(tx, ty)
            .stroke({ color: 0xffe2a2, width: 0.8 / this.scale, alpha: 0.55 });
          this.highlights
            .poly([
              tx,
              ty,
              tx - length * Math.cos(angle - 0.4),
              ty - length * Math.sin(angle - 0.4),
              tx - length * Math.cos(angle + 0.4),
              ty - length * Math.sin(angle + 0.4),
            ])
            .fill({ color: 0xffe2a2, alpha: 0.7 });
        }
    }
    this.render();
  }
  destroy() {
    this.stopped = true;
    this.observer?.disconnect();
    this.host.removeEventListener('pointerdown', this.down);
    this.host.removeEventListener('pointermove', this.move);
    this.host.removeEventListener('pointerup', this.up);
    this.host.removeEventListener('pointercancel', this.cancel);
    this.host.removeEventListener('pointerleave', this.leave);
    this.host.removeEventListener('wheel', this.wheel);
    this.app?.destroy(true, { children: true });
    this.app = null;
  }
}
