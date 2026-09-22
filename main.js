import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadModel, MODEL_CENTER, MODEL_HEIGHT, ANCHOR_NAME } from './model.js';
import { initScentFinder } from './scent-finder.js';
import { initScents } from './scents.js';
import { initAtelier } from './atelier.js';
import { initContact } from './contact.js';
import { initHome } from './home.js';
import { initMarquee } from './marquee.js';
import { isMobile, initPressDelay, initNavDrift } from './mobile.js';

// ---- Config ----------------------------------------------------------------
// The model itself, its centre, its height and the anchor piece ("Curve", the
// AP monogram the others assemble around) live in model.js, so the scent finder
// can reuse the same artwork without loading it twice.

// How far scattered pieces fly out from home, in world units.
const SCATTER_MIN = 18;
const SCATTER_MAX = 45;

// Cursor proximity, as a fraction of the distance from the anchor to the
// farthest screen corner. Inside NEAR -> fully assembled; the response ramps
// continuously from the screen edges (0) inward, so it starts immediately.
const NEAR_FRAC = 0.08;

// Glow of the anchor piece: colour, the little it keeps when fully scattered,
// and how strong the emissive gets at full proximity — halved from 0.35/2.5,
// which read as too bright on the intro. Stays gold — the one
// place on the site that keeps its original colour rather than the iris
// gradient, since it's the piece's own glow rather than a UI accent.
//
// GLOW_REST is what makes the monogram plainly there to move toward before
// anything has been assembled: unlit, it is dark metal on a near-black ground,
// which on a bright screen can be read as an intro that failed to load. Kept
// under the bloom's threshold, so only the assembled glow blooms.
const GLOW_COLOUR = '#ffe119';
const GLOW_REST = 0.175;
const GLOW_MAX = 1.25;

// The cursor drives the assembly — but a cursor that never moves sends no
// pointermove at all, and there are ordinary ways for that to happen: a window
// focused under a stationary pointer, a pointer resting outside it, a click
// straight through. Nothing then assembles, and since a scattered piece is
// mostly outside the frame, the intro sits there looking empty. So if nothing
// has steered it by IDLE_MS, it comes this far together on its own; the first
// real pointermove takes over from there.
const IDLE_MS = 1200;
const IDLE_PROGRESS = 0.55;

// Surface iridescence for the anchor — the same thin-film-on-metal effect a
// slick of petrol or an anodised surface shows, applied as an actual physical
// material layer rather than faked, so it genuinely shifts with the viewing
// angle instead of just being animated. This is separate from the glow
// above: it's how the surface catches reflected light, not its own colour.
const IRIDESCENCE = 1;
const IRIDESCENCE_IOR = 1.3;
const IRIDESCENCE_THICKNESS_RANGE = [100, 400];

// Each time a piece's travel reverses (assembling <-> scattering), it's given
// a freshly rolled scatter pose to head for instead of the one it came from,
// so the same piece doesn't keep retracing the same line. The scatter pose
// drifts toward that new target at DRIFT_SPEED per frame rather than jumping
// to it, so the change in direction reads as a curve, never a pop.
const DRIFT_SPEED = 0.05;

// Click-to-enter "blast": non-anchor pieces fly this far outward, over this
// long. Every stage of the blast is timed in milliseconds rather than stepped
// per frame, so it runs at the same pace on a 60Hz screen and a 144Hz one —
// and so it ends exactly when the reveal it is timed against does.
const BLAST_DIST = 140;
const BLAST_MS = 476;

// The anchor rushes to a point ANCHOR_FRONT units in front of the camera (on
// the central view axis, so it ends dead-centre) and grows ANCHOR_GROW×.
const ANCHOR_FRONT = 2;
const ANCHOR_GROW = 3.5;

// Before it rushes in, the anchor spins rapidly in place around the vertical
// axis — three full turns, easing out into a gentle stop rather than cutting
// off — then holds for a beat before it starts moving.
const ANCHOR_SPIN_TURNS = 3;
const ANCHOR_SPIN_MS = 650; // long enough that the back-half slowdown is actually visible
const ANCHOR_PAUSE_MS = 180;

