# Deploying to GitHub Pages (lnkrs.github.io)

The site is published at **https://lnkrs.github.io/** from the repository
**`Lnkrs/Lnkrs.github.io`**. Because the repository is named `<owner>.github.io`, GitHub Pages
serves it at the domain root, so the base path is `/` and short links look like
`https://lnkrs.github.io/links/my-link/`.

It is built by GitHub Actions with the official [`withastro/action`](https://github.com/withastro/action)
and published with `actions/deploy-pages`. Every push to `main` deploys, including the commits
Decap CMS makes when you save a link. You can also start a deploy manually:
**Actions → Deploy to GitHub Pages → Run workflow**.

## 1. Create the repository and push

1. Create the repository **`Lnkrs.github.io`** under the **Lnkrs** account or organisation
   (exactly that name). A public repository works on the free plan.
2. Push this project to its `main` branch:

   ```bash
   git add -A
   ```

   ```bash
   git commit -m "Initial commit"
   ```

   ```bash
   git remote add origin https://github.com/Lnkrs/Lnkrs.github.io.git
   ```

   ```bash
   git push -u origin main
   ```

## 2. Repository settings

| Setting | Value |
| --- | --- |
| **Settings → Pages → Build and deployment → Source** | **GitHub Actions** |
| **Settings → Actions → General → Workflow permissions** | The default ("Read repository contents") is fine. The workflow asks for `pages: write` and `id-token: write` itself. |
| **Settings → Environments → github-pages** | Created automatically on first deploy. If you add deployment-branch rules, allow `main`. |

The first run takes 1–2 minutes. Then open https://lnkrs.github.io/.

## 3. CMS login

Add `https://lnkrs.github.io` to `ALLOWED_ORIGINS` on the Vercel OAuth proxy and redeploy it.
See [cms-setup.md](cms-setup.md#github-login-shared-vercel-oauth-proxy).

## 4. Configuration (usually none needed)

Inside GitHub Actions, `astro.config.mjs` reads `GITHUB_REPOSITORY` (`Lnkrs/Lnkrs.github.io`)
and derives `site = https://lnkrs.github.io` and `base = /`. Local builds use the same values.
The CMS defaults to the repository `Lnkrs/Lnkrs.github.io` and the proxy
`https://decap-oauth-bishal.vercel.app` + `api/auth`.

To override anything, add **repository variables** (Settings → Secrets and variables →
Actions → **Variables**). None of these are secrets.

| Variable | Example | Purpose |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | `https://go.example.com` | Custom domain |
| `PUBLIC_BASE_PATH` | `/` | Base path |
| `PUBLIC_LINK_PREFIX` | `go` | Short links at `/go/<slug>/`. Use `/` to serve them from the root (`/<slug>/`). |
| `PUBLIC_CMS_REPO` | `Lnkrs/Lnkrs.github.io` | Repository Decap commits to |
| `PUBLIC_CMS_BRANCH` | `main` | Branch Decap commits to |
| `PUBLIC_CMS_OAUTH_URL` | `https://decap-oauth-bishal.vercel.app` | OAuth proxy |
| `PUBLIC_CMS_OAUTH_ENDPOINT` | `api/auth` | Auth path on the proxy |

For local builds, put the same values in `.env` (see `.env.example`).

### Custom domain (optional)

1. Settings → Pages → Custom domain → `go.example.com`, then set up DNS as GitHub describes.
2. Set `PUBLIC_SITE_URL=https://go.example.com` (base stays `/`).
3. Add `https://go.example.com` to the OAuth proxy's `ALLOWED_ORIGINS`.

## 5. What the workflow does

1. **validate**: `npm ci`, unit tests, `astro check`
2. **build**: `withastro/action` installs, builds and uploads `dist/`. Then `scripts/verify-dist.mjs`
   checks that every link page is `noindex`, has a single title and canonical tag and an
   absolute `og:image`; that the sitemap has no link pages; that drafts were not built; and
   that internal links and assets resolve.
3. **deploy**: publishes the artifact to GitHub Pages.

A broken CMS entry (for example a `javascript:` destination or a duplicate slug) fails the
build, and the previous version of the site stays online. The failed run's log names the file
and field.

## 6. Checklist after the first deploy

- [ ] https://lnkrs.github.io/ shows the dashboard
- [ ] https://lnkrs.github.io/links/astro/ redirects to the Astro docs
- [ ] https://lnkrs.github.io/links/decap-cms-setup-guide/ shows the locker
- [ ] https://lnkrs.github.io/links/pages/ shows the countdown
- [ ] https://lnkrs.github.io/sitemap.xml lists only the homepage, and https://lnkrs.github.io/robots.txt points to it
- [ ] https://lnkrs.github.io/admin/ → Login with GitHub works
- [ ] Delete or replace the demo links and `draft-example.json`
