// The bottom scrolling strip. It alternates the welcome line with the local
// time and temperature in the three cities Aleks Parfumy keeps time with, so
// the strip reads:
//
//   welcome ✦ Belgrade ✦ welcome ✦ Cairo ✦ welcome ✦ Prague ✦  (then repeats)
//
// Temperatures come from Open-Meteo (https://open-meteo.com) — a free, key-less
// weather API — with all three cities fetched in one request. The clocks are
// the browser's own, formatted per city via Intl using each city's IANA time
// zone, so they retick every interval without asking the network again.

const WELCOME = 'Welcome to the Aleks Parfumy website and experience';

// Coordinates feed the weather request; the time zone feeds the clock. Order
// here is the order they appear in the strip.
const CITIES = [
  { name: 'Belgrade', tz: 'Europe/Belgrade', lat: 44.7866, lon: 20.4489 },
  { name: 'Cairo', tz: 'Africa/Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Prague', tz: 'Europe/Prague', lat: 50.0755, lon: 14.4378 },
];

// Weather barely moves minute to minute, so it is refetched rarely; the clocks
// retick far more often (and far more cheaply — no network).
const WEATHER_MS = 15 * 60 * 1000;
const CLOCK_MS = 20 * 1000;

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${CITIES.map((c) => c.lat).join(',')}` +
  `&longitude=${CITIES.map((c) => c.lon).join(',')}` +
  '&current=temperature_2m';

// Fetch every city's current temperature in one call. Open-Meteo returns an
// array when several locations are asked for and a bare object for one, so
// normalise to an array. Keyed by city name; a city missing from the reply is
// simply left out and shown without a temperature.
async function fetchTemps() {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`weather request failed: ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];
  const temps = {};
  list.forEach((loc, i) => {
    const t = loc?.current?.temperature_2m;
    if (typeof t === 'number' && CITIES[i]) temps[CITIES[i].name] = Math.round(t);
  });
  return temps;
}

function localTime(tz) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

// e.g. "Belgrade 14:32 · 22°" — the temperature is dropped until it has loaded.
function cityLabel(city, temps) {
  const temp = temps[city.name];
  const tail = temp == null ? '' : ` · ${temp}°`;
  return `${city.name} ${localTime(city.tz)}${tail}`;
}

// One repeat of the strip: welcome, city, welcome, city, … each followed by a
// separator. The track holds two identical groups and slides by -50%, so both
// groups must be built the same way; the second is hidden from screen readers.
function buildGroup(temps, ariaHidden) {
  const group = document.createElement('span');
  group.className = 'marquee-group';
  if (ariaHidden) group.setAttribute('aria-hidden', 'true');

  const add = (text, className) => {
    const span = document.createElement('span');
    span.textContent = text;
    if (className) span.className = className;
    group.append(span);
  };
  const separator = () => {
    const sep = document.createElement('span');
    sep.textContent = '✦';
    sep.className = 'marquee-sep';
    sep.setAttribute('aria-hidden', 'true');
    group.append(sep);
  };

  for (const city of CITIES) {
    add(WELCOME);
    separator();
    add(cityLabel(city, temps), 'marquee-city');
    separator();
  }
  return group;
}

// Rebuild both groups in place. The scroll animation lives on the track itself,
// which is left untouched, so swapping its children never interrupts the slide.
function render(track, temps) {
  track.replaceChildren(buildGroup(temps, false), buildGroup(temps, true));
}

// Match the ribbon backdrop's scroll speed to the text's. The text travels one
// group's width over its own animation duration, so its pixel speed is
// groupWidth / textDuration. The ribbon must cover one tile (--ribbon-w, which
// is strip-height × the image's 3508/121 aspect) at that same speed, so its
// duration is tileWidth / textSpeed. Re-run whenever the group width changes
// (weather loading, a resize): the ribbon tiles are identical, so restarting
// its animation is invisible — there is no seam or landmark to betray a jump.
function syncRibbonSpeed(strip, track) {
  const group = track.querySelector('.marquee-group');
  if (!group) return;
  const groupWidth = group.getBoundingClientRect().width;
  const textDuration = parseFloat(getComputedStyle(track).animationDuration) || 0;
  if (!groupWidth || !textDuration) return; // reduced motion / not laid out yet

  const stripHeight = strip.getBoundingClientRect().height;
  const tileWidth = (stripHeight * 3508) / 121;
  const ribbonDuration = (tileWidth * textDuration) / groupWidth;
  strip.style.setProperty('--ribbon-duration', `${ribbonDuration}s`);
}

export function initMarquee(root) {
  const track = root?.querySelector('.marquee-track');
  if (!track) return;

  let temps = {};
  const draw = () => {
    render(track, temps);
    syncRibbonSpeed(root, track);
  };
  // Only the text on this first pass: syncing the ribbon means measuring the
  // strip, and at this point the site is still hidden behind the intro, so
  // there is nothing to measure — all forcing a layout this early would
  // achieve is a warning about doing it before the stylesheet has landed. The
  // observer below does the first real sync.
  render(track, temps);

  const loadWeather = () =>
    fetchTemps()
      .then((t) => {
        temps = t;
        draw();
      })
      .catch(() => {}); // no weather is fine — the clocks still run

  loadWeather();
  setInterval(draw, CLOCK_MS);
  setInterval(loadWeather, WEATHER_MS);
  // The strip has no size while the intro hides the site, so the first sync
  // measures zero and is skipped. A ResizeObserver re-syncs the instant the
  // strip gains a size (when the site is revealed) and on every later size
  // change — the mobile breakpoint's shorter strip, an orientation flip — each
  // of which changes the tile width. Cheaper and more reliable than guessing
  // when the strip becomes visible.
  new ResizeObserver(() => syncRibbonSpeed(root, track)).observe(root);
}