// The anchor starts a little larger than its authored size while scattered,
// and eases back down to normal as the pieces assemble around it.
const ANCHOR_START_GROW = 1.25;

// A phone has no cursor to move toward the centre, so the intro plays itself:
// the pieces fall into place over ASSEMBLE_MS and then blast the way a click
// would. Long enough to watch, short enough not to be a wait.
const autoIntro = isMobile();
const ASSEMBLE_MS = 1600;

// ---- DOM -------------------------------------------------------------------
const intro = document.getElementById('intro');
const canvas = document.getElementById('scene');
const loadingEl = document.getElementById('loading');
const hintEl = document.getElementById('hint');
const site = document.getElementById('site');

// Start fetching the backdrop while the intro is still up, so it is already
// cached (or nearly) when the site reveals and never appears to stream in over
// the black base behind it.
new Image().src = 'assets/pozadina.png';

// ---- Renderer / scene / camera ---------------------------------------------
// A phone pays for every pixel several times over: the scene is drawn into a
// multisampled half-float buffer, and the bloom then blurs it through five
// mip levels. Past about 1.5 the extra sharpness is invisible at arm's length
// on a phone screen while the fill cost very much is not.
const MAX_PIXEL_RATIO = isMobile() ? 1.5 : 2;

// `antialias` is deliberately off: it multisamples the canvas's own buffer,
// which the composer never draws the scene into — the scene goes to
// composerTarget below, which asks for its own multisampling, and all the
// canvas ever receives is a flat blit of the finished image. Asking for it
// here only allocated a second multisampled buffer nothing ever read.
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0e0e10');

// Neutral environment so the metallic default materials are actually lit.
// Without this, the model renders pure black.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Position the camera on the X axis (the model is a thin wall in the Y-Z plane).
function frameCamera() {
  const fovRad = (camera.fov * Math.PI) / 180;
  const fitDist = (MODEL_HEIGHT / 2) / Math.tan(fovRad / 2);
  const dist = fitDist * 1.25; // a little breathing room
  camera.position.set(dist, MODEL_CENTER.y, 0);
  camera.lookAt(MODEL_CENTER);
}
frameCamera();

