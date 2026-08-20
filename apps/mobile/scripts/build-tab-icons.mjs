/**
 * Génère les icônes de la barre d'onglets.
 *
 * `NativeTabs` s'appuie sur des vues natives : il lui faut des images, pas des
 * composants React. Ces PNG sont donc rendus à partir des mêmes tracés que
 * `src/components/ui/icon.tsx`, pour que la barre d'onglets et les icônes dans
 * les écrans soient la même famille et pas deux jeux qui se ressemblent.
 *
 * Les fichiers produits sont des masques noirs à canal alpha : c'est le mode
 * `template` qui les teinte, la couleur d'ici n'a aucune importance.
 *
 *   bun run scripts/build-tab-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images', 'tabIcons');

/** Grille de tracé, identique à celle du composant `Icon`. */
const VIEWBOX = 24;
const STROKE = 1.8;
/** Suréchantillonnage : 8×8 sous-pixels par pixel, soit un lissage propre. */
const SUPERSAMPLE = 8;

/** Échantillonne une cubique de Bézier en ligne brisée. */
function cubic(p0, c0, c1, p1, steps = 16) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push([
      u * u * u * p0[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t * t * t * p1[1],
    ]);
  }
  return points;
}

const icons = {
  home: {
    polylines: [
      [[3, 10.5], [12, 3], [21, 10.5]],
      [[5.5, 9.5], [5.5, 20], [18.5, 20], [18.5, 9.5]],
    ],
    circles: [],
  },
  chart: {
    polylines: [
      [[4, 5], [4, 19], [20, 19]],
      [[7.5, 15.5], [11, 11], [14, 13.5], [18.5, 7.5]],
    ],
    circles: [],
  },
  person: {
    polylines: [
      [
        ...cubic([5, 20], [5, 16.7], [8.1, 14.5], [12, 14.5]),
        ...cubic([12, 14.5], [15.9, 14.5], [19, 16.7], [19, 20]),
      ],
    ],
    circles: [[12, 8, 3.5]],
  },
};

/** Distance d'un point à un segment. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance d'un point au trait de l'icône (le plus proche de ses primitives). */
function distanceToIcon(icon, px, py) {
  let best = Infinity;
  for (const polyline of icon.polylines) {
    for (let i = 0; i < polyline.length - 1; i++) {
      const [ax, ay] = polyline[i];
      const [bx, by] = polyline[i + 1];
      best = Math.min(best, distanceToSegment(px, py, ax, ay, bx, by));
    }
  }
  for (const [cx, cy, r] of icon.circles) {
    best = Math.min(best, Math.abs(Math.hypot(px - cx, py - cy) - r));
  }
  return best;
}

/** Rend l'icône en un buffer RGBA de `size × size`. */
function render(icon, size) {
  const scale = VIEWBOX / size;
  const half = STROKE / 2;
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let covered = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const px = (x + (sx + 0.5) / SUPERSAMPLE) * scale;
          const py = (y + (sy + 0.5) / SUPERSAMPLE) * scale;
          if (distanceToIcon(icon, px, py) <= half) covered++;
        }
      }
      const alpha = Math.round((covered / (SUPERSAMPLE * SUPERSAMPLE)) * 255);
      rgba[(y * size + x) * 4 + 3] = alpha;
    }
  }
  return rgba;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function toPng(rgba, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA
  // Une ligne = un octet de filtre (0, aucun) suivi des pixels.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, icon] of Object.entries(icons)) {
  for (const [suffix, size] of [['', 24], ['@2x', 48], ['@3x', 72]]) {
    const file = join(OUT_DIR, `${name}${suffix}.png`);
    writeFileSync(file, toPng(render(icon, size), size));
    console.log(`${name}${suffix}.png — ${size}×${size}`);
  }
}
