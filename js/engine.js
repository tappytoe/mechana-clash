// Pure game rules: no DOM, so they run in the browser, on the online host, and in Node tests.
import { CARDS, CARD_MAP, TYPES } from './cards.js';

export const MAX_TEAM = 5;     // "max 5 robots at a time"
export const KO_POINTS = 2;    // "defeat enemy, earn points"
export const BOOST_BONUS = 10; // Brain Boost
export const SHIELD = 20;
export const REPAIR = 20;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const beats = (a, b) => TYPES[a].beats === b;
export const teamSize = (p) => (p.active ? 1 : 0) + p.bench.length;
const unit = (id) => ({ id, hurt: 0, shield: 0, stunned: false, recover: false });
const nm = (id) => CARD_MAP[id].name;
const log = (s, msg) => { s.log.push(msg); if (s.log.length > 30) s.log.shift(); };

export function createGame({ players, target = 10 }, rng = Math.random) {
  if (players.length < 2 || players.length > 4) throw new Error('Mechana-Clash needs 2–4 players');
  const s = {
    gid: Math.floor(rng() * 2 ** 31).toString(36), phase: 'play', target, round: 1, turn: 0,
    deck: shuffle(CARDS.map((c) => c.id), rng), scrap: [],
    players: players.map((p) => ({ name: p.name, cpu: p.cpu || null, level: p.level || 'off', peer: p.peer || null, active: null, bench: [], score: 0, kos: 0 })),
    swapUsed: false, drawn: null, winner: null, log: [], event: null, eventId: 0,
  };
  for (const p of s.players) p.active = unit(draw(s, rng)); // "draw 1 at the start"
  log(s, `🎲 Battle start! First to ${target} points wins.`);
  startTurn(s, rng);
  return s;
}

function draw(s, rng) {
  if (!s.deck.length && s.scrap.length) {
    s.deck = shuffle(s.scrap, rng); s.scrap = [];
    log(s, '♻️ The scrap pile is recycled into a new deck.');
  }
  return s.deck.pop() || null;
}

function startTurn(s, rng) { // "each round draw 1"
  const p = s.players[s.turn];
  s.swapUsed = false; s.drawn = null;
  if (teamSize(p) < MAX_TEAM) {
    const id = draw(s, rng);
    if (id) {
      if (!p.active && !p.bench.length) p.active = unit(id); else p.bench.push(unit(id));
      s.drawn = id; log(s, `📦 ${p.name} draws ${nm(id)}.`);
    }
  }
}

function endTurn(s, rng) {
  const p = s.players[s.turn];
  for (const u of [p.active, ...p.bench]) if (u) { u.recover = u.stunned; u.stunned = false; }
  s.turn = (s.turn + 1) % s.players.length;
  if (s.turn === 0) s.round += 1;
  startTurn(s, rng);
}

export const needsPromote = (s, i = s.turn) => !s.players[i].active && s.players[i].bench.length > 0;
export const targets = (s, i = s.turn) => s.players.map((_, j) => j).filter((j) => j !== i && s.players[j].active);

export function damageFor(s, from, to, { boost = false, heads = false } = {}) {
  const ap = s.players[from], a = CARD_MAP[ap.active.id];
  const du = s.players[to].active, d = CARD_MAP[du.id];
  let base = heads ? a.atk * 2 : a.atk;
  let f = heads ? `${a.atk} × 2` : `${a.atk}`;
  let mods = heads;
  if (a.effect === 'boost') { const b = 10 * Math.min(2, ap.bench.length); if (b) { base += b; f += ` + ${b}`; mods = true; } }
  if (boost) { base += BOOST_BONUS; f += ` + ${BOOST_BONUS}`; mods = true; }
  const weak = beats(a.type, d.type);
  let total = base;
  if (weak) { total *= 2; f = mods ? `(${f}) × 2` : `${f} × 2`; }
  const blocked = Math.min(du.shield || 0, total);
  if (blocked) { total -= blocked; f += ` − ${blocked}`; }
  return { total, weak, blocked, formula: f === `${total}` ? f : `${f} = ${total}` };
}

