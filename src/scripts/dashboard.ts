/* Dashboard: copy-to-clipboard buttons and client-side filtering of the link list. */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function initDashboard(): void {
  const toast = document.querySelector<HTMLElement>('[data-toast]');
  let toastTimer: number | undefined;
  const showToast = (message: string) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    const original = button.textContent ?? 'Copy';
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copy ?? '');
      button.textContent = ok ? 'Copied!' : 'Copy failed';
      showToast(ok ? 'Short URL copied to clipboard' : 'Could not copy — select the URL manually');
      window.setTimeout(() => (button.textContent = original), 1600);
    });
  }

  const rows = [...document.querySelectorAll<HTMLElement>('[data-link-row]')];
  const text = document.querySelector<HTMLInputElement>('[data-filter-text]');
  const type = document.querySelector<HTMLSelectElement>('[data-filter-type]');
  const category = document.querySelector<HTMLSelectElement>('[data-filter-category]');
  const empty = document.querySelector<HTMLElement>('[data-empty-filter]');

  const apply = () => {
    const q = (text?.value ?? '').trim().toLowerCase();
    const t = type?.value ?? '';
    const c = category?.value ?? '';
    let shown = 0;
    for (const row of rows) {
      const match =
        (!q || (row.dataset.search ?? '').includes(q)) && (!t || row.dataset.type === t) && (!c || row.dataset.category === c);
      row.hidden = !match;
      if (match) shown++;
    }
    if (empty) empty.hidden = shown !== 0 || rows.length === 0;
  };

  text?.addEventListener('input', apply);
  type?.addEventListener('change', apply);
  category?.addEventListener('change', apply);
}
