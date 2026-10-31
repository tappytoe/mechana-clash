import { CARDS, CARD_MAP, TYPES, EFFECTS, POWER, weakTo } from './cards.js';
import { robotSVG, logoSVG } from './art.js';
import { createGame, apply, targets, needsPromote, damageFor, beats, MAX_TEAM, KO_POINTS, BOOST_BONUS } from './engine.js';
import { cpuAction } from './ai.js';
import { makeQuestion, LEVELS } from './quiz.js';
import * as net from './net.js';
import { sfx, sound } from './sound.js';

const $app = document.getElementById('app');
const store = {
  get(k, d) { try { const v = localStorage.getItem('mc.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mc.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opt = (v, label, cur) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label}</option>`;
const levelOpts = (cur) => Object.entries(LEVELS).map(([k, v]) => opt(k, `🧠 ${v}`, cur)).join('');
const artCache = new Map();
const art = (id) => { if (!artCache.has(id)) artCache.set(id, robotSVG(CARD_MAP[id])); return artCache.get(id); };
const CPU_NAMES = ['Robo-Rex', 'Gizmo', 'Bolt Bot', 'Widget'];
sound.on = store.get('sound', true);

const app = {
  screen: 'title', mode: null, game: null, me: 0,
  seats: store.get('seats', null) || [{ name: 'Player 1', kind: 'human', level: 'explorer' }, { name: 'Robo-Rex', kind: 'easy', level: 'off' }],
  hostSeats: [], target: store.get('target', 10),
  myName: store.get('name', ''), myLevel: store.get('level', 'explorer'),
  code: '', peer: null, conns: [], conn: null, lobby: [], status: '',
  sel: null, eventKey: '', turnKey: '', cpuTimer: null, modal: null, filter: 'all', handoff: null, lastHuman: null,
};

/* ---------- screen wake lock & status ---------- */
let wakeLock = null;
async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not supported or denied */ }
}
function releaseAwake() {
  try { wakeLock?.release(); } catch { /* ignore */ }
  wakeLock = null;
}
function setStatus(msg) {
  app.status = msg;
  const el = document.getElementById('net-status');
  if (el) el.textContent = msg;
  else if (app.screen === 'host' || app.screen === 'join') render();
}

/* ---------- components ---------- */
function cardHTML(id, { size = 'md', u = null, cls = '' } = {}) {
  const c = CARD_MAP[id], T = TYPES[c.type], W = TYPES[weakTo(c.type)], E = EFFECTS[c.effect];
  const hurt = u ? u.hurt : 0, left = Math.max(0, c.hp - hurt);
  const tokens = hurt ? `<div class="tokens" title="${hurt / 10} damage tokens × 10 = ${hurt}">${'<i></i>'.repeat(Math.min(12, hurt / 10))}</div>` : '';
  const status = u ? `${u.shield ? `<span class="st">🧱 ${u.shield}</span>` : ''}${u.stunned ? '<span class="st">💫 Stunned</span>' : ''}` : '';
  return `<div class="card ${size} t-${c.type} ${cls}">
    <div class="c-head"><span class="c-name">${esc(c.name)}</span><span class="c-hp">${u ? `${left}/` : ''}${c.hp}<small>HP</small></span></div>
    <div class="c-art">${art(id)}${tokens}<div class="c-status">${status}</div>${size !== 'lg' ? `<button class="info" data-act="info" data-id="${id}" aria-label="About ${esc(c.name)}">i</button>` : ''}</div>
    ${u ? `<div class="hpbar"><b style="width:${(left / c.hp) * 100}%"></b></div>` : ''}
    ${size !== 'sm' ? `<div class="c-type"><span>${T.icon} ${T.name}</span><span class="weak">Weak to ${W.icon}</span></div>
    <div class="c-move"><b>${E.icon} ${esc(c.move)}</b><span class="dmg">${c.atk}</span></div>
    <div class="c-eff">${E.text}</div>` : ''}
    ${size === 'lg' ? `<div class="c-fact">💡 ${esc(c.fact)}</div>` : ''}
  </div>`;
}
const scoreBar = (score, target) => `<span class="score"><b>${score}</b>/${target} ⭐<i style="--p:${Math.min(100, (score / target) * 100)}%"></i></span>`;
const topbar = (title, extra = '') => `<header class="bar"><button class="btn sm ghost" data-act="menu">← Menu</button><h2>${title}</h2><div>${extra}</div></header>`;
const targetSelect = () => `<select id="target">${[6, 10, 14].map((n) => opt(String(n), `${n} points${n === 6 ? ' (quick)' : n === 14 ? ' (long)' : ''}`, String(app.target))).join('')}</select>`;
const soundBtn = () => `<button class="btn sm ghost" data-act="sound" aria-label="Toggle sound">${sound.on ? '🔊' : '🔇'}</button>`;

/* ---------- screens ---------- */
function titleView() {
  const fan = ['b05', 'v02', 'i07'].map((id, k) => `<div class="fan-card f${k}">${cardHTML(id, { size: 'md' })}</div>`).join('');
  return `<div class="screen title">
    <div class="corner">${soundBtn()}</div>
    <div class="logo">${logoSVG()}</div>
    <h1 class="brand">Mechana-Clash</h1>
    <p class="tag">Build a robot team. Learn cool science. Battle your family!</p>
    <div class="fan">${fan}</div>
    <div class="menu">
      <button class="btn big go" data-act="go" data-to="setup">🎮 Play on this device</button>
      <button class="btn big alt" data-act="host">📡 Host online game</button>
      <button class="btn big alt" data-act="go" data-to="join">🔗 Join online game</button>
      <div class="row"><button class="btn" data-act="go" data-to="rules">📖 How to play</button><button class="btn" data-act="go" data-to="gallery">🤖 Robot gallery</button></div>
    </div>
    <p class="muted small">30 original robots · 30 science facts · 2–4 players</p>
  </div>`;
}

function seatRow(s, i) {
  return `<div class="seat"><span class="dot c${i}"></span>
    <input data-l="local" data-seat="${i}" data-f="name" value="${esc(s.name)}" maxlength="14" aria-label="Player name">
    <select data-l="local" data-seat="${i}" data-f="kind">${opt('human', '👤 Human', s.kind)}${opt('easy', '🤖 CPU Easy', s.kind)}${opt('hard', '🦾 CPU Hard', s.kind)}</select>
    ${s.kind === 'human' ? `<select data-l="local" data-seat="${i}" data-f="level" aria-label="Brain Boost level">${levelOpts(s.level)}</select>` : ''}
    ${i > 0 ? `<button class="btn sm x" data-act="rm-seat" data-i="${i}" aria-label="Remove">✕</button>` : ''}</div>`;
}
function setupView() {
  return `${topbar('Game setup')}
    <div class="panel"><h3>Players</h3>${app.seats.map(seatRow).join('')}
      ${app.seats.length < 4 ? '<button class="btn sm" data-act="add-seat">+ Add player</button>' : ''}
      <p class="muted small">🧠 Brain Boost: answer a question before attacking for +${BOOST_BONUS} damage. Pick a level for each player.</p></div>
    <div class="panel"><label class="lbl">Points to win ${targetSelect()}</label></div>
    <button class="btn big go" data-act="start-local">Start battle! 🚀</button>`;
}

function hostSeat(s, i) {
  let ctrl;
  if (i === 0) ctrl = `<input data-l="host" data-seat="0" data-f="name" value="${esc(s.name)}" maxlength="14" aria-label="Your name"><select data-l="host" data-seat="0" data-f="level">${levelOpts(s.level)}</select>`;
  else if (s.kind === 'remote') ctrl = `<b>${esc(s.name)}</b><span class="muted small">🧠 ${LEVELS[s.level] || ''}</span>`;
  else ctrl = `<b>${esc(s.name)}</b><select data-l="host" data-seat="${i}" data-f="kind">${opt('easy', '🤖 Easy', s.kind)}${opt('hard', '🦾 Hard', s.kind)}</select>`;
  const tag = i === 0 ? '👑 Host' : s.kind === 'remote' ? '📱 Online' : 'CPU';
  return `<div class="seat"><span class="dot c${i}"></span><span class="tag">${tag}</span>${ctrl}${i > 0 ? `<button class="btn sm x" data-act="rm-seat" data-i="${i}" aria-label="Remove">✕</button>` : ''}</div>`;
}
function hostView() {
  return `${topbar('Host online game')}
    <div class="panel center"><div class="muted">Room code</div><div class="code">${esc(app.code || '····')}</div>
      <div class="muted" id="net-status">${esc(app.status)}</div>
      <div class="row"><button class="btn sm" data-act="copy-link">📋 Copy invite link</button>${typeof navigator.share === 'function' ? '<button class="btn sm" data-act="share">📤 Share</button>' : ''}</div>
      <p class="small">Friends open this page on their phone or tablet, tap <b>Join online game</b> and type the code.<br>Keep this page open: if you switch apps, come back here so the room can reconnect.</p></div>
    <div class="panel"><h3>Players (${app.hostSeats.length}/4)</h3>${app.hostSeats.map(hostSeat).join('')}
      ${app.hostSeats.length < 4 ? '<button class="btn sm" data-act="add-cpu">+ Add CPU</button>' : ''}</div>
    <div class="panel"><label class="lbl">Points to win ${targetSelect()}</label></div>
    <button class="btn big go" data-act="host-start" ${app.hostSeats.length < 2 ? 'disabled' : ''}>Start battle! 🚀</button>`;
}

function joinView() {
  if (app.mode === 'client' && app.conn) {
    return `${topbar('Online game')}<div class="panel center"><div class="muted">Room</div><div class="code">${esc(app.code)}</div><p id="net-status">${esc(app.status)}</p>
      <ul class="lobby">${app.lobby.map((s, i) => `<li><span class="dot c${i}"></span>${esc(s.name)} ${s.kind === 'remote' ? '📱' : s.kind === 'human' ? '👑' : '🤖'}</li>`).join('')}</ul>
      <p class="muted">First to ${app.target} points wins</p></div>`;
  }
  const connecting = app.mode === 'client';
  return `${topbar('Join online game')}<div class="panel">
    <label class="lbl">Room code<input id="code" class="codein" maxlength="4" value="${esc(app.code)}" autocomplete="off" autocapitalize="characters"></label>
    <label class="lbl">Your name<input data-me="name" maxlength="14" value="${esc(app.myName)}" placeholder="Player"></label>
    <label class="lbl">Brain Boost level<select data-me="level">${levelOpts(app.myLevel)}</select></label>
    <p class="muted" id="net-status">${esc(app.status)}</p>
    <button class="btn big go" data-act="join" ${connecting ? 'disabled' : ''}>${connecting ? 'Connecting…' : 'Join! 🔗'}</button></div>`;
}

function rulesView() {
  return `${topbar('How to play')}<div class="rules">
    <section class="panel"><h3>🎯 Goal</h3><p>Knock out other robots to earn <b>${KO_POINTS} points</b> each. The first player to reach the target score (10 by default) wins!</p></section>
    <section class="panel"><h3>🔁 On your turn</h3><ol>
      <li><b>Draw:</b> a new robot joins your team (max ${MAX_TEAM} robots).</li>
      <li><b>Swap (optional):</b> trade your battling robot with a bench robot, once per turn.</li>
      <li><b>Attack:</b> only your battling robot attacks. Bench robots wait and do nothing.</li></ol>
      <p>If your robot is knocked out, pick a new one from your bench on your next turn.</p></section>
    <section class="panel"><h3>⚔️ Type triangle</h3>
      <div class="tri"><div class="tri-node t-blade">⚔️<b>Blade</b></div><div class="tri-node t-volt">⚡<b>Volt</b></div><div class="tri-node t-iron">🛡️<b>Iron</b></div>
      <p class="tri-rules">⚔️ Blade cuts ⚡ Volt's wires<br>⚡ Volt fries 🛡️ Iron's circuits<br>🛡️ Iron blocks ⚔️ Blade</p></div>
      <p>Hitting a weakness does <b>2× damage</b>!</p></section>
    <section class="panel"><h3>✨ Abilities</h3><ul class="eff">${Object.values(EFFECTS).map((e) => `<li><b>${e.icon} ${e.label}</b>: ${e.text}</li>`).join('')}</ul>
      <p class="small muted">A robot that was just stunned can't be stunned again on the very next turn.</p></section>
    <section class="panel"><h3>🧠 Learn while you play</h3><p><b>Brain Boost:</b> answer a quick question before you attack. Get it right for <b>+${BOOST_BONUS} damage</b>.</p>
      <p><b>Health tokens:</b> each 🔴 chip is 10 damage. Count them to see how hurt a robot is.</p><p>Every card has a real science fact 💡.</p></section>
    <section class="panel"><h3>⚖️ Fair robots</h3><p>Every robot has ${POWER} power points: HP + 2 × attack = ${POWER}. Special abilities cost 20 HP. Big hitters are fragile, and tough robots hit softer.</p></section>
  </div>`;
}

function galleryView() {
  const list = CARDS.filter((c) => app.filter === 'all' || c.type === app.filter);
  return `${topbar('Robot gallery', '<button class="btn sm" data-act="print">🖨️ Print deck</button>')}
    <div class="chips">${['all', 'blade', 'volt', 'iron'].map((t) => `<button class="chip ${app.filter === t ? 'on' : ''}" data-act="filter" data-t="${t}">${t === 'all' ? 'All 30' : `${TYPES[t].icon} ${TYPES[t].name}`}</button>`).join('')}</div>
    <div class="gallery">${list.map((c) => cardHTML(c.id, { size: 'lg' })).join('')}</div>`;
}

/* ---------- game screen ---------- */
function viewer() {
  if (app.mode !== 'local') return app.me;
  return app.lastHuman ?? 0;
}
function isMyTurn() {
  const s = app.game;
  return !!s && s.phase === 'play' && s.turn === viewer() && !s.players[s.turn].cpu && !app.handoff;
}

function oppView(i, my, tg, spin, ac) {
  const s = app.game, p = s.players[i];
  const pickable = my && !spin && tg.length > 1 && tg.includes(i);
  const aimed = my && (spin ? tg.includes(i) : app.sel === i);
  const adv = ac && p.active && beats(ac.type, CARD_MAP[p.active.id].type);
  return `<div class="opp ${s.turn === i ? 'turn' : ''} ${aimed ? 'target' : ''}" data-unit="p${i}" ${pickable ? `data-act="sel" data-i="${i}"` : ''}>
    <div class="opp-head"><span class="dot c${i}"></span><b>${esc(p.name)}</b>${p.cpu ? ' 🤖' : ''}${scoreBar(p.score, s.target)}</div>
    ${p.active ? cardHTML(p.active.id, { size: 'md', u: p.active }) : '<div class="empty">No robot in battle</div>'}
    ${adv ? '<div class="adv">×2 weak to you!</div>' : ''}
    <div class="mini-bench">${p.bench.map((u) => `<button class="mini" data-act="info" data-id="${u.id}" aria-label="${esc(CARD_MAP[u.id].name)}">${art(u.id)}</button>`).join('')}</div>
  </div>`;
}

function actionsView(s, me, my, tg, ac, spin) {
  const P = s.players[me];
  if (s.phase !== 'play') return '';
  if (!my) return `<div class="wait">⏳ Waiting for ${esc(s.players[s.turn].name)}…</div>`;
  const pass = '<button class="btn sm ghost" data-act="pass">End turn</button>';
  if (needsPromote(s, me)) return '<div class="hint pulse">👇 Pick a robot from your bench to send into battle!</div>';
  if (!P.active) return `<div class="hint">No robots right now.</div>${pass}`;
  if (P.active.stunned) return `<div class="hint">💫 ${esc(ac.name)} is stunned! ${P.bench.length && !s.swapUsed ? 'Swap in a bench robot, or end your turn.' : 'End your turn.'}</div>${pass}`;
  if (!tg.length) return `<div class="hint">No robots to attack right now.</div>${pass}`;
  const preview = (spin ? tg : [app.sel]).map((j) => {
    const r = damageFor(s, me, j), d = CARD_MAP[s.players[j].active.id];
    return `<div class="pv">🎯 ${esc(d.name)}: <b>${r.total}</b> dmg${r.weak ? ' <span class="x2">×2 weak!</span>' : ''}${r.blocked ? ` <span class="shd">🧱 −${r.blocked}</span>` : ''}</div>`;
  }).join('');
  return `<div class="move-name">${EFFECTS[ac.effect].icon} ${esc(ac.move)}</div>
    ${!spin && tg.length > 1 ? '<div class="hint small">Tap an opponent to choose your target</div>' : ''}
    ${preview}${ac.effect === 'lucky' ? '<div class="hint small">🪙 Heads = double damage</div>' : ''}
    <button class="btn big attack" data-act="attack">💥 Attack!</button>${pass}`;
}

function benchView(s, me, my) {
  const P = s.players[me];
  const canSwap = my && P.active && !s.swapUsed, canProm = my && !P.active;
  const slots = P.bench.map((u, k) => `<div class="slot">${cardHTML(u.id, { size: 'sm', u, cls: s.turn === me && u.id === s.drawn ? 'new' : '' })}
    ${canProm ? `<button class="btn xs go" data-act="promote" data-k="${k}">Battle!</button>` : canSwap ? `<button class="btn xs" data-act="swap" data-k="${k}">Swap ⇅</button>` : ''}</div>`);
  const free = MAX_TEAM - (P.active ? 1 : 0) - P.bench.length;
  for (let i = 0; i < free; i++) slots.push('<div class="slot"><div class="card sm ghostcard">?</div></div>');
  return `<div class="bench-label">Bench · team ${P.bench.length + (P.active ? 1 : 0)}/${MAX_TEAM} · bench robots don't attack</div><div class="bench-row">${slots.join('')}</div>`;
}

function overView() {
  const s = app.game, w = s.players[s.winner];
  const rank = s.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.score - a.score);
  return `<div class="modal"><div class="modal-box center"><div class="trophy">🏆</div><h2>${esc(w.name)} wins!</h2>
    <ol class="rank">${rank.map((p) => `<li><span class="dot c${p.i}"></span>${esc(p.name)}: ${p.score} pts · ${p.kos} KO</li>`).join('')}</ol>
    ${app.mode !== 'client' ? '<button class="btn big go" data-act="again">Play again 🔁</button>' : '<p class="muted">Waiting for the host to start a new game…</p>'}
    <button class="btn" data-act="menu">Menu</button></div></div>`;
}

function gameView() {
  const s = app.game, me = viewer(), P = s.players[me], my = isMyTurn(), cur = s.players[s.turn];
  const tg = targets(s, me);
  if (!tg.includes(app.sel)) app.sel = tg[0] ?? null;
  const ac = P.active ? CARD_MAP[P.active.id] : null;
  const spin = ac?.effect === 'spin';
  const opps = s.players.map((_, i) => i).filter((i) => i !== me);
  return `<div class="game n${s.players.length}">
    <header class="gbar"><button class="btn sm ghost" data-act="menu" aria-label="Leave game">✕</button>
      <div class="turninfo ${my ? 'mine' : ''}">${my ? `⭐ Your turn, ${esc(P.name)}!` : `${esc(cur.name)}'s turn${cur.cpu ? ' · 🤖 thinking…' : ''}`}</div>
      <div class="deck" title="Robots left in the deck">🃏 ${s.deck.length}</div>${soundBtn()}</header>
    <section class="opps">${opps.map((i) => oppView(i, my, tg, spin, ac)).join('')}</section>
    <section class="arena ${s.turn === me ? 'turn' : ''}" data-unit="p${me}">
      <div class="me-head"><span class="dot c${me}"></span><b>${esc(P.name)}</b>${scoreBar(P.score, s.target)}</div>
      <div class="me-main"><div>${P.active ? cardHTML(P.active.id, { size: 'lg', u: P.active }) : '<div class="empty big">No robot in battle</div>'}</div>
        <div class="actions">${actionsView(s, me, my, tg, ac, spin)}</div></div>
      ${benchView(s, me, my)}
    </section>
    <section class="log">${s.log.slice(-5).reverse().map((l) => `<div>${esc(l)}</div>`).join('')}</section>
    ${s.phase === 'over' ? overView() : ''}
  </div>`;
}

function modalView() {
  if (app.handoff) {
    return `<div class="modal"><div class="modal-box center"><div class="trophy">📱</div><h2>Pass to ${esc(app.handoff)}!</h2><button class="btn big go" data-act="handoff-ok">I'm ready!</button></div></div>`;
  }
  const m = app.modal;
  if (!m) return '';
  if (m.kind === 'info') return `<div class="modal" data-act="close-modal"><div class="modal-box">${cardHTML(m.id, { size: 'lg' })}<button class="btn" data-act="close-modal">Close</button></div></div>`;
  const q = m.q, done = m.picked != null;
  return `<div class="modal"><div class="modal-box quiz center"><h3>🧠 Brain Boost!</h3><p class="muted">Answer right for +${BOOST_BONUS} damage</p>
    ${q.show ? `<div class="show">${q.show}</div>` : ''}<div class="q">${esc(q.q)}</div>
    <div class="answers">${q.choices.map((c) => `<button class="btn ans ${done && c === q.ans ? 'right' : done && c === m.picked ? 'wrong' : ''}" data-act="answer" data-v="${c}" ${done ? 'disabled' : ''}>${c}</button>`).join('')}</div>
    ${done ? `<div class="verdict">${m.ok ? `✅ Correct! +${BOOST_BONUS} damage!` : `❌ Nice try! The answer is ${q.ans}.`}</div>` : '<button class="btn sm ghost" data-act="skip-quiz">Skip</button>'}
  </div></div>`;
}

