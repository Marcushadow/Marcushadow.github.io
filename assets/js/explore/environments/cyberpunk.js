/**
 * cyberpunk.js — Neon city street environment (dark theme)
 *
 * Builds a dense cyberpunk alleyway with buildings on both sides,
 * neon signs, rain, floating data bits, vendor stalls, overhead wires,
 * street puddles, ground-level clutter, and Kenney model accents.
 *
 * Shortened street for isometric camera view (Z range: -10 to +10).
 */

import * as THREE from 'three';
import {
  LAYOUT,
  createBox,
  createPlane,
  createCylinder,
  createEmissiveBox,
  createTextSprite,
  createParticles,
  createExitPortal,
} from './shared.js';
import { loadModels, cloneModel } from '../model-loader.js';

/* ============================================
   Palette
   ============================================ */

const C = {
  ground:      0x0a0a12,
  building:    0x0d0d18,
  buildingAlt: 0x10101f,
  neonCyan:    0x00d4ff,
  neonMagenta: 0xff00aa,
  neonPurple:  0x7c3aed,
  neonGreen:   0x39ff14,
  crate:       0x1a1a28,
  barrier:     0x222233,
  dumpster:    0x1c1c2a,
  stallRoof:   0x14142a,
  wire:        0x111111,
};

/* ============================================
   Helpers
   ============================================ */

/**
 * Builds a single building block with randomised lit/unlit windows.
 * Returns the body mesh for use in the collider group.
 */
function createBuilding(scene, x, z, width, height, depth) {
  const body = createBox(
    width, height, depth, C.building,
    new THREE.Vector3(x, height / 2, z)
  );
  body.material.roughness = 0.8;
  body.material.metalness = 0.3;
  scene.add(body);

  const windowRows = Math.floor(height / 1.2);
  const windowCols = Math.max(2, Math.floor(width / 1.5));
  const winWidth = 0.4;
  const winHeight = 0.5;

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const lit = Math.random() > 0.30;
      if (!lit) continue;

      const wy = 1.0 + row * 1.2;
      const wx = x - (width / 2) + 0.8 + col * (width / windowCols);

      const winColor =
        Math.random() > 0.5 ? C.neonCyan : Math.random() > 0.5 ? C.neonMagenta : 0x445566;
      const intensity = Math.random() * 0.6 + 0.3;

      const win = createEmissiveBox(
        winWidth, winHeight, 0.05,
        winColor, winColor, intensity,
        new THREE.Vector3(wx, wy, z + depth / 2 + 0.03)
      );
      scene.add(win);
    }
  }

  return body;
}

/**
 * Creates a visible neon tube mesh (emissive cylinder) and a corresponding
 * PointLight for actual illumination.
 */
function createNeonTubeWithLight(scene, position, color, intensity, tubeLength, tubeRadius) {
  const tubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 8);
  const tubeMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.0,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.position.copy(position);
  tube.rotation.z = Math.PI / 2;
  scene.add(tube);

  const light = new THREE.PointLight(color, intensity, 18);
  light.position.copy(position);
  scene.add(light);

  return tube;
}

/**
 * Creates a procedural crate with neon-trimmed edges at ground level.
 */
function createCrate(scene, x, z, size) {
  const h = size * (0.8 + Math.random() * 0.4);
  const body = createBox(
    size, h, size, C.crate,
    new THREE.Vector3(x, h / 2, z)
  );
  body.material.roughness = 0.9;
  body.material.metalness = 0.2;
  scene.add(body);

  const trimColor = Math.random() > 0.5 ? C.neonCyan : C.neonMagenta;
  const topTrim = createEmissiveBox(
    size + 0.02, 0.03, size + 0.02,
    trimColor, trimColor, 0.8,
    new THREE.Vector3(x, h, z)
  );
  scene.add(topTrim);

  return body;
}

/**
 * Creates a procedural barrier (jersey barrier style).
 */
