// PWM MOTOR CONTROL: you are the controller. Set the duty cycle so the motor speed stays in a
// moving target band while the load changes. Scope shows the PWM wave and its average.
import { C, W, H, clamp, text, panel, hud, meter, popups, rng } from './_kit.js';

const VS = 5;               // driver supply (V), model value
const RPM_PER_V = 1800;     // model motor constant (no-load rpm per volt), not a datasheet value
const TAU = 0.35;           // mechanical time constant (s)
const TIME = 60, CLEAR_PCT = 65;
const BAND = 650;

export default {
  id: 'pwm',
  title: 'PWM Motor Control',
  goal: `You are the Arduino. Change the PWM duty cycle to keep the motor's speed inside the moving red band while the load changes. Stay in the band ${CLEAR_PCT}% of the time to clear.`,
  controls: [
    ['▲ ▼', 'Duty cycle, big steps'],
    ['◀ ▶', 'Duty cycle, fine trim'],
    ['Drag', 'Slide the duty bar on the right (touch or mouse)'],
    ['Start', 'Pause · Esc exits'],
  ],
  touchNote: 'You can also drag the duty bar on the screen',
  learned: [
    'PWM switches the full supply on and off fast. The average voltage is duty × supply: 40% of 5 V is 2 V.',
    "The motor's inertia and coil smooth the pulses, so its speed follows the average voltage, a little late (the time constant).",
    'More load means less speed at the same duty, so a controller has to push the duty up. Closing that loop automatically is what PID speed control does.',
  ],
  create(api) {
    const R = rng();
    const pop = popups();
    const s = { t: 0, duty: 0.3, rpm: 0, load: 0, loadName: 'NO LOAD', nextLoad: 7, inBand: 0, score: 0, hist: [], ang: 0, drag: false };
    const LOADS = [[0, 'NO LOAD'], [0.12, 'LIGHT FAN'], [0.25, 'FINGER ON SHAFT'], [0.38, 'HEAVY GEARBOX']];
    const target = t => 4000 + 1700 * Math.sin(t * 0.21) + 800 * Math.sin(t * 0.57 + 1); // peak 6500, reachable at full duty under the heaviest load
    const SLX = 600, SLY = 240, SLH = 140;

    return { _s: s,
      update(dt) {
        const inp = api.input;
        pop.update(dt);
        s.t += dt;
        if (s.t >= TIME) {
          const pct = Math.round(100 * s.inBand / TIME);
          return api.end({ win: pct >= CLEAR_PCT, score: s.score, headline: `In the band ${pct}% of the time (clear needs ${CLEAR_PCT}%).` });
        }
        const v = (inp.held.up ? 1 : 0) - (inp.held.down ? 1 : 0);
        const f = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
        s.duty = clamp(s.duty + v * 0.32 * dt + f * 0.06 * dt, 0, 1);
        const p = inp.pointer;
        if (p.justDown && p.x > SLX - 30 && p.y > SLY - 20 && p.y < SLY + SLH + 20) s.drag = true;
        if (!p.down) s.drag = false;
        if (s.drag) s.duty = clamp(1 - (p.y - SLY) / SLH, 0, 1);

        s.nextLoad -= dt;
        if (s.nextLoad <= 0) {
          const [l, n] = LOADS[Math.floor(R() * LOADS.length)];
          if (n !== s.loadName) { s.load = l; s.loadName = n; pop.add(`LOAD: ${n}`, 220, 300, C.red); api.sfx('bad'); }
          s.nextLoad = 5 + R() * 5;
        }
        const vavg = s.duty * VS;
        const ss = Math.max(0, RPM_PER_V * vavg - s.load * 7000 * (0.4 + s.duty * 0.6));
        s.rpm += (ss - s.rpm) * (1 - Math.exp(-dt / TAU));
        s.ang += s.rpm / 60 * dt * Math.PI * 2 / 40; // drawn slowed down
        const tg = target(s.t);
        const inside = Math.abs(s.rpm - tg) < BAND;
        if (inside) { s.inBand += dt; s.score += Math.round(dt * 100); }
        s.hist.push([s.t, s.rpm, tg]); while (s.hist.length && s.hist[0][0] < s.t - 8) s.hist.shift();
      },
      draw(ctx) {
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        const pct = s.t > 0 ? Math.round(100 * s.inBand / Math.max(1, s.t)) : 0;
        hud(ctx, [['TIME', Math.ceil(TIME - s.t)], ['IN BAND', `${pct}%`, pct < CLEAR_PCT], ['SCORE', s.score], ['LOAD', s.loadName]]);

        // scope
        panel(ctx, 0, 34, 560, 170, { title: `SCOPE · PIN 9 · 490 Hz · analogWrite(9, ${Math.round(s.duty * 255)})` });
        const x0 = 40, x1 = 545, yHi = 70, yLo = 180, periods = 4, pw = (x1 - x0) / periods;
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        for (let i = 0; i <= periods; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * pw, 60); ctx.lineTo(x0 + i * pw, 190); ctx.stroke(); }
        text(ctx, '5V', 10, yHi + 4, { size: 9, color: C.dim }); text(ctx, '0V', 10, yLo + 4, { size: 9, color: C.dim });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yLo);
        for (let i = 0; i < periods; i++) {
          const a = x0 + i * pw, on = pw * s.duty;
          if (s.duty > 0.001) { ctx.lineTo(a, yHi); ctx.lineTo(a + on, yHi); }
          ctx.lineTo(a + on, yLo); ctx.lineTo(a + pw, yLo);
        }
        ctx.stroke();
        const yAvg = yLo - (yLo - yHi) * s.duty;
        ctx.strokeStyle = C.red; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x0, yAvg); ctx.lineTo(x1, yAvg); ctx.stroke(); ctx.setLineDash([]);
        const lab = `V avg = ${(s.duty * 100).toFixed(0)}% × 5 V = ${(s.duty * VS).toFixed(2)} V`, ly = clamp(yAvg - 6, 70, 196);
        ctx.font = '400 11px Silkscreen'; const lw = ctx.measureText(lab).width;
        ctx.fillStyle = C.bg2; ctx.fillRect(x1 - lw - 6, ly - 12, lw + 10, 16);
        text(ctx, lab, x1, ly, { size: 11, color: C.red, align: 'right' });

        // tach history
        panel(ctx, 0, 208, 400, 194, { title: 'TACHOMETER · LAST 8 s' });
        const tx0 = 46, tx1 = 392, ty0 = 228, ty1 = 392, RMAX = 9500;
        const X = t => tx0 + (t - (s.t - 8)) / 8 * (tx1 - tx0), Y = r => ty1 - r / RMAX * (ty1 - ty0);
        for (const r of [0, 3000, 6000, 9000]) { text(ctx, `${r / 1000}k`, 10, Y(r) + 4, { size: 9, color: C.faint }); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(tx0, Y(r)); ctx.lineTo(tx1, Y(r)); ctx.stroke(); }
        ctx.fillStyle = 'rgba(224,80,95,.18)'; ctx.beginPath();
        s.hist.forEach(([t, , tg], i) => (i ? ctx.lineTo(X(t), Y(tg + BAND)) : ctx.moveTo(X(t), Y(tg + BAND))));
        for (let i = s.hist.length - 1; i >= 0; i--) { const [t, , tg] = s.hist[i]; ctx.lineTo(X(t), Y(tg - BAND)); }
        ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
        s.hist.forEach(([t, r], i) => (i ? ctx.lineTo(X(t), Y(r)) : ctx.moveTo(X(t), Y(r)))); ctx.stroke();
        text(ctx, `${Math.round(s.rpm)} RPM`, tx1, ty0 + 12, { size: 13, align: 'right', color: Math.abs(s.rpm - target(s.t)) < BAND ? C.ink : C.red });

        // motor
        panel(ctx, 404, 208, 150, 194, { title: 'F130 MOTOR' });
        const mx = 479, my = 300;
        ctx.fillStyle = C.line; ctx.fillRect(mx - 34, my - 22, 50, 44);
        ctx.fillStyle = C.faint; ctx.fillRect(mx + 16, my - 3, 16, 6);
        ctx.save(); ctx.translate(mx + 34, my); ctx.rotate(s.ang);
        ctx.fillStyle = C.red; ctx.fillRect(-4, -40, 8, 80); ctx.restore();
        const blur = Math.min(1, s.rpm / 6000);
        if (blur > 0.2) { ctx.strokeStyle = `rgba(224,80,95,${0.2 * blur})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(mx + 34, my, 38, 0, 7); ctx.stroke(); }
        text(ctx, `${(s.duty * VS).toFixed(2)} V avg`, mx, 384, { size: 11, align: 'center', color: C.dim });

        // duty slider
        panel(ctx, 560, 208, 80, 194, { title: 'DUTY' });
        const sh = SLH, sy0 = SLY, sk = sy0 + sh * (1 - s.duty);
        ctx.fillStyle = C.grid; ctx.fillRect(SLX - 8, sy0, 16, sh);
        ctx.fillStyle = C.redD; ctx.fillRect(SLX - 8, sk, 16, sy0 + sh - sk);
        ctx.fillStyle = C.ink; ctx.fillRect(SLX - 16, sk - 4, 32, 8);
        text(ctx, `${Math.round(s.duty * 100)}%`, SLX, 396, { size: 14, align: 'center' });

        ctx.fillStyle = C.bg2; ctx.fillRect(0, 406, W, 74);
        text(ctx, 'Keep the white line inside the red band. Load changes push the speed down.', 12, 432, { size: 11, color: C.ink });
        text(ctx, '▲ ▼ duty   ◀ ▶ fine trim   or drag the duty bar', 12, 458, { size: 10, color: C.dim });
        pop.draw(ctx);
      },
    };
  },
};
