// MOTOR SWITCH CIRCUIT: you are the current. Switch the transistor on to spin the motor.
// When it switches off, the motor's coil kicks back (V = L·di/dt). Route that current through
// the flyback diode before the collector voltage passes the transistor's rating.
import { C, W, H, clamp, text, panel, hud, meter, popups, rng } from './_kit.js';

const ROUNDS = 8, LIVES = 3, VCE_MAX = 40;
// circuit geometry
const P = { vx: 90, top: 100, mx: 230, node: 262, ce: 330, gnd: 400, dx: 360 };
const MAIN = [[P.vx, P.top], [P.mx, P.top], [P.mx, P.node], [P.mx, P.ce], [P.mx, P.gnd], [P.vx, P.gnd], [P.vx, P.top]];
const LOOP = [[P.mx, P.node], [P.dx, P.node], [P.dx, P.top], [P.mx, P.top], [P.mx, P.node]];

function along(path, f) {
  let total = 0; const seg = [];
  for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); seg.push(l); total += l; }
  let d = ((f % 1) + 1) % 1 * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) { const k = d / seg[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k]; }
    d -= seg[i];
  }
  return path[path.length - 1];
}

export default {
  id: 'flyback',
  title: 'Motor Switch Circuit',
  goal: `You are the current. Hold A to switch the transistor on and spin the motor for the time asked. When you let go, the motor's coil kicks back with a voltage spike. Press ▼ fast to route it through the flyback diode, or the transistor blows. Survive ${ROUNDS} switch cycles.`,
  controls: [
    ['A / Space (hold)', 'Arduino pin HIGH: transistor on'],
    ['release A', 'Pin LOW: transistor off'],
    ['▼', 'Route the kick through the flyback diode'],
    ['Start', 'Pause · Esc exits'],
  ],
  learned: [
    "A motor is a coil, and a coil's current can't stop instantly. Cut it off and V = L·di/dt shoots the collector voltage far above the supply.",
    'A flyback diode across the motor gives that current a loop to circulate in, clamping the spike to about one diode drop (≈0.7 V) above the supply.',
    'While the transistor is on, the diode is reverse-biased and does nothing. It only works at the moment of switch-off, which is why it is always fitted.',
  ],
  create(api) {
    const R = rng();
    const pop = popups();
    const s = {
      round: 0, lives: LIVES, score: 0, state: 'wait', I: 0, hold: 0, need: 2, kickT: 0, kickWin: 0.5, vc: 5,
      flow: 0, loopFlow: 0, diodeLock: 0, msg: 'Hold A to switch the transistor on', boom: 0, phase: 0, waitT: 0.8,
    };
    function nextRound() {
      s.round++;
      if (s.round > ROUNDS) return api.end({ win: true, score: s.score + s.lives * 150, headline: `Survived ${ROUNDS} switch cycles with ${s.lives} transistor${s.lives === 1 ? '' : 's'} left.`, detail: 'Real circuits solder the diode in permanently, so the kick is always caught.' });
      s.need = s.round >= 6 ? 0.35 + R() * 0.25 : 1.1 + R() * 1.6;
      s.kickWin = clamp(0.66 - s.round * 0.035, 0.38, 0.66);
      s.state = 'ready'; s.hold = 0;
      s.msg = s.round >= 6 ? `Round ${s.round}: PWM burst. Short pulse, ${s.need.toFixed(1)} s` : `Round ${s.round}: spin the motor for ${s.need.toFixed(1)} s`;
    }

    function kick() {
      s.state = 'kick'; s.kickT = 0; api.sfx('tick'); api.announce('Switch off. Inductive kick. Route it.');
      // more stored current, faster rising spike
      s.kickWin = s.kickWin * (1.25 - 0.4 * s.I);
    }

    return { _s: s,
      update(dt) {
        const inp = api.input;
        pop.update(dt);
        s.diodeLock = Math.max(0, s.diodeLock - dt);
        s.boom = Math.max(0, s.boom - dt);

        if (s.state === 'wait') { s.waitT -= dt; if (s.waitT <= 0) nextRound(); return; }

        const on = inp.held.a && (s.state === 'ready' || s.state === 'on');
        if (s.state === 'ready' && on) { s.state = 'on'; api.sfx('select'); }
        if (s.state === 'on') {
          // L/R current rise: I → 1 with τ ≈ 0.45 s
          s.I += (1 - s.I) * (1 - Math.exp(-dt / 0.45));
          s.hold += dt; s.vc = 0.2;
          s.flow += dt * (0.2 + s.I * 0.8);
          if (s.hold < s.need) s.score += Math.round(dt * 40);
          if (inp.pressed('down') && !s.diodeLock) { s.diodeLock = 0.7; pop.add('DIODE REVERSE-BIASED', 470, 200, C.dim); s.score = Math.max(0, s.score - 5); }
          if (!inp.held.a) {
            if (s.hold < s.need * 0.8) { pop.add('TOO EARLY', P.mx, 70, C.dim); s.score = Math.max(0, s.score - 20); }
            else if (s.hold > s.need + 0.6) { pop.add('TOO LONG', P.mx, 70, C.dim); s.score = Math.max(0, s.score - 10); }
            else { s.score += 50; pop.add('+50 ON TIME', P.mx, 70, C.red); }
            kick();
          }
          return;
        }
        if (s.state === 'kick') {
          s.kickT += dt;
          const k = s.kickT / s.kickWin;
          s.vc = 5 + (VCE_MAX + 15) * k * k * (0.4 + 0.6 * s.I);
          if (inp.pressed('down')) {
            s.state = 'loop'; s.vc = 5.7; api.sfx('good');
            const pts = Math.round(80 + 120 * (1 - k)); s.score += pts; pop.add(`+${pts} CLAMPED`, P.dx, 80, C.red);
            s.msg = 'Caught it. The current circulates through the diode and dies away.';
          } else if (s.vc >= VCE_MAX) {
            s.lives--; s.state = 'blown'; s.boom = 1.2; api.sfx('boom'); api.shake(10, 0.5);
            s.msg = `BANG. ${Math.round(s.vc)} V across a transistor rated for ${VCE_MAX} V.`;
            s.waitT = 1.6;
          }
          return;
        }
        if (s.state === 'loop') {
          s.I *= Math.exp(-dt / 0.35); s.loopFlow += dt * (0.3 + s.I);
          if (s.I < 0.04) { s.I = 0; s.vc = 5; s.state = 'wait'; s.waitT = 0.7; }
          return;
        }
        if (s.state === 'blown') {
          s.I = 0; s.waitT -= dt;
          if (s.waitT <= 0) {
            if (s.lives <= 0) return api.end({ win: false, score: s.score, headline: `Out of transistors on round ${s.round}.`, detail: 'Every one died the same way: no path for the coil current at switch-off.' });
            s.state = 'wait'; s.waitT = 0.3; s.vc = 5;
          }
        }
        if (s.state === 'ready') s.I = 0;
      },
      draw(ctx) {
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        hud(ctx, [['ROUND', `${Math.min(s.round, ROUNDS)}/${ROUNDS}`], ['SCORE', s.score], ['TRANSISTORS', '■'.repeat(Math.max(0, s.lives)) || '-', s.lives <= 1], ['I', `${(s.I * 100).toFixed(0)}%`]]);
        panel(ctx, 0, 34, 440, 400, { title: 'CIRCUIT' });
        const slow = s.state === 'kick';
        // wires
        const wire = (path, col, w = 3) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
        wire(MAIN, C.line);
        wire(LOOP, s.state === 'loop' ? C.redD : C.line);
        // supply
        ctx.fillStyle = C.bg2; ctx.fillRect(P.vx - 26, 210, 52, 80);
        ctx.fillStyle = C.ink; ctx.fillRect(P.vx - 18, 236, 36, 4); ctx.fillRect(P.vx - 10, 250, 20, 4);
        text(ctx, '+5V', P.vx, 225, { size: 10, align: 'center', color: C.dim });
        // motor coil
        ctx.fillStyle = C.bg; ctx.fillRect(P.mx - 22, 140, 44, 90);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(P.mx, 152 + i * 20, 10, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
        text(ctx, 'M', P.mx - 34, 192, { size: 16, color: C.red });
        text(ctx, 'MOTOR (L)', P.mx + 18, 136, { size: 9, color: C.dim });
        // diode (cathode up, towards +V)
        ctx.fillStyle = s.state === 'loop' ? C.red : C.ink;
        ctx.beginPath(); ctx.moveTo(P.dx - 14, 200); ctx.lineTo(P.dx + 14, 200); ctx.lineTo(P.dx, 178); ctx.closePath(); ctx.fill();
        ctx.fillRect(P.dx - 14, 172, 28, 4);
        text(ctx, 'FLYBACK', P.dx + 20, 186, { size: 9, color: C.dim }); text(ctx, 'DIODE', P.dx + 20, 198, { size: 9, color: C.dim });
        // transistor
        const tc = s.state === 'blown' || s.boom ? C.red : C.ink;
        ctx.strokeStyle = tc; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(P.mx, P.ce - 18, 26, 0, 7); ctx.stroke();
        ctx.fillStyle = tc; ctx.fillRect(P.mx - 12, P.ce - 34, 4, 34);
        ctx.beginPath(); ctx.moveTo(P.mx - 8, P.ce - 24); ctx.lineTo(P.mx, P.ce - 36); ctx.moveTo(P.mx - 8, P.ce - 10); ctx.lineTo(P.mx, P.ce); ctx.stroke();
        // base drive from Arduino
        const on = s.state === 'on';
        ctx.strokeStyle = on ? C.red : C.line; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(140, P.ce - 18); ctx.lineTo(P.mx - 12, P.ce - 18); ctx.stroke();
        ctx.fillStyle = C.bg2; ctx.fillRect(122, P.ce - 26, 18, 16);
        text(ctx, 'UNO D9', 150, P.ce + 2, { size: 9, color: C.dim });
        text(ctx, on ? 'HIGH' : 'LOW', 150, P.ce - 26, { size: 10, color: on ? C.red : C.dim });
        // ground
        ctx.fillStyle = C.dim; ctx.fillRect(P.mx - 14, P.gnd + 6, 28, 3); ctx.fillRect(P.mx - 8, P.gnd + 12, 16, 3);
        // current particles (you)
        if (s.state === 'on' || (s.state === 'kick')) {
          const n = 14;
          for (let i = 0; i < n; i++) {
            const f = (s.flow * 0.5 + i / n) % 1;
            const [x, y] = along(MAIN, f * (s.state === 'kick' ? 0.42 : 1));
            ctx.fillStyle = i === 0 ? C.ink : C.red; ctx.globalAlpha = 0.25 + 0.75 * s.I;
            ctx.fillRect(x - 3, y - 3, 6, 6);
          }
          ctx.globalAlpha = 1;
        }
        if (s.state === 'kick') {
          // the current piles up at the collector node
          const [x, y] = [P.mx, P.node]; const r = 8 + 20 * (s.kickT / s.kickWin);
          ctx.fillStyle = 'rgba(224,80,95,.35)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
          ctx.fillStyle = C.ink; ctx.fillRect(x - 5, y - 5, 10, 10);
          text(ctx, '▼ ROUTE IT!', P.dx - 20, P.node + 30, { size: 14, color: C.red });
        }
        if (s.state === 'loop') {
          for (let i = 0; i < 10; i++) { const [x, y] = along(LOOP, (s.loopFlow * 0.6 + i / 10) % 1); ctx.globalAlpha = 0.3 + 0.7 * s.I; ctx.fillStyle = i === 0 ? C.ink : C.red; ctx.fillRect(x - 3, y - 3, 6, 6); }
          ctx.globalAlpha = 1;
        }
        if (s.boom > 0) { ctx.fillStyle = `rgba(167,159,151,${s.boom * 0.4})`; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(P.mx + Math.sin(i * 2 + s.boom * 5) * 20, P.ce - 40 - (1.2 - s.boom) * 60 - i * 8, 10 + i * 2, 0, 7); ctx.fill(); } }

        // collector voltage meter
        panel(ctx, 444, 34, 196, 400, { title: 'COLLECTOR VOLTAGE' });
        const mx = 520, my0 = 70, my1 = 400, VMAX = 60, Y = v => my1 - clamp(v, 0, VMAX) / VMAX * (my1 - my0);
        ctx.fillStyle = C.grid; ctx.fillRect(mx, my0, 30, my1 - my0);
        ctx.fillStyle = s.vc >= VCE_MAX * 0.7 ? C.red : C.redD; ctx.fillRect(mx, Y(s.vc), 30, my1 - Y(s.vc));
        ctx.fillStyle = C.ink; ctx.fillRect(mx - 8, Y(VCE_MAX) - 1, 46, 2);
        text(ctx, `${VCE_MAX} V MAX`, mx + 42, Y(VCE_MAX) + 4, { size: 9, color: C.ink });
        ctx.fillStyle = C.dim; ctx.fillRect(mx - 8, Y(5) - 1, 46, 2);
        text(ctx, '5 V', mx + 42, Y(5) + 4, { size: 9, color: C.dim });
        text(ctx, `${s.vc.toFixed(1)} V`, 542, 424, { size: 14, align: 'center', color: s.vc > 20 ? C.red : C.ink });
        if (slow) text(ctx, 'SLOW-MO ×100000', 542, 60, { size: 9, color: C.red, align: 'center' });

        // hold bar + message
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 438, W, 42);
        if (s.state === 'ready' || s.state === 'on') {
          meter(ctx, 12, 446, 300, 10, s.hold / (s.need + 0.6), { marks: [s.need * 0.8 / (s.need + 0.6), s.need / (s.need + 0.6)] });
          text(ctx, s.state === 'on' && s.hold >= s.need * 0.8 ? 'NOW RELEASE A' : 'HOLD A', 324, 456, { size: 11, color: s.hold >= s.need * 0.8 ? C.red : C.ink });
        }
        text(ctx, s.msg, 12, 474, { size: 10, color: C.dim });
        pop.draw(ctx);
      },
    };
  },
};
