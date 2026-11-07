# Limitations of a static GitHub Pages site

GitHub Pages serves static files only. There is no server to run code per visitor, so:

## The locker and timer are not security

- The destination URL is in the page's HTML (the Continue button's `data-href`). Anyone can
  read it with *View source*, and anyone can skip the steps or the countdown.
- Steps are tracked in the visitor's browser and reset on reload. There is no proof a step
  was "really" done, and no identity verification.
- Treat the locker and timer as **friction and context for honest visitors**, not as access
  control. Don't use them for secret, paid or private destinations.

Real enforcement needs a server, for example a serverless function that checks a signed token
before issuing a redirect. That is out of scope for this static project.

## No analytics

- The dashboard numbers are **counts of links in your content**, not visits or clicks.
- GitHub Pages gives you no access logs. For click statistics, add a privacy-respecting
  analytics script (Plausible, Umami, Cloudflare Web Analytics) to `BaseLayout.astro`, and
  remember direct redirects leave the page before most analytics scripts load.

## No server-side redirects

- Short links are HTML pages that redirect with JavaScript (plus a `<meta refresh>` fallback),
  not HTTP 301/302 responses. Browsers and social apps handle this fine. Some command-line
  tools and simple bots won't follow the redirect.
- Each URL needs its trailing slash (`/guide/`). GitHub Pages redirects `/guide` → `/guide/` automatically.

## Changes are not instant

Every CMS save triggers a rebuild that takes about 1–2 minutes before it is live. GitHub Pages' CDN
may cache old pages for up to ~10 minutes.

## No private links

Everything you publish is public: the dashboard lists every published destination, and
the built pages are in the deployment artifact. Unpublished drafts are not built, but they
**are** stored in your repository. Keep the repository private if drafts must stay private
(GitHub Pages from a private repository needs a paid plan).

## CMS login needs a tiny external service

GitHub OAuth requires a server-side token exchange. That is done by the separate Vercel
proxy at `https://decap-oauth-bishal.vercel.app`. If it is down, or `https://lnkrs.github.io`
is missing from its `ALLOWED_ORIGINS`, you can't log in to the CMS. The live site keeps working.
