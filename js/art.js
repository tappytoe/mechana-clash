// Procedural, original robot art. Pure string output: works in the browser and in Node (art export).
const INK = '#1a1830';
const STEEL = '#a9b4c4';
const THEME = {
  blade: { bg1: '#ffb36b', bg2: '#8a1430', fx: '#ffe2a8', glow: '#ffef8a' },
  volt:  { bg1: '#7b4dff', bg2: '#1a0b45', fx: '#fff36b', glow: '#7df9ff' },
  iron:  { bg1: '#5fb4e8', bg2: '#0f2c4a', fx: '#cfeeff', glow: '#9effa8' },
};
const EMBLEM = {
  blade: 'M100 97l4 5v11h4v3h-4v5h-8v-5h-4v-3h4v-11z',
  volt: 'M104 96l-10 15h6l-3 12l11-16h-6l3-11z',
  iron: 'M100 97l10 4v7q0 9-10 14q-10-5-10-14v-7z',
};

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export function shade(h, p) {
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  return '#' + rgb(h).map((c) => Math.round(c + (t - c) * a).toString(16).padStart(2, '0')).join('');
}
const r1 = (n) => Math.round(n * 10) / 10;

export function robotSVG(card) {
  const id = 'r' + card.id;
  const T = THEME[card.type];
  const c = card.color;
  const [L, B, A, H, E, M, N] = card.dna.split('').map(Number);
  const u = (k) => `url(#${id}-${k})`;
  const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  const P = { u, st, c, T };
  const defs =
    `<radialGradient id="${id}-bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${T.bg1}"/><stop offset="1" stop-color="${T.bg2}"/></radialGradient>` +
    `<linearGradient id="${id}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 0.45)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.4)}"/></linearGradient>` +
    `<linearGradient id="${id}-s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".45" stop-color="${STEEL}"/><stop offset="1" stop-color="#566173"/></linearGradient>` +
    `<linearGradient id="${id}-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b4f66"/><stop offset="1" stop-color="#1f2136"/></linearGradient>` +
    `<radialGradient id="${id}-gl"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${T.glow}"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient>` +
    `<pattern id="${id}-hx" width="24" height="41.6" patternUnits="userSpaceOnUse"><path d="M12 0l12 6.9v13.9l-12 6.9l-12-6.9v-13.9zM12 27.7v13.9" fill="none" stroke="${T.fx}" stroke-width="1.2" opacity=".28"/></pattern>` +
    `<filter id="${id}-sh" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".45"/></filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${card.name}"><defs>${defs}</defs>` +
    background(card.type, P) +
    `<g filter="${u('sh')}">${legs(L, P)}${arm(A, P)}<g transform="matrix(-1 0 0 1 200 0)">${arm(A, P)}</g>` +
    `${body(B, card.type, P)}${antenna(N, P)}${head(H, P)}${eyes(E, H, P)}${mouth(M, H, P)}</g></svg>`;
}

function background(type, { u, T }) {
  let fx = '';
  if (type === 'blade') {
    for (let i = 0; i < 12; i++) {
      const a1 = (i * Math.PI) / 6, a2 = a1 + 0.24;
      fx += `<path d="M100 90L${r1(100 + 220 * Math.cos(a1))} ${r1(90 + 220 * Math.sin(a1))}L${r1(100 + 220 * Math.cos(a2))} ${r1(90 + 220 * Math.sin(a2))}Z" fill="${T.fx}" opacity=".16"/>`;
    }
  } else if (type === 'volt') {
    fx = [[22, 20], [160, 30], [30, 140], [172, 120], [150, 168], [60, 60]]
      .map(([x, y], i) => `<path d="M${x} ${y}l8 12l-6 3l9 14" fill="none" stroke="${T.fx}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="${i % 2 ? 0.35 : 0.55}"/>`).join('') +
      `<path d="M0 100h30l10-10h20M200 70h-26l-8 8h-14M0 172h40l8-8" fill="none" stroke="${T.glow}" stroke-width="1.5" opacity=".35"/>` +
      `<circle cx="60" cy="90" r="3" fill="${T.glow}" opacity=".5"/><circle cx="152" cy="78" r="3" fill="${T.glow}" opacity=".5"/>`;
  } else {
    fx = `<rect width="200" height="200" fill="${u('hx')}"/>`;
  }
  return `<rect width="200" height="200" fill="${u('bg')}"/>${fx}<circle cx="100" cy="105" r="72" fill="${u('gl')}" opacity=".22"/><ellipse cx="100" cy="189" rx="54" ry="8" fill="#000" opacity=".35"/>`;
}

