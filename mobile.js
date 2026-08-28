// Everything the site does differently on a phone that JavaScript has to know
// about. The layout itself is CSS (see the mobile section of style.css); this
// module owns the one media query both sides agree on, and the press-then-act
// delay that stands in for hover on a touch screen.

// Kept in step with the @media block in style.css by hand — there is only one,
// and both sides say so where they use it.
export const MOBILE_QUERY = '(max-width: 768px)';

const mq = window.matchMedia(MOBILE_QUERY);

export function isMobile() {
  return mq.matches;
}

/** Calls `fn` whenever the site crosses the mobile/desktop boundary. */
export function onLayoutChange(fn) {
  mq.addEventListener('change', fn);
}

// ---- Press instead of hover -------------------------------------------------
// On a pointer device the hover animation plays while you decide, and the click
// acts at once. A touch screen has no such moment, so the tap plays the same
// animation first and the site only moves once it has finished.
//
// Each entry is a control that animates on hover, with how long its animation
// runs in CSS. Keep the two in step.
const PRESS_TARGETS = [
  ['.nav-btn', 620],
  ['.scent-bloom', 620],
  ['.home-featured-card', 340],
  ['.scent-inquire', 280],
  ['.inquiry-send', 280],
  ['.inquiry-close', 220],
  ['.finder-answers button', 280],
  ['.finder-alt-link', 280],
  ['.contact-link', 280],
];

// Set while the delayed click is being replayed, so the listener below lets its
// own synthetic event through instead of delaying it a second time.
let replaying = false;
const pending = new WeakSet();

function press(el, ms) {
  return new Promise((resolve) => {
    pending.add(el);
    el.classList.add('is-pressed');
    setTimeout(() => {
      el.classList.remove('is-pressed');
      pending.delete(el);
      resolve();
    }, ms);
  });
}

/**
 * Follows a link once its animation has played. Opening in a new tab this late
 * is what a popup blocker is there to stop, so a blocked window falls back to
 * navigating this one.
 */
function follow(link) {
  const opened = link.target === '_blank'
    ? window.open(link.href, '_blank', 'noopener')
    : null;
  if (!opened) window.location.href = link.href;
}

/**
 * Installs the delay. Capture phase on the document, so it runs before the
 * view's own delegated click handlers and can hold their event back.
 */
export function initPressDelay() {
  document.addEventListener('click', (event) => {
    if (replaying || !isMobile()) return;

    let target = null;
    let ms = 0;
    for (const [selector, duration] of PRESS_TARGETS) {
      const el = event.target.closest(selector);
      // The nearest match wins, so a button inside another control animates
      // rather than its container.
      if (el && (!target || target.contains(el))) {
        target = el;
        ms = duration;
      }
    }
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    if (pending.has(target)) return; // already playing: ignore the second tap

    const link = target.closest('a[href]');
    press(target, ms).then(() => {
      if (link) return follow(link);
      replaying = true;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      replaying = false;
    });
  }, true);
}