export function apply(state, who, action, rng = Math.random) {
  if (state.phase !== 'play') throw new Error('The game is over');
  if (who !== state.turn) throw new Error('Not your turn');
  const s = structuredClone(state);
  const p = s.players[who];
  const kind = action && action.kind;
  const pickBench = () => {
    if (!Number.isInteger(action.bench) || !p.bench[action.bench]) throw new Error('Pick a robot from your bench');
    return action.bench;
  };
  if (kind === 'promote') {
    if (p.active) throw new Error('You already have a robot in battle');
    const [u] = p.bench.splice(pickBench(), 1);
    p.active = u; log(s, `🚀 ${p.name} sends ${nm(u.id)} into battle!`);
    return s;
  }
  if (kind === 'swap') {
    if (!p.active) throw new Error('Pick a robot to battle first');
    if (s.swapUsed) throw new Error('You can only swap once per turn');
    const k = pickBench(), u = p.bench[k];
    p.bench[k] = p.active; p.active = u; s.swapUsed = true;
    log(s, `🔁 ${p.name} swaps in ${nm(u.id)}.`);
    return s;
  }
  if (kind === 'attack') { attack(s, who, action, rng); return s; }
  if (kind === 'pass') { log(s, `⏭️ ${p.name} ends the turn.`); endTurn(s, rng); return s; }
  throw new Error('Unknown action');
}

function attack(s, who, { target, boost }, rng) {
  const p = s.players[who];
  if (!p.active) throw new Error('No robot in battle');
  if (p.active.stunned) throw new Error(`${nm(p.active.id)} is stunned`);
  const a = CARD_MAP[p.active.id];
  const valid = targets(s, who);
  const list = a.effect === 'spin' ? valid : [target];
  if (!list.length || !list.every((j) => valid.includes(j))) throw new Error('Choose a robot to attack');
  const heads = a.effect === 'lucky' && rng() < 0.5;
  const ev = { id: ++s.eventId, by: who, card: a.id, move: a.move, effect: a.effect, coin: a.effect === 'lucky' ? (heads ? 'heads' : 'tails') : null, boost: !!boost, hits: [], healed: 0 };
  log(s, `💥 ${p.name}'s ${a.name} uses ${a.move}!`);
  for (const j of list) {
    const dp = s.players[j], du = dp.active, d = CARD_MAP[du.id];
    const r = damageFor(s, who, j, { boost: !!boost, heads });
    du.shield = 0; du.hurt += r.total;
    const ko = du.hurt >= d.hp;
    ev.hits.push({ player: j, card: du.id, dmg: r.total, weak: r.weak, blocked: r.blocked, formula: r.formula, ko });
    log(s, `${d.name} takes ${r.total} damage${r.weak ? ' (weakness ×2!)' : ''}.`);
    if (ko) {
      s.scrap.push(du.id); dp.active = null; p.score += KO_POINTS; p.kos += 1;
      log(s, `💀 ${d.name} is knocked out! ${p.name} +${KO_POINTS} points.`);
    } else if (a.effect === 'zap') {
      if (du.recover) log(s, `😤 ${d.name} shakes off the zap!`);
      else { du.stunned = true; log(s, `💫 ${d.name} is stunned!`); }
    }
  }
  if (a.effect === 'repair' && p.active.hurt) {
    ev.healed = Math.min(REPAIR, p.active.hurt); p.active.hurt -= ev.healed;
    log(s, `🔧 ${a.name} repairs ${ev.healed} damage.`);
  }
  if (a.effect === 'shield') { p.active.shield = SHIELD; log(s, `🧱 ${a.name} raises a shield.`); }
  s.event = ev;
  if (p.score >= s.target) { s.phase = 'over'; s.winner = who; log(s, `🏆 ${p.name} wins!`); return; }
  endTurn(s, rng);
}