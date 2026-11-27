// news-image-20261127 — "Sum up 27 November's world news in one image".
// Node 22+, standard library only (node:fs, node:path, node:zlib).
// Draws a 1024x1024 newspaper front page in memory with a hand-rolled
// PNG encoder and a 5x7 bitmap font, then writes it to entry.png.
// Fully deterministic: fixed palette, fixed layout, no clock, no randomness,
// no network, no input files. Both runs write byte-identical output.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// PNG encoding (truecolour RGB, filter 0, zlib level 9, no ancillary chunks)
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width: number, height: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter type 0 (none)
    rgb.copy(raw, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows; each row is a 5-bit number,
// bit 4 = leftmost pixel. Only the characters this page uses are defined.
// ---------------------------------------------------------------------------

const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '\u2014': [0, 0, 0, 0x1f, 0, 0, 0],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  '\u00b7': [0, 0, 0, 0x0c, 0x0c, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
};
const BLANK_GLYPH = [0, 0, 0, 0, 0, 0, 0];

// ---------------------------------------------------------------------------
// Canvas: an RGB buffer with rectangle, line, circle and text primitives.
// ---------------------------------------------------------------------------

const WIDTH = 1024;
const HEIGHT = 1024;

type RGB = [number, number, number];
const PAPER: RGB = [250, 246, 236];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [20, 33, 61];
const NAVY_LIGHT: RGB = [38, 55, 92];
const RED: RGB = [180, 35, 24];
const GOLD: RGB = [196, 141, 44];
const TEAL: RGB = [13, 110, 102];
const WHITE: RGB = [255, 255, 255];
const RULE: RGB = [120, 110, 90];

class Canvas {
  buf: Buffer;
  constructor() {
    this.buf = Buffer.alloc(WIDTH * HEIGHT * 3);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      this.buf[i * 3] = PAPER[0];
      this.buf[i * 3 + 1] = PAPER[1];
      this.buf[i * 3 + 2] = PAPER[2];
    }
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  hline(x: number, y: number, w: number, c: RGB, t = 1): void {
    this.rect(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, c: RGB, t = 1): void {
    this.rect(x, y, t, h, c);
  }
  // Filled circle outline (1px ring) centred at (cx, cy).
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++)
        if (xx * xx + yy * yy <= r * r) this.set(cx + xx, cy + yy, c);
  }
}

// ---------------------------------------------------------------------------
// Text: measure, wrap, draw. One glyph cell is 6 units wide (5 + 1 spacing)
// and 7 units tall; scale multiplies every pixel.
// ---------------------------------------------------------------------------

function textWidth(text: string, scale: number): number {
  let w = 0;
  for (const ch of text) {
    const g = FONT[ch.toUpperCase()] ?? FONT[ch] ?? BLANK_GLYPH;
    void g;
    w += 6 * scale;
  }
  return w > 0 ? w - scale : 0; // no trailing spacing after the last glyph
}