function render() {
  const views = { title: titleView, setup: setupView, host: hostView, join: joinView, rules: rulesView, gallery: galleryView, game: gameView };
  $app.innerHTML = (app.screen === 'game' && !app.game ? titleView() : views[app.screen]()) + modalView();
}

/* ---------- effects ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
let bannerAt = 0;
function banner(text, cls = '') {
  const now = Date.now(), start = Math.max(now, bannerAt);
  bannerAt = start + 850;
  setTimeout(() => {
    const b = document.createElement('div'); b.className = `banner ${cls}`; b.textContent = text;
    document.body.appendChild(b); setTimeout(() => b.remove(), 1500);
  }, start - now);
}
function floatText(el, text) {
  const f = document.createElement('span'); f.className = 'float'; f.textContent = text;
  el.appendChild(f); setTimeout(() => f.remove(), 1200);
}
function confetti() {
  const colors = ['#ff5a3c', '#ffc61a', '#3fa3ff', '#2bd97c', '#c6a8ff'];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2 + Math.random() * 2 + 's'; c.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 5000);
  }
}
function playEvent() {
  const s = app.game, ev = s?.event;
  if (!ev) return;
  const key = `${s.gid}:${ev.id}`;
  if (key === app.eventKey) return;
  app.eventKey = key;
  sfx(ev.effect === 'zap' ? 'zap' : 'hit');
  document.querySelector(`[data-unit="p${ev.by}"]`)?.classList.add('lunge');
  if (ev.boost) banner(`🧠 Brain Boost +${BOOST_BONUS}!`, 'math');
  if (ev.coin) banner(ev.coin === 'heads' ? '🪙 Heads! Double damage!' : '🪙 Tails: normal damage', 'math');
  ev.hits.forEach((h, k) => {
    const el = document.querySelector(`[data-unit="p${h.player}"]`);
    if (el) { el.classList.add('hit'); floatText(el, `-${h.dmg}`); }
    if (k === 0 && /[×+−]/.test(h.formula)) banner(`🧮 ${h.formula}`, 'math');
    if (h.weak && k === 0) banner('⚡ SUPER EFFECTIVE! ×2', 'weak');
    if (h.ko) { banner(`💥 KO! ${s.players[ev.by].name} +${KO_POINTS}`, 'ko'); setTimeout(() => sfx('ko'), 400); }
  });
  if (s.phase === 'over') setTimeout(() => { sfx('win'); confetti(); }, 900);
}
function turnCue() {
  const s = app.game;
  if (!s || s.phase !== 'play') return;
  const key = `${s.gid}:${s.round}:${s.turn}`;
  if (key !== app.turnKey) { app.turnKey = key; if (isMyTurn()) sfx('turn'); }
}

/* ---------- game flow ---------- */
function checkHandoff() {
  const s = app.game;
  if (app.mode !== 'local' || s.phase !== 'play') return;
  const p = s.players[s.turn];
  if (p.cpu) return;
  const humans = s.players.filter((x) => !x.cpu).length;
  if (humans > 1 && app.lastHuman !== null && app.lastHuman !== s.turn) { app.handoff = p.name; sfx('turn'); }
  app.lastHuman = s.turn;
}
function onState() {
  if (app.mode === 'host') broadcastState();
  checkHandoff(); render(); playEvent(); turnCue(); scheduleCPU();
}
function doAction(who, action) {
  try { app.game = apply(app.game, who, action); } catch (e) { toast('⚠️ ' + e.message); return false; }
  onState(); return true;
}
function send(action) {
  if (app.mode === 'client') {
    if (app.conn?.open) app.conn.send({ t: 'act', action }); else toast('Not connected to the host');
    return;
  }
  doAction(app.mode === 'host' ? app.me : app.game.turn, action);
}
function scheduleCPU() {
  clearTimeout(app.cpuTimer);
  const s = app.game;
  if (!s || s.phase !== 'play' || app.mode === 'client' || !s.players[s.turn].cpu) return;
  app.cpuTimer = setTimeout(() => {
    if (app.game !== s) return;
    if (!doAction(s.turn, cpuAction(s, s.turn))) doAction(s.turn, { kind: 'pass' });
  }, 1300);
}
function beginGame() {
  app.screen = 'game'; app.sel = null; app.modal = null; app.handoff = null; app.eventKey = ''; app.turnKey = '';
  const k = app.game.players.findIndex((p) => !p.cpu);
  app.lastHuman = app.mode === 'local' ? (k < 0 ? null : k) : null;
  onState();
}
function startLocal() {
  const players = app.seats.map((s, i) => ({ name: (s.name || '').trim() || `Player ${i + 1}`, cpu: s.kind === 'human' ? null : s.kind, level: s.kind === 'human' ? s.level : 'off' }));
  if (players.length < 2) return toast('You need at least 2 players');
  app.mode = 'local'; app.game = createGame({ players, target: app.target }); beginGame();
}
function leave() {
  clearTimeout(app.cpuTimer);
  const p = app.peer;
  Object.assign(app, { peer: null, conn: null, conns: [], mode: null, game: null, modal: null, handoff: null, status: '', lobby: [], screen: 'title' });
  p?.destroy?.();
  releaseAwake();
  render();
}

