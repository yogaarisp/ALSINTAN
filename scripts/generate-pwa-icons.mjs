/**
 * generate-pwa-icons.mjs — buat ikon PWA SIAP ALSINTAN (tanpa dependensi eksternal).
 * Output: public/pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png,
 *         favicon.ico (PNG di dalam ICO), masked-icon.svg
 * Desain: kotak rounded gradien hijau + sprout putih (senada logo app).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public');

// ── PNG encoder minimal (RGBA 8-bit) ─────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePNG = (width, height, rgba) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// ── Gambar ikon: rounded rect gradien + sprout putih ─────────
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const green = [22, 163, 74];
  const green2 = [5, 150, 105];
  const white = [255, 255, 255, 255];
  const transparent = [0, 0, 0, 0];

  const inRounded = (x, y) => {
    const rx = Math.min(x, size - 1 - x);
    const ry = Math.min(y, size - 1 - y);
    if (rx >= radius || ry >= radius) return rx >= 0 && ry >= 0;
    const dx = radius - rx;
    const dy = radius - ry;
    return dx * dx + dy * dy <= radius * radius;
  };
  const inEllipse = (x, y, cx, cy, a, b, theta) => {
    const dx = x - cx;
    const dy = y - cy;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const u = (dx * c + dy * s) / a;
    const v = (-dx * s + dy * c) / b;
    return u * u + v * v <= 1;
  };

  const cx = size / 2;
  const stemTop = size * 0.30;
  const stemBottom = size * 0.74;
  const stemW = size * 0.045;
  const leafA = size * 0.155;
  const leafB = size * 0.085;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRounded(x, y)) {
        transparent.forEach((v, k) => (rgba[i + k] = v));
        continue;
      }
      const c = mix(green, green2, y / size);
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = 255;

      let isWhite = false;
      // batang
      if (x >= cx - stemW / 2 && x <= cx + stemW / 2 && y >= stemTop && y <= stemBottom) isWhite = true;
      // dua daun
      if (inEllipse(x, y, cx - leafA * 0.72, stemTop + leafB * 0.55, leafA, leafB, -0.55)) isWhite = true;
      if (inEllipse(x, y, cx + leafA * 0.72, stemTop + leafB * 0.55, leafA, leafB, 0.55)) isWhite = true;
      // tanah
      if (y >= stemBottom && y <= stemBottom + stemW * 0.8 && Math.abs(x - cx) <= leafA * 1.05) isWhite = true;

      if (isWhite) white.forEach((v, k) => (rgba[i + k] = v));
    }
  }
  return encodePNG(size, size, rgba);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'pwa-192x192.png'), drawIcon(192));
fs.writeFileSync(path.join(OUT, 'pwa-512x512.png'), drawIcon(512));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), drawIcon(180));

// favicon.ico = PNG 32x32 dibungkus container ICO
const png32 = drawIcon(32);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 32;
entry[1] = 32;
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png32.length, 8);
entry.writeUInt32LE(22, 12);
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([header, entry, png32]));

// masked-icon.svg (mono, utk PWA maskable lama)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#16a34a"/>
<g fill="#ffffff" transform="translate(256 256) scale(11)">
<rect x="-0.9" y="-3.2" width="1.8" height="6.4" rx="0.9"/>
<ellipse cx="-2.6" cy="-2.9" rx="3.1" ry="1.7" transform="rotate(-32 -2.6 -2.9)"/>
<ellipse cx="2.6" cy="-2.9" rx="3.1" ry="1.7" transform="rotate(32 2.6 -2.9)"/>
<rect x="-3.4" y="3.2" width="6.8" height="1" rx="0.5"/>
</g></svg>`;
fs.writeFileSync(path.join(OUT, 'masked-icon.svg'), svg);

console.log('Ikon dibuat di public/: pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png, favicon.ico, masked-icon.svg');