// ---- Post-processing: bloom so the anchor's glow blooms ---------------------
// The composer draws the scene into its own buffer rather than to the canvas,
// and the renderer's `antialias: true` only ever applied to the canvas — so
// everything here came out with no antialiasing at all, which on artwork made
// of thin metal curves is what a jagged, crawling shine looks like. The buffer
// is asked for multisampling of its own to put that right; the pixel format is
// the half-float the composer would have picked for itself, kept so the bloom
// still has headroom above white to work with.
const MSAA_SAMPLES = isMobile() ? 2 : 4;
const composerTarget = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType,
  samples: MSAA_SAMPLES,
});
const composer = new EffectComposer(renderer, composerTarget);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,  // strength
  0.5,  // radius
  1.0   // threshold: only the bright emissive anchor blooms, not the metal
);
composer.addPass(bloomPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// ---- Load the model --------------------------------------------------------
const pieces = []; // { mesh, home{pos,quat}, scatter{pos,quat}, isAnchor }
let anchorMaterial = null; // cloned material of the anchor, driven for glow
let anchorPiece = null; // cached ref to the anchor's own piece entry

function randomScatterOffset() {
  // Random direction on a sphere, random magnitude.
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const mag = SCATTER_MIN + Math.random() * (SCATTER_MAX - SCATTER_MIN);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  ).multiplyScalar(mag);
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

loadModel().then(({ gltf, pieces: modelPieces }) => {
  for (const { mesh, name, home } of modelPieces) {
    const isAnchor = name === ANCHOR_NAME;
    if (isAnchor) {
      // The monogram is authored mirrored; flip it back the right way round.
      mesh.quaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      );
      // Upgraded to MeshPhysicalMaterial so it can carry iridescence — built
      // from the glTF-imported MeshStandardMaterial's own properties rather
      // than material.copy(), which assumes the source already has
      // MeshPhysicalMaterial-only fields (clearcoatNormalScale and the like)
      // that a plain glTF import never sets, and throws reading into them.
      const src = mesh.material;
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: src.color,
        map: src.map,
        roughness: src.roughness,
        metalness: src.metalness,
        normalMap: src.normalMap,
        normalScale: src.normalScale,
        aoMap: src.aoMap,
        aoMapIntensity: src.aoMapIntensity,
        metalnessMap: src.metalnessMap,
        roughnessMap: src.roughnessMap,
        emissiveMap: src.emissiveMap,
        alphaMap: src.alphaMap,
        transparent: src.transparent,
        opacity: src.opacity,
        side: src.side,
      });
      mesh.material.iridescence = IRIDESCENCE;
      mesh.material.iridescenceIOR = IRIDESCENCE_IOR;
      mesh.material.iridescenceThicknessRange = IRIDESCENCE_THICKNESS_RANGE;
      mesh.material.emissive = new THREE.Color(GLOW_COLOUR);
      mesh.material.emissiveIntensity = GLOW_REST;
      anchorMaterial = mesh.material;
    }
    const scatter = {
      pos: home.pos.clone().add(randomScatterOffset()),
      quat: randomQuaternion(),
    };
    const piece = {
      mesh,
      isAnchor,
      home: { pos: home.pos.clone(), quat: home.quat.clone(), scale: home.scale.clone() },
      scatter,
      // Where `scatter` is currently drifting toward; reassigned on reversal.
      scatterGoal: { pos: scatter.pos.clone(), quat: scatter.quat.clone() },
    };
    pieces.push(piece);
    if (isAnchor) anchorPiece = piece;
  }
  scene.add(gltf.scene);
  loadingEl.hidden = true;
  applyProgress(0); // start fully scattered
  ready = true; // pieces are placed: startBlast() is safe from here on
  animate();

  // The intro has come up blank in the wild with nothing in the console to say
  // why. If it happens again, this says which part of it was empty — whether
  // frames were drawn at all, whether the canvas had a size to draw into, and
  // whether the artwork was in the scene — instead of leaving nothing behind.
  setTimeout(() => {
    if (done || document.hidden) return; // gone already, or never given a frame
    const { width, height } = renderer.domElement;
    const inScene = gltf.scene.parent === scene;
    if (renderer.info.render.frame > 0 && width > 0 && height > 0 && inScene) return;
    console.warn('Intro is blank:', {
      frames: renderer.info.render.frame,
      canvas: `${width}x${height}`,
      pieces: pieces.length,
      inScene,
    });
  }, 1500);

  if (pendingBlast) {
    // Someone clicked/tapped the loading screen; enter now that we can.
    startBlast();
  } else if (autoIntro) {
    targetProgress = 1; // assemble on its own, then enter
    setTimeout(startBlast, ASSEMBLE_MS);
  } else {
    // Nobody has moved a cursor over it: bring it part of the way together so
    // there is something to look at, and leave the rest to them (see IDLE_MS).
    setTimeout(() => {
      if (!steered && !blasting) targetProgress = IDLE_PROGRESS;
    }, IDLE_MS);
  }
}).catch((err) => {
  console.error('Failed to load model:', err);
  loadingEl.textContent = 'Failed to load model';
});

// ---- Scatter / assemble ----------------------------------------------------
let currentProgress = 0; // eased 0 (scattered) -> 1 (assembled)
let targetProgress = 0;

const _tmpV = new THREE.Vector3();

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// The anchor's angular speed decays exponentially over the spin, like a wheel
// slowing under friction: fast off the mark, then trailing off into a long,
// gently-diminishing tail rather than cutting off. SPIN_DECAY_K sets how hard
// the decay bites — higher means more of the turning happens early and the
// tail lingers longer and flatter.
const SPIN_DECAY_K = 4;
function spinEase(t) {
  return (1 - Math.exp(-SPIN_DECAY_K * t)) / (1 - Math.exp(-SPIN_DECAY_K));
}

