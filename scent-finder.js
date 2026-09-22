import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadModel, frameModel, MODEL_CENTER, ANCHOR_NAME, goldMaterial, unmirrorAnchor } from './model.js';
import { SCENTS } from './scents.js';

// ---- Questions -------------------------------------------------------------
// Each answer scores a point for the scent(s) it maps to (from the atelier's
// answer table); the scent with the most points at the end is the recommendation,
// ties broken at random (see computeResult). Most answers favour a single scent,
// but the astrological element has only four options across seven scents, so
// those answers each score for more than one — hence `scents` is always a list.
const S = {
  KORENATAC_EDT: 'korenatac-edt',
  KORENATAC_EDC: 'korenatac-edc',
  RADNASKELA_EDT: 'radnaskela-edt',
  RADNASKELA_EDC: 'radnaskela-edc',
  PAZAFAUN: 'pazafaun',
  VUNAMAYA: 'vunamaya',
  SHAFRANIYA: 'shafraniya',
};

const QUESTIONS = [
  {
    question: 'Which city appeals to you the most?',
    answers: [
      { text: 'Toronto', scents: [S.KORENATAC_EDT] },
      { text: 'Belgrade', scents: [S.KORENATAC_EDC] },
      { text: 'Paris', scents: [S.RADNASKELA_EDT] },
      { text: 'Prague', scents: [S.RADNASKELA_EDC] },
      { text: 'Bengaluru', scents: [S.PAZAFAUN] },
      { text: 'Ulaanbaatar', scents: [S.VUNAMAYA] },
      { text: 'Cairo', scents: [S.SHAFRANIYA] },
    ],
  },
  {
    question: 'Choose a material.',
    answers: [
      { text: 'Rock', scents: [S.KORENATAC_EDT] },
      { text: 'Moss', scents: [S.KORENATAC_EDC] },
      { text: 'Fur', scents: [S.RADNASKELA_EDT] },
      { text: 'Linen', scents: [S.RADNASKELA_EDC] },
      { text: 'Wood', scents: [S.PAZAFAUN] },
      { text: 'Wool', scents: [S.VUNAMAYA] },
      { text: 'Plastic', scents: [S.SHAFRANIYA] },
    ],
  },
  {
    question: 'If you were an animal, you would most probably be...',
    answers: [
      { text: 'A river snake', scents: [S.KORENATAC_EDT] },
      { text: 'A doormouse', scents: [S.KORENATAC_EDC] },
      { text: 'A tiger', scents: [S.RADNASKELA_EDT] },
      { text: 'A cat', scents: [S.RADNASKELA_EDC] },
      { text: 'A monkey', scents: [S.PAZAFAUN] },
      { text: 'A sheep', scents: [S.VUNAMAYA] },
      { text: 'An octopus', scents: [S.SHAFRANIYA] },
    ],
  },
  {
    question: 'What is your astrological sign’s element?',
    answers: [
      { text: 'Water (Cancer, Scorpio, Pisces)', scents: [S.KORENATAC_EDT] },
      { text: 'Fire (Aries, Leo, Sagittarius)', scents: [S.KORENATAC_EDC, S.SHAFRANIYA] },
      { text: 'Earth (Taurus, Virgo, Capricorn)', scents: [S.RADNASKELA_EDT, S.VUNAMAYA] },
      { text: 'Air (Gemini, Libra, Aquarius)', scents: [S.RADNASKELA_EDC, S.PAZAFAUN] },
    ],
  },
  {
    question: 'If you could time travel, which time period would you go to?',
    answers: [
      { text: '2010s', scents: [S.KORENATAC_EDT] },
      { text: 'Y2K', scents: [S.KORENATAC_EDC] },
      { text: '80s', scents: [S.RADNASKELA_EDT] },
      { text: '19th century', scents: [S.RADNASKELA_EDC] },
      { text: '90s', scents: [S.PAZAFAUN] },
      { text: 'Prehistory', scents: [S.VUNAMAYA] },
      { text: '21st century', scents: [S.SHAFRANIYA] },
    ],
  },
];

