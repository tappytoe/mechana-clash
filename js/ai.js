import { CARD_MAP } from './cards.js';
import { targets, damageFor, beats } from './engine.js';

export function cpuAction(s, i, rng = Math.random) {
  const p = s.players[i], hard = p.cpu === 'hard';
  const opps = targets(s, i);
  const value = (u) => {
    const c = CARD_MAP[u.id];
    let v = (c.hp - u.hurt) / 10 + c.atk / 10;
    for (const j of opps) {
      const t = CARD_MAP[s.players[j].active.id].type;
      if (beats(c.type, t)) v += 4;
      if (beats(t, c.type)) v -= 3;
    }
    return v;
  };
  const best = (list) => list.reduce((b, u, k) => (value(u) > value(list[b]) ? k : b), 0);

  if (!p.active) {
    if (!p.bench.length) return { kind: 'pass' };
    return { kind: 'promote', bench: hard ? best(p.bench) : Math.floor(rng() * p.bench.length) };
  }
  if (!s.swapUsed && p.bench.length) {
    if (p.active.stunned) return { kind: 'swap', bench: best(p.bench) };
    if (hard) { const k = best(p.bench); if (value(p.bench[k]) > value(p.active) + 3) return { kind: 'swap', bench: k }; }
  }
  if (p.active.stunned || !opps.length) return { kind: 'pass' };

  const boost = rng() < (hard ? 0.8 : 0.5); // CPUs "answer" Brain Boost too
  let target = opps[Math.floor(rng() * opps.length)];
  if (hard) {
    let top = -Infinity;
    for (const j of opps) {
      const r = damageFor(s, i, j, { boost });
      const du = s.players[j].active;
      const ko = du.hurt + r.total >= CARD_MAP[du.id].hp;
      const score = r.total + (ko ? 100 : 0) + s.players[j].score * 3;
      if (score > top) { top = score; target = j; }
    }
  }
  return { kind: 'attack', target, boost };
}