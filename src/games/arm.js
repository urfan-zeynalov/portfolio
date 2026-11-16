// ROBOTIC ARM: you are the arm. Stepper base (open-loop steps) + servo joints (closed-loop angles).
// Side view = the arm's own plane. Top view = base yaw. Forward kinematics shown live.
import { C, W, H, clamp, rad, deg, text, panel, hud, meter, popups, rng } from './_kit.js';

const L1 = 12, L2 = 12, L3 = 5, H0 = 8;          // cm: upper arm, forearm, gripper, shoulder height
const STEP = 1.8;                                // NEMA 17: 200 full steps per revolution
const SAFE_RATE = 110, MAX_RATE = 220;           // steps/s: above SAFE_RATE with a load, steps can skip
const BINS = [{ yaw: 126, type: 'CHIP' }, { yaw: 180, type: 'CAP' }, { yaw: -126, type: 'RES' }];
const BIN_R = 17, BIN_HALF = 3.5, BIN_RIM = 5;
const TYPES = ['CHIP', 'CAP', 'RES'];
const TIME = 100, PARTS = 6, CLEAR_AT = 4;

// side view mapping
const SX = 60, SY = 380, S = 9;                  // shoulder axis x, ground y (px), px per cm
const sx = x => SX + x * S, sy = y => SY - y * S;
// top view
const TX = 525, TY = 150, TS = 3.4;

function fk(t1, t2rel) {
  const a1 = rad(t1), a2 = rad(t1 + t2rel);
  const ex = L1 * Math.cos(a1), ey = H0 + L1 * Math.sin(a1);
  const wx = ex + L2 * Math.cos(a2), wy = ey + L2 * Math.sin(a2);
  return { ex, ey, wx, wy, tx: wx, ty: wy - L3 };
}

