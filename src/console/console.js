// 13 SYSTEM: boot → title → character select → cartridge load → game.
import { createInput } from './input.js';
import { createRunner } from './runner.js';
import { sound } from './sound.js';

const root = document.getElementById('r3');
const DATA = JSON.parse(document.getElementById('r3-data').textContent);
const BASE = DATA.base;
const projects = DATA.projects;
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reducedMQ.matches;

// every game module, lazy: a new file in src/games/ is all a new game needs
const GAMES = import.meta.glob(['../games/*.js', '!../games/_*.js']);
const gameLoader = id => GAMES[`../games/${id}.js`];

const screen = root.querySelector('#r3-screen');
screen.tabIndex = -1;
const $ = s => root.querySelector(s);
const now = $('.r3-now'), caseLink = $('.r3-case'), exitBtn = $('.r3-exit');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const caseUrl = p => `${BASE}projects/${p.slug}/`;
const STATUS = { clear: 'CLEAR', progress: 'IN PROGRESS', locked: 'LOCKED' };

let state = 'off';
let sel = 0;
let bootTimer = 0;

// live region for screen readers
const live = document.createElement('p');
live.className = 'sr'; live.setAttribute('aria-live', 'polite');
root.append(live);
const announce = t => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); };

function setState(s) {
  state = s;
  root.dataset.state = s;
  const p = projects[sel];
  const inGame = s === 'game' || s === 'locked' || s === 'loading';
  exitBtn.hidden = !inGame;
  const showCase = (s === 'select' || s === 'game') && p.status !== 'locked';
  caseLink.hidden = !showCase;
  if (showCase) { caseLink.href = caseUrl(p); caseLink.textContent = `Case study: ${p.name}`; }
  now.textContent = ({ off: 'Off', boot: 'Booting', title: 'Title screen', select: 'Choose a project', loading: `Loading ${p.name}`, locked: 'Locked cartridge', game: `Playing ${p.name}` })[s];
}

const engaged = () => root.contains(document.activeElement) || document.fullscreenElement === root || (state === 'game' && inView);
let inView = false;
new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView && state === 'off') boot(); }, { threshold: 0.25 }).observe(root);

const input = createInput(root, engaged, onPress);
const canvas = $('.game-canvas');
input.bindCanvas(canvas);
const runner = createRunner({ canvas, ui: $('.game-ui'), input, reduced: reduced(), announce, onExit: exitToSelect, caseUrl });

// ── boot ──────────────────────────────────────────────────────────────────
const BOOT = [
  '13 SYSTEM BIOS v1.0',
  'OWNER ........ 13',
  'MEMORY TEST .. 64K <ok>OK</ok>',
  'VIDEO ........ CRT 640x480 <ok>OK</ok>',
  `CARTRIDGES ... ${projects.length} FOUND (${projects.filter(p => p.status === 'locked').length} LOCKED)`,
  'INPUT ........ PAD 1 <ok>READY</ok>',
  '',
  'BOOT COMPLETE.',
];
function boot() {
  if (state !== 'off') return;
  setState('boot');
  const pre = $('.boot-lines');
  if (reduced()) { pre.innerHTML = BOOT.join('\n').replace(/<ok>/g, '<span class="ok">').replace(/<\/ok>/g, '</span>'); bootTimer = setTimeout(toTitle, 600); return; }
  let i = 0; pre.innerHTML = '';
  const step = () => {
    if (state !== 'boot') return;
    if (i >= BOOT.length) { bootTimer = setTimeout(toTitle, 450); return; }
    pre.innerHTML += BOOT[i++].replace(/<ok>/g, '<span class="ok">').replace(/<\/ok>/g, '</span>') + '\n';
    sound.play('tick');
    bootTimer = setTimeout(step, 230);
  };
  step();
}
function toTitle() {
  clearTimeout(bootTimer);
  setState('title');
  const pending = new URLSearchParams(location.search).get('play');
  if (pending) {
    const i = projects.findIndex(p => p.slug === pending);
    if (i >= 0) { sel = i; toSelect(); choose(); }
  }
}

