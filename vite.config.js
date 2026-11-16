import { defineConfig } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// BASE is set by the GitHub Actions workflow from the repo name:
//   "<user>.github.io" repo -> "/", any other repo -> "/<repo>/".
// Locally it defaults to "/".
const base = process.env.BASE || '/';

// Every HTML page written by scripts/gen-pages.js becomes a Vite entry.
const ROOT = resolve('.');
const SKIP = new Set(['node_modules', 'dist', 'public', 'src', 'scripts', 'content', 'review']);
function htmlFiles(dir, out = {}) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) {
      const key = p.slice(ROOT.length + 1).replace(/\\/g, '/').replace(/\.html$/, '').replace(/\//g, '_');
      out[key || 'index'] = p;
    }
  }
  return out;
}

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 2048,
    rollupOptions: { input: htmlFiles(ROOT) },
  },
});
