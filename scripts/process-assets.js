// One-off asset pipeline: turns source images in /review into web assets in /public/assets,
// and draws the share (Open Graph) image in code. Run with `npm run assets`.
// review/ is git-ignored, so source files never ship.
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';

const OUT = 'public/assets';
mkdirSync(`${OUT}/portraits`, { recursive: true });

// Palette lock: every portrait pixel snaps to one of these. No yellow, no orange.
const PALETTE = ['#141214', '#2A2326', '#5A5250', '#ECE6DC', '#E0505F', '#B32A3C', '#6B1E2A']
  .map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));

function nearest([r, g, b]) {
  let best = PALETTE[0], bd = Infinity;
  for (const p of PALETTE) {
    const d = 2 * (r - p[0]) ** 2 + 4 * (g - p[1]) ** 2 + 3 * (b - p[2]) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

async function portrait(name, size = 64) {
  const src = `review/${name}.png`;
  if (!existsSync(src)) return console.warn('skip', src);
  const { data, info } = await sharp(src)
    .extract({ left: 96, top: 96, width: 1856, height: 1856 })
    .resize(size, size, { kernel: 'lanczos3' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const neutralMid = mx - mn < 28 && mx > 40 && mx < 175; // flat grey backdrops -> transparent
    if (neutralMid || mx < 56) { out[j + 3] = 0; continue; }
    const [pr, pg, pb] = nearest([r, g, b]);
    out[j] = pr; out[j + 1] = pg; out[j + 2] = pb; out[j + 3] = 255;
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ palette: true, compressionLevel: 9 }).toFile(`${OUT}/portraits/${name}.png`);
  console.log('portrait', name);
}

// Share image (1200×630): a CRT screen with the 13 SYSTEM title, drawn as SVG.
async function ogImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><pattern id="d" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1.4" fill="#CFC7BB"/></pattern>
  <pattern id="s" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".25"/></pattern></defs>
  <rect width="1200" height="630" fill="#F2EEE7"/><rect width="1200" height="630" fill="url(#d)"/>
  <rect x="90" y="60" width="1020" height="510" rx="36" fill="#E4DDD1" stroke="#1C1A1B" stroke-width="4"/>
  <rect x="140" y="100" width="920" height="400" rx="20" fill="#2A2628"/>
  <rect x="170" y="125" width="860" height="350" rx="10" fill="#141214"/>
  <text x="600" y="290" text-anchor="middle" font-family="Consolas, monospace" font-weight="700" font-size="150" fill="#B32A3C">13</text>
  <text x="594" y="284" text-anchor="middle" font-family="Consolas, monospace" font-weight="700" font-size="150" fill="#ECE6DC">13</text>
  <text x="600" y="350" text-anchor="middle" font-family="Consolas, monospace" font-size="40" letter-spacing="22" fill="#E0505F">SYSTEM</text>
  <text x="600" y="430" text-anchor="middle" font-family="Consolas, monospace" font-size="26" fill="#A79F97">URFAN ZEYNALOV · EMBEDDED + ROBOTICS</text>
  <rect x="170" y="125" width="860" height="350" rx="10" fill="url(#s)"/>
  <circle cx="155" cy="300" r="6" fill="#E0505F"/>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}/og-image.jpg`);
  console.log('og image');
}

for (const n of ['arm', 'stm32', 'pwm', 'flyback']) await portrait(n);
await ogImage();
