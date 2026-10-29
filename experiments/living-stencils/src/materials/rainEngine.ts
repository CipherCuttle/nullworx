/**
 * Terminal Rain - a Canvas 2D ASCII-cell material.
 *
 * The material is authored as a full rectangle, independent of every stencil.
 * It is a field of printable ASCII cells on the same 16 px pitch, monospaced
 * face and ordered density ramp used by the approved UI Flower ASCII Waves
 * field. Falling streams replace whole cells; no glyph is ever drawn between
 * cells. The stencil only decides which cells are visible.
 */

import {
  ASCII_RAIN_CELL_SIZE,
  ASCII_FONT_STACK,
  ASCII_GLYPHS,
  ASCII_RAMP,
} from '../compositing/ascii';

export interface RainSettings {
  speed: number;
  density: number;
  glow: number;
  pointerResponse: number;
}

export interface RainMetrics {
  fps: number;
  frameMs: number;
  frameCount: number;
  width: number;
  height: number;
  dpr: number;
  columns: number;
  activeColumns: number;
  glyphs: number;
  pointerStrength: number;
}

interface LayerSpec {
  id: 'far' | 'mid' | 'near';
  weight: number;
  speed: [number, number];
  trail: [number, number];
  alpha: number;
  body: string[];
  head: string;
  glowSize: number;
  glowWeight: number;
  glowColor: string;
}

interface Column {
  layer: number;
  index: number;
  x: number;
  y: number;
  rank: number;
  speedFactor: number;
  trail: number;
  seed: number;
  pulsePhase: number;
  pulseSpeed: number;
  body: string;
  beacon: boolean;
}

const CELL = ASCII_RAIN_CELL_SIZE;
const FROST_CHARS = '.:-=+*';
const STREAM_RAMP = ASCII_RAMP.trim();
const CELL_FONT = `700 ${Math.round(CELL * 0.92)}px ${ASCII_FONT_STACK}`;
const FROST_COLORS = ['#9db4aa', '#b1c6bd', '#8ca399', '#c0d4cc', '#87b9a6'];

const LAYERS: LayerSpec[] = [
  {
    id: 'far',
    weight: 0.3,
    speed: [17, 27],
    trail: [4, 9],
    alpha: 0.62,
    body: ['#879e96', '#93aaa2', '#7f9a91'],
    head: '#d8f5ea',
    glowSize: 20,
    glowWeight: 0.25,
    glowColor: '#c3e6d9',
  },
  {
    id: 'mid',
    weight: 0.38,
    speed: [30, 45],
    trail: [6, 13],
    alpha: 0.86,
    body: ['#aec7bf', '#b9d4cc', '#9dbbb2'],
    head: '#f0fff9',
    glowSize: 28,
    glowWeight: 0.55,
    glowColor: '#cffff0',
  },
  {
    id: 'near',
    weight: 0.32,
    speed: [46, 65],
    trail: [8, 17],
    alpha: 1,
    body: ['#dcebe5', '#c9e1da', '#e8f5ef'],
    head: '#ffffff',
    glowSize: 36,
    glowWeight: 0.85,
    glowColor: '#baffdf',
  },
];

const DEFAULTS: RainSettings = {
  speed: 1,
  density: 0.96,
  glow: 0.85,
  pointerResponse: 0.9,
};

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function makeGlowSprite(hex: string, size: number, strength: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  const pixelSize = Math.max(16, Math.round(size * 2));
  sprite.width = pixelSize;
  sprite.height = pixelSize;
  const ctx = sprite.getContext('2d');
  if (!ctx) return sprite;
  const [r, g, b] = hexToRgb(hex);
  const gradient = ctx.createRadialGradient(
    pixelSize / 2,
    pixelSize / 2,
    0,
    pixelSize / 2,
    pixelSize / 2,
    pixelSize / 2,
  );
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * strength})`);
  gradient.addColorStop(0.22, `rgba(${r}, ${g}, ${b}, ${0.24 * strength})`);
  gradient.addColorStop(0.56, `rgba(${r}, ${g}, ${b}, ${0.06 * strength})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, pixelSize, pixelSize);
  return sprite;
}

