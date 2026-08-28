import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The 3D artwork, shared by the intro and by anything else that wants to reuse
// its pieces. The file is ~14MB, so it is parsed once and handed out after.

const MODEL_URL = 'assets/AP-site-3D_kosta.glb';

// Centre of the model in world space (from the GLB bounds), and how tall it is.
export const MODEL_CENTER = new THREE.Vector3(0, 9.2, 0);
export const MODEL_HEIGHT = 37.4; // world units, used to frame the camera

// The piece that acts as the anchor in the intro: the AP monogram.
export const ANCHOR_NAME = 'Curve';

/**
 * Turns the anchor the right way round. The monogram is authored mirrored in
 * the GLB, so the AP reads backwards until it is spun a half turn about the
 * vertical. Everything that shows it has to do this — the intro and the
 * contact page each do it inline; this is the same half turn, named.
 */
export function unmirrorAnchor(quat) {
  return quat.premultiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
  );
}

// The site's gold, as metal. The intro's anchor gets its gold from an emissive
// glow instead; everywhere the monogram is shown at rest — the contact page,
// and the transition between the finder's questions — it is this, so the two
// cannot drift apart. Kept in step by eye with --gold-* in style.css, which is
// the flat-CSS version worn by the sidebar's active mark.
export const GOLD = '#e3c56a';

/**
 * The monogram's material: plain gold metal, no glow and no iridescence, just
 * gold catching the light.
 *
 * Built fresh from an explicit colour rather than tinting a copy of `src` —
 * the piece's own base colour map would tint the gold away, so it is the one
 * thing deliberately dropped. The surface-detail maps are carried over from
 * `src`, so the metal keeps the artwork's own grain.
 *
 * The default finish is polished, which wants a scene with lights in it for
 * the polish to catch: at roughness 0.3 the surface mostly mirrors what is
 * around it, so in a scene lit by the environment alone it mirrors mostly
 * darkness and renders near-black. Such a scene should pass a rougher
 * `finish`, which scatters the environment instead of reflecting it and is
 * some two and a half times brighter there.
 */
export function goldMaterial(src, finish = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(GOLD),
    metalness: 0.85,
    roughness: 0.3,
    ...finish,
    normalMap: src.normalMap,
    normalScale: src.normalScale,
    aoMap: src.aoMap,
    aoMapIntensity: src.aoMapIntensity,
    side: src.side,
  });
}

let pending = null;

/**
 * Loads (and caches) the model.
 *
 * Resolves to { gltf, pieces }, where each piece carries the pose the artwork
 * was authored in. The intro moves its meshes around and never puts them back,
 * so anyone cloning a piece afterwards needs `home` to restore the real pose.
 */
export function loadModel() {
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        MODEL_URL,
        (gltf) => {
          const pieces = [];
          gltf.scene.traverse((obj) => {
            if (!obj.isMesh) return;
            pieces.push({
              mesh: obj,
              name: obj.name,
              home: {
                pos: obj.position.clone(),
                quat: obj.quaternion.clone(),
                scale: obj.scale.clone(),
              },
            });
          });
          resolve({ gltf, pieces });
        },
        undefined,
        reject
      );
    });
  }
  return pending;
}

/** Frames a camera on the model the way the intro does: side on, down +X. */
export function frameModel(camera, aspect) {
  camera.aspect = aspect;
  const fovRad = (camera.fov * Math.PI) / 180;
  const fitDist = MODEL_HEIGHT / 2 / Math.tan(fovRad / 2);
  camera.position.set(fitDist * 1.25, MODEL_CENTER.y, 0);
  camera.lookAt(MODEL_CENTER);
  camera.updateProjectionMatrix();
}