// ── select ────────────────────────────────────────────────────────────────
function renderSelect() {
  const p = projects[sel];
  const locked = p.status === 'locked';
  const art = p.portrait && !locked
    ? `<img src="${BASE}assets/portraits/${p.portrait}" width="64" height="64" alt="">`
    : `<span class="q" aria-hidden="true">?</span>`;
  const maxQ = 8;
  const loadout = locked
    ? `<li><span class="nm">???</span><span class="q">×?</span><span class="bar" aria-hidden="true">${'<i></i>'.repeat(maxQ)}</span></li>`.repeat(3)
    : p.components.map(c => `<li><span class="nm">${esc(c.name)}</span><span class="q">×${c.qty}</span><span class="bar" aria-hidden="true">${Array.from({ length: maxQ }, (_, i) => `<i${i < c.qty ? ' class="f"' : ''}></i>`).join('')}</span></li>`).join('');
  $('.scr-select').innerHTML = `
    <div class="sel-top"><span>SELECT PROJECT</span><span><b>1P</b> ${sel + 1}/${projects.length}</span></div>
    <div class="sel-main">
      <div class="sel-portrait">${art}
        <button class="sel-arrow sel-prev" type="button" data-act="prev" aria-label="Previous project">◀</button>
        <button class="sel-arrow sel-next" type="button" data-act="next" aria-label="Next project">▶</button>
      </div>
      <div class="sel-info">
        <div class="plate">
          <p class="plate-name">${locked ? '???' : esc(p.name)}</p>
          <p class="plate-row"><span>CLASS <span class="st">${locked ? '???' : esc(p.class).toUpperCase()}</span></span><span>STATUS <span class="st st-${p.status}">${STATUS[p.status]}</span></span></p>
        </div>
        <div class="loadout"><h3>Loadout</h3><ul class="lo">${loadout}</ul></div>
      </div>
    </div>
    <ul class="roster" aria-label="Projects">${projects.map((q, i) => `<li>${i === sel ? '<span class="cursor-1p" aria-hidden="true">1P</span>' : ''}<button class="slot-btn" type="button" data-pick="${i}" aria-current="${i === sel}" aria-label="${q.status === 'locked' ? 'Locked project' : esc(q.name)}">${q.portrait && q.status !== 'locked' ? `<img src="${BASE}assets/portraits/${q.portrait}" width="64" height="64" alt="">` : '?'}</button></li>`).join('')}</ul>
    <p class="sel-hint">◀ ▶ choose · A / Enter ${locked ? 'view' : 'play'}<button class="play-btn" type="button" data-act="choose">${locked ? 'View' : 'Play'}</button></p>`;
  setState('select');
}
function toSelect() { sound.play('select'); renderSelect(); screen.focus({ preventScroll: true }); announce('Select a project. Use left and right.'); }
function move(d) {
  sel = (sel + d + projects.length) % projects.length;
  sound.play('move');
  renderSelect();
  const p = projects[sel];
  announce(p.status === 'locked' ? 'Locked project. Coming soon.' : `${p.name}. ${p.class}. ${STATUS[p.status]}.`);
}

async function choose() {
  const p = projects[sel];
  if (p.status === 'locked' || !p.game || !gameLoader(p.game)) {
    sound.play('back'); setState('locked');
    $('.lk-back').focus({ preventScroll: true });
    announce('Coming soon. Unlocks in Torino.');
    return;
  }
  $('.r3-cart-label').textContent = p.short;
  $('.ld-name').textContent = p.name;
  setState('loading');
  sound.play('insert');
  const minWait = new Promise(r => setTimeout(r, reduced() ? 150 : 1700));
  try {
    const [mod] = await Promise.all([gameLoader(p.game)(), minWait]);
    if (state !== 'loading') return;
    setState('game');
    await runner.mount(mod.default, p);
  } catch (err) {
    console.error(err);
    $('.ld-hint').textContent = 'Read error. Blow on the cartridge and try again.';
  }
}

function exitToSelect() {
  runner.unmount();
  if (document.fullscreenElement && state === 'game') { /* stay fullscreen on select */ }
  sound.play('back');
  renderSelect();
  screen.focus({ preventScroll: true });
}

// ── global button presses ────────────────────────────────────────────────
function onPress(name) {
  if (name === 'escape') {
    if (state === 'game' || state === 'locked' || state === 'loading') exitToSelect();
    return;
  }
  switch (state) {
    case 'off': if (name === 'start' || name === 'a') boot(); break;
    case 'boot': if (name === 'start' || name === 'a') toTitle(); break;
    case 'title': if (name === 'start' || name === 'a') toSelect(); break;
    case 'select':
      if (name === 'left' || name === 'up') move(-1);
      else if (name === 'right' || name === 'down') move(1);
      else if (name === 'a' || name === 'start') choose();
      else if (name === 'b') { setState('title'); sound.play('back'); }
      break;
    case 'locked': if (name === 'b' || name === 'a' || name === 'start') exitToSelect(); break;
    case 'game':
      if (name === 'start' && runner.running) runner.togglePause();
      else if (name === 'select' && !runner.running) exitToSelect();
      break;
  }
}

// clicks inside the screen
root.addEventListener('click', e => {
  const a = e.target.closest('[data-act],[data-pick]');
  if (!a) return;
  if (a.dataset.pick !== undefined) { const i = +a.dataset.pick; if (i === sel) choose(); else { sel = i; sound.play('move'); renderSelect(); } return; }
  switch (a.dataset.act) {
    case 'power': boot(); break;
    case 'start': toSelect(); break;
    case 'prev': move(-1); break;
    case 'next': move(1); break;
    case 'choose': choose(); break;
    case 'exit': exitToSelect(); break;
    case 'sound': { const on = sound.toggle(); a.setAttribute('aria-pressed', String(on)); a.textContent = on ? 'Sound on' : 'Sound off'; sound.play('select'); break; }
    case 'fullscreen':
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      break;
  }
});
document.addEventListener('fullscreenchange', () => {
  const b = $('.r3-full'); b.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
});
if (!document.fullscreenEnabled && !root.webkitRequestFullscreen) $('.r3-full').hidden = true;

// "Press start" in the hero intro
document.querySelector('[data-hero-start]')?.addEventListener('click', () => {
  root.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  if (state === 'off' || state === 'boot') { clearTimeout(bootTimer); state = 'boot'; toTitle(); }
  if (state === 'title') toSelect(); else screen.focus({ preventScroll: true });
});

// arriving from a case study ("Play the cartridge"): skip the boot
if (new URLSearchParams(location.search).get('play')) { state = 'boot'; toTitle(); }
setState(state);