function createBarrier(scene, x, z, rotY) {
  const body = createBox(
    0.5, 0.8, 1.8, C.barrier,
    new THREE.Vector3(x, 0.4, z)
  );
  body.material.roughness = 0.85;
  body.material.metalness = 0.3;
  if (rotY) body.rotation.y = rotY;
  scene.add(body);

  const stripe = createEmissiveBox(
    0.52, 0.08, 1.82,
    C.neonMagenta, C.neonMagenta, 0.5,
    new THREE.Vector3(x, 0.55, z)
  );
  if (rotY) stripe.rotation.y = rotY;
  scene.add(stripe);

  return body;
}

/**
 * Creates a procedural dumpster.
 */
function createDumpster(scene, x, z) {
  const body = createBox(
    1.5, 1.2, 1.0, C.dumpster,
    new THREE.Vector3(x, 0.6, z)
  );
  body.material.roughness = 0.9;
  body.material.metalness = 0.4;
  scene.add(body);

  const lid = createBox(
    1.55, 0.06, 1.05, 0x222238,
    new THREE.Vector3(x, 1.21, z)
  );
  scene.add(lid);

  const handleL = createBox(
    0.06, 0.15, 0.06, 0x333344,
    new THREE.Vector3(x - 0.5, 1.31, z)
  );
  scene.add(handleL);

  const handleR = createBox(
    0.06, 0.15, 0.06, 0x333344,
    new THREE.Vector3(x + 0.5, 1.31, z)
  );
  scene.add(handleR);

  return body;
}

/**
 * Creates a neon vendor stall (2x2.5x1.5) with emissive roof and trim.
 */
function createVendorStall(scene, x, z, roofColor, trimColor) {
  const stallW = 2.0;
  const stallH = 2.5;
  const stallD = 1.5;

  const backWall = createBox(
    stallW, stallH, 0.08, C.buildingAlt,
    new THREE.Vector3(x, stallH / 2, z - stallD / 2)
  );
  backWall.material.roughness = 0.8;
  scene.add(backWall);

  const leftWall = createBox(
    0.08, stallH, stallD, C.buildingAlt,
    new THREE.Vector3(x - stallW / 2, stallH / 2, z)
  );
  scene.add(leftWall);

  const rightWall = createBox(
    0.08, stallH, stallD, C.buildingAlt,
    new THREE.Vector3(x + stallW / 2, stallH / 2, z)
  );
  scene.add(rightWall);

  const counter = createBox(
    stallW, 0.1, stallD * 0.6, 0x181828,
    new THREE.Vector3(x, 1.0, z + stallD * 0.2)
  );
  scene.add(counter);

  const roof = createEmissiveBox(
    stallW + 0.3, 0.1, stallD + 0.3,
    roofColor, roofColor, 1.5,
    new THREE.Vector3(x, stallH + 0.05, z)
  );
  scene.add(roof);

  const frontTrim = createEmissiveBox(
    stallW + 0.3, 0.06, 0.06,
    trimColor, trimColor, 1.2,
    new THREE.Vector3(x, stallH - 0.2, z + stallD / 2 + 0.03)
  );
  scene.add(frontTrim);

  const bottomTrim = createEmissiveBox(
    stallW + 0.1, 0.04, 0.04,
    trimColor, trimColor, 0.8,
    new THREE.Vector3(x, 0.02, z + stallD / 2 + 0.02)
  );
  scene.add(bottomTrim);

  const stallLight = new THREE.PointLight(roofColor, 0.8, 8);
  stallLight.position.set(x, stallH - 0.5, z + 0.3);
  scene.add(stallLight);

  return backWall;
}

/**
 * Creates an overhead wire between two points using a thin cylinder.
 */
function createOverheadWire(scene, start, end) {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();

  const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, length, 4);
  const wireMat = new THREE.MeshStandardMaterial({
    color: C.wire,
    roughness: 0.9,
    metalness: 0.6,
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.position.copy(mid);

  dir.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  wire.quaternion.copy(quat);

  scene.add(wire);
  return wire;
}

/**
 * Creates a street puddle (small reflective plane).
 */
function createPuddle(scene, x, z, w, d) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x060612,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const puddle = new THREE.Mesh(geo, mat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(x, 0.005, z);
  scene.add(puddle);
  return puddle;
}

/**
 * Creates an invisible collision box for the octree.
 */
function createCollisionBox(w, h, d, position) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ visible: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  return mesh;
}

