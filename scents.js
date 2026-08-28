// The scents view: the bloom, in the colours it was drawn in, hung in evenly
// spaced columns, each one a button into that scent's own page. Only each
// bloom's height and the left-to-right order are rolled; the columns stay
// even.

import { initInquiry } from './inquiry.js';

// The collection panel beside the field. Two beats, so two paragraphs — the
// same shape as a scent's own story above.
export const COLLECTION = {
  name: 'The Collection',
  photo: 'assets/collection.jpg',
  description: [
    'Prague Atelier Series is a tribute to Prague. A tribute to the city where '
      + 'I was born, which taught me how to discover the world and then sent me '
      + 'out into it.',
    'The collection includes AP icons (Radnaskela, Korenatac, Shafraniya), one '
      + 'new composition (Vunamaya), a reinterpretation of an archival work '
      + '(Pazafaun), as well as two new eau de cologne versions of classic works.',
  ],
};

// The seven works of the atelier. Korenatac and Radnaskela each have a second,
// lighter version alongside the regular one — its own scent with its own page,
// not a size of the same thing — which is why there are seven of them and five
// names. The regular ones go by the name alone; only the cologne says so.
//
// The ids are what the Parfum Finder scores toward (see scent-finder.js) and
// they double as the photographs' filenames, so a regular version keeps the
// -edt in its id (that is what its photograph is called) whatever it is called
// on the page.
//
// The notes are the perfume's pyramid, so they are grouped as it is written:
// three rows, top to base, and shown as three rows on the page.
export const SCENTS = [
  {
    id: 'korenatac-edt',
    photo: 'assets/scents/korenatac-edt.jpg',
    name: 'Korenatac',
    tagline: 'Invocation of a water spring from Stara Planina',
    story: [
      'Every summer, when visiting my grandparents in Serbia, our grandfather Ratko would take us on a pilgrimage to a cave, from which we would drink the freezing water with our bare hands. Ratko, a hydrologist himself, connected the spring to the nearby villages, thereby granting the villages access to the source of all life, water.',
      'This is Korenatac, a fresh water spring in Stara Planina tucked in a lush green river valley overflowing with wildlife and lined with age-old trees. The fragrance captures all the layers of the journey to the spring. Looking up at the fresh sappy tree canopy, uncovering the tall forest grass and ferns, breathing the mineralic humidity of the cave itself and touching the rich rain-soaked earth from which all life sprang.',
    ],
    notes: [
      ['galbanum', 'italian bergamot', 'omani frankincense co2'],
      ['vetiver', 'patchouli', 'geosmin', 'Balkan mountain water'],
      ['oakmoss tincture from Stara Planina', 'nagarmotha', 'truffle'],
    ],
  },
  {
    id: 'korenatac-edc',
    photo: 'assets/scents/korenatac-edc.jpg',
    name: 'Korenatac EDC',
    tagline: 'Invocation of a water spring from Stara Planina',
    story: [
      'The eau de cologne version of Korenatac brings the fizzy citrus and frankincense complex to the heart of the fragrance.',
      'Every summer, when visiting my grandparents in Serbia, our grandfather Ratko would take us on a pilgrimage to a cave, from which we would drink the freezing water with our bare hands. Ratko, a hydrologist himself, connected the spring to the nearby villages, thereby granting the villages access to the source of all life, water.',
      'This is Korenatac, a fresh water spring in Stara Planina tucked in a lush green river valley overflowing with wildlife and lined with age-old trees. The fragrance captures all the layers of the journey to the spring. Looking up at the fresh sappy tree canopy, uncovering the tall forest grass and ferns, breathing the mineralic humidity of the cave itself and touching the rich rain-soaked earth from which all life sprang.',
      'The EDCs were originally created for Columby-Micić’s private use, but seeing interest in lighter concentrations and knowing how well these formulas perform in this format, I decided to include them in the Prague Atelier Series.',
    ],
    notes: [
      ['galbanum', 'italian bergamot', 'omani frankincense co2'],
      ['vetiver', 'patchouli', 'geosmin', 'Balkan mountain water'],
      ['oakmoss tincture from Stara Planina', 'nagarmotha', 'truffle'],
    ],
  },
  {
    id: 'radnaskela-edt',
    photo: 'assets/scents/radnaskela-edt.jpg',
    name: 'Radnaskela',
    tagline: 'Aleksandar backwards: a poem of East and West',
    story: [
      'A fragrant autograph of Columby-Micić himself, Radnaskela is the ultimate Aleks Parfum. If your star-crossed destiny means you can only wear one of our fragrances, this is the one you can’t miss.',
      'The tension of opposites attracting each other and pushing each other away makes for a chic equilibrium of rawness and elegance. This is not an ordinary fougère by any means. While Radnaskela clearly offers a nod to the French greats of the past two centuries, it also brings forth a characteristic middle-eastern sillage that will make you unforgettable wherever you tread, East or West.',
    ],
    notes: [
      ['italian bergamot', 'iranian lime', 'lavender absolute'],
      ['tonka bean', 'amber', 'omani frankincense co2', 'vetiver', 'indian mysore sandalwood'],
      ['patchouli', 'ethiopian civet paste tincture', 'musk', 'oakmoss tincture from Stara Planina'],
    ],
  },
  {
    id: 'radnaskela-edc',
    photo: 'assets/scents/radnaskela-edc.jpg',
    name: 'Radnaskela EDC',
    tagline: 'Aleksandar backwards: a poem of East and West',
    story: [
      'The eau de cologne version of the AP classic Radnaskela accentuates at once the fragrance’s sparkling top notes and its warming and animalic qualities.',
      'The tension of opposites attracting each other and pushing each other away makes for a chic equilibrium of rawness and elegance. This is not an ordinary fougère by any means. While Radnaskela clearly offers a nod to the French greats of the past two centuries, it also brings forth a characteristic middle-eastern sillage that will make you unforgettable wherever you tread, East or West.',
      'Due to the scent’s lower concentration compared to the eau de toilette, its staying power is softer, but the overall effect is that much more demure and chic.',
    ],
    notes: [
      ['italian bergamot', 'iranian lime', 'lavender absolute'],
      ['tonka bean', 'amber', 'omani frankincense co2', 'vetiver', 'indian mysore sandalwood'],
      ['patchouli', 'ethiopian civet paste tincture', 'musk', 'oakmoss tincture from Stara Planina'],
    ],
  },
  {
    id: 'pazafaun',
    photo: 'assets/scents/pazafaun.jpg',
    name: 'Pazafaun',
    tagline: 'A mythical forest guardian bathed in sandalwood soap',
    story: [
      'Even forest fays do enjoy a good bath. The mythical Pazafaun escapes their duties to enjoy a moment with themselves. Bathing with an Indian sandalwood soap bar in the midst of a verdant rainforest, they let the resinous warmth rise through the steam. When the mind and body both are as clean as the sky, they go back to their endless watch of protecting the spirit of the forest.',
      'At the core of Pazafaun sits a sandalwood soap accord inspired by the iconic Indian Mysore Sandal Soap which serves as the main material inspiration behind the fragrance. This alluring soap bar is constructed using vetiver, sandalwood, clove and rose materials, which are not listed individually.',
    ],
    notes: [
      ['galbanum resinoid', 'labdanum essential oil'],
      ['mysore sandal soap', 'orris root powder', 'fig milk'],
      ['amber', 'oakmoss tincture from Stara Planina', 'peruvian ambrette seed'],
    ],
  },
  {
    id: 'vunamaya',
    photo: 'assets/scents/vunamaya.jpg',
    name: 'Vunamaya',
    tagline: 'The last afternoon with your childhood friend who is a sheep',
    story: [
      'Sitting on a sun-scorched meadow somewhere in the Balkans at sunset, it was the last day you spent with your animal friend, a sheep called Maya. And even though your childhood might pass by in the blink of an eye, embracing her soft, berry-like, woolen coat wraps you in eternity.',
      'Vunamaya is one of those scents that didn’t take a long time to develop, but became a best-seller right after being released. Animalic materials speak to Columby-Micić like no other and once he had tried the wool absolute produced by Biolandes, he knew that this material had to be approached with great respect. Tainting the material’s beauty had to be avoided at all costs, while taming the material was essential in order to make it wearable in everyday contexts. The ethically sourced material is made from byproducts of the wool industry and is therefore classified as green in its environmental impact.',
      'At once welcoming and sensual, Vunamaya melts into your body’s musk which blooms the scent, revealing a captivating personal bouquet.',
    ],
    notes: [
      ['raspberry', 'cognac', 'kačkavalj cheese'],
      ['wool absolute from New Zealand', 'cashmeran', 'cedarwood'],
      ['velvione', 'vanilla', 'lilac'],
    ],
  },
  {
    id: 'shafraniya',
    photo: 'assets/scents/shafraniya.jpg',
    name: 'Shafraniya',
    tagline: 'A jewel-bright saffron bloom steeped in osmanthus and peach',
    story: [
      'Unlike many works of AP, Shafraniya is not tame. Quite the opposite, she casts a loud and confident sillage of rejuvenating and cold sweetness. Although she is the most gourmand scent Columby-Micić ever created, she never becomes cloying or too sweet.',
      'After 3 years from setting out on the journey of interpreting saffron in the language of Aleks Parfumy, Shafraniya was born and became one of the most sought-after works of AP ever: she is often sold out and always desired.',
      'Drawing on its fruity facets, saffron is reimagined as a dried fruit complex, expanded and contrasted with a peach ice tea accord that brings a bright addictive radiance to the scent, while osmanthus ties the whole composition together with floral and leathery aspects.',
    ],
    notes: [
      ['fruity saffron', 'peach ice tea'],
      ['chinese osmanthus absolute', 'saffron', 'dried plums'],
      ['rose', 'airy woods', 'suede', 'amber'],
    ],
  },
];

