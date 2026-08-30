// ============================================================
//  make-ico.mjs
//  Assembles public/favicon.ico from the intermediate PNGs written by
//  generate-icons.ps1. Multi-size ICO with PNG-embedded entries, which
//  every modern browser and Windows Vista+ understands.
//
//  Run from the repo root:  node scripts/make-ico.mjs
// ============================================================

import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const tmp = join(root, 'public', '.ico-tmp');
const out = join(root, 'public', 'favicon.ico');

const sizes = [16, 32, 48];
const images = sizes.map((size) => {
  const path = join(tmp, `ico-${size}.png`);
  if (!existsSync(path)) {
    throw new Error(`Missing ${path} — run scripts/generate-icons.ps1 first.`);
  }
  return { size, data: readFileSync(path) };
});

// ICONDIR: reserved(2) = 0, type(2) = 1 (icon), count(2)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

const ENTRY = 16;
let offset = header.length + images.length * ENTRY;

const entries = images.map(({ size, data }) => {
  // ICONDIRENTRY. Width/height are a single byte each; 0 means 256.
  const e = Buffer.alloc(ENTRY);
  e.writeUInt8(size === 256 ? 0 : size, 0); // width
  e.writeUInt8(size === 256 ? 0 : size, 1); // height
  e.writeUInt8(0, 2);                       // palette colors (0 = truecolor)
  e.writeUInt8(0, 3);                       // reserved
  e.writeUInt16LE(1, 4);                    // color planes
  e.writeUInt16LE(32, 6);                   // bits per pixel
  e.writeUInt32LE(data.length, 8);          // payload size
  e.writeUInt32LE(offset, 12);              // payload offset
  offset += data.length;
  return e;
});

writeFileSync(out, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]));

rmSync(tmp, { recursive: true, force: true });

const kb = (readFileSync(out).length / 1024).toFixed(1);
console.log(`favicon.ico written — ${sizes.join(', ')}px, ${kb} KB`);