function legs(L, { u, st, c }) {
  switch (L) {
    case 0: return `<rect x="78" y="136" width="14" height="38" rx="5" fill="${u('s')}" ${st}/><rect x="108" y="136" width="14" height="38" rx="5" fill="${u('s')}" ${st}/>` +
      `<path d="M66 186q0-14 16-14h10q8 0 8 8v6z" fill="${u('m')}" ${st}/><path d="M134 186q0-14-16-14h-10q-8 0-8 8v6z" fill="${u('m')}" ${st}/>`;
    case 1: return `<rect x="54" y="148" width="92" height="38" rx="19" fill="${u('d')}" ${st}/><rect x="60" y="153" width="80" height="28" rx="14" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="3" stroke-dasharray="5 4"/>` +
      [74, 100, 126].map((x) => `<circle cx="${x}" cy="167" r="10" fill="${u('s')}" ${st}/><circle cx="${x}" cy="167" r="3" fill="${INK}"/>`).join('');
    case 2: return `<rect x="90" y="134" width="20" height="30" rx="4" fill="${u('s')}" ${st}/><circle cx="100" cy="166" r="21" fill="${u('d')}" ${st}/><circle cx="100" cy="166" r="12" fill="${u('m')}" ${st}/>` +
      `<path d="M100 154v24M88 166h24" stroke="${INK}" stroke-width="2.5"/><circle cx="100" cy="166" r="4" fill="${u('s')}" stroke="${INK}" stroke-width="2"/>`;
    case 3: return `<path d="M84 158Q100 210 116 158Z" fill="${u('gl')}"/><path d="M91 158Q100 190 109 158Z" fill="#fff" opacity=".85"/>` +
      `<path d="M78 136h44l-7 24h-30z" fill="${u('s')}" ${st}/><rect x="84" y="156" width="32" height="6" rx="3" fill="${u('d')}" ${st}/>`;
    default: return [[76, 140, 48, 160, 40, 184], [86, 142, 70, 168, 66, 186], [114, 142, 130, 168, 134, 186], [124, 140, 152, 160, 160, 184]]
      .map(([x1, y1, cx, cy, x2, y2]) => `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>` +
        `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${shade(c, -0.15)}" stroke-width="5" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="5" fill="${u('s')}" ${st}/>`).join('');
  }
}

function arm(A, { u, st, T }) {
  const upper = `<path d="M66 94Q46 98 42 120" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>` +
    `<path d="M66 94Q46 98 42 120" fill="none" stroke="${STEEL}" stroke-width="7" stroke-linecap="round"/><circle cx="64" cy="92" r="9" fill="${u('m')}" ${st}/>`;
  const hands = [
    `<circle cx="42" cy="122" r="7" fill="${u('s')}" ${st}/><path d="M38 126q-14 4-12 22q5-9 13-11z" fill="${u('m')}" ${st}/><path d="M46 126q12 6 8 22q-4-9-11-10z" fill="${u('m')}" ${st}/>`,
    `<path d="M38 120L20 62L50 116z" fill="${u('s')}" ${st}/><path d="M24 70L42 116" stroke="#fff" stroke-width="2" opacity=".8"/><rect x="32" y="114" width="20" height="9" rx="3" fill="${u('m')}" ${st}/>`,
    [0, 1, 2].map((i) => `<ellipse cx="42" cy="${116 + i * 5}" rx="8" ry="3" fill="none" stroke="#e0a63a" stroke-width="2.5"/>`).join('') +
      `<circle cx="42" cy="134" r="11" fill="${u('gl')}" stroke="${INK}" stroke-width="2.5"/><path d="M28 132l-6-3l4 7l-6 1M56 132l6-4l-3 7l6 1" fill="none" stroke="${T.glow}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M22 106h38v18q0 20-19 28q-19-8-19-28z" fill="${u('m')}" ${st}/><path d="M29 112h24v12q0 13-12 19q-12-6-12-19z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5"/><circle cx="41" cy="122" r="4" fill="${u('s')}" stroke="${INK}" stroke-width="1.5"/>`,
    `<rect x="32" y="114" width="20" height="9" rx="3" fill="${u('m')}" ${st}/><path d="M33 123h18l-9 34z" fill="${u('s')}" ${st}/><path d="M35 130l14 4M37 138l10 3M39 146l6 2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  ];
  return upper + hands[A];
}

function body(B, type, { u, st, T }) {
  const shapes = [
    `<rect x="62" y="78" width="76" height="64" rx="16" fill="${u('m')}" ${st}/>`,
    `<path d="M70 78h60q14 32 0 64h-60q-14-32 0-64z" fill="${u('m')}" ${st}/>`,
    `<path d="M56 78h88l-12 64h-64z" fill="${u('m')}" ${st}/>`,
    `<circle cx="100" cy="110" r="36" fill="${u('m')}" ${st}/>`,
    `<path d="M82 76h36l22 34l-22 34h-36l-22-34z" fill="${u('m')}" ${st}/>`,
  ];
  return shapes[B] +
    `<path d="M79 90q-4 18 2 36" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>` +
    `<rect x="84" y="94" width="32" height="30" rx="7" fill="${u('d')}" ${st}/><circle cx="100" cy="109" r="14" fill="${u('gl')}" opacity=".55"/>` +
    `<path d="${EMBLEM[type]}" fill="${T.glow}" stroke="${INK}" stroke-width="1.2"/>` +
    [[88, 86], [112, 86], [88, 132], [112, 132]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${u('s')}" stroke="${INK}" stroke-width="1.2"/>`).join('');
}

