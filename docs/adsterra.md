# Advertising (Adsterra and other approved networks)

Ads are optional and off until you paste ad code. They appear only in **labelled ad slots**
("Advertisement") that are visually separate from navigation and the Continue button.

## Rules this project enforces

- Ads are **never** required to unlock or continue. No locker step involves an ad, and the
  countdown never touches the ad slot.
- Ad code is rendered **exactly as you paste it**. It is never modified, wrapped in hidden
  iframes, auto-clicked or triggered by scripts.
- At build time, ad code is rejected (and the build fails) if it:
  - loads a `<script>` or `<iframe>` from a host that isn't on **Allowed ad hosts**
  - hides content (`display:none`, `visibility:hidden`, `opacity:0`, zero width or height, off-screen positioning, the `hidden` attribute)
  - calls `.click()`, `dispatchEvent`, `new MouseEvent`, `window.open` or changes `location`

  This is a guard rail against mistakes and pasted junk, not a sandbox. Only paste code from
  your ad network's dashboard.
- Never place ads where they look like the Continue button or navigation, and don't encourage
  visitors to click them. Read your network's publisher policies.

## Add an Adsterra banner

1. In Adsterra, create a **Banner** (or another display format your account is approved for)
   for your site's domain and copy the code. It usually looks like:

   ```html
   <script type="text/javascript">
     atOptions = { 'key' : 'xxxxxxxx', 'format' : 'iframe', 'height' : 90, 'width' : 728, 'params' : {} };
   </script>
   <script type="text/javascript" src="//www.highperformanceformat.com/xxxxxxxx/invoke.js"></script>
   ```

2. Open `/admin/` → **Site settings** → **Site & advertising settings** → **Ads**:
   - **Enable advertisements**: on (master switch)
   - **Show on URL Locker pages / Timed Redirect pages**: on or off per type
   - **Show on Direct Redirect pages**: leave **off**. Direct links redirect instantly, so the ad
     would only be on the no-JavaScript fallback page.
   - **Default placement**: Top, Middle or Bottom
   - **Default ad code**: paste the code
   - **Allowed ad hosts**: make sure the `src` domain from your code is listed (for example
     `highperformanceformat.com`). Subdomains are included automatically. If the build fails
     with *"loads from X, which is not in the ad host allow-list"*, add that domain here.
3. Publish. Ads appear on every locker and timer page after the rebuild.

Ad domains vary by account and format, so check the `src` in your own code. The default
allow-list contains a few common Adsterra domains as a starting point. Edit it to match your code.

### 728×90 banners on phones

Fixed-width banners scroll horizontally inside the slot on narrow screens. Consider a
320×50 or 300×250 unit as your default, or use the per-link ad code.

## Per-link control

In each link → **Advertisement settings**:

| Advertisements | Effect |
| --- | --- |
| Use site settings | Follows the per-type switch (locker or timer) |
| Show ads on this link | Shows ads even if that type is switched off (the master switch must still be on) |
| No ads on this link | Never shows ads |

**Placement** overrides the default placement. **Ad code** replaces the default code for this
link only (same checks apply).

## Placements

| Placement | Where |
| --- | --- |
| Top | Under the title, image and destination |
| Middle | Between the steps or countdown and the Continue area |
| Bottom | Below the Continue area, after a divider |

## Secrets

Ad code is public by nature: it ends up in the HTML. Never paste API keys, publisher
account passwords or reporting tokens anywhere in the CMS or the repository.
