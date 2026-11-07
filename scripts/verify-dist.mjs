// Post-build checks on dist/: every published link has a page with the right robots tag,
// the sitemap lists only indexable pages, internal links/assets resolve, and no draft leaks.
// Run after `npm run build`:  node scripts/verify-dist.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = 'dist';
const errors = [];
const fail = (msg) => errors.push(msg);

if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// Base path: taken from the favicon link on the homepage.
const home = readFileSync(join(dist, 'index.html'), 'utf8');
const base = (home.match(/href="([^"]*)\/favicon\.svg"/) ?? [])[1] ?? '';

// 1. Link pages: noindex + canonical + og:image, destination is http(s).
const linkPages = htmlFiles.filter((f) => /[\\/]links[\\/][^\\/]+[\\/]index\.html$/.test(f));
if (linkPages.length === 0) fail('No link pages were generated.');
for (const file of linkPages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(dist, file);
  if (!/<meta name="robots" content="noindex, follow">/.test(html)) fail(`${rel}: missing noindex, follow`);
  if ((html.match(/<link rel="canonical"/g) ?? []).length !== 1) fail(`${rel}: expected exactly one canonical link`);
  if ((html.match(/<title>/g) ?? []).length !== 1) fail(`${rel}: expected exactly one <title>`);
  if (!/<meta property="og:image" content="https:\/\//.test(html)) fail(`${rel}: missing absolute og:image`);
  for (const m of html.matchAll(/data-href="([^"]*)"|location\.replace\("([^"]*)"\)/g)) {
    const href = m[1] ?? m[2];
    if (!/^https?:\/\//.test(href)) fail(`${rel}: non-http destination ${href}`);
  }
}

// 2. Sitemap contains no link/admin pages.
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
for (const loc of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  if (/\/links\/|\/admin\//.test(loc[1])) fail(`sitemap.xml lists a non-indexable page: ${loc[1]}`);
}
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
if (!/^Sitemap: https:\/\/.+\/sitemap\.xml$/m.test(robots)) fail('robots.txt has no absolute Sitemap line');
if (/^Disallow: \/\s*$/m.test(robots)) fail('robots.txt blocks the whole site');

// 3b. Links with "Show on homepage" off are built but not listed on the homepage.
for (const name of readdirSync('src/content/links').filter((n) => n.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(join('src/content/links', name), 'utf8'));
  if (data.published !== false && data.showOnHomepage === false) {
    const slug = data.slug || name.replace(/\.json$/, '');
    if (!existsSync(join(dist, 'links', slug, 'index.html'))) fail(`Hidden link "${name}" was not built`);
    if (home.includes(`/links/${slug}/`) || home.includes(String(data.destination))) fail(`Hidden link "${name}" is listed on the homepage`);
  }
}

// 3. Drafts are never built.
const contentDir = 'src/content/links';
for (const name of readdirSync(contentDir).filter((n) => n.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
  if (data.published === false) {
    const slug = data.slug || name.replace(/\.json$/, '');
    if (existsSync(join(dist, 'links', slug))) fail(`Draft "${name}" was built`);
    for (const f of htmlFiles) {
      if (readFileSync(f, 'utf8').includes(data.destination) && !String(data.destination).match(/^https:\/\/example\.com\/?$/)) {
        fail(`Draft destination leaked into ${relative(dist, f)}`);
      }
    }
  }
}

// 4. Internal href/src targets exist in dist/.
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const path = m[1];
    if (path.startsWith('//')) continue; // protocol-relative = external
    if (base && !path.startsWith(`${base}/`)) {
      fail(`${relative(dist, file)}: internal URL without base path: ${path}`);
      continue;
    }
    const local = join(dist, decodeURIComponent(path.slice(base.length)));
    const ok = path.endsWith('/') ? existsSync(join(local, 'index.html')) : existsSync(local);
    if (!ok) fail(`${relative(dist, file)}: broken internal link ${path}`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ dist OK — ${linkPages.length} link page(s), ${htmlFiles.length} HTML file(s), base "${base || '/'}"`);
