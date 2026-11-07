/*
 * Timed redirect countdown. Uses wall-clock time so a throttled background tab can't
 * stretch it, enables the Continue button at zero, and navigates automatically only when
 * the page was built with data-auto="true". It never interacts with ad slots.
 */
import { openDestination } from './navigate';

export function initTimer(): void {
  const root = document.querySelector<HTMLElement>('[data-timer]');
  if (!root) return;

  const duration = Math.max(1, Number(root.dataset.duration) || 1);
  let auto = root.dataset.auto === 'true';
  const continueButton = document.querySelector<HTMLButtonElement>('[data-continue]');
  const cancelAuto = document.querySelector<HTMLButtonElement>('[data-cancel-auto]');
  const status = document.querySelector<HTMLElement>('[data-status]');
  const number = root.querySelector<HTMLElement>('[data-timer-number]');
  const secondsEl = root.querySelector<HTMLElement>('[data-timer-seconds]');
  const label = root.querySelector<HTMLElement>('[data-timer-label]');
  const ring = root.querySelector<SVGCircleElement>('[data-timer-ring]');
  const circumference = ring ? Number(ring.getAttribute('stroke-dasharray')) : 0;
  const href = root.dataset.href;

  const endAt = Date.now() + duration * 1000;
  let lastShown = -1;
  let finished = false;

  function finish(): void {
    finished = true;
    root!.classList.add('is-done');
    if (number) number.textContent = '0';
    if (label) label.textContent = 'Ready.';
    if (ring) ring.style.strokeDashoffset = String(circumference);
    if (continueButton) {
      continueButton.disabled = false;
      continueButton.focus({ preventScroll: true });
    }
    if (cancelAuto) cancelAuto.hidden = true;
    if (status) {
      status.classList.add('is-ready');
      status.textContent = auto ? 'Redirecting…' : 'Ready — press Continue when you are ready.';
    }
    if (auto) openDestination(href, { replace: true });
  }

  function tick(): void {
    if (finished) return;
    const msLeft = endAt - Date.now();
    if (msLeft <= 0) return finish();
    const left = Math.ceil(msLeft / 1000);
    if (ring) ring.style.strokeDashoffset = String(circumference * (1 - msLeft / (duration * 1000)));
    if (left !== lastShown) {
      lastShown = left;
      if (number) number.textContent = String(left);
      if (secondsEl) secondsEl.textContent = String(left);
      // The live count is visual only (aria-live="off"); the polite status line announces
      // just the start and the end, so screen readers aren't interrupted every second.
    }
    window.setTimeout(tick, 200);
  }

  cancelAuto?.addEventListener('click', () => {
    auto = false;
    cancelAuto.hidden = true;
    if (status) status.textContent = 'Automatic redirect cancelled.';
    if (finished && continueButton) continueButton.disabled = false;
  });

  continueButton?.addEventListener('click', () => {
    if (!continueButton.disabled) openDestination(continueButton.dataset.href);
  });

  tick();
}
