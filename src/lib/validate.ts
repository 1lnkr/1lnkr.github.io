/*
 * Pure validation helpers shared by the content schema, the pages and the unit tests.
 * Nothing in here imports from Astro, so `node --test` can run it directly.
 */

/** Lowercase letters, digits and single hyphens: "my-first-link". */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 80;

/**
 * Names that can never be used as slugs because they collide with real routes, folders
 * or files of the site (or could do so in the future if the link prefix is removed).
 */
export const RESERVED_SLUGS: readonly string[] = [
  'admin',
  'api',
  'assets',
  '_astro',
  'images',
  'links',
  'link',
  'go',
  'sitemap',
  'sitemap-xml',
  'robots',
  'robots-txt',
  'favicon',
  'favicon-ico',
  'favicon-svg',
  '404',
  '500',
  'index',
  'oauth',
  'callback',
  'auth',
  'config',
  'static',
  'public',
];

export function isReservedSlug(slug: string, extra: readonly string[] = []): boolean {
  const value = slug.trim().toLowerCase();
  return RESERVED_SLUGS.includes(value) || extra.map((s) => s.toLowerCase()).includes(value);
}

/** "Download Guide (2026)!" → "download-guide-2026" */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}

/** Returns an error message, or null when the slug is usable. */
export function slugProblem(slug: string, extraReserved: readonly string[] = []): string | null {
  if (!slug) return 'The slug is empty.';
  if (slug.length > SLUG_MAX_LENGTH) return `The slug is longer than ${SLUG_MAX_LENGTH} characters.`;
  if (!SLUG_PATTERN.test(slug)) return `"${slug}" is not a valid slug — use lowercase letters, numbers and single hyphens only.`;
  if (isReservedSlug(slug, extraReserved)) return `"${slug}" is a reserved name and cannot be used as a slug.`;
  return null;
}

/**
 * Parse a destination / canonical URL and accept it only when it is an absolute
 * http(s) URL without embedded credentials. Returns the normalised href or null.
 *
 * Rejects javascript:, data:, file:, vbscript:, blob:, protocol-relative "//host",
 * relative paths, whitespace/control-character tricks and "user:pass@host" URLs.
 */
export function safeHttpUrl(input: unknown, { httpsOnly = false } = {}): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  // Control characters and whitespace inside a URL are a classic filter-bypass trick.
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return null;
  // Must literally start with the scheme — no "//evil.com", no "  javascript:".
  if (!/^https?:\/\//i.test(raw)) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && (httpsOnly || parsed.protocol !== 'http:')) return null;
  if (!parsed.hostname) return null;
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

/** Site-relative image path ("/images/uploads/x.png") or an https URL. */
export function safeImagePath(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (/^https:\/\//i.test(value)) return safeHttpUrl(value, { httpsOnly: true });
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('..') || /[\s"'<>\\]/.test(value)) return null;
  if (!/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(value)) return null;
  return value;
}

/** Hostname for display ("www.example.com" → "example.com"). */
export function displayHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ Ad code checks */

export interface AdCodeReport {
  ok: boolean;
  problems: string[];
  scriptHosts: string[];
}

function hostAllowed(host: string, allowed: readonly string[]): boolean {
  const h = host.toLowerCase();
  return allowed.some((entry) => {
    const a = entry.trim().toLowerCase().replace(/^\*\./, '');
    return a !== '' && (h === a || h.endsWith(`.${a}`));
  });
}

/**
 * Guard-rail lint for administrator-supplied ad embed code. The code itself is rendered
 * verbatim (we never rewrite third-party ad tags), but the build refuses code that:
 *  - loads scripts or iframes from hosts that are not on the allow-list,
 *  - hides an ad (display:none, visibility:hidden, zero-size, off-screen, opacity:0),
 *  - simulates clicks or opens windows programmatically,
 *  - redirects the page.
 * This is a safety net against mistakes and pasted junk, not a sandbox.
 */
export function checkAdCode(code: string, allowedHosts: readonly string[]): AdCodeReport {
  const problems: string[] = [];
  const scriptHosts: string[] = [];
  if (!code.trim()) return { ok: true, problems, scriptHosts };

  const srcPattern = /<(script|iframe)\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of code.matchAll(srcPattern)) {
    const tag = match[1].toLowerCase();
    const src = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    const absolute = src.startsWith('//') ? `https:${src}` : src;
    const href = safeHttpUrl(absolute);
    if (!href) {
      problems.push(`<${tag}> src "${src}" is not an absolute http(s) URL.`);
      continue;
    }
    const host = new URL(href).hostname;
    scriptHosts.push(host);
    if (!hostAllowed(host, allowedHosts)) {
      problems.push(`<${tag}> loads from "${host}", which is not in the ad host allow-list (Site settings → Ads → Allowed ad hosts).`);
    }
  }

  const hiddenPatterns: [RegExp, string][] = [
    [/display\s*:\s*none/i, 'uses display:none'],
    [/visibility\s*:\s*hidden/i, 'uses visibility:hidden'],
    [/opacity\s*:\s*0(?:\.0+)?\s*(?:;|"|'|$)/im, 'uses opacity:0'],
    [/\b(?:width|height)\s*=\s*["']?0+(?:px)?["'\s>]/i, 'has a zero width/height'],
    [/\b(?:width|height)\s*:\s*0+(?:px)?\s*(?:;|"|'|$)/im, 'has a zero width/height'],
    [/left\s*:\s*-\d{3,}/i, 'positions content off-screen'],
    [/<[a-z][^>]*\shidden(?=[\s>=/])/i, 'uses the hidden attribute'],
  ];
  for (const [pattern, message] of hiddenPatterns) {
    if (pattern.test(code)) problems.push(`Ad code ${message}. Ads must be visible where they are placed.`);
  }

  const behaviourPatterns: [RegExp, string][] = [
    [/\.click\s*\(/i, 'calls .click() — ads must never be clicked programmatically'],
    [/dispatchEvent\s*\(/i, 'dispatches synthetic events'],
    [/new\s+MouseEvent\b/i, 'creates synthetic mouse events'],
    [/window\.open\s*\(/i, 'opens windows programmatically'],
    [/(?:window\.|document\.|top\.|\b)location(?:\.href)?\s*=(?!=)/i, 'changes the page location'],
    [/location\.(?:assign|replace)\s*\(/i, 'changes the page location'],
  ];
  for (const [pattern, message] of behaviourPatterns) {
    if (pattern.test(code)) problems.push(`Ad code ${message}.`);
  }

  return { ok: problems.length === 0, problems: [...new Set(problems)], scriptHosts };
}

/** Escape a value for safe embedding inside an inline <script> JSON literal. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}
