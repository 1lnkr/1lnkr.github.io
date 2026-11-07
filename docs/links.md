# Creating and managing links

Open `/admin/` → **Links** → **New Link**, fill in the form and click **Publish → Publish now**.
The site rebuilds in about 1–2 minutes. Check progress in the repository's **Actions** tab.

## Basic fields

| Field | Notes |
| --- | --- |
| **Title** *(required)* | Shown on locker and timer pages, in the dashboard and in social previews. |
| **Custom slug** | Optional. See [Slugs](#slugs). |
| **Destination URL** *(required)* | Must start with `http://` or `https://`. Everything else is rejected. |
| **Featured image** | Upload, or paste an `https://` image URL. 1200×630 px is ideal. Used on the page and for Open Graph and Twitter cards. |
| **Image alt text** | Describe the image. Defaults to the title. |
| **Short description** | Shown under the title. Also the fallback meta description. |
| **Category** | Any name, such as "Guides" or "Downloads". Defaults to **Others**: an empty category, "other" or "others" all count as the single **Others** category, which sorts last in the dashboard filter. The category is shown above the title on locker and timer pages, except for Others. |
| **Tags** | For your own organisation. Searchable on the dashboard. |
| **Published** | Off = the page is not built (the URL returns 404) and the link isn't deployed anywhere. |
| **Show on homepage** | On (default) = listed on the homepage dashboard. Off = the short link still works and can be shared, but the deployed homepage doesn't list it, and its title and destination aren't in the homepage HTML. The homepage shows a note with the number of hidden links. |
| **Creation date / Last updated** | Used for sorting and the sitemap's `lastmod`. |

## Slugs

The short URL is `https://lnkrs.github.io/<slug>/`, at the site root. (Set the `PUBLIC_LINK_PREFIX`
variable, for example `go`, if you ever want them in a folder such as `/go/<slug>/`.)

Links used to live under `/links/<slug>/`. Those old addresses still work: each one forwards
to the new root URL, so links you already shared don't break.

- **Automatic (default):** leave *Custom slug* empty. When you first save the link, Decap
  makes a file name from the title ("My Download Guide" → `my-download-guide.json`), and that
  becomes the slug. Editing the title later does **not** change the slug, so links don't break.
- **Custom:** type a slug such as `guide`. Lowercase letters, numbers and single hyphens only,
  up to 80 characters. A custom slug always wins over the automatic one.

The build fails, and nothing is deployed, if:
- two links end up with the same slug (for example your custom slug equals another link's
  automatic slug), or
- the slug is reserved: `admin`, `links`, `images`, `api`, `assets`, `_astro`, `404`,
  `sitemap`, `robots`, `favicon`, `auth`, `callback`, `oauth` and a few others
  (`RESERVED_SLUGS` in `src/lib/validate.ts`).

Changing a slug changes the short URL, so old shared links stop working.

## Seeing the live link in the CMS

- **Preview pane** (right side of the editor, toggle with the eye icon): shows the
  **short URL** as you type, marked *custom slug* or *automatic slug*, with **Open short URL**
  and **Copy short URL** buttons. It also shows whether the link is live, a draft or hidden
  from the homepage, plus its type and destination. For a new link it previews the automatic
  slug from the title before you save.
- **View Live** (top bar, after the link is published): opens the live short link.
  It goes through `/admin/live/<file name>/`, a small helper page that forwards to the
  short URL, so it also works for custom slugs.

A new or edited link goes live about 1–2 minutes after you save, once the site has rebuilt.

## Redirect types

### Direct Redirect

The page runs `location.replace(destination)` before anything renders. Browsers without
JavaScript get a `<meta refresh>` and a visible link. Social-media crawlers don't run
JavaScript, so they still read your title, description and featured image.

### URL Locker

Open **URL Locker settings**:

| Field | Notes |
| --- | --- |
| Enable URL Locker | Off = the link behaves like a Direct Redirect. |
| Locker heading / description | Text above the steps. |
| Number of required steps | `0` = all steps. Otherwise visitors may complete *any* N of them. |
| Verification steps | 1–10 steps (see below). Steps without a title are ignored. |
| Continue button text | e.g. "Continue to the download". |
| Minimum waiting time | Optional. Continue stays locked until N seconds after the page opened. |
| Show progress indicator | Progress bar plus "2 of 3 steps complete". |

Step types are all **legitimate, non-advertising actions**:

| Type | Visitor does | Uses |
| --- | --- | --- |
| **Acknowledge** | Ticks a checkbox ("I understand where this link goes"). | *Button / checkbox label* |
| **Read** | Scrolls to the end of a short text, waits *Seconds*, then confirms. | *Text to read*, *Seconds* |
| **Wait** | Presses Start and waits *Seconds*. | *Seconds* |

When enough steps are done, **Continue** unlocks, and the visitor is redirected **only when they click it**.
There is no step type involving ads, and ad slots are separate from the steps.

### Timed Redirect

Open **Timed Redirect settings**:

| Field | Notes |
| --- | --- |
| Countdown duration | 1–300 seconds, set per link. |
| Heading / description | Text next to the countdown. |
| Continue button text | |
| Continue automatically | Off (default): visitors must click Continue. On: redirect when the countdown ends. When the Continue button is also shown, visitors get a "Stay on this page" button to cancel. |
| Show manual Continue button | At least one of these two options must be on, or the build fails. |

## Ads per link

**Advertisement settings** (per link):
- *Advertisements*: use the site default for this redirect type, force on, or force off.
- *Placement*: top, middle or bottom (see [adsterra.md](adsterra.md)).
- *Ad code*: optional code that replaces the site-wide default ad code for this link.

## Dashboard

The homepage lists published links that have **Show on homepage** on, newest first, with the short URL, destination, slug
(marked *auto* when automatic), type, category and image, plus **Open short URL**, **Copy short URL**,
**Open destination** and **Edit in CMS**. Drafts and hidden links appear only on the local dev
server, with *Draft* or *Hidden from homepage* badges. In the CMS, the *Hidden from homepage* filter lists them. The
counts at the top are counts of links in your content, **not** visitor statistics.

## Editing files directly

Links are plain JSON in `src/content/links/`. You can add or edit them in your editor and
push; the build validates them the same way. Minimal example:

```json
{
  "title": "My Guide",
  "destination": "https://example.com/guide",
  "createdAt": "2026-11-07T10:00:00.000Z",
  "redirectType": "direct"
}
```
