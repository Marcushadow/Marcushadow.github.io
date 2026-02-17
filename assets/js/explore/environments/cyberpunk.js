/**
 * cyberpunk.js — Neon city street environment (dark theme)
 *
 * Builds a dark cyberpunk alleyway with buildings on both sides,
 * neon signs, rain, floating data bits, and a reflective wet
 * asphalt ground.
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

/* ============================================
   Palette
   ============================================ */

const C = {
  ground:      0x0a0a12,
  building:    0x0d0d18,
  neonCyan:    0x00d4ff,
  neonMagenta: 0xff00aa,
  neonPurple:  0x7c3aed,
};

/* ============================================
   Helpers
   ============================================ */

/**
 * Builds a single building block with randomised lit/unlit windows.
 */
function createBuilding(scene, x, z, width, height, depth) {
  // Main body
  const body = createBox(
    width, height, depth, C.building,
    new THREE.Vector3(x, height / 2, z)
  );
  body.material.roughness = 0.8;
  body.material.metalness = 0.3;
  scene.add(body);

  // Window rows
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

      // Window on front face (toward street)
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
}

/* ============================================
   Builder
   ============================================ */

/**
 * @param {THREE.Scene} scene
 * @returns {{ spawnPosition: THREE.Vector3, animationCallbacks: Function[], contentSlots: Object }}
 */
