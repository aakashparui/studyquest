/**
 * Renders the StudyQuest app icons straight to PNG — no image library, no
 * build-time dependency. Run with `npm run icons` after changing the mark.
 *
 * The mark: a violet-to-fuchsia tile with a white timer ring (an arc with
 * round caps) and the little cap on top. Everything sits inside the central
 * 80% so maskable (circle-cropped) launchers don't clip it.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/* ----------------------------------------------------------------- PNG */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** `pixels` is RGBA, 4 bytes per pixel, row-major. */
function encodePng(width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- draw */

const BG_FROM = [124, 58, 237]; // violet 600
const BG_TO = [217, 70, 239]; // fuchsia 500
const INK = [255, 255, 255];

const SAMPLES = 3; // supersampling grid per axis

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Signed distance to a rounded rectangle centred at (cx, cy). */
function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

/**
 * Coverage of the white mark at one sample point: the arc (with round caps)
 * plus the cap on top. Returns 1 inside, 0 outside.
 */
function markAt(x, y, size) {
  const cx = size / 2;
  const cy = size / 2 + size * 0.025;
  const radius = size * 0.27;
  const half = size * 0.0375; // half the stroke width

  // Timer cap.
  if (
    roundedRectDistance(
      x,
      y,
      cx,
      cy - radius - size * 0.075,
      size * 0.075,
      size * 0.037,
      size * 0.028,
    ) <= 0
  ) {
    return 1;
  }

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);

  // Angle measured clockwise from twelve o'clock.
  const angle = (Math.atan2(dx, -dy) * (180 / Math.PI) + 360) % 360;
  const sweep = 284;

  if (Math.abs(dist - radius) <= half && angle <= sweep) return 1;

  // Round caps at both ends of the arc.
  for (const end of [0, sweep]) {
    const rad = (end * Math.PI) / 180;
    const ex = cx + Math.sin(rad) * radius;
    const ey = cy - Math.cos(rad) * radius;
    if (Math.hypot(x - ex, y - ey) <= half) return 1;
  }

  return 0;
}

function render(size, { rounded }) {
  const pixels = Buffer.alloc(size * size * 4);
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let inside = 0;
      let mark = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          if (
            !rounded ||
            roundedRectDistance(px, py, size / 2, size / 2, size / 2, size / 2, cornerRadius) <= 0
          ) {
            inside += 1;
          }
          mark += markAt(px, py, size);
        }
      }

      const total = SAMPLES * SAMPLES;
      const alpha = inside / total;
      const markAlpha = mark / total;

      const background = mix(BG_FROM, BG_TO, (x + y) / (2 * size));
      const colour = mix(background, INK, markAlpha);

      const offset = (y * size + x) * 4;
      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, size, pixels);
}

/* ---------------------------------------------------------------- main */

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  // Square and full-bleed: launchers that apply their own mask.
  { file: 'icon-192.png', size: 192, rounded: false },
  { file: 'icon-512.png', size: 512, rounded: false },
  { file: 'icon-maskable-512.png', size: 512, rounded: false },
  // iOS does its own rounding but dislikes transparency.
  { file: 'apple-touch-icon.png', size: 180, rounded: false },
];

for (const target of targets) {
  const png = render(target.size, { rounded: target.rounded });
  writeFileSync(join(OUT_DIR, target.file), png);
  console.log(`${target.file} — ${target.size}x${target.size}, ${png.length} bytes`);
}
