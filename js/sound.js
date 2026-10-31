export const sound = { on: true };
let ctx;
const SEQ = {
  click: [[660, 0.04]], turn: [[440, 0.07], [660, 0.1]],
  hit: [[180, 0.08, 'sawtooth'], [110, 0.14, 'sawtooth']],
  zap: [[900, 0.05, 'square'], [1400, 0.05, 'square'], [700, 0.09, 'square']],
  ko: [[420, 0.08], [320, 0.08], [220, 0.08], [110, 0.25]],
  good: [[523, 0.08], [659, 0.08], [784, 0.16]], bad: [[300, 0.12], [200, 0.2]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.35]],
};
export function sfx(name) {
  if (!sound.on || !SEQ[name]) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [f, d, type = 'triangle'] of SEQ[name]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); t += d;
    }
  } catch { /* audio unavailable */ }
}