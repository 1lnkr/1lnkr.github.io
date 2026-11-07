# Troubleshooting

### The build fails after I saved a link

Open the failed run in **Actions** and look for `InvalidContentEntryDataError` or `Invalid links`.
The message names the file and field, for example:

```
links → my-link data does not match collection schema.
  destination: "javascript:alert(1)" is not allowed. Destinations must be absolute http:// or https:// URLs …
```

Fix the entry in the CMS and save again. The live site keeps the last good version until a build succeeds.

| Message | Fix |
| --- | --- |
| `is not allowed. Destinations must be absolute http(s)` | Use a full `https://…` URL |
| `is a reserved name` | Pick another slug |
| `Duplicate slug "x"` | Two links resolve to the same slug. Change one custom slug. |
| `A URL Locker needs at least one verification step` | Add a step with a title, or change the redirect type |
| `Required steps (N) is more than the number of steps` | Lower *Number of required steps* or add steps |
| `Enable automatic continuation, the Continue button, or both` | Timer settings: turn one on |
| `loads from "host", which is not in the ad host allow-list` | Add the host in *Site settings → Ads → Allowed ad hosts* |
| `Ad code uses display:none` and similar | Paste the network's original code unchanged |
| `Canonical URL override must be an absolute https:// URL` | Fix or clear the field |

### `/admin/` says "Error loading the CMS configuration"

Open `/admin/config.yml` in the browser. If it 404s, the site wasn't built with the latest code.
Re-run the workflow.

### "Login with GitHub" does nothing or shows an error

- The popup shows `403 Origin not allowed: https://lnkrs.github.io`: add that origin to
  `ALLOWED_ORIGINS` on the Vercel proxy and **redeploy** it.
- Check that https://lnkrs.github.io/admin/config.yml contains
  `"base_url": "https://decap-oauth-bishal.vercel.app"` and `"auth_endpoint": "api/auth"`.
- GitHub shows "redirect_uri is not associated with this application": the OAuth App's
  callback URL must be exactly `https://decap-oauth-bishal.vercel.app/api/callback`.
- `Invalid state signature`: `GITHUB_CLIENT_SECRET` changed on Vercel mid-login. Try again.
- "Your GitHub user account does not have access to this repo": the account needs write access.

### "Failed to persist entry: API_ERROR: … the `Lnkrs` organization has enabled OAuth App access restrictions"

Login worked, but the **Lnkrs** organisation blocks third-party OAuth Apps by default, so
GitHub refuses the commit. An organisation **owner** must approve the OAuth App that the
Vercel proxy uses (the app whose callback is `https://decap-oauth-bishal.vercel.app/api/callback`):

1. Open https://github.com/settings/applications → **Authorized OAuth Apps** → click the app.
2. Under **Organization access**, click **Grant** next to **Lnkrs**. Non-owners see
   **Request** instead, and an owner then approves it.
3. Or, as an owner: https://github.com/organizations/Lnkrs/settings/oauth_application_policy
   → find the app → **Approve** (pending requests appear there too).

Then reload `/admin/` and save again. No rebuild or code change is needed. Avoid
**Remove restrictions** on that page: it lets *every* OAuth App you authorise read the
organisation's data, not just this one.

### Pages, images or CSS 404 on GitHub Pages

The base path is wrong. If the repository was renamed, or you use a custom domain, set
`PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH` ([deployment.md](deployment.md#4-configuration-usually-none-needed)).
Uploaded images must live in `public/images/uploads/`, which the CMS does automatically.

### My change isn't live yet

Wait for the **Deploy to GitHub Pages** run to finish (about 1–2 minutes), then hard-refresh.
GitHub's CDN can cache for a few minutes.

### Social preview shows the old image or text

Platforms cache previews. Use the Facebook Sharing Debugger or LinkedIn Post Inspector to
re-scrape. Make sure the image is PNG or JPG (not SVG) and publicly reachable.

### The local CMS (`npm run cms`) shows "Login" but saves nothing

Run `npm run cms` in its own terminal *and* `npm run dev` in another, then open the admin at
`http://localhost:…/admin/`. Local mode only works from `localhost`.

### A new link isn't on the dev server

The dev server sometimes misses files created by other programs. Restart `npm run dev`.
Drafts (*Published* off) show on the local dashboard only and never get a page.

### The countdown or locker doesn't work

They need JavaScript. Without it, visitors see a direct link (timer: an automatic refresh
when auto-continue is on). Check the browser console for blocked scripts. Some ad blockers
block third-party ad scripts, but never this site's own scripts.
