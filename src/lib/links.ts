import { getCollection, type CollectionEntry } from 'astro:content';
import { absoluteUrl, linkPath, settings, type AdPlacement } from './site';
import { checkAdCode, displayHost, safeHttpUrl, slugify, slugProblem } from './validate';

export type LinkEntry = CollectionEntry<'links'>;
export type RedirectType = 'direct' | 'locker' | 'timer';

/** Category used when a link has none. */
export const OTHER_CATEGORY = 'Others';

/** Sort categories alphabetically, with "Others" always last. */
export const sortCategories = (list: string[]) =>
  [...new Set(list)].sort((a, b) => (a === OTHER_CATEGORY ? 1 : b === OTHER_CATEGORY ? -1 : a.localeCompare(b)));

export const REDIRECT_LABELS: Record<RedirectType, string> = {
  direct: 'Direct Redirect',
  locker: 'URL Locker',
  timer: 'Timed Redirect',
};

export interface ResolvedAds {
  show: boolean;
  placement: AdPlacement;
  code: string;
  label: string;
}

export interface ResolvedLink {
  id: string;
  slug: string;
  /** "custom" when the editor typed a slug, "auto" when it came from the file name. */
  slugSource: 'custom' | 'auto';
  title: string;
  destination: string;
  destinationHost: string;
  /** What the editor selected. */
  redirectType: RedirectType;
  /** What actually runs (a disabled locker behaves like a direct redirect). */
  effectiveType: RedirectType;
  shortDescription: string;
  description: string;
  seoTitle: string;
  image?: string;
  imageAlt: string;
  /** Always set: the editor's category, or "Others". */
  category: string;
  /** True when the editor left the category empty (or chose "Others"). */
  uncategorised: boolean;
  tags: string[];
  published: boolean;
  showOnHomepage: boolean;
  createdAt: Date;
  updatedAt: Date;
  path: string;
  shortUrl: string;
  canonical: string;
  ads: ResolvedAds;
  data: LinkEntry['data'];
}

/** Slug used for the URL: the custom slug, or the automatic one (the entry's file name). */
export function entrySlug(entry: LinkEntry): { slug: string; source: 'custom' | 'auto' } {
  if (entry.data.slug) return { slug: entry.data.slug, source: 'custom' };
  const fromFile = slugify(entry.id.split('/').pop() ?? '');
  return { slug: fromFile || slugify(entry.data.title), source: 'auto' };
}

function resolveAds(entry: LinkEntry, effectiveType: RedirectType): ResolvedAds {
  const global = settings.ads;
  const typeAllowed =
    effectiveType === 'direct' ? global.showOnDirect : effectiveType === 'locker' ? global.showOnLocker : global.showOnTimer;
  const { mode, placement, code } = entry.data.ads;
  const adCode = (code ?? '').trim() || global.defaultCode.trim();
  // Master switch first; then the per-link override; then the per-redirect-type default.
  const wanted = global.enabled && (mode === 'on' || (mode === 'inherit' && typeAllowed));
  return {
    show: wanted && adCode !== '',
    placement: placement === 'inherit' ? global.defaultPlacement : placement,
    code: adCode,
    label: global.label,
  };
}

export function resolveLink(entry: LinkEntry): ResolvedLink {
  const data = entry.data;
  const { slug, source } = entrySlug(entry);
  const destination = safeHttpUrl(data.destination);
  // The schema already rejects unsafe URLs; this is a second, independent check.
  if (!destination) throw new Error(`Link "${entry.id}": unsafe destination URL.`);

  const effectiveType: RedirectType = data.redirectType === 'locker' && !data.locker.enabled ? 'direct' : data.redirectType;
  const path = linkPath(slug);
  const shortDescription = data.shortDescription ?? '';
  const ads = resolveAds(entry, effectiveType);
  // Empty, "others", "Other" … all mean the single "Others" category.
  const uncategorised = !data.category || /^others?$/i.test(data.category.trim());
  if (ads.show) {
    const report = checkAdCode(ads.code, settings.ads.allowedHosts);
    if (!report.ok) throw new Error(`Link "${entry.id}": ad code rejected:\n  - ${report.problems.join('\n  - ')}`);
  }

  return {
    id: entry.id,
    slug,
    slugSource: source,
    title: data.title,
    destination,
    destinationHost: displayHost(destination),
    redirectType: data.redirectType,
    effectiveType,
    shortDescription,
    description: data.metaDescription || shortDescription || `${data.title} — a short link on ${settings.siteName}.`,
    seoTitle: data.seoTitle || data.title,
    image: data.image,
    imageAlt: data.imageAlt || data.title,
    category: uncategorised ? OTHER_CATEGORY : data.category!,
    uncategorised,
    tags: data.tags,
    published: data.published,
    showOnHomepage: data.showOnHomepage,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt ?? data.createdAt,
    path,
    shortUrl: absoluteUrl(path),
    canonical: data.canonical ? (safeHttpUrl(data.canonical, { httpsOnly: true }) ?? absoluteUrl(path)) : absoluteUrl(path),
    ads,
    data,
  };
}

/**
 * All links, newest first. Fails the build when two entries resolve to the same slug
 * (e.g. a custom slug that matches another link's automatic slug).
 */
export async function getLinks({ includeDrafts = false } = {}): Promise<ResolvedLink[]> {
  const entries = await getCollection('links');
  const resolved = entries.map(resolveLink);

  const seen = new Map<string, string>();
  const problems: string[] = [];
  for (const link of resolved) {
    const problem = slugProblem(link.slug);
    if (problem) problems.push(`${link.id}: ${problem}`);
    const other = seen.get(link.slug);
    if (other) problems.push(`Duplicate slug "${link.slug}" used by "${other}" and "${link.id}". Slugs must be unique.`);
    else seen.set(link.slug, link.id);
  }
  if (problems.length) throw new Error(`Invalid links:\n  - ${problems.join('\n  - ')}`);

  return resolved
    .filter((link) => includeDrafts || link.published)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.title.localeCompare(b.title));
}
