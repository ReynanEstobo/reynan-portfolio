// Dependency-free visual QA for the actual pixel renderer. Rows: departure,
// right walk, left walk, stopping to wave. Each column is a later frame.
// Usage: node frontend/scripts/render-walking-preview.mjs [output.png]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCompanion, commandCompanion, updateCompanion } from '../src/companion/engine.js';
import { drawCompanion } from '../src/companion/sprite.js';

const columns = 8, cellWidth = 128, cellHeight = 170;
const width = columns * cellWidth, height = 4 * cellHeight;
const pixels = Buffer.alloc(width * height * 3);
for (let i = 0; i < pixels.length; i += 3) {
  pixels[i] = 255; pixels[i + 1] = 248; pixels[i + 2] = 230;
}

function context(originX, originY) {
  let transform = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const ctx = {
    fillStyle: '#101c28', globalAlpha: 1, imageSmoothingEnabled: false,
    save() { stack.push({ transform: [...transform], fillStyle: this.fillStyle, globalAlpha: this.globalAlpha }); },
    restore() { const saved = stack.pop(); transform = saved.transform; this.fillStyle = saved.fillStyle; this.globalAlpha = saved.globalAlpha; },
    setTransform(...matrix) { transform = matrix; },
    translate(x, y) { transform[4] += transform[0] * x; transform[5] += transform[3] * y; },
    scale(x, y) { transform[0] *= x; transform[3] *= y; },
    clearRect() {}, // Each pose draws into its own fresh paper-colored cell.
    fillRect(x, y, w, h) {
      const color = [1, 3, 5].map(i => parseInt(this.fillStyle.slice(i, i + 2), 16));
      const x0 = originX + transform[4] + transform[0] * x;
      const x1 = x0 + transform[0] * w;
      const y0 = originY + transform[5] + transform[3] * y;
      const y1 = y0 + transform[3] * h;
      for (let py = Math.max(originY, Math.round(Math.min(y0, y1))); py < Math.min(originY + 152, Math.round(Math.max(y0, y1))); py++) {
        for (let px = Math.max(originX, Math.round(Math.min(x0, x1))); px < Math.min(originX + 112, Math.round(Math.max(x0, x1))); px++) {
          const offset = (py * width + px) * 3;
          color.forEach((channel, i) => { pixels[offset + i] = Math.round(pixels[offset + i] * (1 - this.globalAlpha) + channel * this.globalAlpha); });
        }
      }
    },
  };
  return ctx;
}

function model(direction) {
  const m = createCompanion({ width: 1400, height: 800 });
  m.x = 650; m.direction = direction;
  commandCompanion(m, 'come', { x: m.x + 56 + direction * 500 });
  return m;
}
function advance(m, seconds) {
  for (let i = 0; i < Math.round(seconds * 120); i++) updateCompanion(m, 1 / 120, { quiet: true });
}
const rows = [model(1), model(1), model(-1), model(1)];
advance(rows[1], 1); advance(rows[2], 1); advance(rows[3], 1);
commandCompanion(rows[3], 'wave');
rows.forEach((m, row) => {
  for (let column = 0; column < columns; column++) {
    const ctx = context(column * cellWidth + 8, row * cellHeight + 8);
    drawCompanion(ctx, m);
    // A thin guide makes hovering feet and cut-off soles easy to spot.
    ctx.fillStyle = '#bcbfac'; ctx.fillRect(0, 151, 112, 1);
    advance(m, row === 0 ? 0.05 : 0.12);
  }
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; ihdr[9] = 2;
const raw = Buffer.alloc((width * 3 + 1) * height);
for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
const output = process.argv[2] || join(tmpdir(), 'reynan-walking-check.png');
writeFileSync(output, png);
console.log(output);
