/**
 * Navigate to a destination that was baked into the page at build time.
 * Re-checks the protocol in the browser as defence in depth: only http(s) URLs are followed.
 */
export function openDestination(href: string | undefined, { replace = false } = {}): boolean {
  if (!href) return false;
  let target: URL;
  try {
    target = new URL(href);
  } catch {
    return false;
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') return false;
  if (replace) window.location.replace(target.href);
  else window.location.assign(target.href);
  return true;
}