export class TerminalRainEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly seed: number;
  private settings: RainSettings = { ...DEFAULTS };
  private columns: Column[] = [];
  private glowSprites: HTMLCanvasElement[] = [];
  private frost: HTMLCanvasElement | null = null;
  private shadeImage: HTMLImageElement | null = null;
  private frostGlyphs = 0;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private raf = 0;
  private running = false;
  private lastTime = 0;
  private lastMetricsTime = 0;
  private elapsed = 0;
  private framesSinceMetric = 0;
  private frameCount = 0;
  private fps = 0;
  private frameMs = 0;
  private disposed = false;
  private pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, strength: 0, targetStrength: 0 };
  private lastGlyphCount = 0;
  private activeColumns = 0;
  private readonly handleFrame = (now: number) => this.frame(now);

  constructor(canvas: HTMLCanvasElement, options: { seed?: number; settings?: Partial<RainSettings> } = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable for Terminal Rain.');
    this.ctx = ctx;
    this.seed = (options.seed ?? 0x51f15e) >>> 0;
    this.settings = { ...DEFAULTS, ...options.settings };
    this.glowSprites = LAYERS.map((layer) =>
      makeGlowSprite(layer.glowColor, layer.glowSize, layer.glowWeight),
    );
    this.resize();
    this.drawStaticFrame();
  }

  setShade(image: HTMLImageElement | null) {
    this.shadeImage = image;
    this.buildFrost();
    if (!this.running) this.drawStaticFrame();
  }

  setSettings(next: Partial<RainSettings>) {
    this.settings = {
      speed: clamp(next.speed ?? this.settings.speed, 0.1, 2.5),
      density: clamp(next.density ?? this.settings.density, 0.05, 1),
      glow: clamp(next.glow ?? this.settings.glow, 0, 1.6),
      pointerResponse: clamp(next.pointerResponse ?? this.settings.pointerResponse, 0, 1.5),
    };
    if (!this.running) this.drawStaticFrame();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = dpr;
    this.buildColumns();
    this.buildFrost();
    if (!this.running) this.drawStaticFrame();
  }

  private layerForRoll(roll: number): number {
    let cursor = 0;
    for (let index = 0; index < LAYERS.length; index += 1) {
      cursor += LAYERS[index]!.weight;
      if (roll <= cursor) return index;
    }
    return LAYERS.length - 1;
  }

  private buildColumns() {
    const count = Math.max(1, Math.ceil(this.width / CELL));
    const rng = mulberry32(this.seed ^ 0x51f15e);
    const previous = new Map(this.columns.map((column) => [column.index, column]));
    const columns: Column[] = [];

    for (let index = 0; index < count; index += 1) {
      const rank = rng();
      const layerIndex = this.layerForRoll(rng());
      const layer = LAYERS[layerIndex]!;
      const trail = Math.max(1, Math.round(mix(layer.trail[0], layer.trail[1], rng())));
      const speedFactor = mix(0.7, 1.3, rng());
      const seed = Math.floor(rng() * 0xffffffff);
      const colorIndex = Math.floor(rng() * layer.body.length);
      const old = previous.get(index);
      const visibleSpan = this.height + trail * CELL;
      const initialY = old ? old.y : rng() * visibleSpan - trail * CELL * 0.5;
      columns.push({
        layer: layerIndex,
        index,
        x: index * CELL + CELL / 2,
        y: initialY,
        rank,
        speedFactor,
        trail,
        seed,
        pulsePhase: rng() * Math.PI * 2,
        pulseSpeed: mix(0.08, 0.2, rng()) * (layerIndex === 0 ? 0.65 : 1),
        body: layer.body[colorIndex] ?? layer.body[0]!,
        beacon: layerIndex > 0 && rng() < 0.18,
      });
    }
    this.columns = columns;
  }

  /**
   * One whole ASCII character per 16 px cell. This is the static body of the
   * material; the falling streams replace selected cells every frame. The
   * offscreen field is built once per resize and then composited as one image.
   */
  private buildFrost() {
    const frost = document.createElement('canvas');
    frost.width = this.canvas.width;
    frost.height = this.canvas.height;
    const ctx = frost.getContext('2d');
    if (!ctx) { this.frost = null; this.frostGlyphs = 0; return; }
    ctx.scale(this.dpr, this.dpr);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = CELL_FONT;
    const cols = Math.max(1, Math.ceil(this.width / CELL));
    const rows = Math.max(1, Math.ceil(this.height / CELL));
    let count = 0;

    if (this.shadeImage) {
      // Borrow the UI Flower luminance-to-ASCII logic: sample one luminance
      // value per character cell, choose a glyph from the same ordered ramp,
      // and place it on the same grid. No second glyph can occupy a cell.
      const sampler = document.createElement('canvas');
      sampler.width = cols;
      sampler.height = rows;
      const sampleContext = sampler.getContext('2d', { willReadFrequently: true });
      if (sampleContext) {
        sampleContext.drawImage(this.shadeImage, 0, 0, cols, rows);
        const luma = sampleContext.getImageData(0, 0, cols, rows).data;
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const offset = (row * cols + col) * 4;
            const sourceAlpha = luma[offset + 3]! / 255;
            const value = ((luma[offset]! * 0.2126 + luma[offset + 1]! * 0.7152 + luma[offset + 2]! * 0.0722) / 255) * sourceAlpha;
            const tone = Math.pow(clamp((value - 0.03) / 0.75, 0, 1), 0.8);
            const index = Math.round(tone * (ASCII_RAMP.length - 1));
            const character = ASCII_RAMP[index] ?? ' ';
            if (character === ' ') continue;
            const colour = tone > 0.75 ? '#d9f6e9' : tone > 0.45 ? '#a8d8c6' : '#6f9e8b';
            ctx.globalAlpha = 0.24 + tone * 0.56;
            ctx.fillStyle = colour;
            ctx.fillText(character, col * CELL + CELL / 2, row * CELL + CELL / 2 + 1);
            count += 1;
          }
        }
      }
    } else {
      const rng = mulberry32(this.seed ^ 0xa5f3c21d);
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const wave = 0.7 + 0.3 * Math.sin(col * 0.34 + row * 0.08 + 1.7)
            + 0.12 * Math.sin(col * 0.09 - row * 0.19 + 4.1);
          const alpha = clamp((0.24 + rng() * 0.3) * wave, 0.18, 0.52);
          const color = FROST_COLORS[Math.floor(rng() * FROST_COLORS.length)] ?? FROST_COLORS[0]!;
          const character = FROST_CHARS[Math.floor(rng() * FROST_CHARS.length)] ?? '.';
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.fillText(character, col * CELL + CELL / 2, row * CELL + CELL / 2 + 1);
          count += 1;
        }
      }
    }

    this.frost = frost;
    this.frostGlyphs = count;
    this.canvas.dataset.frostGlyphs = String(count);
  }

  setPointer(x: number, y: number, active = true) {
    this.pointer.tx = clamp(x, 0, 1);
    this.pointer.ty = clamp(y, 0, 1);
    this.pointer.targetStrength = active ? 1 : 0;
  }

  setPointerActive(active: boolean) {
    this.pointer.targetStrength = active ? 1 : 0;
  }

  setRunning(running: boolean) {
    if (this.disposed || running === this.running) return;
    this.running = running;
    if (running) {
      this.lastTime = performance.now();
      this.lastMetricsTime = this.lastTime;
      this.framesSinceMetric = 0;
      this.raf = requestAnimationFrame(this.handleFrame);
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.drawStaticFrame();
    }
  }

  drawStaticFrame() {
    if (this.disposed) return;
    this.paint(true);
  }

  private advance(dt: number) {
    this.elapsed += dt;
    const pointerEase = 1 - Math.exp(-dt * 7.2);
    this.pointer.x += (this.pointer.tx - this.pointer.x) * pointerEase;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * pointerEase;
    this.pointer.strength += (this.pointer.targetStrength - this.pointer.strength) * pointerEase;

    for (const column of this.columns) {
      const layer = LAYERS[column.layer]!;
      const speed = mix(layer.speed[0], layer.speed[1], column.speedFactor) * this.settings.speed;
      column.y += speed * dt;
      const tailY = column.y - column.trail * CELL;
      if (tailY > this.height + CELL * 2) {
        const rng = mulberry32((column.seed ^ (this.frameCount * 2654435761)) >>> 0);
        column.y = -CELL * (1.5 + rng() * 5) - rng() * this.height * 0.34;
        column.trail = Math.max(1, Math.round(mix(layer.trail[0], layer.trail[1], rng())));
        column.speedFactor = mix(0.7, 1.3, rng());
        column.seed = Math.floor(rng() * 0xffffffff);
      }
    }
  }

  private frame(now: number) {
    if (this.disposed || !this.running) return;
    this.raf = requestAnimationFrame(this.handleFrame);
    const rawDt = (now - this.lastTime) / 1000;
    const dt = clamp(rawDt, 0, 0.05);
    this.lastTime = now;
    this.advance(dt);
    this.paint(false);
    this.framesSinceMetric += 1;
    this.frameMs = this.frameMs * 0.82 + rawDt * 1000 * 0.18;
    if (now - this.lastMetricsTime > 650) {
      this.fps = (this.framesSinceMetric * 1000) / (now - this.lastMetricsTime);
      this.framesSinceMetric = 0;
      this.lastMetricsTime = now;
      this.canvas.dataset.fps = this.fps.toFixed(1);
      this.canvas.dataset.frameMs = this.frameMs.toFixed(2);
      this.canvas.dataset.frameCount = String(this.frameCount);
      this.canvas.dataset.glyphs = String(this.lastGlyphCount);
      this.canvas.dataset.activeColumns = String(this.activeColumns);
      this.canvas.dataset.pointerStrength = this.pointer.strength.toFixed(3);
    }
  }

  private characterForFade(fade: number): string {
    const index = clamp(Math.round(fade * (STREAM_RAMP.length - 1)), 0, STREAM_RAMP.length - 1);
    return STREAM_RAMP[index] ?? '.';
  }

  private paint(still: boolean) {
    if (this.disposed) return;
    const ctx = this.ctx;
    const { width, height, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.frost) ctx.drawImage(this.frost, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = CELL_FONT;

    const rows = Math.max(1, Math.ceil(height / CELL));
    const pointerX = this.pointer.x * width;
    const pointerY = this.pointer.y * height;
    const pointerOn = this.pointer.strength * this.settings.pointerResponse;
    const pointerRadius = Math.max(90, width * 0.24);
    let glyphCount = this.frostGlyphs;
    let activeColumns = 0;

    for (const column of this.columns) {
      if (column.rank > this.settings.density) continue;
      activeColumns += 1;
      const layer = LAYERS[column.layer]!;
      const pulse = 0.8 + 0.2 * Math.sin(this.elapsed * column.pulseSpeed + column.pulsePhase);
      const headRow = Math.floor(column.y / CELL);
      if (headRow < -1 || headRow > rows + 1) continue;

      for (let step = 0; step < column.trail; step += 1) {
        const row = headRow - step;
        if (row < 0 || row >= rows) continue;
        const x = column.x;
        const y = row * CELL + CELL / 2;
        const fade = 1 - step / Math.max(1, column.trail - 1);
        const isHead = step === 0;
        const localPointer = Math.exp(
          -((x - pointerX) ** 2 + (y - pointerY) ** 2) / (2 * pointerRadius ** 2),
        );
        const boost = pointerOn * localPointer;
        const alpha = clamp(layer.alpha * (0.3 + 0.7 * fade) * pulse + boost * 0.45, 0, 1);
        if (alpha < 0.08) continue;

        // Whole-cell redraw: the frost glyph is removed, then exactly one
        // stream character is placed in this cell.
        ctx.clearRect(x - CELL / 2, row * CELL, CELL, CELL);

        if (isHead && this.settings.glow > 0.01) {
          const sprite = this.glowSprites[column.layer]!;
          const glow = this.settings.glow * layer.glowWeight * (column.beacon ? 1.4 : 1);
          const size = CELL * (column.beacon ? 1.45 : 1.15);
          ctx.save();
          ctx.beginPath();
          ctx.rect(x - CELL / 2, row * CELL, CELL, CELL);
          ctx.clip();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = clamp(glow * pulse, 0, 0.78);
          ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
          ctx.restore();
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = isHead ? (column.beacon ? '#ffffff' : layer.head) : column.body;
        ctx.fillText(
          isHead ? '@' : this.characterForFade(fade),
          x,
          y + 1,
        );
        glyphCount += 1;
      }
    }

    // Ambient head glints are intentionally not separate marks: every visible
    // mark must be a character in a cell. The brightest cell is the lead '@'.

    ctx.globalAlpha = 1;
    this.lastGlyphCount = glyphCount;
    this.activeColumns = activeColumns;
    this.frameCount += 1;
    this.canvas.dataset.pointerStrength = this.pointer.strength.toFixed(3);
    if (still) {
      this.canvas.dataset.frameCount = String(this.frameCount);
      this.canvas.dataset.glyphs = String(glyphCount);
      this.canvas.dataset.activeColumns = String(activeColumns);
      this.canvas.dataset.fps = this.fps.toFixed(1);
    }
  }

  getMetrics(): RainMetrics {
    return {
      fps: Number(this.fps.toFixed(1)),
      frameMs: Number(this.frameMs.toFixed(2)),
      frameCount: this.frameCount,
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      columns: this.columns.length,
      activeColumns: this.activeColumns,
      glyphs: this.lastGlyphCount,
      pointerStrength: Number(this.pointer.strength.toFixed(3)),
    };
  }

  getGlyphPalette(): string[] {
    return Array.from(new Set(ASCII_GLYPHS));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.running = false;
    this.columns = [];
    this.glowSprites = [];
    this.frost = null;
    this.shadeImage = null;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
