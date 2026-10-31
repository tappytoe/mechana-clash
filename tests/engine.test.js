import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, TYPES, POWER, weakTo } from '../js/cards.js';
import { createGame, apply, mulberry32, damageFor, teamSize, MAX_TEAM, KO_POINTS } from '../js/engine.js';
import { cpuAction } from '../js/ai.js';
import { robotSVG } from '../js/art.js';
import { makeQuestion } from '../js/quiz.js';

const bots = (n) => Array.from({ length: n }, (_, i) => ({ name: `Bot ${i}`, cpu: i % 2 ? 'easy' : 'hard' }));
const unit = (id) => ({ id, hurt: 0, shield: 0, stunned: false, recover: false });

test('deck has 30 unique robots, 10 of each type', () => {
  assert.equal(CARDS.length, 30);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 30);
  assert.equal(new Set(CARDS.map((c) => c.name)).size, 30);
  assert.equal(new Set(CARDS.map((c) => c.dna)).size, 30);
  for (const t in TYPES) assert.equal(CARDS.filter((c) => c.type === t).length, 10);
});

test('every robot has the same power budget', () => {
  for (const c of CARDS) assert.equal(c.hp + 2 * c.atk + (c.effect === 'strike' ? 0 : 20), POWER, c.name);
});

test('type triangle is a proper cycle', () => {
  for (const t in TYPES) { assert.notEqual(TYPES[t].beats, t); assert.equal(TYPES[weakTo(t)].beats, t); }
});

test('weakness doubles damage, shields block, Brain Boost adds 10', () => {
  const s = createGame({ players: bots(2) }, mulberry32(1));
  s.players[0].active = unit('b01'); // Blade, 30 attack
  s.players[1].active = unit('v01'); // Volt (weak to Blade)
  assert.equal(damageFor(s, 0, 1).total, 60);
  s.players[1].active.shield = 20;
  assert.equal(damageFor(s, 0, 1).total, 40);
  assert.equal(damageFor(s, 0, 1, { boost: true }).total, 60); // (30 + 10) × 2 − 20
});

test('a KO scores points and the target loses its battler', () => {
  const s = createGame({ players: bots(2) }, mulberry32(2));
  s.players[0].active = unit('b05'); // 40 attack × 2 = 80
  s.players[1].active = unit('v09'); // 60 HP
  const n = apply(s, 0, { kind: 'attack', target: 1, boost: false }, mulberry32(3));
  assert.equal(n.players[0].score, KO_POINTS);
  assert.ok(n.event.hits[0].ko);
});

test('zap cannot stun-lock the same robot two turns in a row', () => {
  const s = createGame({ players: bots(2) }, mulberry32(4));
  s.players[0].active = unit('v02'); // Zapling, zap
  s.players[1].active = unit('i02'); // Anvil, 100 HP
  s.players[1].bench = [];
  let n = apply(s, 0, { kind: 'attack', target: 1 }, mulberry32(5));
  assert.equal(n.players[1].active.stunned, true);
  n = apply(n, 1, { kind: 'pass' }, mulberry32(6));
  assert.equal(n.players[1].active.recover, true);
  n = apply(n, 0, { kind: 'attack', target: 1 }, mulberry32(7));
  assert.equal(n.players[1].active.stunned, false);
});

test('rejects out-of-turn and invalid actions', () => {
  const s = createGame({ players: bots(2) }, mulberry32(8));
  assert.throws(() => apply(s, 1, { kind: 'pass' }));
  assert.throws(() => apply(s, 0, { kind: 'swap' }));
  assert.throws(() => apply(s, 0, { kind: 'attack', target: 0 }));
});

test('CPU-only games always finish without breaking the rules', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rng = mulberry32(seed);
    let s = createGame({ players: bots(2 + (seed % 3)), target: 10 }, rng);
    let steps = 0;
    while (s.phase === 'play' && steps++ < 4000) {
      s = apply(s, s.turn, cpuAction(s, s.turn, rng), rng);
      for (const p of s.players) assert.ok(teamSize(p) <= MAX_TEAM);
      const all = [...s.deck, ...s.scrap, ...s.players.flatMap((p) => [p.active?.id, ...p.bench.map((u) => u.id)])].filter(Boolean);
      assert.equal(all.length, 30); assert.equal(new Set(all).size, 30);
    }
    assert.equal(s.phase, 'over', `seed ${seed} did not finish`);
  }
});

test('every robot has distinct, well-formed art', () => {
  const seen = new Set();
  for (const c of CARDS) {
    const svg = robotSVG(c);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), c.name);
    assert.ok(!/NaN|undefined/.test(svg), c.name);
    seen.add(svg);
  }
  assert.equal(seen.size, 30);
});

test('quiz always offers the right answer among distinct choices', () => {
  const rng = mulberry32(9);
  for (const lvl of ['junior', 'explorer', 'pro']) {
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(lvl, rng);
      assert.ok(q.choices.includes(q.ans));
      assert.equal(new Set(q.choices).size, q.choices.length);
      assert.ok(q.choices.length >= 3);
    }
  }
});