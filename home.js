// The home page: the film, the glitching screen beside it, the featured scent,
// and the mark of where this started.

import { SCENTS } from './scents.js';
import { initLogo, SHINE } from './logo.js';
import { initInquiry } from './inquiry.js';

// The glitching screen. How long each picture is held before it changes over —
// the statement is read rather than glanced at, so it stays up more than twice
// as long as the monogram.
const MANIFESTO_HOLD = [3600, 9000];
// One burst of glitch, matching the animation in the stylesheet, and how far
// into it the pictures change over: while the picture is at its most broken,
// so neither is ever seen fading into the other.
const GLITCH_MS = 420;
const GLITCH_SWAP = 190;

// The scent the home page holds up. Fixed, not rotated.
const FEATURED_ID = 'radnaskela-edc';

// One announcement for now. Newest first, if this ever grows.
const NEWS = [
  {
    eyebrow: 'News',
    title: 'Sniffing Sessions',
    body: 'Book your spot in the sniffing session by sending us a message with '
      + 'your name, your preferred date and the amount of people coming.',
    photo: 'assets/AP_SS_26_SeptOct_web.png',
  },
];

/**
 * Runs the two pictures on the screen between the film and the featured card,
 * each swapped for the next behind a burst of glitch.
 *
 * @param view the home view, checked for being on screen before anything moves
 * @returns an activate() to be run whenever home is opened again
 */
function initManifesto(view) {
  const screen = view.querySelector('.home-manifesto-screen');
  const panes = [...screen.querySelectorAll('.home-manifesto-pane')];
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = 0;

  // Everything pending, so that opening home can wipe the slate: a swap and the
  // end of a glitch are each waiting on their own timer.
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const stop = () => { timers.forEach(clearTimeout); timers.clear(); };

  // The monogram on the first pane: the same 3D artwork the contact page turns,
  // rocking here rather than spinning (see SHINE). It is built the first time
  // home is actually looked at, not on the way past — standing up a second
  // renderer during the intro takes frames from it, and measuring the canvas
  // that early forces a layout before the stylesheet has even landed.
  let logo = null;
  let building = false;

  // Building it means a renderer, an environment map baked for it to be lit by,
  // and a shader compiled on first draw — together long enough to be seen as a
  // stutter. Home is opened in the frame the intro hands over in, so that work
  // waits for the page to be painted first and the monogram lights up a beat
  // later, rather than the handover itself being held up by it.
  const wake = () => {
    if (logo) { logo.activate(); return; }
    if (building) return;
    building = true;
    requestAnimationFrame(() => setTimeout(() => {
      building = false;
      if (shown !== 0 || view.hidden) return; // the moment passed; wake() again later
      logo = initLogo(view.querySelector('#home-logo-canvas'), SHINE);
      logo.activate();
    }, 0));
  };

  // Which picture is up. Told apart from show() below because the opening state
  // has to be set without waking anything: at that point there is no page to
  // draw on yet.
  const paint = (index) => {
    shown = index;
    panes.forEach((pane, n) => pane.classList.toggle('is-on', n === index));
  };

  // The monogram is the first pane, so it draws only while that one is up.
  const show = (index) => {
    paint(index);
    if (shown === 0) wake(); else logo?.pause();
  };

  const next = () => (shown + 1) % panes.length;

  function step() {
    if (view.hidden) return; // another view is open; activate() starts it again

    if (still) {
      show(next());
      later(step, MANIFESTO_HOLD[shown]);
      return;
    }

    screen.classList.add('is-glitching');
    later(() => show(next()), GLITCH_SWAP);
    later(() => {
      screen.classList.remove('is-glitching');
      later(step, MANIFESTO_HOLD[shown]);
    }, GLITCH_MS);
  }

  paint(0);

  return {
    // Home always opens on the monogram, however it was left: whatever was
    // pending is dropped, the glitch is called off, and the cycle starts over.
    activate() {
      stop();
      screen.classList.remove('is-glitching');
      show(0);
      later(step, MANIFESTO_HOLD[0]);
    },
  };
}

/**
 * @param root the home view
 * @param onOpenScent called with a scent id when the featured card is clicked
 */
export function initHome(root, { onOpenScent } = {}) {
  const newsEl = root.querySelector('#home-news');
  const featuredEl = root.querySelector('#home-featured');

  const [item] = NEWS;
  newsEl.innerHTML = `
    <div class="home-news-text">
      <p class="home-eyebrow">${item.eyebrow}</p>
      <h2 class="home-news-title">${item.title}</h2>
      <p class="home-news-body">${item.body}</p>
      <button class="home-news-inquire" type="button">Inquire</button>
    </div>
    ${item.photo ? `<img class="home-news-photo" src="${item.photo}" alt="">` : ''}`;

  const sniffInquiry = initInquiry({
    eyebrow: 'Inquire',
    title: 'Sniffing Sessions',
    sendLabel: 'Send message',
    id: 'inquiry-home',
  });
  newsEl.addEventListener('click', (event) => {
    if (event.target.closest('.home-news-inquire')) sniffInquiry.open();
  });

  const featured = SCENTS.find((scent) => scent.id === FEATURED_ID);
  if (featured) {
    featuredEl.innerHTML = `
      <button class="home-featured-card" type="button" data-scent="${featured.id}">
        <img src="${featured.photo}" alt="" class="home-featured-photo">
        <span class="home-eyebrow">Featured scent</span>
        <span class="home-featured-name">${featured.name}</span>
        <span class="home-featured-line">${featured.tagline}</span>
      </button>`;
  }

  featuredEl.addEventListener('click', (event) => {
    const card = event.target.closest('.home-featured-card');
    if (card) onOpenScent?.(card.dataset.scent);
  });

  const manifesto = initManifesto(root);

  return {
    activate: () => {
      manifesto.activate();
    },
  };
}
