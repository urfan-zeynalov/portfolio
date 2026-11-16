// HTML templates, rendered at build time by scripts/gen-pages.js.
import { site, skills } from '../data/site.js';
import { projects, STATUS, playable } from '../data/projects.js';
import { icon } from './icons.js';

const BASE = process.env.BASE || '/';
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
export const href = p => BASE + p.replace(/^\//, '');
const abs = p => (SITE_URL ? SITE_URL + href(p) : href(p));
const gmail = () => `https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=${encodeURIComponent(site.email)}`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NAV = [
  ['projects/', 'Projects'],
  ['about/', 'About'],
  ['#skills', 'Skills'],
  ['log/', 'Log'],
  ['#contact', 'Contact'],
];

function head({ title, description, path, ogType = 'website' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#F2EEE7">
<meta name="author" content="${site.name}">
${SITE_URL ? `<link rel="canonical" href="${abs(path)}">
<meta property="og:url" content="${abs(path)}">` : '<!-- canonical + og:url are added at deploy time from SITE_URL (see .github/workflows/deploy.yml) -->'}
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE_URL ? abs('assets/og-image.jpg') : '/assets/og-image.jpg'}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Silkscreen:wght@400;700&display=swap">
<link rel="stylesheet" href="/src/styles/main.css">
</head>`;
}

function header(current) {
  const links = NAV.map(([p, label]) => {
    const url = p.startsWith('#') ? href('') + p : href(p);
    const cur = current && p === current ? ' aria-current="page"' : '';
    return `<li><a href="${url}"${cur}>${label}</a></li>`;
  }).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <nav class="nav" aria-label="Main">
    <a class="brand" href="${href('')}#console" aria-label="13 SYSTEM home: the console">
      <svg class="brand-mark" viewBox="0 0 16 12" width="32" height="24" aria-hidden="true" shape-rendering="crispEdges"><rect x="1" y="0" width="14" height="12" fill="currentColor"/><rect x="3" y="2" width="7" height="6" fill="#141214"/><rect x="4" y="3" width="2" height="1" fill="#E0505F"/><rect x="11" y="3" width="2" height="2" fill="#B32A3C"/><rect x="11" y="6" width="2" height="2" fill="#B32A3C"/><rect x="3" y="9" width="3" height="1" fill="#141214"/></svg>
      <span>13 SYSTEM</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-list">Menu</button>
    <ul class="nav-list" id="nav-list">${links}<li><a class="nav-cv" href="${href('cv.pdf')}" download>CV</a></li></ul>
  </nav>
</header>`;
}

function footer() {
  return `<footer class="site-foot">
  <div class="wrap foot-grid">
    <p class="foot-brand"><span class="px">13 SYSTEM</span></p>
    <ul class="foot-links">
      <li><a href="${site.github}" rel="me noopener" target="_blank">GitHub</a></li>
      <li><a href="${site.linkedin}" rel="me noopener" target="_blank">LinkedIn</a></li>
      <li><a href="${gmail()}" target="_blank" rel="noopener">Email</a></li>
      <li><a href="${href('cv.pdf')}" download>CV</a></li>
    </ul>
    <p class="foot-note">© ${new Date().getFullYear()} ${site.name}</p>
  </div>
</footer>`;
}

function page({ title, description, path, current, body, scripts = ['/src/main.js'], bodyClass = '' }) {
  return `${head({ title, description, path })}
<body class="${bodyClass}">
<div class="env" aria-hidden="true"></div>
${header(current)}
<main id="main" tabindex="-1">
${body}
</main>
${footer()}
${scripts.map(s => `<script type="module" src="${s}"></script>`).join('\n')}
</body>
</html>
`;
}

// ── pieces ───────────────────────────────────────────────────────────────────
export function badge(status) {
  return `<span class="badge badge-${status}">${STATUS[status].label}</span>`;
}

function portraitImg(p, cls = 'portrait', size = 64) {
  if (!p.portrait) return `<span class="${cls} portrait-q" aria-hidden="true">?</span>`;
  return `<img class="${cls}" src="/assets/portraits/${p.portrait}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
}

function projectCard(p) {
  const locked = p.status === 'locked';
  return `<li class="card${locked ? ' card-locked' : ''} reveal">
    <div class="card-art">${portraitImg(p, 'portrait', 64)}</div>
    <div class="card-body">
      <p class="card-meta"><span class="px">${esc(p.class)}</span>${badge(p.status)}</p>
      <h3 class="card-title">${esc(p.name)}</h3>
      <p class="card-blurb">${esc(p.blurb)}</p>
      <p class="card-links">
        <a href="${href(`projects/${p.slug}/`)}">${locked ? 'Preview' : 'Case study'}<span class="sr"> for ${esc(p.name)}</span></a>
        ${playable(p) ? `<a href="${href(`?play=${p.slug}`)}#console">Play<span class="sr"> ${esc(p.name)}</span></a>` : ''}
        ${p.repo ? `<a href="${p.repo}" target="_blank" rel="noopener">Repo<span class="sr"> for ${esc(p.name)}</span></a>` : ''}
      </p>
    </div>
  </li>`;
}

function inventory() {
  const tier = (key, title, note) => `<div class="tier tier-${key} reveal">
    <h3 class="tier-title"><span class="px">${title}</span><span class="tier-note">${note}</span></h3>
    <ul class="slots">${skills[key].map(s => `<li class="slot">${icon(s.icon)}<span class="slot-name">${esc(s.name)}</span>${key === 'locked' ? '<span class="slot-lock" aria-label="locked">LOCK</span>' : ''}</li>`).join('')}</ul>
  </div>`;
  return tier('unlocked', 'Unlocked', 'Used on real builds') +
    tier('leveling', 'Leveling up', 'Learning right now') +
    tier('locked', 'Locked', 'Next on the list');
}

function logList(posts, limit) {
  const list = (limit ? posts.slice(0, limit) : posts);
  return `<ol class="log-list">${list.map(p => `<li class="log-item reveal">
    <time class="px" datetime="${p.date}">${p.date}</time>
    <div><h3 class="log-title"><a href="${href(`log/${p.slug}/`)}">${esc(p.title)}</a></h3>
    <p>${esc(p.summary || '')}</p></div></li>`).join('')}</ol>`;
}

// ── the console (hero) ──────────────────────────────────────────────────────
function consoleMarkup() {
  return `<div class="r3" id="r3" data-state="off">
  <div class="r3-slot" aria-hidden="true"><div class="r3-cart"><span class="r3-cart-label"></span></div></div>
  <div class="r3-shell">
    <div class="r3-pad r3-pad-l">
      <div class="dpad" role="group" aria-label="Direction pad">
        <button class="dp dp-up" type="button" data-btn="up" aria-label="Up"></button>
        <button class="dp dp-left" type="button" data-btn="left" aria-label="Left"></button>
        <span class="dp-mid" aria-hidden="true"></span>
        <button class="dp dp-right" type="button" data-btn="right" aria-label="Right"></button>
        <button class="dp dp-down" type="button" data-btn="down" aria-label="Down"></button>
      </div>
    </div>
    <div class="r3-face">
      <div class="r3-bezel">
        <span class="r3-power" aria-hidden="true"></span>
        <div class="r3-screen" id="r3-screen" aria-label="Console screen">
          <div class="scr scr-off"><button class="scr-power" type="button" data-act="power">Power on</button></div>
          <div class="scr scr-boot" aria-hidden="true"><pre class="boot-lines"></pre></div>
          <div class="scr scr-title">
            <p class="t-logo">13<span>SYSTEM</span></p>
            <button class="t-start" type="button" data-act="start">Press start</button>
            <p class="t-sub">PLAYER 1 · 13</p>
          </div>
          <div class="scr scr-select"></div>
          <div class="scr scr-load" aria-live="polite"><p class="ld-title">Loading</p><p class="ld-name"></p><div class="ld-bar"><span></span></div><p class="ld-hint">Reading cartridge…</p></div>
          <div class="scr scr-locked"><p class="lk-q" aria-hidden="true">?</p><p class="lk-title">???</p><p class="lk-msg">Coming soon. Unlocks in Torino.</p><button type="button" class="lk-back" data-act="exit">Back to select</button></div>
          <div class="scr scr-game"><canvas class="game-canvas" width="640" height="480" aria-label="Game screen"></canvas><div class="game-ui"></div></div>
        </div>
      </div>
      <p class="r3-name" aria-hidden="true">13<span>SYSTEM</span></p>
      <div class="r3-meta">
        <button class="pill" type="button" data-btn="select">Select</button>
        <button class="pill" type="button" data-btn="start">Start</button>
      </div>
    </div>
    <div class="r3-pad r3-pad-r">
      <div class="ab" role="group" aria-label="Action buttons">
        <button class="abtn abtn-b" type="button" data-btn="b" aria-label="B button"><span>B</span></button>
        <button class="abtn abtn-a" type="button" data-btn="a" aria-label="A button"><span>A</span></button>
      </div>
    </div>
  </div>
  <div class="r3-bar">
    <p class="r3-status" aria-live="polite"><span class="px">Now:</span> <span class="r3-now">Off</span></p>
    <div class="r3-actions">
      <a class="r3-case" href="${href('projects/')}" hidden>Case study</a>
      <button class="r3-exit" type="button" data-act="exit" hidden>Exit to select</button>
      <button class="r3-sound" type="button" data-act="sound" aria-pressed="false">Sound off</button>
      <button class="r3-full" type="button" data-act="fullscreen">Fullscreen</button>
    </div>
  </div>
  <p class="r3-keys">Keys: arrows or WASD to move · Enter or Space for A · Shift or X for B · Esc to exit</p>
</div>`;
}

// ── pages ───────────────────────────────────────────────────────────────────
export function homePage(posts) {
  const data = projects.map(p => ({
    slug: p.slug, name: p.name, short: p.short, class: p.class, status: p.status,
    game: p.game, portrait: p.portrait, components: p.components, repo: p.repo,
  }));
  const body = `
<section class="hero wrap" id="console" aria-labelledby="hero-title">
  <div class="hero-intro">
    <p class="kicker px">Player 1 · 13</p>
    <h1 id="hero-title">Urfan Zeynalov</h1>
    <p class="lede">EEE student at ADA University. I learn embedded systems and robotics by building the hardware myself.</p>
    <p class="lede-2">Every project here is a cartridge. Press start, pick one, and play it to see how it works.</p>
    <p class="hero-cta"><button class="btn btn-red" type="button" data-hero-start>Press start</button><a class="btn" href="${href('cv.pdf')}" download>Download CV</a></p>
  </div>
  ${consoleMarkup()}
  <script type="application/json" id="r3-data">${JSON.stringify({ base: BASE, projects: data })}</script>
</section>

<section class="sec wrap" id="about" aria-labelledby="about-h">
  <div class="sec-head"><p class="kicker px">01 · About</p><h2 id="about-h">Wire it, flash it, measure it.</h2></div>
  <div class="about-grid">
    <div class="about-copy reveal">
      <p>I'm Urfan, 13 online. I study Electrical and Electronic Engineering at ADA University in Azerbaijan, and in 2027 I join Politecnico di Torino on a dual degree.</p>
      <p>My focus is embedded systems and robotics, the place where code has to move something real. I taught myself the hardware side by building it: a part only makes sense to me once I've wired it up and watched it on a meter or a logic analyzer.</p>
      <p><a class="link-arrow" href="${href('about/')}">More about me</a></p>
    </div>
    <ol class="timeline reveal" aria-label="Education">
      <li><span class="px">Now</span><strong>ADA University</strong><span>EEE student · Azerbaijan</span></li>
      <li><span class="px">2027</span><strong>Politecnico di Torino</strong><span>Dual degree · Italy</span></li>
    </ol>
  </div>
</section>

<section class="sec wrap" id="projects" aria-labelledby="proj-h">
  <div class="sec-head"><p class="kicker px">02 · Cartridges</p><h2 id="proj-h">Projects</h2><p class="sec-sub">Two cleared, two in progress, two still locked.</p></div>
  <ul class="cards">${projects.map(projectCard).join('')}</ul>
</section>

<section class="sec wrap" id="skills" aria-labelledby="skills-h">
  <div class="sec-head"><p class="kicker px">03 · Inventory</p><h2 id="skills-h">Skills</h2></div>
  <div class="inventory">${inventory()}</div>
</section>

<section class="sec wrap" id="log" aria-labelledby="log-h">
  <div class="sec-head split"><div><p class="kicker px">04 · Build log</p><h2 id="log-h">Notes from the bench</h2></div><a class="link-arrow" href="${href('log/')}">All posts</a></div>
  ${logList(posts, 3)}
</section>

<section class="sec wrap" id="contact" aria-labelledby="contact-h">
  <div class="contact reveal">
    <div><p class="kicker px">05 · Contact</p><h2 id="contact-h">Player 2, press start.</h2>
    <p>Internships, projects, or a part you think I should break next. Send it over.</p></div>
    <ul class="contact-links">
      <li><a class="btn btn-red" href="${gmail()}" target="_blank" rel="noopener">Email me</a></li>
      <li><button class="btn" type="button" data-copy="${site.email}">Copy email</button></li>
      <li><a class="btn" href="${site.github}" rel="me noopener" target="_blank">GitHub</a></li>
      <li><a class="btn" href="${site.linkedin}" rel="me noopener" target="_blank">LinkedIn</a></li>
      <li><a class="btn" href="${href('cv.pdf')}" download>Download CV</a></li>
    </ul>
  </div>
</section>`;
  return page({
    title: site.title, description: site.description, path: '', body,
    scripts: ['/src/main.js', '/src/console/console.js'], bodyClass: 'home',
  });
}

export function aboutPage() {
  const body = `<article class="wrap prose-page">
  <p class="kicker px">About</p>
  <h1>Urfan Zeynalov</h1>
  <p class="lede">EEE student at ADA University, online as 13. Embedded systems and robotics, learned by building real hardware.</p>
  <div class="prose">
    <h2>Who I am</h2>
    <p>I study Electrical and Electronic Engineering at ADA University in Azerbaijan. In 2027 I join Politecnico di Torino on a dual degree.</p>
    <p>I'm self-taught on the hardware side. I learn a part by wiring it, flashing it and measuring it, then I write down what broke. Right now that means a robotic arm and bringing up a bare STM32 board.</p>
    <p>[PLACEHOLDER] A line or two about you outside the bench: what got you into electronics, or what you do when you are not building.</p>
    <h2>Education</h2>
    <ol class="timeline">
      <li><span class="px">Now</span><strong>ADA University</strong><span>Electrical and Electronic Engineering · Azerbaijan</span></li>
      <li><span class="px">2027</span><strong>Politecnico di Torino</strong><span>Dual degree · Italy</span></li>
    </ol>
    <h2>What I'm working toward</h2>
    <p>Embedded systems that move things: motors, joints and robots that balance themselves. The next skills on my list are KiCad, motor control, RTOS, ROS, sensor fusion and embedded Linux. The two locked cartridges on the console, a self-balancing bot and a BLDC driver PCB, are where those come together.</p>
    <p>[PLACEHOLDER] The kind of internship, lab or role you are looking for.</p>
    <p class="hero-cta"><a class="btn btn-red" href="${href('cv.pdf')}" download>Download CV</a><a class="btn" href="${href('')}#contact">Contact</a></p>
  </div>
</article>`;
  return page({ title: 'About · 13 SYSTEM', description: 'About Urfan Zeynalov (13): EEE student at ADA University, joining Politecnico di Torino on a dual degree in 2027.', path: 'about/', current: 'about/', body });
}

export function projectsIndexPage() {
  const body = `<section class="wrap sec page-top">
  <div class="sec-head"><p class="kicker px">Cartridges</p><h1>Projects</h1><p class="sec-sub">Each one has a case study and a playable mini-game on the console.</p></div>
  <ul class="cards">${projects.map(projectCard).join('')}</ul>
</section>`;
  return page({ title: 'Projects · 13 SYSTEM', description: 'Embedded and robotics projects by Urfan Zeynalov: robotic arm, STM32 bring-up, PWM motor control and a motor switch circuit.', path: 'projects/', current: 'projects/', body });
}

const ph = (label, ratio = '16 / 9') => `<figure class="ph" style="aspect-ratio:${ratio}"><figcaption>[PLACEHOLDER] ${label}</figcaption></figure>`;

export function caseStudyPage(p) {
  const idx = projects.indexOf(p);
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  const locked = p.status === 'locked';
  const loadout = p.components.length ? `<table class="loadout-table">
      <caption class="px">Loadout</caption>
      <thead><tr><th scope="col">Component</th><th scope="col">Qty</th></tr></thead>
      <tbody>${p.components.map(c => `<tr><td>${esc(c.name)}</td><td><span class="blocks" aria-hidden="true">${'<i></i>'.repeat(c.qty)}</span> ×${c.qty}</td></tr>`).join('')}</tbody>
    </table>` : '';
  const cs = p.caseStudy;
  const body = locked ? `<article class="wrap prose-page">
  <p class="kicker px">${esc(p.class)} · ${badge(p.status)}</p>
  <h1>${esc(p.name)}</h1>
  <div class="locked-panel"><p class="lk-q" aria-hidden="true">?</p><p class="px">Coming soon. Unlocks in Torino.</p><p>No details yet. This cartridge opens when the build starts.</p></div>
  <nav class="cs-nav" aria-label="More projects"><a href="${href(`projects/${prev.slug}/`)}">Previous: ${esc(prev.name)}</a><a href="${href('projects/')}">All projects</a><a href="${href(`projects/${next.slug}/`)}">Next: ${esc(next.name)}</a></nav>
</article>` : `<article class="wrap cs">
  <header class="cs-head">
    <div class="cs-art">${portraitImg(p, 'portrait portrait-xl', 64)}</div>
    <div>
      <p class="kicker px">${esc(p.class)} · ${badge(p.status)}</p>
      <h1>${esc(p.name)}</h1>
      <p class="lede">${esc(p.blurb)}</p>
      <p class="hero-cta"><a class="btn btn-red" href="${href(`?play=${p.slug}`)}#console">Play the cartridge</a>${p.repo ? `<a class="btn" href="${p.repo}" target="_blank" rel="noopener">View repo</a>` : ''}</p>
    </div>
  </header>
  <div class="cs-grid">
    <aside class="cs-side">${loadout}</aside>
    <div class="prose">
      <h2>The problem</h2><p>${esc(cs.problem)}</p>
      <h2>The approach</h2><p>${esc(cs.approach)}</p>
      <h2>Schematic</h2>${ph('Schematic image: add it to public/assets/projects/' + p.slug + '/ and replace this block.', '4 / 3')}
      <h2>Code</h2>
      <pre class="code"><code>// [PLACEHOLDER] Paste the key snippet for ${esc(p.name)} here,
// or link the file in the repo.</code></pre>
      <h2>Photos and video</h2>
      <div class="ph-grid">${ph('Photo of the build')}${ph('Photo or GIF of it running')}</div>
      ${ph('Video: embed a YouTube or MP4 clip here')}
      <h2>Next steps</h2><p>${esc(cs.next)}</p>
    </div>
  </div>
  <nav class="cs-nav" aria-label="More projects"><a href="${href(`projects/${prev.slug}/`)}">Previous: ${esc(prev.name)}</a><a href="${href('projects/')}">All projects</a><a href="${href(`projects/${next.slug}/`)}">Next: ${esc(next.name)}</a></nav>
</article>`;
  return page({ title: `${p.name} · 13 SYSTEM`, description: `${p.name}: ${p.blurb}`, path: `projects/${p.slug}/`, current: 'projects/', body });
}

export function logIndexPage(posts) {
  const body = `<section class="wrap sec page-top">
  <div class="sec-head"><p class="kicker px">Build log</p><h1>Notes from the bench</h1><p class="sec-sub">Short dated posts on what I built, what broke and what I measured.</p></div>
  ${logList(posts)}
</section>`;
  return page({ title: 'Build log · 13 SYSTEM', description: 'Build log by Urfan Zeynalov: short notes on embedded and robotics builds.', path: 'log/', current: 'log/', body });
}

export function logPostPage(post) {
  const body = `<article class="wrap prose-page">
  <p class="kicker px"><a href="${href('log/')}">Build log</a> · <time datetime="${post.date}">${post.date}</time></p>
  <h1>${esc(post.title)}</h1>
  <div class="prose">${post.html}</div>
  <p class="cs-nav"><a href="${href('log/')}">All posts</a></p>
</article>`;
  return page({ title: `${post.title} · 13 SYSTEM`, description: post.summary || post.title, path: `log/${post.slug}/`, current: 'log/', body });
}

export function notFoundPage() {
  const body = `<section class="wrap nodisc">
  <div class="nodisc-screen" role="img" aria-label="Console screen reading NO DISC">
    <p class="nd-big">NO DISC</p>
    <p class="nd-sub">ERROR 404 · CARTRIDGE NOT FOUND</p>
    <p class="nd-blink" aria-hidden="true">▮</p>
  </div>
  <h1 class="sr">Page not found</h1>
  <p class="lede">This page isn't in the console. Blow on the cartridge and try again, or head back.</p>
  <p class="hero-cta"><a class="btn btn-red" href="${href('')}#console">Back to the console</a><a class="btn" href="${href('projects/')}">All projects</a></p>
</section>`;
  return page({ title: 'No disc · 13 SYSTEM', description: 'Page not found.', path: '404.html', body, bodyClass: 'is-404' });
}