// Place every non-anchor piece between its scatter and home pose. The anchor
// stays put but shrinks from ANCHOR_START_GROW× down to its authored size.
function applyProgress(p) {
  const eased = smoothstep(THREE.MathUtils.clamp(p, 0, 1));
  for (const piece of pieces) {
    if (piece.isAnchor) {
      const scale = THREE.MathUtils.lerp(ANCHOR_START_GROW, 1, eased);
      piece.mesh.scale.copy(piece.home.scale).multiplyScalar(scale);
      continue;
    }
    piece.mesh.position.lerpVectors(piece.scatter.pos, piece.home.pos, eased);
    piece.mesh.quaternion
      .copy(piece.scatter.quat)
      .slerp(piece.home.quat, eased);
  }
}

// Where the anchor sits on screen, in pixels.
function anchorScreenPos() {
  _tmpV.copy(MODEL_CENTER).project(camera);
  return {
    x: (_tmpV.x * 0.5 + 0.5) * window.innerWidth,
    y: (-_tmpV.y * 0.5 + 0.5) * window.innerHeight,
  };
}

// Farthest a cursor can be from the anchor on screen (distance to the corner
// diagonally opposite the anchor). This makes the response span the whole page.
function maxCursorDist(anchor) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dx = Math.max(anchor.x, w - anchor.x);
  const dy = Math.max(anchor.y, h - anchor.y);
  return Math.hypot(dx, dy);
}

window.addEventListener('pointermove', (e) => {
  if (autoIntro) return; // the intro is running itself; a stray touch cannot steer it
  steered = true; // the cursor has it from here; the idle assembly stands down
  const anchor = anchorScreenPos();
  const dist = Math.hypot(e.clientX - anchor.x, e.clientY - anchor.y);
  const far = maxCursorDist(anchor);
  const near = far * NEAR_FRAC;
  targetProgress = THREE.MathUtils.clamp((far - dist) / (far - near), 0, 1);
});

// Re-rolls where every non-anchor piece's scatter pose is drifting toward,
// so the next time it flies out it takes a different path than last time.
function rerollScatterTargets() {
  for (const piece of pieces) {
    if (piece.isAnchor) continue;
    piece.scatterGoal.pos.copy(piece.home.pos).add(randomScatterOffset());
    piece.scatterGoal.quat.copy(randomQuaternion());
  }
}

