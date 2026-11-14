// Draws the Verisafe icon at the sizes Chrome wants, with no image libraries.
// A rounded square in the site's accent blue with a white check inside.
//
//   node tools/make-icons.js      (also run by build-extension.js)
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const ACCENT = [0x2f, 0x6f, 0xed];
const CHECK = [0xff, 0xff, 0xff];
const SIZES = [16, 32, 48, 128];

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedSquare(x, y) {
  const pad = 0.03;
  const radius = 0.2;
  const min = pad;
  const max = 1 - pad;
  if (x < min || x > max || y < min || y > max) return false;
  const cx = Math.min(Math.max(x, min + radius), max - radius);
  const cy = Math.min(Math.max(y, min + radius), max - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

const CHECK_PATH = [[0.3, 0.52], [0.44, 0.66], [0.7, 0.36]];
const CHECK_HALF_WIDTH = 0.085;

function onCheck(x, y) {
  for (let i = 0; i < CHECK_PATH.length - 1; i++) {
    const [x1, y1] = CHECK_PATH[i];
    const [x2, y2] = CHECK_PATH[i + 1];
    if (distanceToSegment(x, y, x1, y1, x2, y2) <= CHECK_HALF_WIDTH) return true;
  }
  return false;
}

function iconPng(size) {
  const samples = 4;
  const pixelAt = (x, y) => {
    let inside = 0;
    let check = 0;
    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const px = (x + (sx + 0.5) / samples) / size;
        const py = (y + (sy + 0.5) / samples) / size;
        if (!insideRoundedSquare(px, py)) continue;
        inside++;
        if (onCheck(px, py)) check++;
      }
    }
    const total = samples * samples;
    if (inside === 0) return [0, 0, 0, 0];

    const mix = check / inside;
    return [
      Math.round(ACCENT[0] * (1 - mix) + CHECK[0] * mix),
      Math.round(ACCENT[1] * (1 - mix) + CHECK[1] * mix),
      Math.round(ACCENT[2] * (1 - mix) + CHECK[2] * mix),
      Math.round((inside / total) * 255),
    ];
  };
  return encodePng(size, pixelAt);
}

export async function writeIcons(directory) {
  await mkdir(directory, { recursive: true });
  for (const size of SIZES) {
    await writeFile(join(directory, `${size}.png`), iconPng(size));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  await writeIcons(join(root, "extension", "icons"));
  console.log(`Wrote ${SIZES.join(", ")} px icons to extension/icons`);
}
