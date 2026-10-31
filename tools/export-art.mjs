// Writes every robot as a standalone .svg (plus card back and logo).
// Usage: node tools/export-art.mjs [outDir]   (default: assets/cards)
import { mkdir, writeFile } from 'node:fs/promises';
import { CARDS } from '../js/cards.js';
import { robotSVG, cardBackSVG, logoSVG } from '../js/art.js';

const out = process.argv[2] || 'assets/cards';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
await mkdir(out, { recursive: true });
for (const c of CARDS) await writeFile(`${out}/${c.id}-${slug(c.name)}.svg`, robotSVG(c));
await writeFile(`${out}/card-back.svg`, cardBackSVG());
await writeFile(`${out}/logo.svg`, logoSVG());
console.log(`🎨 Wrote ${CARDS.length + 2} SVG files to ${out}`);