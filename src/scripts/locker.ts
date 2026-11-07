/*
 * URL Locker client logic.
 *
 * Step types (all are legitimate, non-advertising actions):
 *   acknowledge — tick a checkbox
 *   read        — scroll to the end of a text block (if it scrolls) and wait a few seconds,
 *                 then confirm
 *   wait        — press Start and wait the configured number of seconds
 *
 * Nothing here interacts with ad slots. Progress lives only in memory for this page view.
 * This is a UX gate, not security — the destination is in the page source.
 */
import { openDestination } from './navigate';

export function initLocker(): void {
  const root = document.querySelector<HTMLElement>('[data-locker]');
  const continueButton = document.querySelector<HTMLButtonElement>('[data-continue]');
  if (!root || !continueButton) return;

  const required = Math.max(1, Number(root.dataset.required) || 1);
  const minWaitMs = Math.max(0, Number(root.dataset.minWait) || 0) * 1000;
  const startedAt = performance.now();
  const status = document.querySelector<HTMLElement>('[data-status]');
  const progressText = root.querySelector<HTMLElement>('[data-progress-text]');
  const progressBar = root.querySelector<HTMLElement>('[data-progress-bar]');
  const progressFill = root.querySelector<HTMLElement>('[data-progress-fill]');
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const done = new Set<number>();
  let waitTimer: number | undefined;

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function render(): void {
    const count = Math.min(done.size, required);
    if (progressText) progressText.textContent = `${count} of ${plural(required, 'step')} complete`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(count));
    if (progressFill) progressFill.style.width = `${(count / required) * 100}%`;

    const stepsComplete = done.size >= required;
    const remainingMs = minWaitMs - (performance.now() - startedAt);
    const unlocked = stepsComplete && remainingMs <= 0;

    continueButton!.disabled = !unlocked;
    if (status) {
      status.classList.toggle('is-ready', unlocked);
      if (unlocked) status.textContent = 'Unlocked — press Continue when you are ready.';
      else if (!stepsComplete) status.textContent = `Complete ${plural(required - done.size, 'more step')} to unlock the link.`;
      else status.textContent = `Almost there — available in ${Math.ceil(remainingMs / 1000)} s.`;
    }

    // Keep ticking only while the minimum waiting time is the last thing missing.
    window.clearTimeout(waitTimer);
    if (stepsComplete && remainingMs > 0) waitTimer = window.setTimeout(render, Math.min(1000, remainingMs));
  }

  function complete(index: number, step: HTMLElement, action: HTMLElement | null): void {
    done.add(index);
    step.classList.add('is-done');
    const state = step.querySelector('[data-step-state]');
    if (state) state.textContent = '(completed)';
    if (action instanceof HTMLButtonElement) {
      action.disabled = true;
      action.textContent = 'Done';
    }
    render();
  }

  function uncomplete(index: number, step: HTMLElement): void {
    done.delete(index);
    step.classList.remove('is-done');
    const state = step.querySelector('[data-step-state]');
    if (state) state.textContent = '(not completed)';
    render();
  }

  steps.forEach((step, index) => {
    const type = step.dataset.type;
    const seconds = Math.max(0, Number(step.dataset.seconds) || 0);
    const action = step.querySelector<HTMLInputElement | HTMLButtonElement>('[data-step-action]');
    const hint = step.querySelector<HTMLElement>('[data-step-hint]');
    if (!action) return;

    if (type === 'acknowledge' && action instanceof HTMLInputElement) {
      action.addEventListener('change', () => (action.checked ? complete(index, step, null) : uncomplete(index, step)));
      return;
    }

    if (type === 'read' && action instanceof HTMLButtonElement) {
      const reading = step.querySelector<HTMLElement>('[data-reading]');
      let reachedEnd = false;
      let timeOk = seconds === 0;
      const visibleSince = { at: 0 };

      const update = () => {
        if (done.has(index)) return;
        action.disabled = !(reachedEnd && timeOk);
        if (hint) {
          if (!reachedEnd) hint.textContent = 'Scroll to the end of the text to continue.';
          else if (!timeOk) hint.textContent = 'Take a moment to read it…';
          else hint.textContent = '';
        }
      };
      const checkEnd = () => {
        if (!reading) return void (reachedEnd = true);
        if (reading.scrollTop + reading.clientHeight >= reading.scrollHeight - 8) reachedEnd = true;
      };

      checkEnd();
      reading?.addEventListener('scroll', () => {
        checkEnd();
        update();
      }, { passive: true });

      // The reading time starts when the step is actually on screen.
      if (!timeOk) {
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting) && !visibleSince.at) {
            visibleSince.at = performance.now();
            observer.disconnect();
            window.setTimeout(() => {
              timeOk = true;
              update();
            }, seconds * 1000);
          }
        });
        observer.observe(step);
      }

      update();
      action.addEventListener('click', () => {
        if (!action.disabled) complete(index, step, action);
      });
      return;
    }

    if (type === 'wait' && action instanceof HTMLButtonElement) {
      const total = Math.max(1, seconds);
      action.addEventListener('click', () => {
        action.disabled = true;
        let left = total;
        const tick = () => {
          if (left <= 0) {
            if (hint) hint.textContent = '';
            complete(index, step, action);
            return;
          }
          action.textContent = `Waiting… ${left} s`;
          left -= 1;
          window.setTimeout(tick, 1000);
        };
        tick();
      });
    }
  });

  continueButton.addEventListener('click', () => {
    if (continueButton.disabled) return;
    openDestination(continueButton.dataset.href);
  });

  render();
}