function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (textWidth(trial, scale) <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawText(cv: Canvas, text: string, x: number, y: number, scale: number, color: RGB): number {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch.toUpperCase()] ?? FONT[ch] ?? BLANK_GLYPH;
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          cv.rect(cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
  return cx - x;
}

function drawCentered(cv: Canvas, text: string, y: number, scale: number, color: RGB): void {
  const w = textWidth(text, scale);
  drawText(cv, text, Math.round((WIDTH - w) / 2), y, scale, color);
}

// ---------------------------------------------------------------------------
// The day's news — every story was first reported on Friday 27 November 2026.
// ---------------------------------------------------------------------------

interface Story {
  tag: string;
  tagColor: RGB;
  headline: string;
  deck: string;
}

const STORIES: Story[] = [
  {
    tag: 'UKRAINE WAR',
    tagColor: RED,
    headline: 'BIGGEST PRISONER SWAP OF THE WAR DUE "SHORTLY"',
    deck: 'A US envoy says Russia and Ukraine are set to exchange the largest number of prisoners of the war, ahead of the holidays.',
  },
  {
    tag: 'EUROPE',
    tagColor: NAVY,
    headline: 'SERBIA CALLS EARLY PRESIDENTIAL VOTE FOR 27 DECEMBER',
    deck: 'Belgrade sets the snap election date after students won the parliamentary elections.',
  },
  {
    tag: 'MARKETS',
    tagColor: TEAL,
    headline: 'BLACK FRIDAY: WALL STREET REOPENS AS MARKETS RALLY',
    deck: 'Global stocks climb after Thanksgiving; online sales are forecast at a record $12.9 billion for the day.',
  },
  {
    tag: 'ASIA',
    tagColor: GOLD,
    headline: 'HONG KONG MARKS ONE YEAR SINCE DEADLY TOWER FIRE',
    deck: 'The city remembers the high-rise blaze that claimed residents\' lives a year ago.',
  },
  {
    tag: 'MIDDLE EAST',
    tagColor: RED,
    headline: 'ISRAELI DRONE STRIKE KILLS THREE IN GAZA CITY',
    deck: 'Three Palestinians are killed as strikes continue despite the ceasefire.',
  },
  {
    tag: 'ASIA',
    tagColor: NAVY,
    headline: 'KIM JONG UN VOWS "UNCONTROLLABLE" NUCLEAR BUILD-UP',
    deck: 'North Korea\'s leader rejects a US offer and escalates the nuclear programme.',
  },
  {
    tag: 'SPACE',
    tagColor: TEAL,
    headline: 'ROCKET LAB LAUNCHES "NIGHT OWLS NEVER SLEEP"',
    deck: 'Rocket Lab targets a 00:05 UTC launch from New Zealand for Synspective.',
  },
];

// ---------------------------------------------------------------------------
// Page layout: masthead, lead story, six more stories, footer.
// ---------------------------------------------------------------------------

const MARGIN = 44;
const CONTENT_W = WIDTH - MARGIN * 2;

function drawPage(): Buffer {
  const cv = new Canvas();

  // Masthead band.
  cv.rect(0, 0, WIDTH, 168, NAVY);
  cv.rect(0, 168, WIDTH, 4, GOLD);
  drawCentered(cv, 'THE WORLD TODAY', 26, 7, WHITE);
  drawCentered(cv, 'FRIDAY \u00b7 27 NOVEMBER 2026', 96, 4, GOLD);
  // Small globe mark at the left of the masthead.
  cv.circle(78, 84, 34, GOLD);
  cv.circle(78, 84, 22, GOLD);
  cv.vline(78, 50, 68, GOLD);
  cv.hline(44, 84, 68, GOLD);
  cv.disc(70, 66, 5, GOLD);
  cv.disc(88, 102, 5, GOLD);

  let y = 196;

  // Lead story, full width, larger type.
  const lead = STORIES[0];
  cv.rect(MARGIN, y, 10, 148, lead.tagColor);
  drawText(cv, lead.tag + '  \u2014  LEAD STORY', MARGIN + 26, y + 2, 2, lead.tagColor);
  const leadLines = wrapText(lead.headline, 4, CONTENT_W - 26);
  let ly = y + 30;
  for (const line of leadLines) {
    drawText(cv, line, MARGIN + 26, ly, 4, INK);
    ly += 36;
  }
  const leadDeck = wrapText(lead.deck, 2, CONTENT_W - 26);
  let dy = ly + 4;
  for (const line of leadDeck) {
    drawText(cv, line, MARGIN + 26, dy, 2, NAVY_LIGHT);
    dy += 20;
  }
  y = dy + 14;
  cv.hline(MARGIN, y, CONTENT_W, RULE, 2);
  y += 16;

  // Remaining stories in two columns.
  const colW = Math.floor((CONTENT_W - 28) / 2);
  const colX = [MARGIN, MARGIN + colW + 28];
  const rows = Math.ceil((STORIES.length - 1) / 2);
  const rowH = 196;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const idx = 1 + r * 2 + c;
      if (idx >= STORIES.length) continue;
      const s = STORIES[idx];
      const x = colX[c];
      const top = y + r * rowH;
      cv.rect(x, top, 8, 148, s.tagColor);
      drawText(cv, s.tag, x + 20, top + 2, 2, s.tagColor);
      const headLines = wrapText(s.headline, 3, colW - 20);
      let hy = top + 28;
      for (const line of headLines) {
        drawText(cv, line, x + 20, hy, 3, INK);
        hy += 27;
      }
      const deckLines = wrapText(s.deck, 2, colW - 20);
      let dyy = hy + 4;
      for (const line of deckLines) {
        drawText(cv, line, x + 20, dyy, 2, NAVY_LIGHT);
        dyy += 19;
      }
    }
    if (r < rows - 1) cv.hline(MARGIN, y + (r + 1) * rowH - 18, CONTENT_W, RULE, 1);
  }
  y = y + rows * rowH;

  // Footer.
  cv.hline(MARGIN, y - 6, CONTENT_W, RULE, 2);
  drawCentered(cv, 'ALL STORIES FIRST REPORTED FRIDAY 27 NOVEMBER 2026', y + 8, 2, INK);
  drawCentered(cv, 'THE WORLD IN ONE PAGE  \u00b7  MAKE.FUN NEWS-IMAGE-20261127', y + 30, 2, NAVY_LIGHT);

  return encodePng(WIDTH, HEIGHT, cv.buf);
}

// ---------------------------------------------------------------------------
// Entry point. Output dir: MAKEFUN_OUTPUT_DIR first, then MAKEFUN_BOT_DIR,
// then '/output' (the grader's /bot is read-only, so BOT_DIR-first dies).
// ---------------------------------------------------------------------------

function main(): void {
  const scriptDir = fileURLToPath(new URL('.', import.meta.url));
  void scriptDir;
  const outDir =
    process.env.MAKEFUN_OUTPUT_DIR ?? process.env.MAKEFUN_BOT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  const png = drawPage();
  const outPath = join(outDir, 'entry.png');
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes, ${WIDTH}x${HEIGHT})`);
}

main();
