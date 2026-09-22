// The atelier view: a collection of posts. On a wide screen they sit in a row
// and scroll sideways; on a phone they stack and scroll down, and each post's
// parts (text, poster) scroll sideways within it. The first post is the
// atelier itself, over a photograph picked afresh each time the view opens.

const BACKGROUNDS = [
  'assets/atelier-1.jpg',
  'assets/atelier-2.jpg',
  'assets/atelier-3.jpg',
  'assets/atelier-4.jpg',
];

const POSTS = [
  {
    parts: [
      {
        type: 'cover',
        title: 'The Atelier',
        paragraphs: [
          'The Atelier is in the traditional sense the artist’s abode. A place '
            + 'of experiment and creation, where intention meets instinct.',
          'The founder, creative director and perfumer of the atelier is Hadži '
            + 'Aleksandar Columby-Micić (also known as Aleksandar Columby), while '
            + 'its muses are many. Drawing inspiration from raw materials, natural '
            + 'and urban scentscapes, family history and close friends. At Aleks '
            + 'Parfumy, we believe that with great care, meticulous attention to '
            + 'detail and refined craftsmanship, anything can be transformed into '
            + 'a fragrance.',
          'The AP Atelier is a spacetime in which inspirations and ideas spring '
            + 'up, fly, melt and transmute into creations that live unbound. For '
            + 'Columby-Micić the Atelier transcends the spatial dimension, and '
            + 'operates as a consciousness of its own, requiring interpretation '
            + 'by the perfumer who allows it to weave its fragrant threads into '
            + 'the hearts of our customers.',
          'It is here where the whole process of creation and production takes '
            + 'place, from drawing concepts and running tests, to creative '
            + 'composition, bottling and finally packaging. All AP fragrances are '
            + 'hand-crafted in Prague by Columby-Micić himself.',
        ],
      },
    ],
  },
  {
    parts: [
      {
        type: 'text',
        eyebrow: 'News',
        date: '28 August',
        title: 'Invisible Placemakers',
        paragraphs: [
          'Galerija Čubra, Patrijarha Varnave, 29–30 August, 12–20h. The '
            + 'exhibition explores scent as an invisible architectural material '
            + 'that occupies space, follows movement through the city, attaches '
            + 'itself to memory, and participates in shaping what we experience '
            + 'as home.',
        ],
      },
      {
        type: 'poster',
        src: 'assets/exhibition.jpg',
        alt: 'Invisible Placemakers poster',
      },
    ],
  },
  {
    parts: [
      {
        type: 'text',
        eyebrow: 'Workshop',
        title: 'Mirisne Niti',
        paragraphs: [
          'The Mirisne Niti (Threads of Scent) workshop was held for the first '
            + 'time as part of a collaboration between Čubra Gallery and Aleks '
            + 'Parfumy. The workshop uses scent as a nonverbal, shared element '
            + 'for exploring a common emotional and experiential space through '
            + 'embodied, attentive listening and collective storytelling.',
          'The olfactory materials include raw ingredients, some freshly '
            + 'gathered in Stara Planina and others drawn from our everyday '
            + 'lives, including several raw materials used in original, composed '
            + 'fragrances.',
          'The workshop facilitator, Hadži Aleksandar Columby-Micić, artist and '
            + 'perfumer, approaches the workshop as a curator of attention, '
            + 'creating the conditions and time necessary for participants to '
            + 'access their own memories, rather than producing or directing the '
            + 'content in advance.',
        ],
      },
      {
        type: 'poster',
        src: 'assets/poster_radionica_APxChubra.JPG',
        alt: 'Mirisne Niti workshop poster',
      },
    ],
  },
];

function renderParagraphs(paragraphs) {
  return paragraphs.map((p) => `<p>${p}</p>`).join('');
}

function renderPart(part) {
  if (part.type === 'cover') {
    return `
      <div class="atelier-part atelier-part--cover">
        <div class="atelier-part-text atelier-part-text--cover">
          <h2>${part.title}</h2>
          ${renderParagraphs(part.paragraphs)}
        </div>
      </div>`;
  }
  if (part.type === 'text') {
    return `
      <div class="atelier-part atelier-part--text">
        <div class="atelier-part-inner">
          <p class="home-eyebrow">${part.eyebrow ?? ''}</p>
          ${part.date ? `<p class="atelier-post-date">${part.date}</p>` : ''}
          <h2 class="atelier-post-title">${part.title}</h2>
          ${part.paragraphs.map((p) => `<p class="atelier-post-body">${p}</p>`).join('')}
        </div>
      </div>`;
  }
  return `
    <div class="atelier-part atelier-part--poster">
      <img src="${part.src}" alt="${part.alt}">
    </div>`;
}

export function initAtelier(root) {
  const scroll = root.querySelector('#atelier-scroll');
  scroll.innerHTML = POSTS.map((post) => `
    <article class="atelier-post">
      <div class="atelier-post-parts${post.parts.length === 1 ? ' atelier-post-parts--single' : ''}">
        ${post.parts.map(renderPart).join('')}
      </div>
    </article>`).join('');

  // Warm the cache so the first opening does not flash an empty photograph.
  for (const src of BACKGROUNDS) {
    const image = new Image();
    image.src = src;
  }

  const cover = scroll.querySelector('.atelier-part--cover');
  let previous = -1;

  function pickBackground() {
    let index = Math.floor(Math.random() * BACKGROUNDS.length);
    // Never the same photograph twice in a row, so opening the view again
    // visibly changes it.
    if (index === previous && BACKGROUNDS.length > 1) {
      index = (index + 1 + Math.floor(Math.random() * (BACKGROUNDS.length - 1)))
        % BACKGROUNDS.length;
    }
    previous = index;
    cover.style.backgroundImage = `url('${BACKGROUNDS[index]}')`;
  }

  return {
    activate() {
      // Each opening lands back on the first post, and on a fresh photograph.
      scroll.scrollTop = 0;
      scroll.scrollLeft = 0;
      pickBackground();
    },
  };
}
