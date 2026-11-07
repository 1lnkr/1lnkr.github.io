import settingsJson from '../data/settings.json';
import { checkAdCode, safeImagePath, SLUG_PATTERN } from './validate';

/*
 * Site-wide settings and base-path-aware URL helpers.
 * Always build internal links with `url()` — never hard-code the repository base path.
 */

export type AdPlacement = 'top' | 'middle' | 'bottom';

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  ownerName: string;
  defaultSocialImage: string;
  defaultSocialImageAlt: string;
  twitterHandle: string;
  indexHomepage: boolean;
  ads: {
    enabled: boolean;
    showOnDirect: boolean;
    showOnLocker: boolean;
    showOnTimer: boolean;
    label: string;
    defaultPlacement: AdPlacement;
    defaultCode: string;
    allowedHosts: string[];
  };
}

function loadSettings(raw: typeof settingsJson): SiteSettings {
  const ads = raw.ads ?? ({} as SiteSettings['ads']);
  const placement = ['top', 'middle', 'bottom'].includes(ads.defaultPlacement) ? (ads.defaultPlacement as AdPlacement) : 'bottom';
  const settings: SiteSettings = {
    siteName: raw.siteName?.trim() || 'Links',
    siteDescription: raw.siteDescription?.trim() || '',
    ownerName: raw.ownerName?.trim() || '',
    defaultSocialImage: raw.defaultSocialImage?.trim() || '',
    defaultSocialImageAlt: raw.defaultSocialImageAlt?.trim() || '',
    twitterHandle: (raw.twitterHandle ?? '').trim().replace(/^@?/, raw.twitterHandle?.trim() ? '@' : ''),
    indexHomepage: raw.indexHomepage !== false,
    ads: {
      enabled: ads.enabled === true,
      showOnDirect: ads.showOnDirect === true,
      showOnLocker: ads.showOnLocker !== false,
      showOnTimer: ads.showOnTimer !== false,
      label: ads.label?.trim() || 'Advertisement',
      defaultPlacement: placement,
      defaultCode: ads.defaultCode ?? '',
      allowedHosts: Array.isArray(ads.allowedHosts) ? ads.allowedHosts.filter((h) => typeof h === 'string' && h.trim()) : [],
    },
  };

  // Settings are edited in the CMS too, so validate them like link entries.
  if (settings.defaultSocialImage && !safeImagePath(settings.defaultSocialImage)) {
    throw new Error(`src/data/settings.json: defaultSocialImage "${settings.defaultSocialImage}" is not a valid image path.`);
  }
  const adReport = checkAdCode(settings.ads.defaultCode, settings.ads.allowedHosts);
  if (!adReport.ok) {
    throw new Error(`src/data/settings.json: default ad code rejected:\n  - ${adReport.problems.join('\n  - ')}`);
  }
  return settings;
}

export const settings = loadSettings(settingsJson);

/**
 * Short links live at the site root by default: https://lnkrs.github.io/my-link/.
 * Set PUBLIC_LINK_PREFIX (e.g. "go") to put them in a folder instead: /go/my-link/.
 */
export const LINK_PREFIX = (import.meta.env.PUBLIC_LINK_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '');
if (LINK_PREFIX && !SLUG_PATTERN.test(LINK_PREFIX)) {
  throw new Error(`PUBLIC_LINK_PREFIX "${LINK_PREFIX}" must use lowercase letters, numbers and single hyphens only.`);
}

const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Prefix a site-relative path with the deployment base path. */
export function url(path = '/'): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.startsWith('#')) return path;
  const normalised = path.startsWith('/') ? path : `/${path}`;
  if (base && (normalised === base || normalised.startsWith(`${base}/`))) return normalised;
  return `${base}${normalised}`;
}

/** Absolute URL for canonical tags, Open Graph, the sitemap and copy buttons. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(url(path), import.meta.env.SITE).href;
}

/** Site-relative path of a short link. */
export const linkPath = (slug: string) => (LINK_PREFIX ? `/${LINK_PREFIX}/${slug}/` : `/${slug}/`);

/** Image path from content ("/images/uploads/x.png" or https URL) → usable src. */
export const imageSrc = (path: string | undefined) => (path ? url(path) : '');

/** Deep link into Decap CMS for a given entry file. */
export const cmsEditUrl = (entryId: string) => url(`/admin/#/collections/links/entries/${encodeURIComponent(entryId)}`);
