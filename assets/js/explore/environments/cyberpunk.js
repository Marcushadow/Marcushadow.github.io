/**
 * cyberpunk.js — Open neon plaza environment (dark theme)
 *
 * An open-air cyberpunk plaza with neon lighting, rain particles,
 * and holographic signs. Sparse neon pillars provide minimal collision.
 * Designed for unobstructed isometric camera view.
 */

import * as THREE from 'three';
import {
  createBox,
  createEmissiveBox,
  createCylinder,
  createTextSprite,
  createExitPortal,
} from './shared.js';
import { loadModels, cloneModel } from '../model-loader.js';

/* ============================================
   Palette
   ============================================ */

const C = {
  ground:      0x0a0a14,
  neonCyan:    0x00d4ff,
  neonMagenta: 0xff00aa,
  neonPurple:  0x7c3aed,
  neonGreen:   0x00ff88,
  darkMetal:   0x1a1a2e,
};

/* ============================================
   Helpers
   ============================================ */

function createNeonPillar(scene, x, z, height, color) {
  // Pillar body
  const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, height, 8);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: C.darkMetal,
    roughness: 0.3,
    metalness: 0.8,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(x, height / 2, z);
  pillar.castShadow = true;
  scene.add(pillar);

  // Neon ring at top
  const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, height, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // Point light at top
  const light = new THREE.PointLight(color, 1.0, 8);
  light.position.set(x, height + 0.5, z);
  scene.add(light);

  return pillar;
}

/* ============================================
   Builder
   ============================================ */

