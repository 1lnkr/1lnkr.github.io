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

// Expected URL of every link, worked out from the content files the same way the site does.
const prefix = (process.env.PUBLIC_LINK_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '');
const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const contentDir = 'src/content/links';
const entries = readdirSync(contentDir)
  .filter((n) => n.endsWith('.json'))
  .map((name) => {
    const data = JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
    const id = name.replace(/\.json$/, '');
    const slug = (data.slug || '').trim().toLowerCase() || slugify(id);
    const dir = prefix ? join(dist, prefix, slug) : join(dist, slug);
    return { name, id, data, slug, dir, path: `${base}/${prefix ? `${prefix}/` : ''}${slug}/` };
  });
const published = entries.filter((e) => e.data.published !== false);

// 1. Link pages exist and are noindex with one title/canonical, an absolute og:image and http(s) destinations.
if (published.length === 0) fail('No published links in src/content/links.');
const redirectPages = [];
for (const entry of published) {
  const file = join(entry.dir, 'index.html');
  if (!existsSync(file)) {
    fail(`${entry.name}: page not built at ${entry.path}`);
    continue;
  }
  redirectPages.push(file);
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

  // CMS "View Live" helper page: noindex and points at the short link, not the destination.
  const live = join(dist, 'admin', 'live', entry.id, 'index.html');
  if (!existsSync(live)) fail(`${entry.name}: CMS live-link page missing (admin/live/${entry.id}/)`);
  else {
    const liveHtml = readFileSync(live, 'utf8');
    if (!/noindex/.test(liveHtml)) fail(`admin/live/${entry.id}/: missing noindex`);
    if (!liveHtml.includes(entry.path)) fail(`admin/live/${entry.id}/: does not point to ${entry.path}`);
    if (liveHtml.includes(String(entry.data.destination))) fail(`admin/live/${entry.id}/: exposes the destination`);
  }
}

// 2. Sitemap lists no link, helper or admin pages.
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const siteOrigin = (sitemap.match(/<loc>(https?:\/\/[^/<]+)/) ?? [])[1] ?? '';
for (const loc of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = loc[1].slice(siteOrigin.length);
  if (/\/admin\/|\/links\//.test(path) || entries.some((e) => e.path === path)) fail(`sitemap.xml lists a non-indexable page: ${loc[1]}`);
}
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
if (!/^Sitemap: https:\/\/.+\/sitemap\.xml$/m.test(robots)) fail('robots.txt has no absolute Sitemap line');
if (/^Disallow: \/\s*$/m.test(robots)) fail('robots.txt blocks the whole site');

// 3. Links with "Show on homepage" off are built but not listed on the homepage.
for (const entry of published.filter((e) => e.data.showOnHomepage === false)) {
  if (home.includes(`href="${entry.path}"`) || home.includes(String(entry.data.destination))) {
    fail(`Hidden link "${entry.name}" is listed on the homepage`);
  }
}

// 3b. Drafts are never built and their destinations never leak.
for (const entry of entries.filter((e) => e.data.published === false)) {
  if (existsSync(entry.dir)) fail(`Draft "${entry.name}" was built`);
  if (existsSync(join(dist, 'admin', 'live', entry.id))) fail(`Draft "${entry.name}" has a live-link page`);
  if (/^https:\/\/example\.com\/?$/.test(String(entry.data.destination))) continue;
  for (const f of htmlFiles) {
    if (readFileSync(f, 'utf8').includes(entry.data.destination)) fail(`Draft destination leaked into ${relative(dist, f)}`);
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
console.log(`✓ dist OK — ${redirectPages.length} link page(s), ${htmlFiles.length} HTML file(s), base "${base || '/'}"`);