export function buildCyberpunk(scene) {
  const animationCallbacks = [];

  // --- Fog & background ---
  scene.fog = new THREE.FogExp2(0x050510, 0.03);
  scene.background = new THREE.Color(0x050510);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0x111122, 0.5);
  scene.add(ambient);

  // Main neon lights along the street
  const neonLights = [
    { pos: new THREE.Vector3(-4, 4, -8),  color: C.neonCyan,    intensity: 1.5 },
    { pos: new THREE.Vector3(4, 4, -4),   color: C.neonMagenta, intensity: 1.5 },
    { pos: new THREE.Vector3(-4, 4, 0),   color: C.neonPurple,  intensity: 1.2 },
    { pos: new THREE.Vector3(4, 4, 4),    color: C.neonCyan,    intensity: 1.0 },
    { pos: new THREE.Vector3(-4, 4, 8),   color: C.neonMagenta, intensity: 1.0 },
    { pos: new THREE.Vector3(0, 6, -16),  color: C.neonCyan,    intensity: 2.0 },
  ];

  neonLights.forEach(({ pos, color, intensity }) => {
    const light = new THREE.PointLight(color, intensity, 18);
    light.position.copy(pos);
    scene.add(light);
  });

  // --- Ground (wet asphalt) ---
  const groundGeo = new THREE.PlaneGeometry(40, 60);
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

  // Neon strip on ground (center line)
  const neonStrip = createEmissiveBox(
    0.15, 0.02, 40,
    C.neonCyan, C.neonCyan, 1.0,
    new THREE.Vector3(0, 0.02, 0)
  );
  scene.add(neonStrip);

  // Side neon strips
  const leftStrip = createEmissiveBox(
    0.1, 0.02, 40,
    C.neonMagenta, C.neonMagenta, 0.6,
    new THREE.Vector3(-5.5, 0.02, 0)
  );
  scene.add(leftStrip);

  const rightStrip = createEmissiveBox(
    0.1, 0.02, 40,
    C.neonMagenta, C.neonMagenta, 0.6,
    new THREE.Vector3(5.5, 0.02, 0)
  );
  scene.add(rightStrip);

  // --- Buildings — Left side (blog billboards) ---
  const blogSlots = [];

  const leftBuildings = [
    { x: -9,  z: -18, w: 6, h: 12, d: 6 },
    { x: -9,  z: -10, w: 6, h: 9,  d: 6 },
    { x: -10, z: -2,  w: 8, h: 15, d: 6 },
    { x: -9,  z: 6,   w: 6, h: 10, d: 6 },
    { x: -9,  z: 14,  w: 6, h: 8,  d: 6 },
  ];

  leftBuildings.forEach((b, i) => {
    createBuilding(scene, b.x, b.z, b.w, b.h, b.d);

    // Billboard slot on the face toward the street
    const billboardX = b.x + b.w / 2 + 0.15;
    const billboardY = 3.0 + (i % 3) * 1.2;

    blogSlots.push(new THREE.Vector3(billboardX, billboardY, b.z));

    // Add a second billboard slot higher up on taller buildings
    if (b.h > 9) {
      blogSlots.push(new THREE.Vector3(billboardX, billboardY + 2.5, b.z));
    }
  });

  // --- Buildings — Right side (project storefronts) ---
  const projectSlots = [];

  const rightBuildings = [
    { x: 9,  z: -16, w: 6, h: 10, d: 6 },
    { x: 9,  z: -8,  w: 6, h: 14, d: 6 },
    { x: 10, z: 0,   w: 8, h: 11, d: 6 },
    { x: 9,  z: 8,   w: 6, h: 9,  d: 6 },
    { x: 9,  z: 16,  w: 6, h: 12, d: 6 },
  ];

  rightBuildings.forEach((b) => {
    createBuilding(scene, b.x, b.z, b.w, b.h, b.d);

    // Storefront slot on the face toward the street
    const storefrontX = b.x - b.w / 2 - 0.15;
    projectSlots.push(new THREE.Vector3(storefrontX, 2.0, b.z));
  });

  // --- Neon sign accents ---
  const signs = [
    { text: 'BLOG',     pos: new THREE.Vector3(-5.5, 5.0, -14), color: '#00d4ff' },
    { text: 'PROJECTS', pos: new THREE.Vector3(5.5, 5.0, -4),   color: '#ff00aa' },
    { text: 'ABOUT',    pos: new THREE.Vector3(-2, 5.0, 18),     color: '#7c3aed' },
  ];

  signs.forEach(({ text, pos, color }) => {
    const sign = createTextSprite(text, 42, color);
    sign.position.copy(pos);
    scene.add(sign);
  });

  // Decorative neon bars on buildings
  const neonBarConfigs = [
    { pos: new THREE.Vector3(-6, 6, -14),  color: C.neonCyan,    w: 3 },
    { pos: new THREE.Vector3(-6, 4, -6),   color: C.neonMagenta, w: 2.5 },
    { pos: new THREE.Vector3(6, 5, -12),   color: C.neonPurple,  w: 2 },
    { pos: new THREE.Vector3(6, 7, 0),     color: C.neonCyan,    w: 3.5 },
    { pos: new THREE.Vector3(-6, 8, 2),    color: C.neonMagenta, w: 2 },
  ];

  neonBarConfigs.forEach(({ pos, color, w }) => {
    const bar = createEmissiveBox(w, 0.12, 0.12, color, color, 1.2, pos);
    scene.add(bar);
  });

  // --- About zone (end of street) ---
  const aboutPosition = new THREE.Vector3(0, 1.7, 20);

  // Terminal / kiosk for about section
  const kiosk = createBox(
    2, 2.5, 0.3, 0x1a1a2e,
    new THREE.Vector3(0, 1.25, 21)
  );
  scene.add(kiosk);

  // Screen glow
  const screen = createEmissiveBox(
    1.6, 1.8, 0.05,
    C.neonCyan, C.neonCyan, 0.4,
    new THREE.Vector3(0, 1.5, 20.82)
  );
  scene.add(screen);

  // --- Rain particles ---
  const rainCount = 1500;
  const rainPositions = new Float32Array(rainCount * 3);

  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3]     = (Math.random() - 0.5) * 30;
    rainPositions[i * 3 + 1] = Math.random() * 20;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
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
      positions[i * 3 + 1] -= 0.25; // fast fall

      // Slight drift
      positions[i * 3] += (Math.random() - 0.5) * 0.01;

      // Reset when below ground
      if (positions[i * 3 + 1] < -0.5) {
        positions[i * 3]     = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = 18 + Math.random() * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
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
    dataBitPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
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
      // Gentle sin-wave float
      positions[i * 3 + 1] =
        dataBitBaseY[i] + Math.sin(elapsed * 0.5 + i * 0.8) * 0.6;
    }

    dataBits.geometry.attributes.position.needsUpdate = true;
  });

  // --- Neon light flicker animation ---
  animationCallbacks.push((_delta, elapsed) => {
    neonLights.forEach(({ pos }, idx) => {
      // Already created above — access scene children to flicker
      // We modulate the strip emissive intensities instead
    });

    // Subtle pulsing on the ground neon strip
    const pulse = 0.7 + 0.3 * Math.sin(elapsed * 2);
    neonStrip.material.emissiveIntensity = pulse;
  });

  // --- Exit portal ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.7, -22),
    C.neonCyan
  );
  scene.add(exitPortal);

  // --- Return ---
  return {
    spawnPosition: LAYOUT.spawnPosition.clone(),
    animationCallbacks,
    contentSlots: {
      blog: blogSlots.slice(0, 10),
      projects: projectSlots.slice(0, 5),
      about: aboutPosition,
    },
  };
}
