/**
 * Generates simple placeholder PNG icons (16/32/48/128) without external deps.
 * Solid teal square with a white "P" drawn as rectangles — good enough for local loading.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icon');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const teal = [13, 148, 136, 255]; // #0d9488
  const white = [255, 255, 255, 255];

  const setPixel = (x, y, rgba) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter
    const i = row + 1 + x * 4;
    raw[i] = rgba[0];
    raw[i + 1] = rgba[1];
    raw[i + 2] = rgba[2];
    raw[i + 3] = rgba[3];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPixel(x, y, teal);
  }

  // Rough "P" glyph
  const m = Math.max(1, Math.floor(size / 8));
  const left = Math.floor(size * 0.28);
  const top = Math.floor(size * 0.2);
  const bottom = Math.floor(size * 0.8);
  const right = Math.floor(size * 0.62);
  const midY = Math.floor(size * 0.5);

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < left + m; x++) setPixel(x, y, white);
  }
  for (let y = top; y < top + m; y++) {
    for (let x = left; x < right; x++) setPixel(x, y, white);
  }
  for (let y = midY - Math.floor(m / 2); y < midY + Math.ceil(m / 2); y++) {
    for (let x = left; x < right; x++) setPixel(x, y, white);
  }
  for (let y = top; y < midY; y++) {
    for (let x = right - m; x < right; x++) setPixel(x, y, white);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) {
  const path = join(outDir, `${size}.png`);
  writeFileSync(path, makePng(size));
  console.log('wrote', path);
}