function antenna(N, { u, st, T }) {
  const stick = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${STEEL}" stroke-width="2" stroke-linecap="round"/>`;
  const ball = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${u('gl')}" stroke="${INK}" stroke-width="2"/>`;
  switch (N) {
    case 0: return '';
    case 1: return stick(100, 36, 100, 14) + ball(100, 11, 6);
    case 2: return stick(90, 36, 80, 12) + stick(110, 36, 120, 12) + ball(80, 10, 5) + ball(120, 10, 5);
    case 3: return stick(100, 36, 100, 16) + `<ellipse cx="87" cy="14" rx="13" ry="4" fill="${u('m')}" ${st}/><ellipse cx="113" cy="14" rx="13" ry="4" fill="${u('m')}" ${st}/><circle cx="100" cy="14" r="4" fill="${u('s')}" stroke="${INK}" stroke-width="2"/>`;
    default: return stick(100, 36, 100, 16) + `<path d="M100 16l-7-6l7-2l-5-7" fill="none" stroke="${T.glow}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

function head(H, { u, st }) {
  const heads = [
    `<rect x="68" y="30" width="64" height="46" rx="12" fill="${u('m')}" ${st}/>`,
    `<path d="M66 76v-20a34 30 0 0 1 68 0v20z" fill="${u('m')}" ${st}/>`,
    `<rect x="62" y="28" width="76" height="48" rx="9" fill="${u('m')}" ${st}/><rect x="70" y="35" width="60" height="34" rx="7" fill="${u('d')}" stroke="${INK}" stroke-width="2"/>`,
    `<path d="M72 76L64 48L82 30H118L136 48L128 76Z" fill="${u('m')}" ${st}/>`,
    `<ellipse cx="100" cy="54" rx="40" ry="24" fill="${u('m')}" ${st}/>`,
  ];
  return `<rect x="91" y="70" width="18" height="12" fill="${u('d')}" ${st}/>` +
    `<circle cx="64" cy="54" r="6" fill="${u('s')}" ${st}/><circle cx="136" cy="54" r="6" fill="${u('s')}" ${st}/>` +
    heads[H] + `<path d="M78 37q10-5 22-5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>`;
}

function eyes(E, H, { T }) {
  const sparkle = (x, y) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`;
  switch (E) {
    case 0: return [87, 113].map((x) => `<circle cx="${x}" cy="50" r="9" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${x + 1}" cy="51" r="4.5" fill="${INK}"/>${sparkle(x - 1, 49)}`).join('');
    case 1: return `<rect x="75" y="44" width="50" height="13" rx="6.5" fill="${T.glow}" stroke="${INK}" stroke-width="2.5"/><rect x="84" y="47" width="8" height="7" rx="2" fill="${INK}"/><rect x="108" y="47" width="8" height="7" rx="2" fill="${INK}"/><path d="M79 47h40" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>`;
    case 2: return `<circle cx="100" cy="50" r="13" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="100" cy="51" r="7.5" fill="${T.glow}" stroke="${INK}" stroke-width="2"/><circle cx="100" cy="51" r="3.5" fill="${INK}"/>${sparkle(97, 47)}`;
    case 3: return [80, 108].map((x) => `<rect x="${x}" y="43" width="12" height="12" rx="2" fill="${T.glow}" stroke="${INK}" stroke-width="2.5"/><rect x="${x + 2.5}" y="45.5" width="4" height="4" fill="#fff"/>`).join('');
    default: {
      const ink = H === 2 ? T.glow : INK; // screen heads are dark, so glow instead
      return `<path d="M80 53q7-10 14 0M106 53q7-10 14 0" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="61" r="4" fill="#ff7aa8" opacity=".6"/><circle cx="120" cy="61" r="4" fill="#ff7aa8" opacity=".6"/>`;
    }
  }
}