/* ---------- online: host ---------- */
const shareLink = () => `${location.origin}${location.pathname}?room=${app.code}`;
function startHosting() {
  if (!net.hasPeer()) return toast('Online play could not load. Check your internet connection.');
  app.peer?.destroy?.();
  app.mode = 'host'; app.me = 0; app.code = net.roomCode(); app.conns = []; app.screen = 'host';
  app.status = 'Opening room…';
  app.hostSeats = [{ name: app.myName || 'Host', kind: 'human', level: app.myLevel }];
  render(); keepAwake();
  app.peer = net.host(app.code, {
    onOpen: () => setStatus('✅ Room ready! Share the code with your family.'),
    onStatus: setStatus,
    onError: (e) => {
      if (e.type === 'unavailable-id') return startHosting(); // code already taken, so pick another
      setStatus('Connection problem: ' + (e.type || e.message));
    },
    onConn: (conn) => {
      if (app.game && app.screen === 'game') { conn.send({ t: 'full', msg: 'That game has already started.' }); setTimeout(() => conn.close(), 400); return; }
      if (app.hostSeats.length >= 4) { conn.send({ t: 'full', msg: 'That room is full.' }); setTimeout(() => conn.close(), 400); return; }
      app.conns.push(conn);
    },
    onData: hostData,
    onClose: hostDrop,
  });
}
function hostData(conn, d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'hello') {
    if (app.hostSeats.some((s) => s.peerId === conn.peer)) return;
    if (app.hostSeats.length >= 4) { conn.send({ t: 'full', msg: 'That room is full.' }); return; }
    const name = String(d.name || 'Player').slice(0, 14);
    app.hostSeats.push({ name, kind: 'remote', level: LEVELS[d.level] ? d.level : 'explorer', peerId: conn.peer });
    sfx('good'); toast(`${name} joined!`);
    if (app.screen === 'host') render();
    broadcastLobby();
  } else if (d.t === 'act' && app.game) {
    const who = app.game.players.findIndex((p) => p.peer === conn.peer);
    if (who >= 0 && who === app.game.turn) doAction(who, d.action);
  }
}
function hostDrop(conn) {
  app.conns = app.conns.filter((c) => c !== conn);
  const seat = app.hostSeats.findIndex((s) => s.peerId === conn.peer);
  if (app.game && app.screen === 'game') {
    const g = structuredClone(app.game);
    const i = g.players.findIndex((p) => p.peer === conn.peer);
    if (i < 0) return;
    g.players[i].cpu = 'easy'; g.players[i].peer = null;
    g.log.push(`📴 ${g.players[i].name} left, so a CPU takes over.`);
    if (seat >= 0) Object.assign(app.hostSeats[seat], { kind: 'easy', peerId: null });
    app.game = g; toast(`${g.players[i].name} disconnected, so a CPU takes over`); onState();
  } else if (seat >= 0) {
    app.hostSeats.splice(seat, 1); if (app.screen === 'host') render(); broadcastLobby();
  }
}
function broadcastLobby() {
  const msg = { t: 'lobby', seats: app.hostSeats.map((s) => ({ name: s.name, kind: s.kind })), target: app.target };
  for (const c of app.conns) if (c.open) c.send(msg);
}
function broadcastState() {
  for (const c of app.conns) {
    if (!c.open) continue;
    c.send({ t: 'state', state: app.game, you: app.game.players.findIndex((p) => p.peer === c.peer) });
  }
}
function hostStart() {
  if (app.hostSeats.length < 2) return toast('Invite a friend or add a CPU first');
  const players = app.hostSeats.map((s, i) => ({
    name: (s.name || '').trim() || `Player ${i + 1}`,
    cpu: s.kind === 'easy' || s.kind === 'hard' ? s.kind : null,
    level: s.kind === 'human' || s.kind === 'remote' ? s.level : 'off',
    peer: s.peerId || null,
  }));
  app.game = createGame({ players, target: app.target }); beginGame();
}

