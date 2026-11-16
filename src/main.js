// Shared page behaviour: mobile nav, scroll entrances, pause animations on hidden tabs.
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav-toggle');
if (nav && toggle) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav-list a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
    }
  });
}

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add('in');
      // retire the stagger delay once the entrance is done so hovers don't lag
      setTimeout(() => e.target.classList.add('done'), 1200);
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(el => io.observe(el));
} else reveals.forEach(el => el.classList.add('in', 'done'));

document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

// "Copy email" buttons: copy the address and confirm on the button itself
document.querySelectorAll('[data-copy]').forEach(btn => {
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select();
      try { ok = document.execCommand('copy'); } catch {} t.remove();
    }
    btn.textContent = ok ? 'Copied!' : text;
    setTimeout(() => { btn.textContent = label; }, 2200);
  });
});