export async function buildCyberpunk(scene) {
  const animationCallbacks = [];
  const obstacles = [];

  // --- Load GLB models ---
  const models = await loadModels({
    trashcan:           '/assets/models/cyberpunk/trashcan.glb',
    cardboardBoxClosed: '/assets/models/cyberpunk/cardboardBoxClosed.glb',
    computerScreen:     '/assets/models/cyberpunk/computerScreen.glb',
  });

  // --- Sky & fog ---
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.025);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0x111122, 0.4);
  scene.add(ambient);

  // --- Ground (wet asphalt, 22x22) ---
  const groundGeo = new THREE.PlaneGeometry(24, 24);
  const groundMat = new THREE.MeshStandardMaterial({
    color: C.ground,
    roughness: 0.2,
    metalness: 0.7,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Neon ground strips (cross pattern) ---
  const stripH = createEmissiveBox(
    22, 0.02, 0.15, C.neonCyan, C.neonCyan, 1.0,
    new THREE.Vector3(0, 0.01, 0)
  );
  scene.add(stripH);

  const stripV = createEmissiveBox(
    0.15, 0.02, 22, C.neonMagenta, C.neonMagenta, 0.8,
    new THREE.Vector3(0, 0.01, 0)
  );
  scene.add(stripV);

  // Outer border strips
  const borderPositions = [
    { pos: new THREE.Vector3(0, 0.01, -10), w: 22, d: 0.1 },
    { pos: new THREE.Vector3(0, 0.01, 10), w: 22, d: 0.1 },
    { pos: new THREE.Vector3(-10, 0.01, 0), w: 0.1, d: 22 },
    { pos: new THREE.Vector3(10, 0.01, 0), w: 0.1, d: 22 },
  ];

  borderPositions.forEach(({ pos, w, d }) => {
    const strip = createEmissiveBox(w, 0.02, d, C.neonPurple, C.neonPurple, 0.6, pos);
    scene.add(strip);
  });

  // --- Neon pillars (4 pillars, circle collision) ---
  const pillarConfigs = [
    { x: -6, z: -6, h: 3.5, color: C.neonCyan },
    { x: 6, z: -6, h: 4.0, color: C.neonMagenta },
    { x: -6, z: 6, h: 3.0, color: C.neonPurple },
    { x: 6, z: 6, h: 3.5, color: C.neonGreen },
  ];

  pillarConfigs.forEach(({ x, z, h, color }) => {
    createNeonPillar(scene, x, z, h, color);
    obstacles.push({ x, z, radius: 0.5 });
  });

  // --- Content slots ---
  // Blog zone: negative-Z quadrant
  const blogSlots = [];
  for (let i = 0; i < 8; i++) {
    const x = -6 + i * 1.8;
    blogSlots.push(new THREE.Vector3(x, 2.5, -8));
  }

  // Projects zone: positive-X side
  const projectSlots = [];
  for (let i = 0; i < 5; i++) {
    const z = -4 + i * 2.2;
    projectSlots.push(new THREE.Vector3(8, 1.5, z));
  }

  // About zone: negative-X side
  const aboutPosition = new THREE.Vector3(-8, 1.5, 0);

  // --- Zone labels (neon text sprites) ---
  const blogSign = createTextSprite('BLOG', 42, '#00d4ff');
  blogSign.position.set(0, 3.5, -8.5);
  scene.add(blogSign);

  const projectsSign = createTextSprite('PROJECTS', 42, '#ff00aa');
  projectsSign.position.set(8.5, 3.0, 0);
  scene.add(projectsSign);

  const aboutSign = createTextSprite('ABOUT', 42, '#7c3aed');
  aboutSign.position.set(-8.5, 3.0, 0);
  scene.add(aboutSign);

  // --- About kiosk (small screen) ---
  const kiosk = createBox(1.5, 2.0, 0.2, C.darkMetal, new THREE.Vector3(-8.5, 1.0, 0));
  scene.add(kiosk);
  const kioskScreen = createEmissiveBox(
    1.2, 1.5, 0.05, C.neonCyan, C.neonCyan, 0.3,
    new THREE.Vector3(-8.35, 1.2, 0)
  );
  scene.add(kioskScreen);

  // --- Decorative GLB models (walk-through) ---
  if (models.trashcan) {
    const trashSpots = [
      new THREE.Vector3(-9, 0, -8),
      new THREE.Vector3(9, 0, 8),
    ];
    trashSpots.forEach((pos) => {
      const tc = cloneModel(models.trashcan);
      tc.position.copy(pos);
      tc.scale.set(1.2, 1.2, 1.2);
      tc.rotation.y = Math.random() * Math.PI * 2;
      scene.add(tc);
    });
  }

  if (models.cardboardBoxClosed) {
    const boxSpots = [
      new THREE.Vector3(-8, 0, 7),
      new THREE.Vector3(8, 0, -7),
    ];
    boxSpots.forEach((pos) => {
      const box = cloneModel(models.cardboardBoxClosed);
      box.position.copy(pos);
      box.scale.set(1.0, 1.0, 1.0);
      scene.add(box);
    });
  }

  if (models.computerScreen) {
    const screen = cloneModel(models.computerScreen);
    screen.position.set(8, 0.5, 2);
    screen.scale.set(1.2, 1.2, 1.2);
    scene.add(screen);
  }

  // --- Puddles (reflective planes) ---
  const puddleConfigs = [
    { x: -2, z: -4, w: 2.0, d: 1.0 },
    { x: 3, z: 3, w: 1.5, d: 0.8 },
    { x: -4, z: 6, w: 1.8, d: 1.2 },
  ];

  puddleConfigs.forEach(({ x, z, w, d }) => {
    const geo = new THREE.PlaneGeometry(w, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x060612,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.7,
    });
    const puddle = new THREE.Mesh(geo, mat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.005, z);
    scene.add(puddle);
  });

  // --- Rain particles ---
  const rainCount = 1200;
  const rainPositions = new Float32Array(rainCount * 3);

  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3]     = (Math.random() - 0.5) * 30;
    rainPositions[i * 3 + 1] = Math.random() * 15;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

  const rainMat = new THREE.PointsMaterial({
    color: 0x8888cc,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });

  const rain = new THREE.Points(rainGeo, rainMat);
  scene.add(rain);

  animationCallbacks.push(() => {
    const positions = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 1] -= 0.2;
      if (positions[i * 3 + 1] < -0.5) {
        positions[i * 3]     = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = 14 + Math.random() * 3;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  });

  // --- Floating data bits ---
  const dataBitCount = 80;
  const dataBitPos = new Float32Array(dataBitCount * 3);
  const dataBitBaseY = new Float32Array(dataBitCount);

  for (let i = 0; i < dataBitCount; i++) {
    dataBitPos[i * 3]     = (Math.random() - 0.5) * 22;
    dataBitPos[i * 3 + 1] = 1 + Math.random() * 6;
    dataBitPos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    dataBitBaseY[i] = dataBitPos[i * 3 + 1];
  }

  const dataBitGeo = new THREE.BufferGeometry();
  dataBitGeo.setAttribute('position', new THREE.BufferAttribute(dataBitPos, 3));

  const dataBitMat = new THREE.PointsMaterial({
    color: C.neonCyan,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
  });

  const dataBits = new THREE.Points(dataBitGeo, dataBitMat);
  scene.add(dataBits);

  animationCallbacks.push((_delta, elapsed) => {
    const positions = dataBits.geometry.attributes.position.array;
    for (let i = 0; i < dataBitCount; i++) {
      positions[i * 3 + 1] = dataBitBaseY[i] + Math.sin(elapsed * 0.5 + i * 0.8) * 0.5;
    }
    dataBits.geometry.attributes.position.needsUpdate = true;
  });

  // --- Neon strip pulse animation ---
  animationCallbacks.push((_delta, elapsed) => {
    const pulse = 0.6 + 0.4 * Math.sin(elapsed * 2);
    stripH.material.emissiveIntensity = pulse;
    stripV.material.emissiveIntensity = pulse * 0.8;
  });

  // --- Exit portal ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.0, 9.5),
    C.neonCyan
  );
  scene.add(exitPortal);

  // --- Return ---
  return {
    spawnPosition: new THREE.Vector3(0, 0, 0),
    animationCallbacks,
    contentSlots: {
      blog: blogSlots,
      projects: projectSlots,
      about: aboutPosition,
    },
    bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    obstacles,
  };
}