/* ---------- online: client ---------- */
function joinRoom() {
  if (!net.hasPeer()) return toast('Online play could not load. Check your internet connection.');
  const code = (document.getElementById('code')?.value || '').trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return toast('Room codes are 4 letters');
  app.code = code; app.myName = (app.myName || '').trim() || 'Player'; store.set('name', app.myName);
  app.mode = 'client'; app.status = 'Connecting…'; render();
  keepAwake();
  app.peer = net.join(code, {
    onOpen: (conn) => { app.conn = conn; conn.send({ t: 'hello', name: app.myName, level: app.myLevel }); app.status = 'Connected! Waiting for the host to start…'; render(); },
    onStatus: setStatus,
    onData: clientData,
    onClose: () => { if (app.mode === 'client') { toast('Disconnected from the host'); leave(); } },
    onError: (e) => {
      if (app.mode !== 'client' || app.screen === 'game') return;
      app.peer?.destroy?.(); app.peer = null; app.mode = null; app.conn = null;
      app.status = e.type === 'peer-unavailable' ? 'Room not found. Make sure the host screen says "Room ready".'
        : e.type === 'timeout' ? 'Found the room but could not connect. Try both devices on the same Wi-Fi or both on mobile data.'
        : 'Connection problem: ' + (e.type || e.message);
      render();
    },
  });
}
function clientData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'lobby') { app.lobby = d.seats; app.target = d.target; if (app.screen === 'join') render(); }
  else if (d.t === 'full') { toast(d.msg); leave(); }
  else if (d.t === 'state') {
    const fresh = app.screen !== 'game' || app.game?.gid !== d.state.gid;
    app.game = d.state; app.me = d.you;
    if (fresh) { app.screen = 'game'; app.modal = null; app.eventKey = d.state.event ? `${d.state.gid}:${d.state.event.id}` : ''; }
    render(); playEvent(); turnCue();
  }
}