// ---- Transition animation --------------------------------------------------
// The intro's pieces fade in where they belong, fly outward, then spiral back
// into place and fade away again — the intro's assembly, played as a loop.
const FADE_IN_MS = 350;
const FLY_OUT_MS = 600;
const CIRCLE_BACK_MS = 1000;
const FADE_OUT_MS = 400;
const TOTAL_MS = FADE_IN_MS + FLY_OUT_MS + CIRCLE_BACK_MS + FADE_OUT_MS;

// How far the pieces fly out, in world units.
const OUT_MIN = 14;
const OUT_MAX = 40;

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function randomQuaternion() {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 2
    )
  );
}

class ShapeTransition {
  constructor(canvas) {
    this.canvas = canvas;
    this.ready = null;
    this.playing = false;
  }

  /** Builds the scene from clones of the model's pieces. Runs once. */
  init() {
    if (!this.ready) {
      this.ready = loadModel().then(({ pieces }) => {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: true,
          alpha: true, // the page shows through behind the shapes
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose(); // only frees its own generation-time resources, not the texture above

        this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

        this.pieces = pieces.map(({ mesh, name, home }) => {
          const isAnchor = name === ANCHOR_NAME;
          // `home` is the authored pose, straight from the GLB and shared with
          // the intro, so it is read rather than written to. The monogram is
          // authored mirrored, and every frame below puts each piece back to
          // its home pose — so the flip has to live in the pose this scene
          // uses, not just in how the clone is first placed.
          const rest = isAnchor
            ? { ...home, quat: unmirrorAnchor(home.quat.clone()) }
            : home;

          // Clone so the intro keeps its own copy; geometry is shared, the
          // material is not, since opacity is animated per piece.
          const clone = mesh.clone();
          clone.position.copy(rest.pos);
          clone.quaternion.copy(rest.quat);
          clone.scale.copy(rest.scale);
          // The monogram flies with the rest, but in gold — the same metal it
          // is rendered in on the contact page, and the same warm accent the
          // sidebar's active mark wears. Every other piece keeps its own.
          //
          // Rougher than the contact page's polish, because this scene has no
          // lights in it: the pieces are lit by the environment alone, and a
          // polished surface with nothing to reflect comes out near-black (see
          // goldMaterial). Matte, it scatters that same environment the way
          // the pieces around it do, and sits among them instead of vanishing.
          clone.material = isAnchor
            ? goldMaterial(mesh.material, { roughness: 0.7 })
            : mesh.material.clone();
          clone.material.transparent = true;
          clone.material.opacity = 0;
          this.scene.add(clone);

          // Outward direction: away from the centre of the artwork, jittered so
          // the pieces do not fan out in a perfectly even star.
          const dir = rest.pos.clone().sub(MODEL_CENTER);
          if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
          dir.normalize().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
          )).normalize();

          return {
            mesh: clone,
            home: rest,
            out: rest.pos.clone().addScaledVector(dir, OUT_MIN + Math.random() * (OUT_MAX - OUT_MIN)),
            // Circle back around an axis roughly facing the viewer, so the arc
            // reads on screen rather than edge-on.
            axis: new THREE.Vector3(1, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5).normalize(),
            turns: (0.75 + Math.random() * 0.75) * (Math.random() < 0.5 ? -1 : 1),
            tumble: randomQuaternion(),
          };
        });
      });
    }
    return this.ready;
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    frameModel(this.camera, w / h);
  }

  setOpacity(value) {
    for (const piece of this.pieces) piece.mesh.material.opacity = value;
  }

  /**
   * Plays one transition. `onFadeOut` fires as the shapes start to fade, which
   * is when the caller should swap in the next question.
   */
  async play({ onFadeOut } = {}) {
    await this.init();
    if (this.playing) return;
    this.playing = true;
    this.resize();

    const offset = new THREE.Vector3();
    let faded = false;

    await new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const t = now - start;

        if (t < FADE_IN_MS) {
          // Fade in, at rest, where the pieces belong.
          this.setOpacity(t / FADE_IN_MS);
          for (const p of this.pieces) {
            p.mesh.position.copy(p.home.pos);
            p.mesh.quaternion.copy(p.home.quat);
          }
        } else if (t < FADE_IN_MS + FLY_OUT_MS) {
          const u = easeOut((t - FADE_IN_MS) / FLY_OUT_MS);
          this.setOpacity(1);
          for (const p of this.pieces) {
            p.mesh.position.lerpVectors(p.home.pos, p.out, u);
            p.mesh.quaternion.copy(p.home.quat).slerp(p.tumble, u);
          }
        } else if (t < FADE_IN_MS + FLY_OUT_MS + CIRCLE_BACK_MS) {
          // Spiral home: swing the outward offset around an axis while its
          // length shrinks to nothing, so each piece curves back into place.
          const u = easeInOut((t - FADE_IN_MS - FLY_OUT_MS) / CIRCLE_BACK_MS);
          for (const p of this.pieces) {
            offset.subVectors(p.out, p.home.pos)
              .applyAxisAngle(p.axis, p.turns * Math.PI * 2 * u)
              .multiplyScalar(1 - u);
            p.mesh.position.copy(p.home.pos).add(offset);
            p.mesh.quaternion.copy(p.tumble).slerp(p.home.quat, u);
          }
        } else if (t < TOTAL_MS) {
          if (!faded) {
            faded = true;
            onFadeOut?.();
          }
          this.setOpacity(1 - (t - FADE_IN_MS - FLY_OUT_MS - CIRCLE_BACK_MS) / FADE_OUT_MS);
          for (const p of this.pieces) {
            p.mesh.position.copy(p.home.pos);
            p.mesh.quaternion.copy(p.home.quat);
          }
        } else {
          this.setOpacity(0);
          this.renderer.render(this.scene, this.camera);
          if (!faded) onFadeOut?.();
          this.playing = false;
          resolve();
          return;
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
}

// ---- The view ---------------------------------------------------------------
export function initScentFinder(root, { onOpenScent } = {}) {
  const canvas = root.querySelector('#finder-fx');
  const panel = root.querySelector('#finder-panel');
  const transition = new ShapeTransition(canvas);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 'start' -> the invitation, 'question' -> the five questions, 'result'.
  let stage = 'start';
  let step = 0;
  const answers = [];
  let busy = false;

  function renderStart() {
    panel.innerHTML = `
      <p class="finder-step">Parfum Finder</p>
      <h2 class="finder-question">Find the right Aleks Parfum for you.</h2>
      <!-- The invitation is read as three separate beats, so each is its own
           paragraph rather than a line break inside one — they are separate
           thoughts, not one sentence wrapped, and the gap between them says so.

           An artefact hangs either side of the passage, the two of them turned
           in towards it. Decoration only, so they are hidden from assistive
           tech here and dropped altogether on anything too narrow to hold them
           beside the text — see .finder-glyph in the stylesheet. -->
      <div class="finder-intro-block">
        <span class="shape shape--finder-artefact finder-glyph finder-glyph--left"
              aria-hidden="true"></span>
        <p class="finder-intro">
          The works of the Aleks Parfumy atelier are all intriguing, but which one
          should cast its spell on you?
        </p>
        <p class="finder-intro">
          To guide you to the fragrance that matters most to you, we invite you to
          a unique experience of the AP Parfum Finder.
        </p>
        <p class="finder-intro">
          Answer 5 key questions and discover what the atelier recommends specially
          for you.
        </p>
        <span class="shape shape--finder-artefact finder-glyph finder-glyph--right"
              aria-hidden="true"></span>
      </div>
      <ul class="finder-answers">
        <li><button type="button" data-start>Begin</button></li>
      </ul>`;
  }

  function renderQuestion() {
    const { question, answers: options } = QUESTIONS[step];
    panel.innerHTML = `
      <p class="finder-step">Question ${step + 1} of ${QUESTIONS.length}</p>
      <h2 class="finder-question">${question}</h2>
      <ul class="finder-answers">
        ${options.map((a, i) => `<li><button type="button" data-answer="${i}">${a.text}</button></li>`).join('')}
      </ul>`;
  }

  // Tallies a point per question toward every scent its chosen answer maps to
  // (an answer can favour more than one), then returns the scent with the most.
  //
  // A scent that scored highest outright is the whole answer, and `alternate`
  // comes back null: nothing was in the running with it. Only a draw needs
  // more — the recommendation is then drawn from the tied leaders at random,
  // so no scent wins purely by its place in the list, and one of the leaders
  // that lost that toss is offered alongside it as the alternate.
  function computeResult() {
    const scores = new Map(SCENTS.map((s) => [s.id, 0]));
    QUESTIONS.forEach((q, i) => {
      const chosen = q.answers[answers[i]];
      if (!chosen) return;
      for (const id of chosen.scents) {
        if (scores.has(id)) scores.set(id, scores.get(id) + 1);
      }
    });

    const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];
    const top = Math.max(...scores.values());
    const leaders = SCENTS.filter((s) => scores.get(s.id) === top);
    const scent = pick(leaders);
    const rest = leaders.filter((s) => s !== scent);
    return { scent, alternate: rest.length ? pick(rest) : null };
  }

  // The recommendation gets the photograph, with its two actions beside it —
  // stacked under it, the screen ran off the bottom of the panel. An alternate
  // only exists when the tally drew (see computeResult), and is deliberately
  // only a line and a link, so the two scents never read as an equal pair.
  function renderResult() {
    const { scent, alternate } = computeResult();
    const alternateLine = alternate ? `
      <p class="finder-alt">
        However, you may also be drawn to
        <a class="finder-alt-link" href="#scent-${alternate.id}">${alternate.name}</a>.
      </p>` : '';
    panel.innerHTML = `
      <p class="finder-step">Your result</p>
      <h2 class="finder-question">Thank you for taking the time to answer all the questions.</h2>
      <p class="finder-result">
        After carefully considering your input, we recommend ${scent.name} as the
        scent most relevant to you.
      </p>
      <div class="finder-result-row">
        <img class="finder-result-photo" src="${scent.photo}" alt="${scent.name}, photographed on skin">
        <ul class="finder-answers finder-result-actions">
          <li><button type="button" data-view-scent="${scent.id}">View ${scent.name}</button></li>
          <li><button type="button" data-restart>Start again</button></li>
        </ul>
      </div>${alternateLine}`;
  }

  function render() {
    if (stage === 'start') renderStart();
    else if (step < QUESTIONS.length) renderQuestion();
    else renderResult();
  }

  async function advance(next) {
    busy = true;
    panel.classList.add('is-hidden');

    if (reduceMotion.matches) {
      // No flying shapes: just swap the question over a short cross-fade.
      await new Promise((r) => setTimeout(r, 250));
      next();
      render();
    } else {
      await new Promise((r) => setTimeout(r, 250));
      await transition.play({ onFadeOut: () => { next(); render(); } });
    }

    panel.classList.remove('is-hidden');
    busy = false;
  }

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || busy) return;

    // Beginning and starting over both play the same transition as an answer,
    // so every move through the finder looks the same.
    if (button.dataset.start !== undefined) {
      advance(() => { stage = 'question'; step = 0; answers.length = 0; });
      return;
    }
    if (button.dataset.restart !== undefined) {
      advance(() => { stage = 'start'; step = 0; answers.length = 0; });
      return;
    }
    if (button.dataset.viewScent) {
      onOpenScent?.(button.dataset.viewScent);
      return;
    }
    if (button.dataset.answer !== undefined) {
      answers[step] = Number(button.dataset.answer);
      advance(() => { step += 1; });
    }
  });

  window.addEventListener('resize', () => {
    if (transition.renderer) transition.resize();
  });

  render();
  // Warm the model up so the first answer does not wait on a 14MB parse.
  transition.init();

  return {
    // Opening the view always lands back on the invitation.
    reset() {
      stage = 'start';
      step = 0;
      answers.length = 0;
      panel.classList.remove('is-hidden');
      render();
    },
  };
}
