import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- Config ----------------------------------------------------------------
const MODEL_URL = 'AP-site-3D_kosta.glb';

// Centre of the model in world space (from the GLB bounds), and how tall it is.
const MODEL_CENTER = new THREE.Vector3(0, 9.2, 0);
const MODEL_HEIGHT = 37.4; // world units, used to frame the camera

// The piece that stays fixed as the anchor. Others scatter and assemble
// toward it as the cursor approaches. (The yellow "Curve" = centre of the AP.)
const ANCHOR_NAME = 'Curve';

// How far scattered pieces fly out from home, in world units.
const SCATTER_MIN = 18;
const SCATTER_MAX = 45;

// Cursor proximity, as a fraction of the distance from the anchor to the
// farthest screen corner. Inside NEAR -> fully assembled; the response ramps
// continuously from the screen edges (0) inward, so it starts immediately.
const NEAR_FRAC = 0.08;

// Glow of the anchor piece: colour and how strong the emissive gets at full
// proximity (0 = off when scattered, GLOW_MAX = fully assembled).
const GLOW_COLOUR = '#ffe119'; // warm yellow, matching the piece
const GLOW_MAX = 2.5;

// Click-to-enter "blast": non-anchor pieces fly this far outward, over roughly
// BLAST_SPEED progress per frame (~1 / (60 * seconds)).
const BLAST_DIST = 140;
const BLAST_SPEED = 0.035;

// The anchor rushes to a point ANCHOR_FRONT units in front of the camera (on
// the central view axis, so it ends dead-centre) and grows ANCHOR_GROW×.
const ANCHOR_FRONT = 2;
const ANCHOR_GROW = 3.5;

// ---- DOM -------------------------------------------------------------------
const intro = document.getElementById('intro');
const canvas = document.getElementById('scene');
const loadingEl = document.getElementById('loading');
const site = document.getElementById('site');

// ---- Renderer / scene / camera ---------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,  // strength
  0.5,  // radius
  1.0   // threshold: only the bright emissive anchor blooms, not the metal
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ---- Load the model --------------------------------------------------------
const pieces = []; // { mesh, home{pos,quat}, scatter{pos,quat}, isAnchor }
let anchorMaterial = null; // cloned material of the anchor, driven for glow

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

new GLTFLoader().load(
  MODEL_URL,
  (gltf) => {
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh) return;
      const isAnchor = obj.name === ANCHOR_NAME;
      const homePos = obj.position.clone();
      const homeQuat = obj.quaternion.clone();
      if (isAnchor) {
        // Clone so adding emissive doesn't affect pieces sharing this material.
        obj.material = obj.material.clone();
        obj.material.emissive = new THREE.Color(GLOW_COLOUR);
        obj.material.emissiveIntensity = 0;
        anchorMaterial = obj.material;
      }
      pieces.push({
        mesh: obj,
        isAnchor,
        home: { pos: homePos, quat: homeQuat },
        scatter: {
          pos: homePos.clone().add(randomScatterOffset()),
          quat: randomQuaternion(),
        },
      });
    });
    scene.add(gltf.scene);
    loadingEl.hidden = true;
    applyProgress(0); // start fully scattered
    animate();
  },
  undefined,
  (err) => {
    console.error('Failed to load model:', err);
    loadingEl.textContent = 'Failed to load model';
  }
);

// ---- Scatter / assemble ----------------------------------------------------
let currentProgress = 0; // eased 0 (scattered) -> 1 (assembled)
let targetProgress = 0;

const _tmpV = new THREE.Vector3();

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// Place every non-anchor piece between its scatter and home pose.
function applyProgress(p) {
  const eased = smoothstep(THREE.MathUtils.clamp(p, 0, 1));
  for (const piece of pieces) {
    if (piece.isAnchor) continue;
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
  const anchor = anchorScreenPos();
  const dist = Math.hypot(e.clientX - anchor.x, e.clientY - anchor.y);
  const far = maxCursorDist(anchor);
  const near = far * NEAR_FRAC;
  targetProgress = THREE.MathUtils.clamp((far - dist) / (far - near), 0, 1);
});

// ---- Animation loop --------------------------------------------------------
function animate() {
  if (done) return; // stopped after the site is revealed
  requestAnimationFrame(animate);

  if (blasting) {
    if (blastProgress < 1) {
      blastProgress = Math.min(1, blastProgress + BLAST_SPEED);
      const t = blastProgress * blastProgress; // ease-in: accelerate outward
      for (const piece of pieces) {
        piece.mesh.position.lerpVectors(piece.blastStart, piece.blastTarget, t);
        piece.mesh.quaternion.copy(piece.blastStartQuat).slerp(piece.blastQuat, t);
        piece.mesh.scale.lerpVectors(piece.blastStartScale, piece.blastEndScale, t);
      }
      if (anchorMaterial) anchorMaterial.emissiveIntensity = GLOW_MAX;
    }
  } else {
    // Ease current toward target for smooth motion.
    currentProgress += (targetProgress - currentProgress) * 0.12;
    applyProgress(currentProgress);
    if (anchorMaterial) {
      anchorMaterial.emissiveIntensity = currentProgress * GLOW_MAX;
    }
  }

  composer.render();
}

// ---- Click → blast the pieces away, then reveal the site -------------------
let blasting = false;
let blastProgress = 0;
let done = false;
// Blast duration in ms, derived from the per-frame speed at ~60fps.
const BLAST_MS = (1 / BLAST_SPEED / 60) * 1000;
const _dir = new THREE.Vector3();

intro.addEventListener('click', () => {
  if (blasting) return;
  blasting = true;
  blastProgress = 0;
  // Reveal on a timer, independent of the render loop's frame rate, so the page
  // always appears even if the heavy blast frame briefly stalls rAF.
  setTimeout(revealSite, BLAST_MS);
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
      piece.blastQuat = piece.mesh.quaternion.clone(); // keep it steady as it comes
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
});

function revealSite() {
  if (done) return;
  done = true; // stop the render loop
  intro.hidden = true; // drop the 3D canvas
  site.hidden = false;
}

// ---- Resize ----------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  frameCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