/* ---------- input ---------- */
const handlers = {
  go: (el) => { app.screen = el.dataset.to; render(); },
  menu: () => { if (app.screen === 'game' && app.game?.phase === 'play' && !confirm('Leave this game?')) return; leave(); },
  sound: () => { sound.on = !sound.on; store.set('sound', sound.on); render(); },
  'add-seat': () => { if (app.seats.length < 4) app.seats.push({ name: `Player ${app.seats.length + 1}`, kind: 'human', level: 'junior' }); saveSeats(); render(); },
  'rm-seat': (el) => {
    const i = +el.dataset.i, list = app.screen === 'host' ? app.hostSeats : app.seats, seat = list[i];
    if (!seat || i === 0) return;
    if (seat.kind === 'remote') {
      const c = app.conns.find((x) => x.peer === seat.peerId);
      if (c) { try { c.send({ t: 'full', msg: 'The host removed you from the room.' }); } catch { /* ignore */ } setTimeout(() => c.close(), 300); }
    }
    list.splice(i, 1); saveSeats(); render(); if (app.screen === 'host') broadcastLobby();
  },
  'start-local': startLocal,
  host: startHosting,
  'add-cpu': () => {
    if (app.hostSeats.length >= 4) return;
    app.hostSeats.push({ name: CPU_NAMES.find((n) => !app.hostSeats.some((s) => s.name === n)) || 'CPU', kind: 'easy', level: 'off' });
    render(); broadcastLobby();
  },
  'host-start': hostStart,
  join: joinRoom,
  'copy-link': () => {
    const link = shareLink();
    (navigator.clipboard?.writeText(link) || Promise.reject()).then(() => toast('Invite link copied!')).catch(() => prompt('Copy this invite link:', link));
  },
  share: () => navigator.share({ title: 'Mechana-Clash', text: `Join my robot battle! Room code ${app.code}`, url: shareLink() }).catch(() => {}),
  filter: (el) => { app.filter = el.dataset.t; render(); },
  print: () => { app.filter = 'all'; render(); setTimeout(() => window.print(), 150); },
  info: (el) => { app.modal = { kind: 'info', id: el.dataset.id }; render(); },
  'close-modal': (el, e) => { if (el.classList.contains('modal') && e.target !== el) return; app.modal = null; render(); },
  sel: (el) => { app.sel = +el.dataset.i; render(); },
  attack: () => {
    if (!isMyTurn()) return;
    const s = app.game, me = viewer(), ac = CARD_MAP[s.players[me].active.id];
    const action = { kind: 'attack', target: ac.effect === 'spin' ? targets(s, me)[0] : app.sel };
    const lvl = s.players[me].level;
    if (lvl && lvl !== 'off') { app.modal = { kind: 'quiz', q: makeQuestion(lvl), action }; render(); } else send(action);
  },
  answer: (el) => {
    const m = app.modal;
    if (!m || m.picked != null) return;
    m.picked = Number(el.dataset.v); m.ok = m.picked === m.q.ans;
    sfx(m.ok ? 'good' : 'bad'); render();
    setTimeout(() => { app.modal = null; send({ ...m.action, boost: m.ok }); }, 1200);
  },
  'skip-quiz': () => { const m = app.modal; app.modal = null; if (m) send({ ...m.action, boost: false }); },
  swap: (el) => send({ kind: 'swap', bench: +el.dataset.k }),
  promote: (el) => send({ kind: 'promote', bench: +el.dataset.k }),
  pass: () => send({ kind: 'pass' }),
  'handoff-ok': () => { app.handoff = null; render(); },
  again: () => (app.mode === 'host' ? hostStart() : startLocal()),
};
function saveSeats() { if (app.screen === 'setup') store.set('seats', app.seats); }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (act !== 'close-modal' && act !== 'answer') sfx('click');
  handlers[act]?.(el, e);
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.seat != null) {
    const list = t.dataset.l === 'host' ? app.hostSeats : app.seats, s = list[+t.dataset.seat];
    if (!s) return;
    s[t.dataset.f] = t.value;
    if (t.dataset.l === 'host' && +t.dataset.seat === 0) {
      if (t.dataset.f === 'name') { app.myName = t.value; store.set('name', t.value); }
      if (t.dataset.f === 'level') { app.myLevel = t.value; store.set('level', t.value); }
    }
    saveSeats();
    if (t.tagName === 'SELECT') render();
    if (t.dataset.l === 'host') broadcastLobby();
  } else if (t.dataset.me) {
    if (t.dataset.me === 'name') { app.myName = t.value; store.set('name', t.value); }
    else { app.myLevel = t.value; store.set('level', t.value); }
  } else if (t.id === 'target') {
    app.target = +t.value; store.set('target', app.target); if (app.mode === 'host') broadcastLobby();
  } else if (t.id === 'code') {
    t.value = t.value.toUpperCase().replace(/[^A-Z]/g, ''); app.code = t.value;
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.modal?.kind === 'info') { app.modal = null; render(); } });

// Phones pause background tabs: when the page comes back, reconnect the room and re-take the wake lock.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  app.peer?.wake?.();
  if (app.mode) keepAwake();
});

const room = new URLSearchParams(location.search).get('room');
if (room) { app.code = room.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); app.screen = 'join'; }
render();