// ---- Animation loop --------------------------------------------------------
let prevDir = 0; // -1 scattering, 0 idle/at rest, 1 assembling — last frame's travel direction
function animate() {
  if (done) return; // stopped after the site is revealed
  requestAnimationFrame(animate);

  if (blasting) {
    // How far each stage has got, from the clock: 0 before it starts, 1 once
    // its milliseconds are up. The pause between the anchor's spin and its rush
    // is simply the gap between two stages, so it needs no state of its own.
    const since = performance.now() - blastAt;
    const stage = (after, ms) => THREE.MathUtils.clamp((since - after) / ms, 0, 1);

    // Every other piece flies outward immediately.
    const blast = stage(0, BLAST_MS);
    const t = blast * blast; // ease-in: accelerate outward
    for (const piece of pieces) {
      if (piece.isAnchor) continue;
      piece.mesh.position.lerpVectors(piece.blastStart, piece.blastTarget, t);
      piece.mesh.quaternion.copy(piece.blastStartQuat).slerp(piece.blastQuat, t);
      piece.mesh.scale.lerpVectors(piece.blastStartScale, piece.blastEndScale, t);
    }

    // The anchor spins rapidly in place first, eases into a stop, pauses for
    // a beat, and only then rushes toward the camera.
    const spin = stage(0, ANCHOR_SPIN_MS);
    if (!spinSettled) {
      const angle = spinEase(spin) * ANCHOR_SPIN_TURNS * Math.PI * 2;
      _spinQuat.setFromAxisAngle(Y_AXIS, angle);
      anchorPiece.mesh.quaternion.multiplyQuaternions(_spinQuat, anchorPiece.blastStartQuat);
      if (spin >= 1) {
        // Spin's done: rush in from this orientation, and hold it steady. The
        // spin is built on blastStartQuat, so overwriting it here is only safe
        // because this runs once — hence the flag rather than a `spin < 1`.
        spinSettled = true;
        anchorPiece.blastStartQuat.copy(anchorPiece.mesh.quaternion);
        anchorPiece.blastQuat.copy(anchorPiece.mesh.quaternion);
      }
    }

    const rush = stage(ANCHOR_SPIN_MS + ANCHOR_PAUSE_MS, BLAST_MS);
    if (rush > 0) {
      const at = rush * rush; // ease-in, same feel as the others
      anchorPiece.mesh.position.lerpVectors(anchorPiece.blastStart, anchorPiece.blastTarget, at);
      anchorPiece.mesh.scale.lerpVectors(anchorPiece.blastStartScale, anchorPiece.blastEndScale, at);
    }

    if (anchorMaterial) anchorMaterial.emissiveIntensity = GLOW_MAX;
  } else {
    // Direction of travel this frame; a flip means the pieces just reversed
    // course, so give them a new path to drift toward.
    const dir = Math.sign(targetProgress - currentProgress);
    if (dir !== 0 && prevDir !== 0 && dir !== prevDir) rerollScatterTargets();
    if (dir !== 0) prevDir = dir;

    // Ease current toward target for smooth motion.
    currentProgress += (targetProgress - currentProgress) * 0.12;
    for (const piece of pieces) {
      if (piece.isAnchor) continue;
      piece.scatter.pos.lerp(piece.scatterGoal.pos, DRIFT_SPEED);
      piece.scatter.quat.slerp(piece.scatterGoal.quat, DRIFT_SPEED);
    }
    applyProgress(currentProgress);
    if (anchorMaterial) {
      anchorMaterial.emissiveIntensity =
        GLOW_REST + currentProgress * (GLOW_MAX - GLOW_REST);
    }
  }

  composer.render();
}

// ---- Click → blast the pieces away, then reveal the site -------------------
let blasting = false;
let steered = false; // a pointermove has arrived, so the cursor is driving it
let blastAt = 0; // when the blast began; every stage is measured from here
let spinSettled = false; // the anchor's pre-move spin has been run out and held
let ready = false; // the 14MB model has loaded and its pieces are placed
let pendingBlast = false; // a click/tap landed before `ready`; blast as soon as it is
let done = false;
const _dir = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _spinQuat = new THREE.Quaternion();

function startBlast() {
  // The instruction has been followed, so it fades out — before the guard
  // below, since a click that lands while the model is still downloading has
  // spent it just the same.
  hintEl.classList.add('is-spent');

  // A click can arrive while the model is still downloading (the "Loading…"
  // screen is up but `pieces` is empty). Blasting now would set up nothing and
  // then crash the render loop reading undefined blast poses once the pieces
  // appear — so remember the intent and let the load handler run it instead.
  if (!ready) { pendingBlast = true; return; }
  if (blasting) return;
  blasting = true;
  blastAt = performance.now();
  spinSettled = false;
  // Reveal on a timer, independent of the render loop's frame rate, so the page
  // always appears even if the heavy blast frame briefly stalls rAF. The anchor's
  // spin-pause-rush takes longer than the others' blast, so it sets the pace —
  // and being on the same clock as the animation, it lands just as it finishes.
  setTimeout(revealSite, ANCHOR_SPIN_MS + ANCHOR_PAUSE_MS + BLAST_MS);
  for (const piece of pieces) {
    piece.blastStart = piece.mesh.position.clone();
    piece.blastStartQuat = piece.mesh.quaternion.clone();
    piece.blastStartScale = piece.mesh.scale.clone();
    piece.blastEndScale = piece.mesh.scale.clone();
    if (piece.isAnchor) {
      // Aim at a point on the camera's central axis, just in front of the lens,
      // so it sweeps to screen-centre and looms directly at the viewer.
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward); // unit vector from camera into the scene
      piece.blastTarget = camera.position
        .clone()
        .addScaledVector(forward, ANCHOR_FRONT); // ANCHOR_FRONT units in front of camera
      piece.blastQuat = piece.mesh.quaternion.clone(); // set for real once the spin ends
      piece.blastEndScale = piece.mesh.scale.clone().multiplyScalar(ANCHOR_GROW);
    } else {
      // Fling outward from the model centre (random fallback if dead-centre).
      _dir.copy(piece.home.pos).sub(MODEL_CENTER);
      if (_dir.lengthSq() < 1e-6) _dir.copy(randomScatterOffset());
      _dir.normalize();
      piece.blastTarget = piece.blastStart.clone().addScaledVector(_dir, BLAST_DIST);
      piece.blastQuat = randomQuaternion();
    }
  }
}

