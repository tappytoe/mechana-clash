export const LEVELS = { off: 'Off', junior: 'Junior · ages 4–6', explorer: 'Explorer · ages 7–9', pro: 'Pro · ages 10+' };

export function makeQuestion(level, rng = Math.random) {
  const r = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  let q, ans, show = '';
  if (level === 'junior') {
    const k = r(0, 2);
    if (k === 0) { const a = r(1, 5), b = r(1, 5); q = `${a} + ${b} = ?`; ans = a + b; show = '🔩'.repeat(a) + ' + ' + '🔩'.repeat(b); }
    else if (k === 1) { const a = r(4, 10), b = r(1, a - 1); q = `${a} − ${b} = ?`; ans = a - b; }
    else { ans = r(3, 9); q = 'How many bolts?'; show = '⚡'.repeat(ans); }
  } else if (level === 'pro') {
    const k = r(0, 3);
    if (k === 0) { const a = r(3, 12), b = r(3, 12); q = `${a} × ${b} = ?`; ans = a * b; }
    else if (k === 1) { const a = r(25, 99), b = r(11, 49); q = `${a} + ${b} = ?`; ans = a + b; }
    else if (k === 2) { const a = r(50, 120), b = r(12, 45); q = `${a} − ${b} = ?`; ans = a - b; }
    else { const hp = pick([60, 80, 100]), hit = pick([20, 30, 40]); q = `A robot has ${hp} HP. Each hit does ${hit}. How many hits to knock it out?`; ans = Math.ceil(hp / hit); }
  } else {
    const k = r(0, 3);
    if (k === 0) { const a = pick([10, 20, 30, 40]); q = `Weakness doubles damage! ${a} × 2 = ?`; ans = a * 2; }
    else if (k === 1) { const a = r(2, 5), b = r(2, 10); q = `${a} × ${b} = ?`; ans = a * b; }
    else if (k === 2) { const a = pick([10, 20, 30, 40, 50]), b = pick([10, 20, 30]); q = `${a} + ${b} = ?`; ans = a + b; }
    else { const hp = pick([60, 80, 100]), d = pick([10, 20, 30, 40]); q = `A robot with ${hp} HP takes ${d} damage. How much HP is left?`; ans = hp - d; }
  }
  const step = ans >= 20 ? 10 : 1;
  const opts = new Set([ans]);
  for (const c of [ans + step, ans - step, ans + 2 * step, ans - 2 * step, ans + 1, ans - 1, ans + 5, ans + 3]) {
    if (opts.size >= 4) break;
    if (c >= 0) opts.add(c);
  }
  const choices = [...opts];
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  return { q, ans, show, choices };
}