export default {
  id: 'arm',
  title: 'Robotic Arm',
  goal: `You are the arm. Pick up each part and drop it in its matching bin before time runs out. Sort ${CLEAR_AT} to clear and open the pen-tool bonus stage.`,
  controls: [
    ['◀ ▶', 'Step the base (NEMA 17 stepper)'],
    ['▲ ▼', 'Bend the selected servo joint'],
    ['B / Shift', 'Switch joint: shoulder or elbow'],
    ['A / Space', 'Close or open the gripper'],
    ['Start', 'Pause · Esc exits'],
  ],
  learned: [
    'Forward kinematics: the gripper position is the joint angles added up. x = L1·cos θ1 + L2·cos(θ1+θ2), so moving one joint moves everything after it.',
    'A stepper moves in fixed 1.8° steps and the controller just counts them. Push it too fast under load and it skips steps without knowing, unless a home switch resets the count.',
    'A servo takes an angle command and holds it with its own feedback loop, which is why the joints land where you aim them and the base needs homing.',
  ],
  create(api) {
    const R = rng();
    const pop = popups();
    const s = {
      phase: 'sort', time: TIME, score: 0, sorted: 0, spawned: 0,
      cmdSteps: 0, realSteps: 0, rate: 0, stepAcc: 0, skipped: 0, skipFlash: 0, homeFlash: 0,
      t1: 80, t2: -100, c1: 80, c2: -100, joint: 0,
      grip: false, carry: null, part: null, msg: '', msgT: 0,
      // bonus
      bonusT: 0, dots: [], trail: [], lit: 0,
    };
    const say = (m, t = 2) => { s.msg = m; s.msgT = t; };

    function spawn() {
      if (s.spawned >= PARTS) { s.part = null; return; }
      s.spawned++;
      const yawSteps = Math.round((R() * 100 - 50) / STEP);            // ±50°, on the step grid
      s.part = { yaw: yawSteps * STEP, r: 13 + Math.round(R() * 9), type: TYPES[Math.floor(R() * 3)] };
    }
    spawn();
    say('Rotate the base to the part, then reach down');

    const realYaw = () => s.realSteps * STEP;
    const wrap = a => ((a + 540) % 360) - 180;
    const aligned = target => Math.abs(wrap(realYaw() - target)) <= 3.7;

    function setJoint(i, v) {
      const lim = i === 0 ? [0, 180] : [-170, 0];                         // servo travel 0..180°
      const n = clamp(v, lim[0], lim[1]);
      const c1 = i === 0 ? n : s.c1, c2 = i === 1 ? n : s.c2;
      const p = fk(c1, c2);
      if (p.ty < 0.4 || p.ey < 0) return false;                          // the table is in the way
      if (i === 0) s.c1 = n; else s.c2 = n;
      return true;
    }

    function updateSort(dt) {
      const inp = api.input;
      s.time -= dt;
      if (s.time <= 0) { s.time = 0; return finishSort(); }

      // ── stepper base: open loop, ramped step rate ──
      const dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
      if (dir) s.rate = Math.min(MAX_RATE, s.rate + 260 * dt); else s.rate = 0;
      if (dir) {
        s.stepAcc += s.rate * dt;
        while (s.stepAcc >= 1) {
          s.stepAcc -= 1;
          s.cmdSteps += dir;
          const overdriven = s.carry && s.rate > SAFE_RATE;
          if (overdriven && R() < 0.4) { s.skipped++; s.skipFlash = 1.2; api.sfx('bad'); }
          else {
            const before = s.realSteps; s.realSteps += dir;
            // home switch at 0°: the counter resyncs to reality
            if ((before < 0 && s.realSteps >= 0) || (before > 0 && s.realSteps <= 0)) {
              if (s.cmdSteps !== s.realSteps) { s.homeFlash = 1.5; say('Home switch hit: step count corrected'); }
              s.cmdSteps = s.realSteps;
            }
          }
        }
      }
      if (s.realSteps > 100) { s.realSteps -= 200; s.cmdSteps -= 200; }
      if (s.realSteps < -100) { s.realSteps += 200; s.cmdSteps += 200; }

      // ── servos: commanded angle, own feedback loop ──
      if (inp.pressed('b')) { s.joint = 1 - s.joint; api.sfx('move'); }
      const v = (inp.held.up ? 1 : 0) - (inp.held.down ? 1 : 0);
      if (v) {
        const sign = s.joint === 0 ? 1 : 1;
        if (!setJoint(s.joint, (s.joint === 0 ? s.c1 : s.c2) + v * sign * 75 * dt)) { if (!s.msgT) say('Gripper would hit the table'); }
      }
      const SV = 340 * dt;                                               // servo slew ≈ 0.18 s / 60°
      s.t1 += clamp(s.c1 - s.t1, -SV, SV);
      s.t2 += clamp(s.c2 - s.t2, -SV, SV);

      const p = fk(s.t1, s.t2);
      if (inp.pressed('a')) {
        if (!s.carry) {
          const pt = s.part;
          if (pt && aligned(pt.yaw) && Math.abs(p.tx - pt.r) < 1.6 && p.ty < 3.6) {
            s.carry = pt; s.part = null; api.sfx('good'); say(`Got the ${pt.type}. Find its bin`);
          } else { api.sfx('tick'); say(pt && !aligned(pt.yaw) ? 'Base is not lined up with the part' : 'Nothing under the gripper'); }
        } else {
          const bin = BINS.find(b => aligned(b.yaw));
          if (bin && Math.abs(p.tx - BIN_R) < BIN_HALF && p.ty > BIN_RIM - 0.5 && p.ty < BIN_RIM + 10) {
            if (bin.type === s.carry.type) {
              const pts = 100 + Math.round(s.time);
              s.score += pts; s.sorted++; pop.add(`+${pts}`, sx(p.tx), sy(p.ty) - 20, C.red); api.sfx('good');
              say(s.sorted >= CLEAR_AT ? 'Cleared! Keep sorting for points' : 'Sorted!');
            } else { s.score = Math.max(0, s.score - 50); pop.add('-50', sx(p.tx), sy(p.ty) - 20); api.sfx('bad'); api.shake(5); say(`Wrong bin. That was the ${s.carry.type} bin's job`); }
          } else { api.sfx('bad'); say('Dropped on the table. A new part appears'); }
          s.carry = null; spawn();
          if (!s.part && !s.carry) return finishSort();
        }
      }
    }

    function finishSort() {
      if (s.sorted >= CLEAR_AT) { s.phase = 'toolchange'; s.bonusT = 0; s.c1 = 120; s.c2 = -60; api.sfx('win'); api.announce('Stage clear. Automatic tool change.'); setupBonus(); }
      else api.end({ win: false, score: s.score, headline: `You sorted ${s.sorted} of ${PARTS}. Clear needs ${CLEAR_AT}.`, detail: s.skipped ? `Your base skipped ${s.skipped} steps by moving too fast with a load.` : '' });
    }

    // ── bonus: pen tool traces a word on a board in the arm's plane ──
    const BOARD = { x0: 5, x1: 21, y0: 9, y1: 19 };   // every point stays inside the arm's reach
    function setupBonus() {
      const c = document.createElement('canvas'); c.width = 260; c.height = 150;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.font = 'italic 700 118px "Brush Script MT", "Segoe Script", cursive';
      g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('hi', 130, 70);
      const d = g.getImageData(0, 0, 260, 150).data; const pts = [];
      for (let y = 4; y < 150; y += 7) for (let x = 4; x < 260; x += 7) if (d[(y * 260 + x) * 4 + 3] > 128) pts.push([x, y]);
      // thin out to a spaced set of targets
      const keep = [];
      for (const q of pts) if (keep.every(k => (k[0] - q[0]) ** 2 + (k[1] - q[1]) ** 2 > 13 ** 2)) keep.push(q);
      s.dots = keep.map(([x, y]) => ({ x: BOARD.x0 + (x / 260) * (BOARD.x1 - BOARD.x0), y: BOARD.y1 - (y / 150) * (BOARD.y1 - BOARD.y0), on: false }));
      s.trail = []; s.lit = 0; s.bonusTime = 40;
    }

    function updateBonus(dt) {
      const inp = api.input;
      if (s.phase === 'toolchange') {
        s.bonusT += dt;
        const SV = 200 * dt; s.t1 += clamp(s.c1 - s.t1, -SV, SV); s.t2 += clamp(s.c2 - s.t2, -SV, SV);
        if (s.bonusT > 2.8) { s.phase = 'draw'; s.c1 = s.t1; s.c2 = s.t2; say('Trace the word: both joints at once', 3); }
        return;
      }
      s.bonusTime -= dt;
      const a = (inp.held.left ? 1 : 0) - (inp.held.right ? 1 : 0);
      const b = (inp.held.up ? 1 : 0) - (inp.held.down ? 1 : 0);
      if (a) setJoint(0, s.c1 + a * 40 * dt);
      if (b) setJoint(1, s.c2 + b * 55 * dt);
      s.t1 = s.c1; s.t2 = s.c2;
      const p = fk(s.t1, s.t2);
      const pen = { x: p.wx, y: p.wy };
      const last = s.trail[s.trail.length - 1];
      if (!last || Math.hypot(last.x - pen.x, last.y - pen.y) > 0.15) s.trail.push(pen);
      if (s.trail.length > 900) s.trail.shift();
      for (const d of s.dots) if (!d.on && Math.hypot(d.x - pen.x, d.y - pen.y) < 0.75) { d.on = true; s.lit++; s.score += 20; api.sfx('tick'); }
      if (s.lit === s.dots.length || s.bonusTime <= 0) {
        const pct = Math.round(100 * s.lit / s.dots.length);
        api.end({ win: true, score: s.score, headline: `Sorted ${s.sorted} of ${PARTS}, then traced ${pct}% of the word with the pen tool.`, detail: s.skipped ? `Base skipped ${s.skipped} steps while carrying.` : 'No skipped steps. Smooth driving.' });
      }
    }

    // ── drawing ──
    function drawArm(ctx, t1, t2, tool) {
      const p = fk(t1, t2);
      ctx.lineCap = 'round';
      // base
      ctx.fillStyle = C.faint; ctx.fillRect(sx(-3), sy(H0) , 6 * S, H0 * S);
      ctx.fillStyle = C.line; ctx.fillRect(sx(-4.5), sy(1.2), 9 * S, 1.2 * S);
      // links
      ctx.strokeStyle = C.ink; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(sx(0), sy(H0)); ctx.lineTo(sx(p.ex), sy(p.ey)); ctx.stroke();
      ctx.strokeStyle = '#D9D1C5'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(sx(p.ex), sy(p.ey)); ctx.lineTo(sx(p.wx), sy(p.wy)); ctx.stroke();
      // joints
      for (const [x, y, i] of [[0, H0, 0], [p.ex, p.ey, 1]]) {
        ctx.fillStyle = s.joint === i && s.phase === 'sort' ? C.red : C.redD;
        ctx.beginPath(); ctx.arc(sx(x), sy(y), 9, 0, 7); ctx.fill();
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(sx(x), sy(y), 3, 0, 7); ctx.fill();
      }
      // wrist servo keeps the tool pointing down: θ3 = −90° − θ1 − θ2
      ctx.fillStyle = C.redDD; ctx.beginPath(); ctx.arc(sx(p.wx), sy(p.wy), 6, 0, 7); ctx.fill();
      ctx.strokeStyle = C.dim; ctx.lineWidth = 4;
      if (tool === 'pen') {
        ctx.beginPath(); ctx.moveTo(sx(p.wx), sy(p.wy)); ctx.lineTo(sx(p.wx) + 14, sy(p.wy) - 4); ctx.stroke();
        ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(sx(p.wx), sy(p.wy), 3, 0, 7); ctx.fill();
      } else {
        const open = s.carry ? 0.6 : 1.4;
        ctx.beginPath(); ctx.moveTo(sx(p.wx), sy(p.wy)); ctx.lineTo(sx(p.wx), sy(p.wy - L3 * 0.55)); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx(p.wx - open), sy(p.wy - L3 * 0.55)); ctx.lineTo(sx(p.wx - open), sy(p.ty));
        ctx.moveTo(sx(p.wx + open), sy(p.wy - L3 * 0.55)); ctx.lineTo(sx(p.wx + open), sy(p.ty));
        ctx.moveTo(sx(p.wx - open), sy(p.wy - L3 * 0.55)); ctx.lineTo(sx(p.wx + open), sy(p.wy - L3 * 0.55));
        ctx.stroke();
        if (s.carry) drawPart(ctx, s.carry.type, sx(p.tx), sy(p.ty) + 2, 1);
      }
      return p;
    }

    function drawPart(ctx, type, x, y, alpha) {
      ctx.globalAlpha = alpha;
      if (type === 'CHIP') { ctx.fillStyle = C.ink; ctx.fillRect(x - 10, y - 10, 20, 10); ctx.fillStyle = C.dim; for (let i = -8; i <= 6; i += 4) ctx.fillRect(x + i, y, 2, 3); }
      else if (type === 'CAP') { ctx.fillStyle = C.redD; ctx.fillRect(x - 6, y - 16, 12, 16); ctx.fillStyle = C.ink; ctx.fillRect(x - 6, y - 16, 3, 16); }
      else { ctx.fillStyle = C.dim; ctx.fillRect(x - 13, y - 5, 26, 2); ctx.fillStyle = C.ink; ctx.fillRect(x - 8, y - 9, 16, 9); ctx.fillStyle = C.red; ctx.fillRect(x - 4, y - 9, 2, 9); ctx.fillRect(x + 1, y - 9, 2, 9); }
      ctx.globalAlpha = 1;
    }

    function drawSide(ctx) {
      panel(ctx, 0, 34, 400, 366, { title: 'SIDE VIEW · ARM PLANE' });
      ctx.save(); ctx.beginPath(); ctx.rect(2, 36, 396, 362); ctx.clip();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (let x = 0; x <= 36; x += 4) { ctx.beginPath(); ctx.moveTo(sx(x), 50); ctx.lineTo(sx(x), SY); ctx.stroke(); }
      ctx.fillStyle = C.line; ctx.fillRect(0, SY, 400, 3);
      for (let x = 0; x <= 32; x += 8) text(ctx, `${x}`, sx(x), SY + 14, { size: 9, color: C.faint, align: 'center' });
      if (s.phase === 'sort') {
        // part on the table, faded unless the base faces it
        if (s.part) { const al = aligned(s.part.yaw) ? 1 : 0.22; drawPart(ctx, s.part.type, sx(s.part.r), SY, al); if (al === 1) { ctx.strokeStyle = C.red; ctx.setLineDash([3, 4]); ctx.strokeRect(sx(s.part.r) - 15, SY - 22, 30, 22); ctx.setLineDash([]); } }
        // bin in this plane
        const bin = BINS.find(b => aligned(b.yaw));
        if (bin) {
          ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(sx(BIN_R - BIN_HALF), sy(BIN_RIM)); ctx.lineTo(sx(BIN_R - BIN_HALF + 0.6), SY); ctx.lineTo(sx(BIN_R + BIN_HALF - 0.6), SY); ctx.lineTo(sx(BIN_R + BIN_HALF), sy(BIN_RIM)); ctx.stroke();
          text(ctx, `${bin.type} BIN`, sx(BIN_R), sy(BIN_RIM) - 8, { size: 11, color: C.red, align: 'center' });
        }
        drawArm(ctx, s.t1, s.t2, 'grip');
      } else {
        // whiteboard
        ctx.fillStyle = '#2A2426'; ctx.fillRect(sx(BOARD.x0 - 0.6), sy(BOARD.y1 + 0.6), (BOARD.x1 - BOARD.x0 + 1.2) * S, (BOARD.y1 - BOARD.y0 + 1.2) * S);
        for (const d of s.dots) { ctx.fillStyle = d.on ? C.red : C.faint; ctx.fillRect(sx(d.x) - 3, sy(d.y) - 3, 6, 6); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
        s.trail.forEach((q, i) => (i ? ctx.lineTo(sx(q.x), sy(q.y)) : ctx.moveTo(sx(q.x), sy(q.y)))); ctx.stroke();
        // tool rack
        ctx.fillStyle = C.line; ctx.fillRect(sx(-5.5), sy(26), 30, 6);
        if (s.phase === 'toolchange') {
          const k = Math.min(1, s.bonusT / 2.8);
          text(ctx, 'M6 T2 · AUTOMATIC TOOL CHANGE', 200, 80, { size: 13, color: C.red, align: 'center' });
          text(ctx, k < 0.5 ? 'Docking gripper…' : 'Picking up pen tool…', 200, 100, { size: 11, color: C.dim, align: 'center' });
          drawArm(ctx, s.t1, s.t2, k < 0.5 ? 'grip' : 'pen');
        } else drawArm(ctx, s.t1, s.t2, 'pen');
      }
      ctx.restore();
    }

    function drawTop(ctx) {
      panel(ctx, 404, 34, 236, 228, { title: 'TOP VIEW · BASE' });
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(TX, TY, 24 * TS, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(TX, TY, 12 * TS, 0, 7); ctx.stroke();
      // home switch at 0° (forward = up)
      ctx.fillStyle = s.homeFlash > 0 ? C.red : C.faint; ctx.fillRect(TX - 3, TY - 27 * TS, 6, 6);
      const at = (yaw, r) => [TX + Math.sin(rad(yaw)) * r * TS, TY - Math.cos(rad(yaw)) * r * TS];
      if (s.phase === 'sort') {
        for (const b of BINS) { const [x, y] = at(b.yaw, BIN_R); ctx.strokeStyle = aligned(b.yaw) ? C.red : C.dim; ctx.lineWidth = 2; ctx.strokeRect(x - 11, y - 11, 22, 22); text(ctx, b.type, x, y + 4, { size: 8, color: C.dim, align: 'center' }); }
        if (s.part) { const [x, y] = at(s.part.yaw, s.part.r); ctx.fillStyle = C.ink; ctx.fillRect(x - 4, y - 4, 8, 8); }
      }
      // commanded (what the firmware believes) vs real
      const p = fk(s.t1, s.t2);
      if (s.cmdSteps !== s.realSteps) { const [gx, gy] = at(s.cmdSteps * STEP, p.tx); ctx.strokeStyle = C.faint; ctx.setLineDash([4, 4]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TX, TY); ctx.lineTo(gx, gy); ctx.stroke(); ctx.setLineDash([]); }
      const [ax, ay] = at(realYaw(), Math.max(1, p.tx));
      ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(TX, TY); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, 7); ctx.fill();
      ctx.fillStyle = C.redD; ctx.beginPath(); ctx.arc(TX, TY, 8, 0, 7); ctx.fill();
      if (s.phase === 'sort') {
        text(ctx, `STEPS ${s.cmdSteps}`, 412, 254, { size: 10, color: s.cmdSteps !== s.realSteps ? C.red : C.dim });
        meter(ctx, 520, 246, 112, 8, s.rate / MAX_RATE, { color: s.carry && s.rate > SAFE_RATE ? C.red : C.dim, marks: s.carry ? [SAFE_RATE / MAX_RATE] : null });
      }
    }

    function drawKin(ctx) {
      panel(ctx, 404, 266, 236, 134, { title: 'KINEMATICS' });
      const p = fk(s.t1, s.t2);
      const t3 = -90 - s.t1 - s.t2;
      const rows = [
        [`BASE  ${(s.cmdSteps * STEP).toFixed(1)}°`, 'stepper', s.phase === 'sort'],
        [`θ1    ${s.t1.toFixed(0)}°`, 'servo', s.joint === 0],
        [`θ2   ${s.t2.toFixed(0)}°`, 'servo', s.joint === 1],
        [`θ3   ${t3.toFixed(0)}°`, 'auto', false],
      ];
      rows.forEach(([a, b, hot], i) => { text(ctx, a, 414, 298 + i * 16, { size: 12, font: 'mono', color: hot && s.phase === 'sort' ? C.red : C.ink }); text(ctx, b, 630, 298 + i * 16, { size: 9, color: C.faint, align: 'right' }); });
      text(ctx, `TIP x ${p.tx.toFixed(1)}  y ${p.ty.toFixed(1)} cm`, 414, 372, { size: 11, font: 'mono', color: C.dim });
      text(ctx, 'x = L1·cosθ1 + L2·cos(θ1+θ2)', 414, 390, { size: 10, font: 'mono', color: C.faint });
    }

    return { _s: s,
      update(dt) {
        pop.update(dt);
        s.msgT = Math.max(0, s.msgT - dt); s.skipFlash = Math.max(0, s.skipFlash - dt); s.homeFlash = Math.max(0, s.homeFlash - dt);
        if (s.phase === 'sort') updateSort(dt); else updateBonus(dt);
      },
      draw(ctx) {
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        if (s.phase === 'sort') hud(ctx, [['TIME', Math.ceil(s.time), s.time < 15], ['SORTED', `${s.sorted}/${PARTS}`], ['SCORE', s.score], ['JOINT', s.joint ? 'ELBOW' : 'SHOULDER', true]]);
        else hud(ctx, [['BONUS', 'PEN TOOL', true], ['TIME', Math.ceil(s.bonusTime ?? 40)], ['TRACED', `${s.lit}/${s.dots.length}`], ['SCORE', s.score]]);
        drawSide(ctx); drawTop(ctx); drawKin(ctx);
        // message bar
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 404, W, 76);
        if (s.skipFlash > 0) text(ctx, `SKIPPED STEPS: ${s.skipped}. The controller didn't notice. Ease off with a load.`, 12, 428, { size: 11, color: C.red });
        else if (s.msgT > 0) text(ctx, s.msg, 12, 428, { size: 12, color: C.ink });
        const hint = s.phase === 'draw' ? '◀ ▶ shoulder θ1   ▲ ▼ elbow θ2   Move both to draw curves' : s.phase === 'sort' ? '◀ ▶ base   ▲ ▼ joint   B switch joint   A grip / release' : '';
        text(ctx, hint, 12, 456, { size: 10, color: C.dim });
        if (s.phase === 'sort' && s.part) text(ctx, `NEXT: ${s.part.type} → ${s.part.type} bin`, 628, 456, { size: 10, color: C.dim, align: 'right' });
        pop.draw(ctx);
      },
    };
  },
};
