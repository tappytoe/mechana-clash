// Builds the Mechana-Clash thumbnail: 1280×640 (GitHub social preview + link previews).
// Usage: node tools/thumbnail.mjs [outDir]  → thumbnail.svg, plus thumbnail.png when @resvg/resvg-js is installed.
import { mkdir, writeFile } from 'node:fs/promises';
import { CARD_MAP, TYPES } from '../js/cards.js';
import { robotSVG, logoSVG } from '../js/art.js';

const W = 1280, H = 640, INK = '#1a1830';
const FONT = "'Arial Black','DejaVu Sans',Arial,sans-serif";
const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nest = (svg, x, y, w, h, vb) => svg.replace(/^<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">`);
const ICONS = {
  blade: 'M0 -14l5 6v13h5v4h-5v6h-10v-6h-5v-4h5v-13z',
  volt: 'M4 -14l-12 18h7l-4 14l13-19h-7l4-13z',
  iron: 'M0 -13l12 5v8q0 11-12 16q-12-5-12-16v-8z',
};

function card(c, x, y, rot) {
  const col = TYPES[c.type].color;
  return `<g transform="translate(${x} ${y}) rotate(${rot} 130 180)">` +
    `<rect x="8" y="14" width="260" height="360" rx="22" fill="#000" opacity=".35"/>` +
    `<rect width="260" height="360" rx="22" fill="${col}" stroke="${INK}" stroke-width="5"/>` +
    `<rect x="10" y="10" width="240" height="340" rx="15" fill="url(#tcard)"/>` +
    `<text x="130" y="42" text-anchor="middle" font-size="24" font-weight="900" fill="${INK}">${esc(c.name)}</text>` +
    `<rect x="18" y="54" width="224" height="224" rx="12" fill="${INK}"/>` +
    nest(robotSVG(c), 22, 58, 216, 216, '0 0 200 200') +
    `<circle cx="212" cy="84" r="26" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
    `<text x="212" y="88" text-anchor="middle" font-size="20" font-weight="900" fill="#c4122f">${c.hp}</text>` +
    `<text x="212" y="103" text-anchor="middle" font-size="11" font-weight="900" fill="#c4122f">HP</text>` +
    `<rect x="18" y="290" width="224" height="46" rx="12" fill="${col}" stroke="${INK}" stroke-width="3"/>` +
    `<text x="32" y="320" font-size="18" font-weight="900" fill="${INK}">${esc(c.move)}</text>` +
    `<text x="228" y="322" text-anchor="end" font-size="24" font-weight="900" fill="${INK}">${c.atk}</text>` +
    `</g>`;
}

export function thumbnailSVG() {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a1 = (i * Math.PI) / 8, a2 = a1 + 0.18;
    return `<path d="M975 330L${r1(975 + 900 * Math.cos(a1))} ${r1(330 + 900 * Math.sin(a1))}L${r1(975 + 900 * Math.cos(a2))} ${r1(330 + 900 * Math.sin(a2))}Z" fill="#fff" opacity=".045"/>`;
  }).join('');
  const spark = (x, y, s, c) => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="${c}"/>`;
  const pill = (x, y, t) => `<g transform="translate(${x} ${y})"><rect width="168" height="52" rx="26" fill="${TYPES[t].color}" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="28" cy="26" r="18" fill="${INK}"/><path d="${ICONS[t]}" transform="translate(28 26) scale(.8)" fill="${TYPES[t].color}"/>` +
    `<text x="56" y="36" font-size="24" font-weight="900" fill="${INK}">${TYPES[t].name.toUpperCase()}</text></g>`;
  const title = (t, y, g) => `<text x="66" y="${y}" font-size="96" font-weight="900" fill="url(#${g})" stroke="${INK}" stroke-width="10" stroke-linejoin="round" paint-order="stroke">${t}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>` +
    `<radialGradient id="tbg" cx="72%" cy="45%" r="85%"><stop offset="0" stop-color="#4b3bb8"/><stop offset=".55" stop-color="#231d5a"/><stop offset="1" stop-color="#100e24"/></radialGradient>` +
    `<radialGradient id="tglow"><stop offset="0" stop-color="#ffc61a" stop-opacity=".45"/><stop offset="1" stop-color="#ffc61a" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="tt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#ff5a3c"/></linearGradient>` +
    `<linearGradient id="tt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ff3ff"/><stop offset="1" stop-color="#3f7bff"/></linearGradient>` +
    `<linearGradient id="tcard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe3f0"/></linearGradient>` +
    `<pattern id="thx" width="36" height="62.4" patternUnits="userSpaceOnUse"><path d="M18 0l18 10.4v20.8l-18 10.4l-18-10.4v-20.8zM18 41.6v20.8" fill="none" stroke="#7df9ff" stroke-width="1.2" opacity=".12"/></pattern>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#tbg)"/><rect width="${W}" height="${H}" fill="url(#thx)"/>${rays}` +
    `<circle cx="975" cy="330" r="320" fill="url(#tglow)"/>` +
    `<path d="M1010 40l-150 260h90l-60 300l190-330h-95l75-230z" fill="#ffc61a" opacity=".12"/>` +
    spark(640, 90, 14, '#ffc61a') + spark(1222, 84, 10, '#7df9ff') + spark(1232, 566, 14, '#ff7a5c') + spark(626, 566, 9, '#7df9ff') + spark(1140, 40, 7, '#ffffff') +
    `<g font-family="${FONT}">` +
    nest(logoSVG(), 66, 50, 104, 104, '0 0 120 120') +
    `<text x="186" y="112" font-size="26" font-weight="900" fill="#ffc61a" letter-spacing="3">ROBOT CARD BATTLE</text>` +
    title('MECHANA', 285, 'tt1') + title('CLASH', 385, 'tt2') +
    `<text x="66" y="448" font-size="28" font-weight="700" fill="#f4f2ff">Build a robot team.</text>` +
    `<text x="66" y="486" font-size="28" font-weight="700" fill="#f4f2ff">Learn math &amp; science as you battle!</text>` +
    pill(66, 520, 'blade') + pill(248, 520, 'volt') + pill(430, 520, 'iron') +
    `<text x="66" y="612" font-size="21" font-weight="700" fill="#c9c3f5">2–4 players • one device or many • 30 original robots</text>` +
    card(CARD_MAP.b05, 700, 170, -12) + card(CARD_MAP.i07, 980, 170, 12) + card(CARD_MAP.v02, 840, 110, 0) +
    `</g></svg>`;
}

const out = process.argv[2] || 'assets';
await mkdir(out, { recursive: true });
const svg = thumbnailSVG();
await writeFile(`${out}/thumbnail.svg`, svg);
console.log(`🖼️  Wrote ${out}/thumbnail.svg`);
try {
  const { Resvg } = await import('@resvg/resvg-js');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' } }).render().asPng();
  await writeFile(`${out}/thumbnail.png`, png);
  console.log(`🖼️  Wrote ${out}/thumbnail.png`);
} catch (e) {
  console.warn(`⚠️  PNG skipped (run "npm install" first): ${e.message}`);
}