// Tiny chiptune bleeps made with WebAudio. Off until the visitor turns sound on.
let ctx = null;
let on = false;
const SFX = {
  move: [[660, .04, 'square']],
  select: [[880, .06, 'square'], [1320, .08, 'square', .06]],
  start: [[523, .08, 'square'], [659, .08, 'square', .08], [784, .14, 'square', .16]],
  back: [[440, .06, 'square'], [330, .08, 'square', .06]],
  good: [[988, .05, 'square'], [1319, .09, 'square', .05]],
  bad: [[180, .18, 'sawtooth']],
  tick: [[1200, .02, 'square']],
  boom: [[90, .35, 'sawtooth'], [60, .4, 'square', .05]],
  win: [[523, .1, 'square'], [659, .1, 'square', .1], [784, .1, 'square', .2], [1047, .25, 'square', .3]],
  lose: [[392, .15, 'square'], [330, .15, 'square', .15], [262, .3, 'square', .3]],
  insert: [[200, .05, 'square'], [140, .08, 'square', .1]],
};

export const sound = {
  get on() { return on; },
  toggle() {
    on = !on;
    if (on && !ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { on = false; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return on;
  },
  play(name) {
    if (!on || !ctx) return;
    const seq = SFX[name]; if (!seq) return;
    const t0 = ctx.currentTime;
    for (const [f, d, type, delay = 0] of seq) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + delay);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + delay + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + d);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + delay); o.stop(t0 + delay + d + 0.02);
    }
  },
};