// A bloom's size ceiling, and the fraction of its column it may fill once
// rotation is accounted for. A rotated square is bounded by its circumcircle
// (half the diagonal, hence the √2), so filling the whole column would let
// corners touch; COLUMN_FILL leaves a gap between neighbours.
const SIZE_MAX_PX = 150;
const COLUMN_FILL = 0.82;

// Room under a bloom for its name, in px, plus a little air under that so the
// lowest name never sits flush against the bottom of the field.
const LABEL_SPACE = 30;
const BOTTOM_AIR = 14;

// The shortest string worth drawing, as a fraction of the shape's own size: any
// less and the bloom reads as stuck to the ceiling rather than hung from it.
// It also keeps the whole shape clear of the top edge, since the string is what
// holds it down from there.
const STRING_MIN = 0.55;

// The three rows of the pyramid, named on the page in the order every scent's
// notes are written in.
const NOTE_ROWS = ['Top', 'Middle', 'Base'];

/** A fresh 0..n-1 in random order (Fisher–Yates), used to shuffle the blooms. */
function shuffledIndices(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * @param root the scents view
 * @param onDetailChange called with true when a single scent's page is opened
 *   and false when the field comes back, so the sidebar can follow
 */
export function initScents(root, { onDetailChange } = {}) {
  const overview = root.querySelector('#scent-overview');
  const field = root.querySelector('#scent-field');
  const title = root.querySelector('#scent-collection-title');
  const info = root.querySelector('#scent-collection-info');
  const detail = root.querySelector('#scent-detail');
  const inquiry = initInquiry();
  let openScent = null;

  // Its own element, not part of #scent-collection-info: on a phone it moves
  // above the field instead of staying with the photo and text below it.
  title.innerHTML = `
    <p class="home-eyebrow">Aleks Parfumy</p>
    <h2 class="scent-collection-name">${COLLECTION.name}</h2>`;

  info.innerHTML = `
    <img class="scent-collection-photo" src="${COLLECTION.photo}" alt="">
    ${COLLECTION.description.map((p) => `<p class="scent-collection-description">${p}</p>`).join('')}`;

  // Each bloom is a group: a string+shape piece that swings as one rigid
  // whole when hovered, pivoting from the string's real anchor at the top of
  // the field (see place(), which sizes .scent-bloom to reach there), plus
  // the name outside that piece, so it never swings along with it. The shape
  // is the only real hit target inside the piece (see the CSS) — the name
  // still opens the scent too, since the click handler below reads the
  // group, not just the shape.
  field.innerHTML = SCENTS.map(({ id, name }) => `
    <span class="scent-bloom-group" data-scent="${id}">
      <button class="scent-bloom" type="button" aria-label="${name}">
        <span class="scent-string" aria-hidden="true"></span>
        <span class="shape shape--flower-colour scent-shape" aria-hidden="true"></span>
      </button>
      <span class="scent-name">${name}</span>
    </span>`).join('');

  const groups = [...field.querySelectorAll('.scent-bloom-group')];

  // Drive the swing from entering the shape rather than from :hover. The swing
  // rotates the shape out from under the cursor, which would drop :hover and
  // abort a hover-driven animation mid-arc; holding a class until the animation
  // ends lets it always finish. Leaving is ignored on purpose — a swing in
  // flight is never cut short — and adding the class while it is already there
  // is a no-op, so it will not restart until it has cleared and the cursor
  // genuinely re-enters. Skipped under reduced motion, where the animation (and
  // so its animationend) never runs and the class would otherwise stick.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  for (const group of groups) {
    const bloom = group.querySelector('.scent-bloom');
    const shape = group.querySelector('.scent-shape');
    shape.addEventListener('pointerenter', () => {
      if (!reduceMotion.matches) bloom.classList.add('is-swinging');
    });
    bloom.addEventListener('animationend', (event) => {
      if (event.animationName === 'scent-swing') bloom.classList.remove('is-swinging');
    });
  }

  // What the field last rolled: which column each bloom took, how far down it
  // hung (as a fraction of the reach available, so it survives a change of
  // height), and how its shape was turned. Held between lay-outs because a
  // re-fit is not a re-roll — folding the phone's bottom strip away resizes the
  // field, and the arrangement should ride that out rather than be thrown again.
  let arrangement = null;

  function roll() {
    arrangement = {
      order: shuffledIndices(groups.length),
      drops: groups.map(() => Math.random()),
      rots: groups.map(() => Math.round(Math.random() * 360)),
    };
  }

  /**
   * Lays the blooms out for the field's current size. Rolls a fresh arrangement
   * when asked (opening the view), otherwise re-fits the one already on screen.
   */
  function place({ reroll = false } = {}) {
    const { width, height } = field.getBoundingClientRect();
    if (!width || !height) return; // hidden view: nothing to measure yet

    if (reroll || !arrangement) roll();
    const { order, drops, rots } = arrangement;

    const n = groups.length;
    const colWidth = width / n;

    // One shared size for every bloom (no longer rolled): the largest that fits
    // a column side to side once rotation is taken into account, capped, and
    // never so tall that a bloom hung at the top has no room for its label.
    const fitByColumn = (colWidth / Math.SQRT2) * COLUMN_FILL;
    // Tall enough for the shape, the shortest string it may hang from, its name
    // and the air below — so a bloom always fits the field whole, whichever
    // height it is then given.
    const fitByHeight =
      (height - LABEL_SPACE - BOTTOM_AIR) / (1 + STRING_MIN);
    const size = Math.max(24, Math.min(SIZE_MAX_PX, fitByColumn, fitByHeight));

    // The two things that are rolled: the left-to-right order (which column each
    // bloom takes) and each bloom's own hang height. Columns are fixed and even.
    // The height is the whole reach — string and shape together — so the bounds
    // are what keep the shape off the top edge at one end and its name off the
    // bottom at the other.
    const minHeight = size * (1 + STRING_MIN);
    const maxHeight = Math.max(minHeight, height - LABEL_SPACE - BOTTOM_AIR);

    groups.forEach((group, i) => {
      // Evenly spaced column centres; `order` shuffles which bloom lands where.
      const x = colWidth * (order[i] + 0.5);
      group.style.left = `${(x / width) * 100}%`;

      const bloom = group.querySelector('.scent-bloom');
      // The bloom reaches from the top of the field (its own top edge, where it
      // pivots) down to where the shape hangs — a random height per bloom.
      // --size goes on the bloom, not the shape, so the string (the shape's
      // sibling) can read it too, to know where the shape's centre is.
      bloom.style.height =
        `${minHeight + drops[i] * (maxHeight - minHeight)}px`;
      bloom.style.setProperty('--size', `${size}px`);
      // --rot goes on the shape itself: .shape declares its own --rot, which
      // would shadow anything inherited from an ancestor.
      group.querySelector('.scent-shape')
        .style.setProperty('--rot', `${rots[i]}deg`);
    });
  }

  function showDetail(scent) {
    openScent = scent;
    detail.innerHTML = `
      <div class="scent-detail-col">
        <h2 class="scent-detail-name">${scent.name}</h2>
        <p class="scent-detail-tagline">${scent.tagline}</p>
        <div class="scent-detail-story">
          ${scent.story.map((p) => `<p>${p}</p>`).join('')}
        </div>
      </div>

      <div class="scent-detail-col">
        <img class="scent-detail-photo" src="${scent.photo}"
             alt="${scent.name}, photographed on skin">
        <div class="scent-detail-notes">
          <h3>Notes</h3>
          <!-- One row of the pyramid to a box, each named, in the order the
               perfume is written: top, middle, base. The long rows wrap to two
               lines of notes, so a box around each row is what keeps a wrap
               from reading as the next layer down. -->
          <ul>${scent.notes.map((row, i) => `
            <li>
              <span class="scent-note-label">${NOTE_ROWS[i] ?? ''}</span>
              <span class="scent-note-list">${
                row.map((n) => `<span class="scent-note">${n}</span>`).join('')
              }</span>
            </li>`).join('')}</ul>
        </div>
        <button class="scent-inquire" type="button">Inquire</button>
      </div>`;
    overview.hidden = true;
    detail.hidden = false;
    onDetailChange?.(true);
  }

  function showField() {
    detail.hidden = true;
    overview.hidden = false;
    place({ reroll: true });
    onDetailChange?.(false);
  }

  field.addEventListener('click', (event) => {
    const group = event.target.closest('.scent-bloom-group');
    if (!group) return;
    const scent = SCENTS.find((s) => s.id === group.dataset.scent);
    if (scent) showDetail(scent);
  });

  // The way back to the field is the bloom the sidebar wears while a scent is
  // open (see main.js), and Escape below — the page itself carries no mark.
  detail.addEventListener('click', (event) => {
    if (event.target.closest('.scent-inquire') && openScent) {
      inquiry.open(openScent.name);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || root.hidden || detail.hidden) return;
    // Escape belongs to the popup when one is open: closing it should not also
    // send the page behind it back to the field.
    if (document.querySelector('dialog[open]')) return;
    showField();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (root.hidden || overview.hidden) return;
    clearTimeout(resizeTimer);
    // Re-fit after a resize, so the even columns and sizes suit the new width —
    // the arrangement itself is kept, not thrown again.
    resizeTimer = setTimeout(() => place(), 150);
  });

  return {
    // Called each time the view is opened: back to the field, freshly rolled.
    activate() {
      showField();
    },
    /** Back to the field from a scent's own page — used by the sidebar. */
    showField,
    /** Opens one scent's page directly, e.g. from the featured card at home. */
    openScent(id) {
      const scent = SCENTS.find((s) => s.id === id);
      if (scent) showDetail(scent);
    },
  };
}
