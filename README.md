# Astro URL Shortener

**Lnkrs**: a **personal** static URL shortener and link manager built with Astro, Decap CMS and GitHub Pages.
Only the repository owner can create or edit links (through Decap CMS, using GitHub login).
Every published link becomes a static page such as:

```
https://lnkrs.github.io/links/my-link/
```

Each link uses one of three redirect types:

| Type | What the visitor sees |
| --- | --- |
| **Direct Redirect** | Nothing. They are sent to the destination at once. |
| **URL Locker** | The featured image, title and description, then a few steps you define (tick a box, read a short text, wait a few seconds). A progress bar tracks them. **Continue** unlocks when the steps are done, and the visitor clicks it to go on. |
| **Timed Redirect** | The featured image, title and description, then a countdown. **Continue** unlocks at zero. It redirects by itself only if you turn on automatic continuation. |

Ads (for example Adsterra banners) can appear in labelled slots on locker and timer pages.
**Ads are never part of unlocking a link:** visitors never have to click, view or wait for an ad.

## Features

- Astro 7 static output, TypeScript, no UI framework, under 3 KB of page JavaScript per interstitial
- Decap CMS at `/admin/` with a **Links** collection and **Site settings**
- Custom slugs, or automatic slugs generated from the title
- Strict build-time validation: only `http://`/`https://` destinations, no reserved or duplicate slugs, and checked canonicals, images and ad code
- Per-link SEO title, meta description and canonical override, plus Open Graph and Twitter/X cards with the featured image (or a default social image)
- Redirect and interstitial pages are `noindex, follow` and left out of the sitemap
- Dashboard homepage with link counts, search and filters, plus Open, Copy, Destination and Edit-in-CMS actions
- Light and dark themes, responsive, accessible (keyboard, screen-reader labels, reduced motion)
- GitHub Actions workflow: unit tests → type check → build → output checks → deploy

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:4321/.

To edit content locally without logging in, run the CMS proxy in a second terminal and open `/admin/`:

```bash
npm run cms
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run check` | TypeScript and Astro diagnostics |
| `npm test` | Unit tests (URL, slug and ad-code validation) |
| `npm run verify` | check + test + build + output checks on `dist/` |
| `npm run cms` | Local Decap backend (edit files without GitHub login) |
| `npm run generate:images` | Regenerate the default social image and demo images |

## Documentation

| Guide | |
| --- | --- |
| [docs/deployment.md](docs/deployment.md) | Deploying to lnkrs.github.io: repository settings, environment variables |
| [docs/cms-setup.md](docs/cms-setup.md) | Decap CMS and GitHub login through the Vercel OAuth proxy |
| [docs/links.md](docs/links.md) | Creating links: slugs, redirect types, locker steps, timer |
| [docs/adsterra.md](docs/adsterra.md) | Adding Adsterra (or other approved) ad code |
| [docs/seo.md](docs/seo.md) | SEO strategy: noindex, sitemap, canonicals, social cards |
| [docs/limitations.md](docs/limitations.md) | **What a static site can't do.** Read this. |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Common problems and fixes |

## Project structure

```
.github/workflows/deploy.yml   Build, test and deploy to GitHub Pages
public/
  favicon.svg
  images/site/                 Default social image, touch icon
  images/uploads/              Images uploaded through the CMS
scripts/
  generate-images.mjs          Builds the PNG social and demo images
  verify-dist.mjs              Post-build checks (noindex, sitemap, broken links, drafts)
src/
  content.config.ts            Link schema and validation (mirrors the CMS fields)
  content/links/*.json         One file per link (written by Decap CMS)
  data/settings.json           Site and advertising settings (editable in the CMS)
  lib/validate.ts              Pure validators: URLs, slugs, ad code, script escaping
  lib/links.ts                 Loads links, resolves slugs, ads and fallbacks, checks uniqueness
  lib/site.ts                  Settings, base-path-aware URL helpers
  components/                  Seo, AdSlot, ThemeToggle, dashboard and redirect components
  layouts/BaseLayout.astro
  pages/
    index.astro                Dashboard
    [...path].astro            One page per published link
    admin/index.astro          Decap CMS
    admin/config.yml.ts        Generated Decap config (repo, branch, URLs)
    sitemap.xml.ts, robots.txt.ts, 404.astro
  scripts/                     Client scripts: locker, timer, dashboard
  styles/
tests/                         node:test unit tests
```

## Security model, in brief

- Destinations are fixed at build time from the CMS files. Pages never read query parameters, so there is **no open redirect**.
- Only `http(s)` destinations are accepted. `javascript:`, `data:`, `file:`, credentials in the URL and similar are rejected, and the build fails.
- All CMS text is HTML-escaped. The only raw HTML rendered is administrator ad code. It goes inside a labelled ad slot, and only after a lint check: allow-listed hosts only, no hidden ads, no programmatic clicks, no redirects.
- Decap CMS authenticates with GitHub. Edits are commits, so only users with write access to the repository can change links. Hiding `/admin/` is not what protects it.
- No tokens or secrets are in the repository or the built site. The OAuth client secret lives only in the Vercel OAuth proxy (`https://decap-oauth-bishal.vercel.app`).
- The locker and timer are **client-side UX**, not security. See [docs/limitations.md](docs/limitations.md).
