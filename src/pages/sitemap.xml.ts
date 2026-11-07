import type { APIRoute } from 'astro';
import { absoluteUrl, settings } from '../lib/site';
import { getLinks } from '../lib/links';

/*
 * XML sitemap with indexable pages only. Redirect, locker and timer pages are
 * `noindex` and deliberately left out; so are /admin/ and the 404 page.
 */
export const GET: APIRoute = async () => {
  const links = await getLinks();
  const lastmod = links.reduce<Date | undefined>((latest, link) => (!latest || link.updatedAt > latest ? link.updatedAt : latest), undefined);

  const pages: { loc: string; lastmod?: Date }[] = [];
  if (settings.indexHomepage) pages.push({ loc: absoluteUrl('/'), lastmod });

  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(
      (page) =>
        `  <url><loc>${escape(page.loc)}</loc>${page.lastmod ? `<lastmod>${page.lastmod.toISOString()}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
