# Decap CMS setup

The CMS lives at **https://lnkrs.github.io/admin/**. It uses the **GitHub backend**: when you
save, Decap commits the JSON file to `Lnkrs/Lnkrs.github.io` with your own GitHub token, and
the deploy workflow rebuilds the site.

**Who can edit?** Only GitHub users with **write access to the repository**. The `/admin/`
page is public (it is just a JavaScript app), but it can't change anything without a token
that GitHub issues to a user with write permission. Hiding the URL is not the protection.

## Configuration

`/admin/config.yml` is **generated at build time** by `src/pages/admin/config.yml.ts`, so the
repository, branch and site URL always match the deployment. To change fields, edit that
file *and* the schema in `src/content.config.ts`; they mirror each other.

| Setting | Value | Override with |
| --- | --- | --- |
| `backend.repo` | `Lnkrs/Lnkrs.github.io` (taken from `GITHUB_REPOSITORY` in Actions) | `PUBLIC_CMS_REPO` |
| `backend.branch` | `main` | `PUBLIC_CMS_BRANCH` |
| `backend.base_url` | `https://decap-oauth-bishal.vercel.app` | `PUBLIC_CMS_OAUTH_URL` |
| `backend.auth_endpoint` | `api/auth` | `PUBLIC_CMS_OAUTH_ENDPOINT` |
| Media | Uploaded to `public/images/uploads/`, referenced as `/images/uploads/<file>` | |

## GitHub login (shared Vercel OAuth proxy)

GitHub's OAuth flow needs a server to keep the client secret, and GitHub Pages can't run one.
This site uses your existing proxy, **https://decap-oauth-bishal.vercel.app**
(source: `github.com/dev-bishal/decap-oauth`, local copy in `SMM-VPS-Projects/decap-oauth/`).
One proxy serves several sites. Each site only needs to be allow-listed.

**One-time step:** add this site's origin to the proxy's allow-list.

1. Vercel → the `decap-oauth-bishal` project → **Settings → Environment Variables**.
2. Edit `ALLOWED_ORIGINS` and append `https://lnkrs.github.io`. The value is comma-separated,
   with no trailing slash, for example:

   ```
   https://bishal-biswas.github.io,https://lnkrs.github.io
   ```

3. **Redeploy** the Vercel project. Environment-variable changes only apply to new deployments.

Nothing else changes on the proxy. The GitHub OAuth App's callback URL stays
`https://decap-oauth-bishal.vercel.app/api/callback`.

Then open https://lnkrs.github.io/admin/ → **Login with GitHub**. The GitHub account you log
in with must have write access to `Lnkrs/Lnkrs.github.io`. **Lnkrs is an organisation**, so
an owner must also approve the proxy's OAuth App once, or saving fails with "OAuth App access
restrictions". See the steps in [troubleshooting.md](troubleshooting.md).

How the proxy checks the site: Decap sends the page's hostname as `site_id`
(`lnkrs.github.io`), the proxy turns it into `https://lnkrs.github.io`, and it refuses with
`403 Origin not allowed` unless that value is in `ALLOWED_ORIGINS`. The token is then posted
only to that origin.

## Editing locally (no login)

```bash
npm run dev
```

```bash
npm run cms
```

Open `http://localhost:4321/admin/` and click **Login**. Decap detects `localhost` and uses the
local `decap-server` proxy, which reads and writes files in this folder directly. Commit and
push them yourself afterwards.

## Collections

- **Links**: one JSON file per link in `src/content/links/`. See [links.md](links.md).
- **Site settings**: `src/data/settings.json`: site name, default social image, Twitter handle,
  whether the dashboard homepage is indexable, and all **ad settings** ([adsterra.md](adsterra.md)).

The CMS has filters (Direct, Locker, Timer, Drafts) and sorting by date, title or type.