// Tapping or clicking enters early, whether or not the intro is playing itself.
intro.addEventListener('click', startBlast);

function revealSite() {
  if (done) return;

  // Reveal the site and cross-fade the intro out over it. The site has been in
  // the layout (painted, just transparent) for the whole intro, so there is
  // nothing left to rasterise at this point — no frozen intro frame and no
  // first-frame pop-in.
  site.classList.remove('is-veiled');
  site.removeAttribute('aria-hidden');

  // Home was never opened — it was simply the section that wasn't hidden — so
  // nothing has run its activate() yet, and the screen on it only starts once
  // something has. A deep link to a scent (see openScentFromHash below) opens
  // that instead.
  if (!openScentFromHash()) showView('home');

  intro.classList.add('is-fading');

  // Once the fade has finished, drop the intro and give the GPU its memory
  // back. Held on a timer that matches the CSS fade (0.3s), plus a beat for the
  // last frame to be drawn.
  requestAnimationFrame(() => {
    setTimeout(() => {
      done = true; // stop the render loop now the intro is gone
      intro.hidden = true;
      intro.classList.remove('is-fading');
      setTimeout(disposeIntro, 0);
    }, 320);
  });
}

// The model's own geometry and materials stay alive — model.js caches and hands
// them out again (e.g. to the scent finder) — but all of this is exclusive to
// the intro's renderer/composer/environment (full-screen bloom render targets
// included) and is never needed again once it is gone. composer.dispose() only
// frees its own read/write buffers, not each pass's, so the passes that carry
// their own GPU resources are disposed by hand.
function disposeIntro() {
  composer.dispose();
  bloomPass.dispose();
  outputPass.dispose();
  pmrem.dispose();
  scene.environment?.dispose();
  composerTarget.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}

// ---- Views -----------------------------------------------------------------
// Sidebar buttons carrying data-view swap which section of the site is shown.
// Clicking the button of the open view goes back home.
const views = new Map(
  [...site.querySelectorAll('.view')].map((el) => [el.dataset.view, el])
);
const navButtons = [...document.querySelectorAll('.nav-btn[data-view]')];

// Each view may expose an activate() hook, run whenever it is opened.
// While one scent's own page is open, its button in the sidebar stops being the
// way home and becomes the way back to the field (see setScentDetail below).
const scents = initScents(views.get('scents'), {
  onDetailChange: (open) => setScentDetail(open),
});

// Jumps straight to a given scent's own page — shared by the featured card on
// home and the finder's result, so both land the same way.
const openScent = (id) => { showView('scents'); scents.openScent(id); };

// The finder's alternate suggestion is a real link (see renderResult in
// scent-finder.js), so a scent can be addressed by URL: #scent-<id>. Following
// that hash opens the scent's page, whether it happened before the site was
// revealed (revealSite above) or afterwards.
const SCENT_HASH = /^#scent-(.+)$/;

function openScentFromHash() {
  const match = window.location.hash.match(SCENT_HASH);
  if (!match) return false;
  openScent(match[1]);
  return true;
}

window.addEventListener('hashchange', openScentFromHash);

const controllers = new Map([
  ['home', initHome(views.get('home'), { onOpenScent: openScent })],
  ['scents', scents],
  ['atelier', initAtelier(views.get('atelier'))],
  ['contact', initContact(views.get('contact'))],
  ['finder', { activate: initScentFinder(views.get('finder'), { onOpenScent: openScent }).reset }],
]);

