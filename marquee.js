// The bottom scrolling strip. It alternates the welcome line with the local
// time and temperature in the three cities Aleks Parfumy keeps time with, so
// the strip reads:
//
//   welcome ◆ Belgrade ◆ welcome ◆ Cairo ◆ welcome ◆ Prague ◆  (then repeats)
//
// The ◆ is not a typed glyph — it is a small rotated square drawn in CSS
// (see .marquee-sep in style.css). The character it replaces (✦) is missing
// from many fonts, including the bundled one, and a missing glyph renders as
// nothing or a tofu box on some systems; a drawn shape is identical everywhere.
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
// separator. The track holds two identical groups and slides by one group's
// width, so both groups must be built the same way; the second is hidden from
// screen readers.
function buildGroup(temps, ariaHidden) {
  const group = document.createElement('span');
  group.className = 'marquee-group';
  if (ariaHidden) group.setAttribute('aria-hidden', 'true');

  const cities = [];
  const add = (text, className) => {
    const span = document.createElement('span');
    span.textContent = text;
    if (className) span.className = className;
    group.append(span);
    return span;
  };
  const separator = () => {
    const sep = document.createElement('span');
    sep.className = 'marquee-sep';
    sep.setAttribute('aria-hidden', 'true');
    group.append(sep);
  };

  for (const city of CITIES) {
    add(WELCOME);
    separator();
    const citySpan = add(cityLabel(city, temps), 'marquee-city');
    cities.push({ city, span: citySpan });
    separator();
  }
  return { group, cities };
}

// The text's one full cycle: it travels exactly one group's width in this time.
const TEXT_DURATION_S = 60;

// Match the ribbon backdrop's speed to the text's. The text travels one group's
// width over TEXT_DURATION_S, so its pixel speed is groupWidth / TEXT_DURATION_S.
// The ribbon must cover one tile (--ribbon-w, which is strip-height × the
// image's 3508/121 aspect) at that same speed, so its duration is tileWidth /
// textSpeed. Re-run whenever the group width changes (weather loading, a
// resize): the ribbon tiles are identical, so restarting its animation is
// invisible — there is no seam or landmark to betray a jump.
export function initMarquee(root) {
  const track = root?.querySelector('.marquee-track');
  if (!track) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let temps = {};
  let textRafId = null;
  let pos = 0;
  let lastTime = performance.now();
  let speed = 0; // px per second
  let lastGroupWidth = 0;
  let lastRibbonDuration = 0;
  let citySpans = [];

  function render() {
    const first = buildGroup(temps, false);
    const second = buildGroup(temps, true);
    track.replaceChildren(first.group, second.group);
    citySpans = [...first.cities, ...second.cities];
  }

  // Update only the city/time/temperature text in place. The welcome line and
  // separators never change, so there is no need to rebuild the DOM every tick
  // — replacing children on a moving, composited track is a good way to make
  // iOS text blink or jump.
  function updateCityText() {
    for (const { city, span } of citySpans) {
      span.textContent = cityLabel(city, temps);
    }
  }

  function syncRibbonSpeed(groupWidth) {
    if (!groupWidth) return;
    const stripHeight = root.getBoundingClientRect().height;
    if (!stripHeight) return;
    const tileWidth = (stripHeight * 3508) / 121;
    const ribbonDuration = (tileWidth * TEXT_DURATION_S) / groupWidth;
    // Only touch the style when the value actually changes enough to matter,
    // so the ribbon animation isn't restarted by sub-pixel measurement wobble.
    if (Math.abs(ribbonDuration - lastRibbonDuration) < 0.05) return;
    lastRibbonDuration = ribbonDuration;
    root.style.setProperty('--ribbon-duration', `${ribbonDuration}s`);
  }

  // Animate the text with a rAF loop, snapping the transform to whole pixels.
  // A continuously interpolated transform leaves the glyphs on sub-pixel
  // positions, which reads as a slight shimmer/wobble on moving text. Whole-pixel
  // steps keep it still. The transform is still composited by the browser, so it
  // moves on the same GPU timeline as the ribbon; the loop just decides the
  // position each frame.
  //
  // (An earlier attempt used the Web Animations API plus will-change:transform
  // to hand this to the compositor outright, but that made iOS Safari drop the
  // text entirely — so it stays on this plain rAF loop, which is what Safari
  // has proven it can render.)
  function startTextAnimation(groupWidth) {
    if (reduced) return;
    // Restart only on a meaningful change. A clock tick can nudge a digit's
    // width by a pixel or two when the font's figures aren't tabular; restarting
    // then would jump the whole strip once a minute. Real changes — weather
    // loading, a breakpoint flip — are tens or hundreds of pixels.
    if (!groupWidth || Math.abs(groupWidth - lastGroupWidth) < 2) return;
    lastGroupWidth = groupWidth;
    speed = groupWidth / TEXT_DURATION_S;

    if (textRafId) cancelAnimationFrame(textRafId);
    pos = 0;
    lastTime = performance.now();
    textRafId = requestAnimationFrame(step);
  }

  function step(now) {
    textRafId = requestAnimationFrame(step);
    // No upper clamp on dt. The text must advance by the real elapsed time so
    // it stays in step with the ribbon's CSS animation; clamping used to cap a
    // late frame at 0.1s and silently throw the rest away, so every main-thread
    // stall left the text permanently behind the ribbon.
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    pos += speed * dt;
    if (pos >= lastGroupWidth) pos -= lastGroupWidth;
    track.style.transform = `translateX(${-Math.round(pos)}px)`;
  }

  function sync() {
    const group = track.querySelector('.marquee-group');
    const groupWidth = group ? Math.round(group.getBoundingClientRect().width) : 0;
    syncRibbonSpeed(groupWidth);
    startTextAnimation(groupWidth);
  }

  render();

  const loadWeather = () =>
    fetchTemps()
      .then((t) => {
        temps = t;
        updateCityText();
        sync();
      })
      .catch(() => {}); // no weather is fine — the clocks still run

  loadWeather();
  setInterval(() => {
    updateCityText();
    sync();
  }, CLOCK_MS);
  setInterval(loadWeather, WEATHER_MS);

  // The strip already has a size during the intro (the site is kept in the
  // layout, just faded out), so this observer's first pass can already measure
  // and sync. It re-syncs on every later size change — the mobile breakpoint's
  // shorter strip, an orientation flip — each of which changes the tile width.
  new ResizeObserver(sync).observe(root);
}
