// Hosts one mini-game on the console screen: start screen, loop, end screen.
import { sound } from './sound.js';

const W = 640, H = 480;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function createRunner({ canvas, ui, input, reduced, announce, onExit, caseUrl }) {
  const ctx = canvas.getContext('2d');
  let mod = null, project = null, inst = null, raf = 0, last = 0, running = false, shakeT = 0, shakeA = 0;
  let paused = false;

  function overlay(html, focusSel) {
    ui.innerHTML = `<div class="gov" role="dialog" aria-modal="false" aria-label="${esc(mod.title)}">${html}</div>`;
    const f = ui.querySelector(focusSel || 'button');
    if (f) f.focus({ preventScroll: true });
  }
  function clearOverlay() { ui.innerHTML = ''; }

  function startScreen() {
    stopLoop();
    drawAttract();
    overlay(`<h2>${esc(mod.title)}</h2>
      <p>${esc(mod.goal)}</p>
      <h3>Controls</h3>
      <ul>${mod.controls.map(([k, v]) => `<li><kbd>${esc(k)}</kbd> ${esc(v)}</li>`).join('')}</ul>
      <p class="dim">Touch: use the console's D-pad and A/B buttons${mod.touchNote ? `. ${esc(mod.touchNote)}` : ''}.</p>
      ${matchMedia('(max-width: 640px)').matches ? '<p class="dim">Tip: turn your phone sideways and tap Fullscreen for a bigger screen.</p>' : ''}
      <div class="gov-actions"><button class="go" type="button" data-g="play">Play</button><button type="button" data-g="exit">Exit to select</button></div>`);
    wire();
  }

  function wire() {
    ui.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
      const g = b.dataset.g;
      if (g === 'play') play();
      if (g === 'exit') onExit();
    }));
  }

  function play() {
    clearOverlay();
    input.reset();
    if (inst && inst.destroy) inst.destroy();
    inst = mod.create(api);
    if (location.search.includes('debug')) window.__r3 = inst; // test hook for automated play-tests
    sound.play('start');
    announce(`${mod.title} started`);
    canvas.closest('.r3-screen').focus({ preventScroll: true });
    running = true; paused = false; last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function end({ win, score, headline, detail }) {
    running = false; cancelAnimationFrame(raf);
    const key = `r3-best-${mod.id}`;
    let best = 0;
    try { best = Number(localStorage.getItem(key)) || 0; if (score > best) { localStorage.setItem(key, String(score)); } } catch {}
    const isBest = score > best;
    sound.play(win ? 'win' : 'lose');
    announce(`${win ? 'Clear' : 'Game over'}. Score ${score}.`);
    const repo = project.repo ? `<a href="${project.repo}">Real project on GitHub</a>` : '';
    overlay(`<h2>${win ? 'STAGE CLEAR' : 'GAME OVER'}</h2>
      <p>${esc(headline || '')}</p>
      <p class="score">SCORE ${score}${isBest ? ' · NEW BEST' : best ? ` · BEST ${best}` : ''}</p>
      ${detail ? `<p class="dim">${esc(detail)}</p>` : ''}
      <h3>What you just learned</h3>
      <ul>${mod.learned.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="gov-actions"><button class="go" type="button" data-g="play">Play again</button><button type="button" data-g="exit">Exit to select</button><a href="${caseUrl(project)}">Case study</a>${repo}</div>`);
    wire();
  }

  const api = {
    W, H, input, reduced,
    end, announce,
    sfx: name => sound.play(name),
    shake(amount = 6, time = 0.25) { if (!reduced) { shakeA = amount; shakeT = time; } },
  };

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
      inst.update(dt);
      input.clearEdges();
    }
    ctx.save();
    if (shakeT > 0) { shakeT -= dt; const a = shakeA * Math.max(0, shakeT) * 4; ctx.translate((Math.random() - .5) * a, (Math.random() - .5) * a); }
    inst.draw(ctx);
    ctx.restore();
    if (paused) {
      ctx.fillStyle = 'rgba(20,18,20,.7)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ECE6DC'; ctx.font = '700 28px Silkscreen'; ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2); ctx.font = '14px Silkscreen'; ctx.fillText('PRESS START', W / 2, H / 2 + 30); ctx.textAlign = 'left';
    }
    if (running) raf = requestAnimationFrame(loop);
  }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  function drawAttract() {
    ctx.fillStyle = '#141214'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(224,80,95,.12)';
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden && running) paused = true; });

  return {
    async mount(m, p) {
      mod = m; project = p;
      try { await document.fonts.load('16px Silkscreen'); } catch {}
      startScreen();
    },
    togglePause() { if (running) { paused = !paused; sound.play('tick'); } },
    get running() { return running; },
    unmount() { stopLoop(); if (inst && inst.destroy) inst.destroy(); inst = null; clearOverlay(); },
  };
}
