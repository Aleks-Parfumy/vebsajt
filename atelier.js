// The atelier view: a little text over one of the atelier photographs, picked
// afresh every time the view is opened.

import { isMobile } from './mobile.js';

const BACKGROUNDS = [
  'assets/atelier-1.jpg',
  'assets/atelier-2.jpg',
  'assets/atelier-3.jpg',
  'assets/atelier-4.jpg',
];

// Each photograph's own width ÷ height, filled in as the images load. On a
// phone the backdrop is as wide as its proportions make it at full height, so
// the whole picture is there to be slid across rather than cropped to the
// screen. Until one is measured, the CSS fallback stands in.
const aspects = new Map();

export function initAtelier(root) {
  const backdrop = root.querySelector('#atelier-backdrop');
  let previous = -1;

  function applyAspect(src) {
    const aspect = aspects.get(src);
    if (aspect) backdrop.style.setProperty('--atelier-aspect', aspect);
    // Open on the middle of the picture, so it can be slid either way.
    if (isMobile()) root.scrollLeft = (root.scrollWidth - root.clientWidth) / 2;
  }

  function pickBackground() {
    let index = Math.floor(Math.random() * BACKGROUNDS.length);
    // Never the same photograph twice in a row, so opening the view again
    // visibly changes it.
    if (index === previous && BACKGROUNDS.length > 1) {
      index = (index + 1 + Math.floor(Math.random() * (BACKGROUNDS.length - 1)))
        % BACKGROUNDS.length;
    }
    previous = index;
    const src = BACKGROUNDS[index];
    backdrop.style.backgroundImage = `url('${src}')`;
    applyAspect(src);
  }

  // Warm the cache so a later switch does not flash an empty backdrop, and
  // measure each photograph while it is there.
  for (const src of BACKGROUNDS) {
    const image = new Image();
    image.addEventListener('load', () => {
      aspects.set(src, image.naturalWidth / image.naturalHeight);
      // The one on screen may well be this one, and it was placed unmeasured.
      if (backdrop.style.backgroundImage.includes(src)) applyAspect(src);
    });
    image.src = src;
  }
  pickBackground();

  return { activate: pickBackground };
}
