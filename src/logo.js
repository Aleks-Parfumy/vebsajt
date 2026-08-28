// The 3D AP monogram, on its own canvas: the intro's anchor piece ("Curve"),
// rendered as plain golden metal — the real 3D artwork rather than a masked
// PNG. No glow and no iridescence: just gold catching the light as it moves.
// Worn by the contact page, and by the glitching screen on home.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadModel, ANCHOR_NAME, goldMaterial, unmirrorAnchor } from './model.js';

// How it moves. The contact page turns it right round, echoing the flat mask it
// replaced: a slow spin about the vertical axis and a gentle float, so it
// drifts like a hanging sign in a draught.
export const SPIN = {
  turnSeconds: 11,      // one full turn
  swayDegrees: 0,       // 0 means spin rather than rock
  tiltDegrees: 0,
  floatUnits: 0.35,     // vertical drift, in world units
  floatSeconds: 6,
};

// A screen that only holds the monogram for a few seconds at a time wants the
// other kind of motion: barely a turn at all, just enough rocking for the
// highlight to travel across the metal and back — and never so far round that
// it goes edge-on, which on a thin wall of a shape means nearly disappearing.
// The tilt runs on its own period so the two never line up and the shine never
// settles into an obvious loop.
export const SHINE = {
  turnSeconds: 9,
  swayDegrees: 17,
  tiltDegrees: 6,
  floatUnits: 0.08,
  floatSeconds: 13,
};

// How much longer the tilt takes than the rock — deliberately not a whole
// number of them.
const TILT_PERIOD = 1.43;

const DEG = Math.PI / 180;

/**
 * @param canvas the canvas to draw on; it is sized to its own CSS box
 * @param motion SPIN or SHINE above (or anything the same shape)
 */
export function initLogo(canvas, motion = SPIN) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  // Neutral lighting so the metallic surface is actually lit (as in the intro).
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // The environment alone lights the monogram from one side, leaving the other
  // in shadow. A few lights from different directions even it out: on the metal
  // they read as highlights that sweep across as it turns, and the hemisphere
  // fill keeps the shadowed side from going dark. Camera looks down +X, so the
  // key sits front-and-high and the fills come from the far side and below.
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 2, 1.5);
  const fillBack = new THREE.DirectionalLight(0xffffff, 1.4);
  fillBack.position.set(1, 0.5, -2.5);
  const fillUnder = new THREE.DirectionalLight(0xffffff, 1.0);
  fillUnder.position.set(2, -2, -1);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2118, 0.6);
  scene.add(key, fillBack, fillUnder, hemi);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

  // The monogram spins inside a pivot so its own centring never fights the spin.
  const pivot = new THREE.Group();
  scene.add(pivot);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let ready = false;
  let running = false;
  let start = performance.now();

  loadModel().then(({ pieces }) => {
    const anchor = pieces.find((p) => p.name === ANCHOR_NAME);
    if (!anchor) return;

    const mesh = anchor.mesh.clone();
    mesh.scale.copy(anchor.home.scale);
    // Undo the authored mirror, so the AP reads the right way round.
    mesh.quaternion.copy(unmirrorAnchor(anchor.home.quat.clone()));

    // Give it its own gold metal (see goldMaterial) rather than the plain base
    // material, which without the intro's emissive glow renders as dull metal.
    mesh.material = goldMaterial(mesh.material);

    // Re-centre the piece about the pivot origin so it turns around itself, and
    // frame the camera down +X (face-on to the monogram, which is a thin wall in
    // the Y-Z plane) with enough room for its full width and height.
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
    pivot.add(mesh);

    const fovRad = (camera.fov * Math.PI) / 180;
    const fit = Math.max(size.y, size.z) / 2 / Math.tan(fovRad / 2);
    camera.position.set(fit * 1.35, 0, 0);
    camera.lookAt(0, 0, 0);

    ready = true;
    resize();
    render();
  });

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    if (!ready) return;
    const elapsed = (performance.now() - start) / 1000;

    if (!reduceMotion.matches) {
      const turn = (elapsed / motion.turnSeconds) * Math.PI * 2;
      pivot.rotation.y = motion.swayDegrees
        ? Math.sin(turn) * motion.swayDegrees * DEG
        : turn;
      pivot.rotation.x =
        Math.sin(turn / TILT_PERIOD) * motion.tiltDegrees * DEG;
      pivot.position.y =
        Math.sin((elapsed / motion.floatSeconds) * Math.PI * 2) * motion.floatUnits;
    }

    renderer.render(scene, camera);

    // Only keep the loop alive while the view holding it is on screen; a hidden
    // canvas has no offsetParent, so there is nothing to draw.
    if (running && canvas.offsetParent !== null) {
      requestAnimationFrame(render);
    } else {
      running = false;
    }
  }

  window.addEventListener('resize', () => {
    if (canvas.offsetParent !== null) resize();
  });

  return {
    // Called when the view holding it is opened: (re)start the loop, sized to
    // the canvas now that it is visible.
    activate() {
      start = performance.now();
      if (!running) {
        running = true;
        resize();
        render();
      }
    },

    // Called when it is still on the page but no longer being looked at — the
    // screen on home hides it behind another picture for seconds at a time,
    // and a canvas nobody can see is not worth a frame.
    pause() {
      running = false;
    },
  };
}
