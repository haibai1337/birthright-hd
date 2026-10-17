import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Campaign, Scenario } from '../core/schema';
import { sourcePotential } from '../core/selectors';

export type MapOverlay = 'political' | 'military' | 'economic' | 'magical';
export interface MapView {
  selected: string;
  overlay: MapOverlay;
  labels: boolean;
}
export interface MapCallbacks {
  select(id: string): void;
  hover(id: string | null): void;
  ready(): void;
  error(message: string): void;
}
const WIDTH = 1400,
  HEIGHT = 940;
function label(
  text: string,
  x: number,
  y: number,
  size = 16,
  color = '#323a32',
  italic = false,
): Text {
  const t = new Text({
    text,
    style: {
      fontFamily: 'Georgia, serif',
      fontSize: size,
      fill: color,
      fontStyle: italic ? 'italic' : 'normal',
      align: 'center',
    },
  });
  t.anchor.set(0.5);
  t.position.set(x, y);
  return t;
}
function inside(x: number, y: number, points: readonly (readonly [number, number])[]) {
  let yes = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (!a || !b) continue;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      yes = !yes;
  }
  return yes;
}
function color(value: string) {
  return Number.parseInt(value.slice(1), 16);
}
// Display-only, stateless noise. It never touches the campaign PRNG.
function noise(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class StrategicMap {
  private app: Application | null = null;
  private world = new Container();
  private scene = new Container();
  private highlights = new Graphics();
  private observer: ResizeObserver | null = null;
  private stopped = false;
  private scale = 1;
  private minScale = 0.5;
  private drag: { x: number; y: number; wx: number; wy: number; distance: number } | null = null;
  private selected = '';
  private hoverId: string | null = null;
  private state: Campaign | null = null;
  private view: MapView = { selected: '', overlay: 'political', labels: true };
  constructor(
    private host: HTMLElement,
    private scenario: Scenario,
    private callbacks: MapCallbacks,
  ) {}
  async init() {
    const app = new Application();
    try {
      await app.init({
        resizeTo: this.host,
        preference: 'webgl',
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        background: '#566e70',
        autoStart: false,
      });
      if (this.stopped) {
        app.destroy(true, { children: true });
        return;
      }
      this.app = app;
      this.host.appendChild(app.canvas);
      app.canvas.setAttribute(
        'aria-label',
        'Strategic province map. Use the province list for keyboard selection.',
      );
      app.canvas.setAttribute('role', 'img');
      app.stage.addChild(this.world);
      this.world.addChild(this.scene, this.highlights);
      this.host.addEventListener('pointerdown', this.down);
      this.host.addEventListener('pointermove', this.move);
      this.host.addEventListener('pointerup', this.up);
      this.host.addEventListener('pointercancel', this.cancel);
      this.host.addEventListener('pointerleave', this.leave);
      this.host.addEventListener('wheel', this.wheel, { passive: false });
      this.observer = new ResizeObserver(() => {
        if (!this.app) return;
        this.app.renderer.resize(this.host.clientWidth, this.host.clientHeight);
        this.fit();
      });
      this.observer.observe(this.host);
      this.fit();
      if (this.state) this.update(this.state, this.view);
      this.callbacks.ready();
    } catch (e) {
      if (!this.stopped)
        this.callbacks.error(e instanceof Error ? e.message : 'Unable to initialize WebGL');
    }
  }
  private render() {
    this.app?.render();
  }
  fit = () => {
    this.minScale = Math.min(this.host.clientWidth / WIDTH, this.host.clientHeight / HEIGHT) * 0.96;
    this.scale = this.minScale;
    this.world.scale.set(this.scale);
    this.world.position.set(
      (this.host.clientWidth - WIDTH * this.scale) / 2,
      (this.host.clientHeight - HEIGHT * this.scale) / 2,
    );
    this.render();
  };
  zoom(factor: number, px = this.host.clientWidth / 2, py = this.host.clientHeight / 2) {
    const old = this.scale;
    this.scale = Math.max(this.minScale * 0.75, Math.min(this.minScale * 3.5, this.scale * factor));
    this.world.position.set(
      px - ((px - this.world.x) * this.scale) / old,
      py - ((py - this.world.y) * this.scale) / old,
    );
    this.world.scale.set(this.scale);
    this.render();
  }
  focus(id: string) {
    const p = this.scenario.provinces.find((p) => p.id === id);
    if (!p) return;
    this.zoom((this.minScale * 2.5) / this.scale);
    this.world.position.set(
      this.host.clientWidth / 2 - p.center[0] * this.scale,
      this.host.clientHeight / 2 - p.center[1] * this.scale,
    );
    this.render();
  }
  private location(e: PointerEvent | WheelEvent): [number, number] {
    const b = this.host.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }
  private down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const [x, y] = this.location(e);
    this.drag = { x, y, wx: this.world.x, wy: this.world.y, distance: 0 };
    this.host.setPointerCapture(e.pointerId);
  };
  private move = (e: PointerEvent) => {
    const [x, y] = this.location(e);
    if (this.drag) {
      this.drag.distance = Math.hypot(x - this.drag.x, y - this.drag.y);
      if (this.drag.distance > 4) {
        this.world.position.set(this.drag.wx + x - this.drag.x, this.drag.wy + y - this.drag.y);
        this.render();
      }
      return;
    }
    const wx = (x - this.world.x) / this.scale,
      wy = (y - this.world.y) / this.scale;
    const id = this.scenario.provinces.find((p) => inside(wx, wy, p.polygon))?.id ?? null;
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.host.style.cursor = id ? 'pointer' : 'grab';
      this.callbacks.hover(id);
      this.drawHighlight();
    }
  };
  private up = (e: PointerEvent) => {
    if (this.drag && this.drag.distance <= 4) {
      const [x, y] = this.location(e);
      const p = this.scenario.provinces.find((p) =>
        inside((x - this.world.x) / this.scale, (y - this.world.y) / this.scale, p.polygon),
      );
      if (p) this.callbacks.select(p.id);
    }
    this.cancel(e);
  };
  private cancel = (e: PointerEvent) => {
    this.drag = null;
    if (this.host.hasPointerCapture(e.pointerId)) this.host.releasePointerCapture(e.pointerId);
  };
  private leave = () => {
    if (!this.drag) {
      this.hoverId = null;
      this.callbacks.hover(null);
      this.drawHighlight();
    }
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    const [x, y] = this.location(e);
    this.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, x, y);
  };
  update(state: Campaign, view: MapView) {
    this.state = state;
    this.view = view;
    this.selected = view.selected;
    if (!this.app) return;
    this.draw();
  }
  private drawHighlight() {
    this.highlights.clear();
    for (const [id, hover] of [
      [this.selected, false],
      [this.hoverId, true],
    ] as const) {
      const p = this.scenario.provinces.find((p) => p.id === id);
      if (!p) continue;
      this.highlights
        .poly(p.polygon.flat())
        .fill({ color: 0xffefb7, alpha: hover ? 0.14 : 0.06 })
        .stroke({ color: hover ? 0xfff2c9 : 0xffe1a0, width: hover ? 2 : 4, alpha: 0.95 });
    }
    this.render();
  }
  private draw() {
    const state = this.state;
    if (!state) return;
    for (const child of this.scene.removeChildren()) child.destroy({ children: true });
    const sea = new Graphics();
    sea.rect(0, 0, WIDTH, HEIGHT).fill(0x566e70);
    // Engraved waves, survey grid, and an inset neatline.
    for (let y = 20; y < HEIGHT; y += 22)
      for (let x = 15; x < WIDTH; x += 50) {
        sea
          .moveTo(x, y)
          .quadraticCurveTo(x + 12, y + 5, x + 26, y)
          .stroke({ color: 0xc6d4c3, alpha: 0.13, width: 0.8 });
      }
    sea.rect(32, 32, WIDTH - 64, HEIGHT - 64).stroke({ color: 0xd1c49e, alpha: 0.4, width: 1 });
    sea.rect(38, 38, WIDTH - 76, HEIGHT - 76).stroke({ color: 0xd1c49e, alpha: 0.22, width: 1 });
    this.scene.addChild(sea);
    const land = new Graphics();
    for (const d of this.scenario.provinces) {
      const points = d.polygon.flatMap(([x, y]) => [x + 3, y + 7]);
      land.poly(points).fill(0x2c494b).stroke({ color: 0xc3baa0, width: 10, alpha: 0.7 });
    }
    this.scene.addChild(land);
    for (const def of this.scenario.provinces) {
      const p = state.provinces.find((p) => p.id === def.id);
      if (!p) continue;
      const realm = this.scenario.realms.find((r) => r.id === p.owner);
      const points = def.polygon.flat();
      const g = new Graphics();
      let tint = realm ? color(realm.color) : 0x98866c;
      if (this.view.overlay === 'economic')
        tint =
          [0xb7ac84, 0xb1ab80, 0x9da47b, 0x85966f, 0x71856b, 0x628063, 0x50715b][p.level] ??
          0x71856b;
      if (this.view.overlay === 'magical')
        tint = sourcePotential(this.scenario, p.id, p.level) > 3 ? 0x9a91aa : 0xb4aaac;
      if (this.view.overlay === 'military')
        tint = state.armies.some((a) => a.provinceId === p.id) ? 0xa77d62 : 0xa4a17f;
      g.poly(points).fill(0xc7bf9a);
      g.poly(points).fill({ color: tint, alpha: 0.48 });
      g.poly(points).stroke({ color: 0x524f3d, width: 1.5, alpha: 0.6 });
      this.scene.addChild(g);
      // Small stipples suggest paper grain without textures or external assets.
      const grain = new Graphics();
      const minX = Math.min(...def.polygon.map((p) => p[0])),
        maxX = Math.max(...def.polygon.map((p) => p[0]));
      const minY = Math.min(...def.polygon.map((p) => p[1])),
        maxY = Math.max(...def.polygon.map((p) => p[1]));
      const number = Number(def.id.replace(/\D/g, '')) || 0;
      for (let i = 0; i < 130; i++) {
        const x = minX + noise(i + number * 149) * (maxX - minX),
          y = minY + noise(i + number * 189 + 500) * (maxY - minY);
        if (inside(x, y, def.polygon))
          grain.circle(x, y, 0.7).fill({ color: 0x514e37, alpha: 0.15 });
      }
      this.scene.addChild(grain);
      const relief = new Graphics();
      for (
        let i = 0;
        i <
        (def.terrain === 'forest'
          ? 48
          : def.terrain === 'mountains'
            ? 23
            : def.terrain === 'hills'
              ? 16
              : 9);
        i++
      ) {
        const x = minX + 20 + noise(i + number * 31 + 900) * (maxX - minX - 40);
        const y = minY + 25 + noise(i + number * 17 + 700) * (maxY - minY - 50);
        if (
          !inside(x, y, def.polygon) ||
          (Math.abs(x - def.center[0]) < 65 && Math.abs(y - def.center[1]) < 48)
        )
          continue;
        if (def.terrain === 'forest') {
          const h = 10 + noise(i + 73) * 12;
          relief.ellipse(x + 4, y + 3, 8, 3).fill({ color: 0x38483c, alpha: 0.15 });
          relief
            .moveTo(x, y)
            .lineTo(x, y - h)
            .stroke({ color: 0x414937, width: 1 });
          relief
            .poly([x - 7, y - 3, x, y - h - 5, x + 7, y - 3])
            .fill({ color: i % 2 ? 0x54674b : 0x647452, alpha: 0.7 })
            .stroke({ color: 0x3d523e, width: 0.65, alpha: 0.7 });
        } else if (def.terrain === 'mountains' || def.terrain === 'hills') {
          const h = def.terrain === 'mountains' ? 22 + noise(i) * 24 : 9 + noise(i) * 9,
            w = h * 0.75;
          relief
            .poly([x - w, y, x, y - h, x + w, y])
            .fill({ color: 0xaaa88e, alpha: 0.8 })
            .stroke({ color: 0x5d6251, width: 1, alpha: 0.65 });
          relief.poly([x, y - h, x + w, y, x + 3, y - 4]).fill({ color: 0x5b6858, alpha: 0.38 });
          if (h > 28)
            relief
              .poly([x - h * 0.16, y - h * 0.75, x, y - h, x + h * 0.17, y - h * 0.75])
              .fill({ color: 0xe2dec4, alpha: 0.8 });
        } else {
          relief
            .moveTo(x - 8, y)
            .quadraticCurveTo(x, y - 6, x + 8, y)
            .stroke({ color: 0x7c805b, width: 1, alpha: 0.3 });
        }
      }
      this.scene.addChild(relief);
    }
    // Emphasize realm frontiers independently of province subdivisions.
    const borders = new Graphics();
    for (const d of this.scenario.provinces)
      for (let i = 0; i < d.polygon.length; i++) {
        const a = d.polygon[i],
          b = d.polygon[(i + 1) % d.polygon.length];
        if (!a || !b) continue;
        const neighbor = this.scenario.provinces.find(
          (n) =>
            n.id !== d.id &&
            n.polygon.some((p) => p[0] === a[0] && p[1] === a[1]) &&
            n.polygon.some((p) => p[0] === b[0] && p[1] === b[1]),
        );
        const owner = state.provinces.find((p) => p.id === d.id)?.owner;
        if (!neighbor || state.provinces.find((p) => p.id === neighbor.id)?.owner !== owner)
          borders
            .moveTo(...a)
            .lineTo(...b)
            .stroke({ color: 0x484b3e, width: 3, alpha: 0.65 });
      }
    this.scene.addChild(borders);
    const river = new Graphics();
    river
      .moveTo(700, 155)
      .bezierCurveTo(650, 230, 750, 310, 700, 330)
      .bezierCurveTo(660, 410, 770, 490, 720, 585)
      .bezierCurveTo(650, 630, 700, 710, 745, 770)
      .stroke({ color: 0xc7d1bc, width: 6, alpha: 0.6 });
    river
      .moveTo(700, 155)
      .bezierCurveTo(650, 230, 750, 310, 700, 330)
      .bezierCurveTo(660, 410, 770, 490, 720, 585)
      .bezierCurveTo(650, 630, 700, 710, 745, 770)
      .stroke({ color: 0x627f7c, width: 3 });
    this.scene.addChild(river);
    const roads = new Graphics();
    for (const p of this.scenario.provinces)
      for (const id of p.adjacent.filter((id) => id > p.id)) {
        const n = this.scenario.provinces.find((n) => n.id === id);
        if (!n) continue;
        for (let t = 0.12; t < 0.9; t += 0.055) {
          const x = p.center[0] + (n.center[0] - p.center[0]) * t,
            y = p.center[1] + (n.center[1] - p.center[1]) * t;
          roads.circle(x, y, 1.15).fill({ color: 0x625a43, alpha: 0.4 });
        }
      }
    this.scene.addChild(roads);
    for (const def of this.scenario.provinces) {
      const p = state.provinces.find((p) => p.id === def.id);
      if (!p) continue;
      const [x, y] = def.center;
      const castle = new Graphics();
      castle.ellipse(x, y + 3, 19, 5).fill({ color: 0x364339, alpha: 0.18 });
      castle
        .rect(x - 10, y - 15, 20, 16)
        .fill(0xd6c9a1)
        .stroke({ color: 0x4f5545, width: 1.2 });
      castle
        .rect(x - 14, y - 20, 7, 21)
        .fill(0xc5b992)
        .stroke({ color: 0x4f5545, width: 1.2 });
      castle
        .rect(x + 7, y - 20, 7, 21)
        .fill(0xc5b992)
        .stroke({ color: 0x4f5545, width: 1.2 });
      for (const dx of [-14, -9, 7, 12]) castle.rect(x + dx, y - 24, 3, 6).fill(0x5f6251);
      castle.rect(x - 3, y - 9, 6, 10).fill(0x4f5545);
      const realm = this.scenario.realms.find((r) => r.id === p.owner);
      castle
        .moveTo(x, y - 16)
        .lineTo(x, y - 40)
        .stroke({ color: 0x4e5343, width: 1 });
      castle
        .poly([x, y - 40, x + 15, y - 35, x, y - 30])
        .fill(realm ? color(realm.color) : 0x999999)
        .stroke({ color: 0xe5d7ad, width: 0.8 });
      this.scene.addChild(castle);
      if (this.view.labels) {
        this.scene.addChild(label(def.name, x, y + 24, 17));
        this.scene.addChild(
          label(
            `${p.level} / ${sourcePotential(this.scenario, p.id, p.level)}`,
            x,
            y + 44,
            11,
            '#585a47',
          ),
        );
      }
      const army = state.armies.filter((a) => a.provinceId === p.id);
      if (army.length) {
        const units = army.reduce((n, a) => n + a.units.length, 0);
        const badge = new Graphics();
        badge
          .roundRect(x + 28, y - 19, 40, 25, 4)
          .fill(0x2e4140)
          .stroke({ color: 0xdbc69c, width: 1 });
        this.scene.addChild(badge, label(`⚑ ${units}`, x + 48, y - 7, 13, '#f1e4be'));
      }
      if (this.view.overlay === 'economic')
        this.scene.addChild(label(`${p.tax.toUpperCase()} TAX`, x, y + 64, 10, '#394c36'));
      if (this.view.overlay === 'magical')
        this.scene.addChild(
          label(
            `${state.holdings.filter((h) => h.provinceId === p.id && h.type === 'source').reduce((n, h) => n + h.level, 0)} SOURCE`,
            x,
            y + 64,
            10,
            '#57405f',
          ),
        );
    }
    if (this.view.labels) {
      this.scene.addChild(label('C R O W N M E R E', 340, 440, 20, '#344f57'));
      this.scene.addChild(label('T H E  C O V E N A N T', 665, 280, 17, '#435541'));
      this.scene.addChild(label('T H E  I R O N  M A R C H', 1070, 485, 17, '#694738'));
    }
    this.scene.addChild(label('The Pale Sea', 150, 710, 25, '#c1cbbb', true));
    this.scene.addChild(label('THE COVENANT MARCHES', 700, 66, 15, '#ddd3b4'));
    this.scene.addChild(
      label('A provisional cartography · twelve provinces', 700, 887, 12, '#d4d4b8', true),
    );
    const compass = new Graphics();
    const cx = 1250,
      cy = 790;
    compass.circle(cx, cy, 44).stroke({ color: 0xc8c5a4, width: 1, alpha: 0.6 });
    compass.circle(cx, cy, 34).stroke({ color: 0xc8c5a4, width: 0.6, alpha: 0.4 });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      compass
        .poly([
          cx,
          cy,
          cx + Math.sin(a - 0.1) * 14,
          cy + Math.cos(a - 0.1) * 14,
          cx + Math.sin(a) * 40,
          cy + Math.cos(a) * 40,
        ])
        .fill({ color: i % 2 ? 0x2f494a : 0xc8c5a4, alpha: 0.8 });
    }
    this.scene.addChild(compass, label('N', cx, cy - 56, 15, '#e3d9b9'));
    this.drawHighlight();
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
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