// While a view is open, its own button is the way back home, so it wears the
// monogram and reads "Home" until you leave.
for (const button of navButtons) {
  const label = button.querySelector('.nav-label');
  button.dataset.label = label.textContent.trim();
  const homeShape = document.createElement('span');
  homeShape.className = 'shape shape--logo nav-home-shape';
  homeShape.setAttribute('aria-hidden', 'true');
  button.querySelector('.nav-art').append(homeShape);
}

// The Scents buttons (one in each marquee group on a phone) also carry the
// bloom the scents page hangs, shown in place of the monogram while a single
// scent is open: there, the button leads back to the field rather than home,
// so it wears the field's own mark.
const scentsButtons = navButtons.filter((b) => b.dataset.view === 'scents');
for (const button of scentsButtons) {
  const backShape = document.createElement('span');
  backShape.className = 'shape shape--flower-colour nav-back-shape';
  backShape.setAttribute('aria-hidden', 'true');
  button.querySelector('.nav-art').append(backShape);
}

/** Switches the Scents buttons between "home" and "back to all scents". */
function setScentDetail(open) {
  for (const button of scentsButtons) {
    button.classList.toggle('is-scent-detail', open);
    if (button.classList.contains('is-active')) {
      button.querySelector('.nav-label').textContent =
        open ? 'All scents' : 'Home';
    }
  }
}

function showView(name) {
  for (const [key, el] of views) el.hidden = key !== name;
  for (const button of navButtons) {
    const active = button.dataset.view === name;
    button.classList.toggle('is-active', active);
    const back = active && button.dataset.view === 'scents'
      && button.classList.contains('is-scent-detail');
    button.querySelector('.nav-label').textContent =
      back ? 'All scents' : active ? 'Home' : button.dataset.label;
  }
  controllers.get(name)?.activate?.();
}

// One listener on the strip rather than one per button, so the duplicate group
// the phone's marquee slides past responds exactly like the original.
document.getElementById('nav-scroll').addEventListener('click', (event) => {
  const button = event.target.closest('.nav-btn[data-view]');
  if (!button) return;
  if (!button.classList.contains('is-active')) {
    showView(button.dataset.view);
  } else if (button.dataset.view === 'scents' && button.classList.contains('is-scent-detail')) {
    // A scent's own page is open: the bloom leads back to the field, not home.
    scents.showField();
  } else {
    showView('home');
  }
});

// ---- The bottom strip on a phone -------------------------------------------
// Folding it away hands its height back to the view above, so the strip can be
// got out of the way of a photograph or a long page.
const navToggle = document.getElementById('nav-toggle');

navToggle.addEventListener('click', () => {
  const collapsed = site.classList.toggle('nav-collapsed');
  navToggle.setAttribute('aria-expanded', String(!collapsed));
  navToggle.setAttribute('aria-label', collapsed ? 'Show the menu' : 'Hide the menu');
  // The view just changed height: anything laid out against it (the scattered
  // blooms) needs to hear about it, and only ever listens for a resize.
  window.dispatchEvent(new Event('resize'));
});

// The bottom strip fills itself with the welcome line and each city's clock.
initMarquee(document.getElementById('marquee'));

// On a touch screen the hover animations play on the press instead, and the
// site waits for them before it moves.
initPressDelay();

// The phone's bottom nav drifts slowly left-to-right, but always yields to a
// user's own swipe or scroll.
initNavDrift(document.getElementById('nav-scroll'));

// ---- Resize ----------------------------------------------------------------
// Every one of these reallocates the composer's buffer and the bloom's five
// pairs of mips, which is far too much to do per event: a desktop drag and a
// phone's own address bar sliding away both fire resize in a stream. Settle
// first, then resize once.
let sceneResizeTimer = null;
window.addEventListener('resize', () => {
  if (done) return; // the intro's renderer/composer are disposed once it's gone
  clearTimeout(sceneResizeTimer);
  sceneResizeTimer = setTimeout(() => {
    if (done) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    frameCamera();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }, 120);
});
