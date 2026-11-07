import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/site';

/*
 * Generated so the Sitemap line always matches the deployed base path.
 * The site is not blocked; redirect/interstitial pages opt out with `noindex` instead
 * (crawlers must be able to fetch a page to see its noindex tag).
 *
 * Note: for a GitHub Pages *project* site (user.github.io/repo/) crawlers only read
 * robots.txt at the domain root, so this file is informational there; the per-page
 * robots meta tags and the sitemap do the real work. It is authoritative on a custom
 * domain or a user site.
 */
export const GET: APIRoute = () => {
  const body = ['User-agent: *', 'Allow: /', `Disallow: ${new URL(absoluteUrl('/admin/')).pathname}`, '', `Sitemap: ${absoluteUrl('/sitemap.xml')}`, ''].join(
    '\n',
  );
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
