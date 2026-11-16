// One input bus for the console: keyboard, the console's own on-screen buttons (touch + mouse),
// and pointer on the game canvas. Games read `held` and call `pressed(name)` for edges.
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'a', Space: 'a', KeyZ: 'a', KeyJ: 'a',
  ShiftLeft: 'b', ShiftRight: 'b', KeyX: 'b', KeyK: 'b',
  Escape: 'escape', Tab: null,
};

export function createInput(root, isEngaged, onPress) {
  const held = { up: false, down: false, left: false, right: false, a: false, b: false, start: false, select: false };
  const edges = new Set();
  const pointer = { x: 0, y: 0, down: false, justDown: false, active: false };

  function press(name, source) {
    if (!held[name]) edges.add(name);
    held[name] = true;
    onPress(name, source);
  }
  function release(name) { held[name] = false; }

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const name = KEYMAP[e.code];
    if (!name || !isEngaged()) return;
    // let real buttons/links handle Enter/Space natively when they have focus
    const t = document.activeElement;
    const nativeTarget = t && (t.tagName === 'BUTTON' || t.tagName === 'A') && root.contains(t) && !t.dataset.btn;
    if ((name === 'a') && nativeTarget) return;
    if (name === 'escape') { onPress('escape', 'key'); return; }
    e.preventDefault();
    if (e.repeat) return;
    press(name, 'key');
  });
  document.addEventListener('keyup', e => {
    const name = KEYMAP[e.code];
    if (name && name !== 'escape') release(name);
  });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; pointer.down = false; });

  // on-console buttons
  root.querySelectorAll('[data-btn]').forEach(btn => {
    const name = btn.dataset.btn;
    const down = e => { e.preventDefault(); btn.classList.add('on'); try { btn.setPointerCapture(e.pointerId); } catch {} press(name, 'button'); };
    const up = () => { btn.classList.remove('on'); release(name); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    // keyboard users tabbing onto a console button
    btn.addEventListener('keydown', e => {
      if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); e.stopPropagation(); btn.classList.add('on'); press(name, 'button'); }
    });
    btn.addEventListener('keyup', e => { if (e.code === 'Enter' || e.code === 'Space') { btn.classList.remove('on'); release(name); } });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  function bindCanvas(canvas) {
    const map = e => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) * (canvas.width / r.width);
      pointer.y = (e.clientY - r.top) * (canvas.height / r.height);
    };
    canvas.addEventListener('pointerdown', e => { map(e); pointer.down = true; pointer.justDown = true; pointer.active = true; try { canvas.setPointerCapture(e.pointerId); } catch {} });
    canvas.addEventListener('pointermove', e => { map(e); pointer.active = true; });
    canvas.addEventListener('pointerup', e => { map(e); pointer.down = false; });
    canvas.addEventListener('pointercancel', () => { pointer.down = false; });
  }

  return {
    held, pointer, bindCanvas,
    pressed(name) { if (edges.has(name)) { edges.delete(name); return true; } return false; },
    clearEdges() { edges.clear(); pointer.justDown = false; },
    reset() { edges.clear(); for (const k in held) held[k] = false; pointer.down = false; pointer.justDown = false; },
  };
}
