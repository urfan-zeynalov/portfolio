// STM32 BRING-UP: you are the microcontroller. Flash the firmware over SWD, then run:
// toggle the LED on SysTick, read UART bytes before they overrun, service interrupts.
// A logic-analyzer trace records every signal you drive.
import { C, W, H, clamp, text, panel, hud, meter, popups, rng } from './_kit.js';

const MSG = '13 ONLINE';
const RUN_TIME = 60, MAX_ERR = 8;
const TICK = 0.8;                       // SysTick period shown (scaled way down so humans can play)
const SPEED = 170;                      // lane scroll px/s
const HIT_X = 140, WIN = 30;            // hit line and tolerance (px)
const ISR_TIME = 0.32;
const IRQS = [{ n: 'EXTI0', p: 1 }, { n: 'TIM2', p: 2 }, { n: 'USART1', p: 3 }, { n: 'DMA1', p: 4 }];
const LA_WIN = 4;                       // seconds of trace on screen

export default {
  id: 'stm32',
  title: 'STM32 Bring-up',
  goal: 'You are the STM32F103. First flash the firmware over the ST-Link, then survive 60 seconds of real work: blink the LED on the clock tick, catch every UART byte in order, and clear interrupts before they pile up.',
  controls: [
    ['A / Space', 'Flash stages · read a UART byte'],
    ['▲', 'Toggle the LED (PC13) on the SysTick'],
    ['▼', 'Run the ISR for the top pending interrupt'],
    ['Start', 'Pause · Esc exits'],
  ],
  learned: [
    'Flashing goes connect (SWD), erase, program, verify. Code lives in flash starting at 0x08000000 on the STM32F1.',
    'A UART byte has to be read before the next one lands, or the overrun flag (ORE) sets and data is lost.',
    'Interrupts queue up by priority in the NVIC. While an ISR runs, the main loop waits, so ISRs should be short. The logic analyzer shows all of this as timing.',
  ],
  create(api) {
    const R = rng();
    const pop = popups();
    const s = {
      phase: 'flash', stage: 0, cur: 0, dir: 1, misses: 0, flashLog: ['$ st-flash write r3.bin 0x08000000'], win: [0.55, 0.72],
      t: 0, runT: 0, score: 0, err: 0,
      ticks: [], nextTick: 1.2, led: false,
      bytes: [], nextByte: 1.6, ci: 0, rx: '',
      pending: [], nextIrq: 2.5, isr: 0, isrName: '',
      la: { clk: [], led: [[0, 0]], rx: [], irq: [[0, 0]] },
    };
    const STAGES = ['CONNECT (SWD)', 'ERASE FLASH', 'PROGRAM + VERIFY'];
    const newWindow = () => { const w = 0.16 - s.stage * 0.03; const a = 0.15 + R() * (0.7 - w); s.win = [a, a + w]; };
    newWindow();

    const err = (why, x, y) => { s.err++; api.sfx('bad'); pop.add(why, x, y, C.red); api.shake(4); if (s.err >= MAX_ERR) crash(); };
    function crash() { api.end({ win: false, score: s.score, headline: `HardFault after ${s.runT.toFixed(0)} s. Too many missed events.`, detail: `RX buffer: "${s.rx}"` }); s.phase = 'done'; }
    const level = (ch, v) => { const a = s.la[ch]; if (!a.length || a[a.length - 1][1] !== v) a.push([s.runT, v]); };

    function updateFlash(dt) {
      s.cur += s.dir * dt * (0.7 + s.stage * 0.25);
      if (s.cur > 1) { s.cur = 1; s.dir = -1; } if (s.cur < 0) { s.cur = 0; s.dir = 1; }
      if (api.input.pressed('a')) {
        if (s.cur >= s.win[0] && s.cur <= s.win[1]) {
          s.flashLog.push(['Found ST-Link V2, target STM32F1xx (SWD ACK)', 'Erased 32 pages (32 KiB)', 'Flash written and verified · jumping to 0x08000000'][s.stage]);
          api.sfx('good'); s.stage++;
          if (s.stage >= 3) { s.phase = 'run'; s.score += Math.max(50, 300 - s.misses * 40); api.announce('Firmware flashed. Running.'); return; }
          newWindow();
        } else {
          s.misses++; api.sfx('bad');
          s.flashLog.push(['Error: no SWD ACK, retrying', 'Error: erase timeout, retrying', 'Error: verify mismatch at 0x08000400, retrying'][s.stage]);
        }
        if (s.flashLog.length > 9) s.flashLog.shift();
      }
    }

    function updateRun(dt) {
      const inp = api.input;
      s.runT += dt;
      const cpuFree = s.isr <= 0;
      const lv = 1 + s.runT / 40; // difficulty

      // SysTick lane
      s.nextTick -= dt;
      if (s.nextTick <= 0) { s.ticks.push({ x: W + 10, hit: false }); s.nextTick += TICK; }
      // UART lane
      s.nextByte -= dt;
      if (s.nextByte <= 0) { const ch = MSG[s.ci % MSG.length]; s.ci++; s.bytes.push({ x: W + 10, ch, hit: false }); s.nextByte = (0.9 + R() * 1.3) / lv; }
      // IRQs land in the pending queue
      s.nextIrq -= dt;
      if (s.nextIrq <= 0) { const q = IRQS[Math.floor(R() * IRQS.length)]; s.pending.push({ ...q, age: 0 }); s.nextIrq = (1.0 + R() * 1.6) / lv; }
      for (const q of s.pending) q.age += dt;
      if (s.pending.length > 5) { s.pending = []; err('NVIC OVERFLOW', 500, 200); }

      for (const k of s.ticks) { const was = k.x; k.x -= SPEED * dt; if (was >= HIT_X && k.x < HIT_X) level('clk', 1), setTimeout(() => level('clk', 0), 60); }
      for (const b of s.bytes) b.x -= SPEED * dt;

      // inputs
      if (inp.pressed('up')) {
        const k = s.ticks.find(k => !k.hit && Math.abs(k.x - HIT_X) < WIN);
        if (!cpuFree) pop.add('CPU BUSY IN ISR', HIT_X, 70, C.dim);
        else if (k) { k.hit = true; s.led = !s.led; level('led', s.led ? 1 : 0); s.score += 10; api.sfx('tick'); }
        else err('OFF BEAT', HIT_X, 70);
      }
      if (inp.pressed('a')) {
        const b = s.bytes.find(b => !b.hit && Math.abs(b.x - HIT_X) < WIN);
        if (!cpuFree) pop.add('CPU BUSY IN ISR', HIT_X, 140, C.dim);
        else if (b) { b.hit = true; s.rx = (s.rx + b.ch).slice(-24); s.score += 15; api.sfx('good'); rxFrame(b.ch); }
        else err('NOTHING IN RDR', HIT_X, 140);
      }
      if (inp.pressed('down')) {
        if (!s.pending.length) err('NO PENDING IRQ', 500, 200);
        else if (!cpuFree) pop.add('ALREADY IN ISR', 500, 200, C.dim);
        else {
          s.pending.sort((a, b) => a.p - b.p);
          const q = s.pending.shift(); s.isr = ISR_TIME; s.isrName = q.n; level('irq', 1); s.score += 12; api.sfx('select');
        }
      }
      if (s.isr > 0) { s.isr -= dt; if (s.isr <= 0) level('irq', 0); }

      // misses
      for (const k of s.ticks) if (!k.hit && k.x < HIT_X - WIN && !k.missed) { k.missed = true; err('MISSED TICK', HIT_X, 70); }
      for (const b of s.bytes) if (!b.hit && b.x < HIT_X - WIN && !b.missed) { b.missed = true; s.rx = (s.rx + '?').slice(-24); err('ORE: OVERRUN', HIT_X, 140); }
      s.ticks = s.ticks.filter(k => k.x > -20); s.bytes = s.bytes.filter(b => b.x > -20);

      if (s.runT >= RUN_TIME && s.phase === 'run') {
        s.phase = 'done';
        api.end({ win: true, score: s.score, headline: `60 seconds without a HardFault. ${s.err} errors.`, detail: `RX buffer: "${s.rx}"` });
      }
    }

    function rxFrame(ch) {
      // UART 8N1: idle high, start bit low, 8 data bits LSB first, stop bit high
      const code = ch.charCodeAt(0), bit = 0.022, t0 = s.runT;
      const a = s.la.rx; a.push([t0, 0]);
      for (let i = 0; i < 8; i++) a.push([t0 + bit * (i + 1), (code >> i) & 1]);
      a.push([t0 + bit * 9, 1]);
    }

    function drawFlash(ctx) {
      hud(ctx, [['MODE', 'FLASH', true], ['STAGE', `${Math.min(3, s.stage + 1)}/3`], ['RETRIES', s.misses]]);
      panel(ctx, 20, 50, 600, 200, { title: 'ST-LINK V2 → SWD → STM32F103C6T6' });
      s.flashLog.forEach((l, i) => text(ctx, l, 34, 84 + i * 18, { size: 12, font: 'mono', color: l.startsWith('Error') ? C.red : i === 0 ? C.dim : C.ink }));
      if (s.stage < 3) {
        text(ctx, STAGES[s.stage], W / 2, 300, { size: 20, align: 'center' });
        text(ctx, 'Press A when the cursor is inside the window', W / 2, 326, { size: 11, color: C.dim, align: 'center' });
        const x = 80, w = 480, y = 350;
        ctx.fillStyle = C.grid; ctx.fillRect(x, y, w, 26);
        ctx.fillStyle = C.redDD; ctx.fillRect(x + w * s.win[0], y, w * (s.win[1] - s.win[0]), 26);
        ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.strokeRect(x + w * s.win[0], y, w * (s.win[1] - s.win[0]), 26);
        ctx.fillStyle = C.ink; ctx.fillRect(x + w * s.cur - 2, y - 6, 4, 38);
      }
      text(ctx, 'Flash memory starts at 0x08000000. The core boots from there after reset.', W / 2, 440, { size: 10, color: C.faint, align: 'center' });
    }

    function lane(ctx, y, label, key) {
      ctx.fillStyle = C.bg2; ctx.fillRect(0, y, 400, 54);
      ctx.fillStyle = C.line; ctx.fillRect(0, y + 53, 400, 1);
      text(ctx, label, 8, y + 14, { size: 9, color: C.dim });
      text(ctx, key, 8, y + 44, { size: 14, color: C.red });
      ctx.fillStyle = 'rgba(224,80,95,.15)'; ctx.fillRect(HIT_X - WIN, y, WIN * 2, 54);
      ctx.fillStyle = C.red; ctx.fillRect(HIT_X - 1, y, 2, 54);
    }

    function drawRun(ctx) {
      hud(ctx, [['TIME', Math.max(0, Math.ceil(RUN_TIME - s.runT))], ['SCORE', s.score], ['ERRORS', `${s.err}/${MAX_ERR}`, s.err >= MAX_ERR - 2], ['CPU', s.isr > 0 ? s.isrName : 'MAIN', s.isr > 0]]);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 34, 400, 170); ctx.clip();
      lane(ctx, 36, 'SYSTICK → LED PC13', '▲');
      lane(ctx, 92, 'USART1 RX', 'A');
      for (const k of s.ticks) if (!k.hit) { ctx.fillStyle = k.missed ? C.faint : C.ink; ctx.fillRect(k.x - 3, 46, 6, 34); }
      for (const b of s.bytes) if (!b.hit) {
        ctx.fillStyle = b.missed ? C.grid : C.redD; ctx.fillRect(b.x - 18, 100, 36, 36);
        text(ctx, b.ch === ' ' ? '␠' : b.ch, b.x, 124, { size: 14, align: 'center', color: C.ink });
      }
      ctx.restore();
      // RX buffer + board
      panel(ctx, 0, 150, 400, 56, { title: 'RX BUFFER' });
      text(ctx, s.rx || '_', 12, 194, { size: 16, font: 'mono', color: C.ink });
      // board with LED
      panel(ctx, 404, 36, 236, 76, { title: 'F103C6T6 · LED PC13' });
      ctx.fillStyle = C.grid; ctx.fillRect(420, 58, 150, 44);
      ctx.fillStyle = C.bg; ctx.fillRect(470, 66, 34, 28);
      ctx.fillStyle = s.led ? C.red : C.redDD; ctx.beginPath(); ctx.arc(592, 80, 10, 0, 7); ctx.fill();
      if (s.led) { ctx.fillStyle = 'rgba(224,80,95,.25)'; ctx.beginPath(); ctx.arc(592, 80, 20, 0, 7); ctx.fill(); }
      // NVIC
      panel(ctx, 404, 116, 236, 90, { title: 'NVIC PENDING  ▼ RUN ISR' });
      const sorted = [...s.pending].sort((a, b) => a.p - b.p);
      for (let i = 0; i < 6; i++) {
        const q = sorted[i], x = 412 + i * 38;
        ctx.strokeStyle = i === 5 ? C.redD : C.line; ctx.lineWidth = 2; ctx.strokeRect(x, 140, 34, 54);
        if (q) { ctx.fillStyle = i === 0 ? C.redD : C.grid; ctx.fillRect(x + 2, 142, 30, 50); text(ctx, q.n.slice(0, 5), x + 17, 166, { size: 7, align: 'center' }); text(ctx, `P${q.p}`, x + 17, 184, { size: 10, align: 'center', color: C.dim }); }
      }
      if (s.isr > 0) meter(ctx, 412, 198, 220, 4, 1 - s.isr / ISR_TIME);
      drawLA(ctx);
    }

    function drawLA(ctx) {
      const x0 = 70, x1 = 630, y0 = 218, ch = 60;
      panel(ctx, 0, 210, W, 270, { title: 'LOGIC ANALYZER · 24 MHz' });
      const tEnd = s.runT, tStart = tEnd - LA_WIN;
      const X = t => x0 + (t - tStart) / LA_WIN * (x1 - x0);
      const chans = [['CLK', s.la.clk, 1], ['PC13', s.la.led, 1], ['RX', s.la.rx, 1], ['ISR', s.la.irq, 1]];
      chans.forEach(([name, arr], i) => {
        const yb = y0 + 22 + i * ch, hi = yb + 6, lo = yb + 34;
        text(ctx, name, 10, yb + 26, { size: 11, color: C.dim });
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, lo + 10); ctx.lineTo(x1, lo + 10); ctx.stroke();
        ctx.strokeStyle = i === 1 ? C.red : C.ink; ctx.lineWidth = 2; ctx.beginPath();
        let v = name === 'RX' ? 1 : 0;
        for (const [t, val] of arr) if (t <= tStart) v = val;
        ctx.moveTo(x0, v ? hi : lo);
        for (const [t, val] of arr) {
          if (t <= tStart || t > tEnd) continue;
          const x = X(t); ctx.lineTo(x, v ? hi : lo); v = val; ctx.lineTo(x, v ? hi : lo);
        }
        ctx.lineTo(x1, v ? hi : lo); ctx.stroke();
      });
      for (const k in s.la) { const a = s.la[k]; while (a.length > 2 && a[1][0] < tStart - 1) a.shift(); }
    }

    return { _s: s,
      update(dt) {
        pop.update(dt);
        if (s.phase === 'flash') updateFlash(dt);
        else if (s.phase === 'run') updateRun(dt);
      },
      draw(ctx) {
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        if (s.phase === 'flash') drawFlash(ctx); else drawRun(ctx);
        pop.draw(ctx);
      },
    };
  },
};