/* ============================================
   Builder
   ============================================ */

/**
 * @param {THREE.Scene} scene
 * @returns {Promise<{ spawnPosition: THREE.Vector3, animationCallbacks: Function[], contentSlots: Object, colliderGroup: THREE.Group }>}
 */
export async function buildCyberpunk(scene) {
  const animationCallbacks = [];
  const colliderGroup = new THREE.Group();

  // --- Load Kenney models ---
  const models = await loadModels({
    trashcan:          '/assets/models/cyberpunk/trashcan.glb',
    cardboardBoxClosed: '/assets/models/cyberpunk/cardboardBoxClosed.glb',
    cardboardBoxOpen:   '/assets/models/cyberpunk/cardboardBoxOpen.glb',
    computerScreen:     '/assets/models/cyberpunk/computerScreen.glb',
  });

  // --- Fog & background ---
  scene.fog = new THREE.FogExp2(0x050510, 0.03);
  scene.background = new THREE.Color(0x050510);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0x111122, 0.5);
  scene.add(ambient);

  // Main neon lights — mounted on building walls with brackets
  // Z positions compressed ~50% from original
  const neonLightConfigs = [
    { pos: new THREE.Vector3(-6.4, 4, -4),   color: C.neonCyan,    intensity: 1.5, len: 1.8 },
    { pos: new THREE.Vector3(6.4, 4, -2),    color: C.neonMagenta, intensity: 1.5, len: 1.5 },
    { pos: new THREE.Vector3(-6.4, 4, 0),    color: C.neonPurple,  intensity: 1.2, len: 2.0 },
    { pos: new THREE.Vector3(6.4, 4, 2),     color: C.neonCyan,    intensity: 1.0, len: 1.5 },
    { pos: new THREE.Vector3(-6.4, 4, 4),    color: C.neonMagenta, intensity: 1.0, len: 1.8 },
    { pos: new THREE.Vector3(-6.4, 5, 7),    color: C.neonGreen,   intensity: 1.0, len: 1.2 },
    { pos: new THREE.Vector3(6.4, 5, 6),     color: C.neonPurple,  intensity: 1.0, len: 1.4 },
  ];

  const neonTubes = [];
  neonLightConfigs.forEach(({ pos, color, intensity, len }) => {
    const tube = createNeonTubeWithLight(scene, pos, color, intensity, len, 0.05);
    neonTubes.push(tube);

    // Wall bracket connecting tube to building face
    const bracketX = pos.x < 0 ? pos.x - 0.15 : pos.x + 0.15;
    const bracket = createBox(
      0.1, 0.1, 0.2, C.building,
      new THREE.Vector3(bracketX, pos.y, pos.z)
    );
    bracket.material.metalness = 0.6;
    bracket.material.roughness = 0.4;
    scene.add(bracket);
  });

  // --- Ground (wet asphalt) ---
  const groundGeo = new THREE.PlaneGeometry(40, 30);
  const groundMat = new THREE.MeshStandardMaterial({
    color: C.ground,
    roughness: 0.3,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // Neon strip on ground (center line) — shortened
  const neonStrip = createEmissiveBox(
    0.15, 0.02, 22,
    C.neonCyan, C.neonCyan, 1.0,
    new THREE.Vector3(0, 0.02, 0)
  );
  scene.add(neonStrip);

  // Side neon strips (pushed outward for tighter street) — shortened
  const leftStrip = createEmissiveBox(
    0.1, 0.02, 22,
    C.neonMagenta, C.neonMagenta, 0.6,
    new THREE.Vector3(-6.5, 0.02, 0)
  );
  scene.add(leftStrip);

  const rightStrip = createEmissiveBox(
    0.1, 0.02, 22,
    C.neonMagenta, C.neonMagenta, 0.6,
    new THREE.Vector3(6.5, 0.02, 0)
  );
  scene.add(rightStrip);

  // --- Buildings — Left side (blog billboards) — 6 buildings ---
  // Z range: -10 to +10, ~3.5 unit spacing, max height 8
  const blogSlots = [];

  const leftBuildings = [
    { x: -9,  z: -9,   w: 5, h: 7, d: 5 },
    { x: -10, z: -5.5, w: 7, h: 6, d: 5 },
    { x: -9,  z: -2,   w: 5, h: 8, d: 5 },
    { x: -10, z: 1.5,  w: 7, h: 7, d: 5 },
    { x: -9,  z: 5,    w: 5, h: 5, d: 5 },
    { x: -9,  z: 8.5,  w: 5, h: 8, d: 5 },
  ];

  leftBuildings.forEach((b, i) => {
    createBuilding(scene, b.x, b.z, b.w, b.h, b.d);

    // Collision box for this building
    colliderGroup.add(
      createCollisionBox(b.w, b.h, b.d, new THREE.Vector3(b.x, b.h / 2, b.z))
    );

    // Billboard slot on the face toward the street
    const billboardX = b.x + b.w / 2 + 0.15;
    const billboardY = 3.0 + (i % 3) * 1.2;

    blogSlots.push(new THREE.Vector3(billboardX, billboardY, b.z));

    if (b.h > 6) {
      blogSlots.push(new THREE.Vector3(billboardX, billboardY + 2.5, b.z));
    }
  });

  // --- Buildings — Right side (project storefronts) — 6 buildings ---
  // Z range: -10 to +10, ~3.5 unit spacing, max height 8
  const projectSlots = [];

  const rightBuildings = [
    { x: 9,  z: -9,   w: 5, h: 6, d: 5 },
    { x: 10, z: -5.5, w: 7, h: 7, d: 5 },
    { x: 9,  z: -2,   w: 5, h: 8, d: 5 },
    { x: 10, z: 1.5,  w: 7, h: 6, d: 5 },
    { x: 9,  z: 5,    w: 5, h: 7, d: 5 },
    { x: 9,  z: 8.5,  w: 5, h: 5, d: 5 },
  ];

  rightBuildings.forEach((b) => {
    createBuilding(scene, b.x, b.z, b.w, b.h, b.d);

    colliderGroup.add(
      createCollisionBox(b.w, b.h, b.d, new THREE.Vector3(b.x, b.h / 2, b.z))
    );

    const storefrontX = b.x - b.w / 2 - 0.15;
    projectSlots.push(new THREE.Vector3(storefrontX, 2.0, b.z));
  });

  // --- Neon sign accents ---
  // Z positions compressed ~50%
  const signs = [
    { text: 'BLOG',     pos: new THREE.Vector3(-5.5, 5.0, -7),  color: '#00d4ff' },
    { text: 'PROJECTS', pos: new THREE.Vector3(5.5, 5.0, -2),   color: '#ff00aa' },
    { text: 'ABOUT',    pos: new THREE.Vector3(-2, 5.0, 9),     color: '#7c3aed' },
  ];

  signs.forEach(({ text, pos, color }) => {
    const sign = createTextSprite(text, 42, color);
    sign.position.copy(pos);
    scene.add(sign);
  });

  // Decorative neon bars on building faces — Z compressed ~50%
  const neonBarConfigs = [
    { pos: new THREE.Vector3(-6.4, 6, -7),   color: C.neonCyan,    w: 3 },
    { pos: new THREE.Vector3(-6.4, 4, -3),   color: C.neonMagenta, w: 2.5 },
    { pos: new THREE.Vector3(6.4, 5, -6),    color: C.neonPurple,  w: 2 },
    { pos: new THREE.Vector3(6.4, 7, 0),     color: C.neonCyan,    w: 3.5 },
    { pos: new THREE.Vector3(-6.4, 8, 1),    color: C.neonMagenta, w: 2 },
    { pos: new THREE.Vector3(6.4, 3, 4),     color: C.neonGreen,   w: 2.5 },
    { pos: new THREE.Vector3(-6.4, 5, 5),    color: C.neonPurple,  w: 3 },
    { pos: new THREE.Vector3(6.4, 6, 8),     color: C.neonCyan,    w: 2 },
  ];

  neonBarConfigs.forEach(({ pos, color, w }) => {
    const bar = createEmissiveBox(w, 0.12, 0.12, color, color, 1.2, pos);
    scene.add(bar);

    // Bracket at each end of the bar
    const halfW = w / 2 - 0.1;
    const bracketX = pos.x < 0 ? pos.x - 0.1 : pos.x + 0.1;
    for (const offset of [-halfW, halfW]) {
      const bracket = createBox(
        0.08, 0.15, 0.15, C.building,
        new THREE.Vector3(bracketX, pos.y, pos.z + offset)
      );
      bracket.material.metalness = 0.6;
      scene.add(bracket);
    }
  });

  // --- Ground-level clutter: Procedural crates --- Z compressed ~50%
  const cratePositions = [
    { x: -6.2, z: -8.5, size: 0.6 },
    { x: 6.2,  z: -7,   size: 0.55 },
    { x: -6.0, z: 1.5,  size: 0.7 },
    { x: 6.0,  z: 5,    size: 0.5 },
  ];

  cratePositions.forEach(({ x, z, size }) => {
    const crate = createCrate(scene, x, z, size);
    const crateH = size * 1.0;
    colliderGroup.add(
      createCollisionBox(size, crateH, size, new THREE.Vector3(x, crateH / 2, z))
    );
  });

  // --- Ground-level clutter: Barriers --- Z compressed ~50%
  const barrierConfigs = [
    { x: -3, z: -5, rot: 0.3 },
    { x: 3,  z: 2.5, rot: -0.2 },
  ];

  barrierConfigs.forEach(({ x, z, rot }) => {
    createBarrier(scene, x, z, rot);
    colliderGroup.add(
      createCollisionBox(0.5, 0.8, 1.8, new THREE.Vector3(x, 0.4, z))
    );
  });

  // --- Ground-level clutter: Dumpsters --- Z compressed ~50%
  const dumpsterPositions = [
    { x: -6.5, z: -1.5 },
    { x: 6.5,  z: 7.5 },
  ];

  dumpsterPositions.forEach(({ x, z }) => {
    createDumpster(scene, x, z);
    colliderGroup.add(
      createCollisionBox(1.5, 1.2, 1.0, new THREE.Vector3(x, 0.6, z))
    );
  });

  // --- Neon vendor stalls (4 along the street) --- Z compressed ~50%
  const stallConfigs = [
    { x: -4.5, z: -2.5, roofColor: C.neonCyan,    trimColor: C.neonMagenta },
    { x: 4.5,  z: 1,    roofColor: C.neonMagenta,  trimColor: C.neonCyan },
    { x: -4.0, z: 4.5,  roofColor: C.neonPurple,   trimColor: C.neonGreen },
    { x: 4.0,  z: -7.5, roofColor: C.neonGreen,    trimColor: C.neonPurple },
  ];

  stallConfigs.forEach(({ x, z, roofColor, trimColor }) => {
    createVendorStall(scene, x, z, roofColor, trimColor);
    colliderGroup.add(
      createCollisionBox(2.0, 2.5, 1.5, new THREE.Vector3(x, 1.25, z))
    );
  });

  // --- Overhead wires with pole supports --- Z compressed ~50%
  const wireConfigs = [
    { start: new THREE.Vector3(-6.5, 8,  -9),  end: new THREE.Vector3(6.5, 7.5, -9) },
    { start: new THREE.Vector3(-6.5, 9,  -5),  end: new THREE.Vector3(6.5, 8,   -5) },
    { start: new THREE.Vector3(-6.5, 7,  -1),  end: new THREE.Vector3(6.5, 7.5, -1) },
    { start: new THREE.Vector3(-6.5, 10, 2),   end: new THREE.Vector3(6.5, 9,   2) },
    { start: new THREE.Vector3(-6.5, 8,  5),   end: new THREE.Vector3(6.5, 8.5, 5) },
    { start: new THREE.Vector3(-6.5, 7,  8),   end: new THREE.Vector3(6.5, 7,   8) },
  ];

  wireConfigs.forEach(({ start, end }) => {
    createOverheadWire(scene, start, end);

    // Pole at each endpoint — sits on building rooftop
    [start, end].forEach((point) => {
      const side = point.x < 0 ? leftBuildings : rightBuildings;
      const building = side.find(b => Math.abs(b.z - point.z) < 3);
      const roofY = building ? building.h : point.y;
      const poleHeight = point.y - roofY + 1.5;

      if (poleHeight > 0.1) {
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, poleHeight, 6);
        const poleMat = new THREE.MeshStandardMaterial({
          color: C.wire,
          roughness: 0.7,
          metalness: 0.5,
        });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(point.x, roofY + poleHeight / 2, point.z);
        scene.add(pole);
      }
    });
  });

  // --- Street puddles (reflective planes) --- Z compressed ~50%
  const puddleConfigs = [
    { x: -2.5, z: -6,   w: 2.0, d: 1.0 },
    { x: 1.5,  z: -1.5, w: 1.5, d: 0.8 },
    { x: -1.0, z: 3,    w: 2.5, d: 1.2 },
    { x: 3.0,  z: 6.5,  w: 1.8, d: 0.9 },
    { x: -3.5, z: 8.5,  w: 1.2, d: 1.0 },
  ];

  puddleConfigs.forEach(({ x, z, w, d }) => {
    createPuddle(scene, x, z, w, d);
  });

  // --- Kenney model accents: trashcans --- Z compressed ~50%
  if (models.trashcan) {
    const trashcanPlacements = [
      { x: -6.3, z: -9.5, scale: 1.2 },
      { x: 6.3,  z: -5.5, scale: 1.0 },
      { x: -6.1, z: -0.5, scale: 1.1 },
      { x: 6.1,  z: 3.5,  scale: 1.3 },
    ];

    trashcanPlacements.forEach(({ x, z, scale }) => {
      const tc = cloneModel(models.trashcan);
      tc.scale.set(scale, scale, scale);
      tc.position.set(x, 0, z);
      tc.rotation.y = Math.random() * Math.PI * 2;
      scene.add(tc);
      colliderGroup.add(
        createCollisionBox(0.5 * scale, 1.0 * scale, 0.5 * scale, new THREE.Vector3(x, 0.5 * scale, z))
      );
    });
  }

  // --- Kenney model accents: cardboard boxes --- Z compressed ~50%
  if (models.cardboardBoxClosed) {
    const closedBoxPlacements = [
      { x: -6.0, z: -7.5, scale: 1.0 },
      { x: 6.0,  z: -2.5, scale: 1.2 },
    ];

    closedBoxPlacements.forEach(({ x, z, scale }) => {
      const box = cloneModel(models.cardboardBoxClosed);
      box.scale.set(scale, scale, scale);
      box.position.set(x, 0, z);
      box.rotation.y = Math.random() * Math.PI;
      scene.add(box);
    });
  }

  if (models.cardboardBoxOpen) {
    const openBoxPlacements = [
      { x: -5.9, z: -7.25, scale: 1.0 },
      { x: 5.9,  z: -2.25, scale: 1.3 },
    ];

    openBoxPlacements.forEach(({ x, z, scale }) => {
      const box = cloneModel(models.cardboardBoxOpen);
      box.scale.set(scale, scale, scale);
      box.position.set(x, 0, z);
      box.rotation.y = Math.random() * Math.PI;
      scene.add(box);
    });
  }

  // --- Kenney model accents: computer screens on vendor stalls and crates ---
  // Z positions adjusted to match compressed stall positions
  if (models.computerScreen) {
    const screenPlacements = [
      { x: -4.5, z: -2.2, y: 1.1, scale: 1.2, rotY: 0 },
      { x: 4.5,  z: 1.3,  y: 1.1, scale: 1.0, rotY: Math.PI },
      { x: -4.0, z: 4.8,  y: 1.1, scale: 1.1, rotY: 0 },
    ];

    screenPlacements.forEach(({ x, z, y, scale, rotY }) => {
      const screen = cloneModel(models.computerScreen);
      screen.scale.set(scale, scale, scale);
      screen.position.set(x, y, z);
      screen.rotation.y = rotY;
      scene.add(screen);
    });
  }

  // --- About zone (end of street) --- moved from z=20 to z=9
  const aboutPosition = new THREE.Vector3(0, 0, 9);

  const kiosk = createBox(
    2, 2.5, 0.3, 0x1a1a2e,
    new THREE.Vector3(0, 1.25, 10)
  );
  scene.add(kiosk);
  colliderGroup.add(
    createCollisionBox(2, 2.5, 0.3, new THREE.Vector3(0, 1.25, 10))
  );

  const screen = createEmissiveBox(
    1.6, 1.8, 0.05,
    C.neonCyan, C.neonCyan, 0.4,
    new THREE.Vector3(0, 1.5, 9.82)
  );
  scene.add(screen);

  // --- Rain particles ---
  const rainCount = 1500;
  const rainPositions = new Float32Array(rainCount * 3);

  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3]     = (Math.random() - 0.5) * 30;
    rainPositions[i * 3 + 1] = Math.random() * 20;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 25;
  }

  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(rainPositions, 3)
  );

  const rainMaterial = new THREE.PointsMaterial({
    color: 0x8888cc,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
  });

  const rain = new THREE.Points(rainGeometry, rainMaterial);
  scene.add(rain);

  animationCallbacks.push((_delta, _elapsed) => {
    const positions = rain.geometry.attributes.position.array;

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 1] -= 0.25;
      positions[i * 3] += (Math.random() - 0.5) * 0.01;

      if (positions[i * 3 + 1] < -0.5) {
        positions[i * 3]     = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = 18 + Math.random() * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
      }
    }

    rain.geometry.attributes.position.needsUpdate = true;
  });

  // --- Floating data bits ---
  const dataBitCount = 100;
  const dataBitPositions = new Float32Array(dataBitCount * 3);
  const dataBitBaseY = new Float32Array(dataBitCount);

  for (let i = 0; i < dataBitCount; i++) {
    dataBitPositions[i * 3]     = (Math.random() - 0.5) * 25;
    dataBitPositions[i * 3 + 1] = 1 + Math.random() * 8;
    dataBitPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    dataBitBaseY[i] = dataBitPositions[i * 3 + 1];
  }

  const dataBitGeometry = new THREE.BufferGeometry();
  dataBitGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(dataBitPositions, 3)
  );

  const dataBitMaterial = new THREE.PointsMaterial({
    color: C.neonCyan,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });

  const dataBits = new THREE.Points(dataBitGeometry, dataBitMaterial);
  scene.add(dataBits);

  animationCallbacks.push((_delta, elapsed) => {
    const positions = dataBits.geometry.attributes.position.array;

    for (let i = 0; i < dataBitCount; i++) {
      positions[i * 3 + 1] =
        dataBitBaseY[i] + Math.sin(elapsed * 0.5 + i * 0.8) * 0.6;
    }

    dataBits.geometry.attributes.position.needsUpdate = true;
  });

  // --- Neon light and tube flicker animation ---
  animationCallbacks.push((_delta, elapsed) => {
    const pulse = 0.7 + 0.3 * Math.sin(elapsed * 2);
    neonStrip.material.emissiveIntensity = pulse;

    neonTubes.forEach((tube, idx) => {
      const flicker = 1.5 + 0.5 * Math.sin(elapsed * 3.0 + idx * 1.7);
      tube.material.emissiveIntensity = flicker;
    });
  });

  // --- Exit portal --- moved from z=-22 to z=-11
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.7, -11),
    C.neonCyan
  );
  scene.add(exitPortal);

  // Add colliderGroup to scene (invisible boxes are inside it)
  scene.add(colliderGroup);

  // --- Return ---
  return {
    spawnPosition: new THREE.Vector3(0, 0, 0),
    animationCallbacks,
    contentSlots: {
      blog: blogSlots.slice(0, 10),
      projects: projectSlots.slice(0, 5),
      about: aboutPosition,
    },
    colliderGroup,
  };
}
