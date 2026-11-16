// Writes every HTML page from src/pages/templates.js + src/data + content/log/*.md.
// Runs automatically before `npm run dev` and `npm run build`.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { marked } from 'marked';
import { projects } from '../src/data/projects.js';
import * as T from '../src/pages/templates.js';

function write(path, html) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

// ── build log: content/log/*.md with a tiny front-matter block ──
function parsePost(file) {
  const raw = readFileSync(`content/log/${file}`, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  const slug = meta.slug || file.replace(/\.md$/, '');
  return { slug, title: meta.title || slug, date: String(meta.date || ''), summary: meta.summary || '', html: marked.parse(m ? m[2] : raw) };
}
const posts = existsSync('content/log')
  ? readdirSync('content/log').filter(f => f.endsWith('.md')).map(parsePost).sort((a, b) => b.date.localeCompare(a.date))
  : [];

// clean generated folders so deleted projects/posts don't linger
for (const d of ['projects', 'log', 'about']) rmSync(d, { recursive: true, force: true });

write('index.html', T.homePage(posts));
write('about/index.html', T.aboutPage());
write('projects/index.html', T.projectsIndexPage());
for (const p of projects) write(`projects/${p.slug}/index.html`, T.caseStudyPage(p));
write('log/index.html', T.logIndexPage(posts));
for (const post of posts) write(`log/${post.slug}/index.html`, T.logPostPage(post));
write('404.html', T.notFoundPage());

console.log(`pages: home, about, 404, ${projects.length} projects, ${posts.length} log posts`);