function mouth(M, H, { u, T }) {
  switch (M) {
    case 0: return `<rect x="88" y="61" width="24" height="9" rx="3" fill="${u('d')}" stroke="${INK}" stroke-width="2"/><path d="M94 62v7M100 62v7M106 62v7" stroke="${STEEL}" stroke-width="1.5"/>`;
    case 1: return `<path d="M90 63q10 9 20 0" fill="none" stroke="${H === 2 ? T.glow : INK}" stroke-width="3" stroke-linecap="round"/>`;
    case 2: return `<rect x="86" y="61" width="28" height="10" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M93 61v10M100 61v10M107 61v10" stroke="${INK}" stroke-width="1.5"/>`;
    default: return [93, 100, 107].map((x) => `<circle cx="${x}" cy="66" r="2.3" fill="${T.glow}" stroke="${INK}" stroke-width="1"/>`).join('');
  }
}

export function logoSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Mechana-Clash logo"><defs><linearGradient id="lg-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a3c"/><stop offset=".5" stop-color="#ffc61a"/><stop offset="1" stop-color="#3fa3ff"/></linearGradient></defs>` +
    `<path d="M36 26V12M84 26V12" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="36" cy="10" r="8" fill="#ffc61a" stroke="${INK}" stroke-width="3"/><circle cx="84" cy="10" r="8" fill="#3fa3ff" stroke="${INK}" stroke-width="3"/>` +
    `<circle cx="12" cy="62" r="6" fill="${STEEL}" stroke="${INK}" stroke-width="3"/><circle cx="108" cy="62" r="6" fill="${STEEL}" stroke="${INK}" stroke-width="3"/>` +
    `<rect x="12" y="24" width="96" height="76" rx="20" fill="url(#lg-m)" stroke="${INK}" stroke-width="5"/><rect x="24" y="38" width="72" height="34" rx="12" fill="#1f2136" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M44 46l-7 11h6l-3 9l9-12h-6l3-8zM78 46l-7 11h6l-3 9l9-12h-6l3-8z" fill="#7df9ff"/>` +
    `<rect x="38" y="80" width="44" height="10" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M49 80v10M60 80v10M71 80v10" stroke="${INK}" stroke-width="2"/></svg>`;
}

export function cardBackSVG() {
  const logo = logoSVG().replace(/^<svg[^>]*>/, '<svg viewBox="0 0 120 120" width="120" height="120">');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350"><defs><radialGradient id="cb" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#4b3bb8"/><stop offset="1" stop-color="#14122b"/></radialGradient>` +
    `<pattern id="cbh" width="24" height="41.6" patternUnits="userSpaceOnUse"><path d="M12 0l12 6.9v13.9l-12 6.9l-12-6.9v-13.9zM12 27.7v13.9" fill="none" stroke="#7df9ff" stroke-opacity=".18" stroke-width="1.2"/></pattern></defs>` +
    `<rect x="4" y="4" width="242" height="342" rx="20" fill="url(#cb)" stroke="#ffc61a" stroke-width="8"/><rect x="4" y="4" width="242" height="342" rx="20" fill="url(#cbh)"/>` +
    `<g transform="translate(65 95)">${logo}</g>` +
    `<text x="125" y="270" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="30" font-weight="900" fill="#ffc61a" stroke="${INK}" stroke-width="2">MECHANA</text>` +
    `<text x="125" y="302" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="30" font-weight="900" fill="#3fa3ff" stroke="${INK}" stroke-width="2">CLASH</text></svg>`;
}