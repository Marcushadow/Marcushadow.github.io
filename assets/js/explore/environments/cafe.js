/**
 * cafe.js — Open outdoor patio environment (beige theme)
 *
 * An open-air cafe patio with scattered tables, plants, and a small
 * counter. All decoration is walk-through except the counter.
 * Designed for unobstructed isometric camera view.
 */

import * as THREE from 'three';
import {
  createBox,
  createCylinder,
  createTextSprite,
  createParticles,
  createExitPortal,
} from './shared.js';
import { loadModels, cloneModel } from '../model-loader.js';

/* ============================================
   Palette
   ============================================ */

const C = {
  ground:   0xD4B896,
  stone:    0xC8B898,
  wood:     0x6B4226,
  woodDark: 0x4A2F1A,
  accent:   0xC4704C,
  cream:    0xFAF6F1,
  hedge:    0x3A6B35,
};

/* ============================================
   Helper
   ============================================ */

function placeModel(scene, model, position, rotationY, scale) {
  if (!model) return null;
  const instance = cloneModel(model);
  instance.position.copy(position);
  if (rotationY !== undefined) instance.rotation.y = rotationY;
  const s = scale || 1;
  instance.scale.set(s, s, s);
  scene.add(instance);
  return instance;
}

/* ============================================
   Builder
   ============================================ */

export async function buildCafe(scene) {
  const animationCallbacks = [];

  // --- Load GLB models ---
  const models = await loadModels({
    tableRound:        '/assets/models/cafe/tableRound.glb',
    tableCoffee:       '/assets/models/cafe/tableCoffee.glb',
    chairCushion:      '/assets/models/cafe/chairCushion.glb',
    chairRounded:      '/assets/models/cafe/chairRounded.glb',
    pottedPlant:       '/assets/models/cafe/pottedPlant.glb',
    plantSmall1:       '/assets/models/cafe/plantSmall1.glb',
    plantSmall2:       '/assets/models/cafe/plantSmall2.glb',
    lampRoundFloor:    '/assets/models/cafe/lampRoundFloor.glb',
    rugRound:          '/assets/models/cafe/rugRound.glb',
    benchCushion:      '/assets/models/cafe/benchCushion.glb',
  });

  // --- Sky & fog ---
  scene.background = new THREE.Color(0xE8DCC8);
  scene.fog = new THREE.Fog(0xE8DCC8, 25, 50);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xFFF5E6, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFE4C4, 1.0);
  sun.position.set(8, 12, 8);
  sun.castShadow = true;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);

  // --- Ground plane (20x20 stone patio) ---
  const groundGeo = new THREE.PlaneGeometry(22, 22);
  const groundMat = new THREE.MeshStandardMaterial({
    color: C.ground,
    roughness: 0.8,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Patio border (thin darker edge)
  const borderGeo = new THREE.PlaneGeometry(24, 24);
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xA08B6B,
    roughness: 0.9,
  });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.rotation.x = -Math.PI / 2;
  border.position.y = -0.01;
  border.receiveShadow = true;
  scene.add(border);

  // --- Grass area around the patio ---
  const grassGeo = new THREE.PlaneGeometry(60, 60);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x7CB342,
    roughness: 0.95,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  scene.add(grass);

  // --- Content slots ---
  // Blog zone: spread along negative-Z side
  const blogSlots = [];
  for (let i = 0; i < 8; i++) {
    const x = -6 + i * 1.8;
    blogSlots.push(new THREE.Vector3(x, 0.9, -7));
  }

  // Projects zone: spread along positive-X side
  const projectSlots = [];
  for (let i = 0; i < 5; i++) {
    const z = -4 + i * 2.2;
    projectSlots.push(new THREE.Vector3(7, 0.9, z));
  }

  // About zone: negative-X side
  const aboutPosition = new THREE.Vector3(-7, 0.9, 0);

  // --- Decoration: 3 table+chair pairs (walk-through, no collision) ---
  const tableSpots = [
    { pos: new THREE.Vector3(-3, 0, -3), chairDir: 0 },
    { pos: new THREE.Vector3(2, 0, 2), chairDir: Math.PI / 2 },
    { pos: new THREE.Vector3(-2, 0, 5), chairDir: -Math.PI / 4 },
  ];

  tableSpots.forEach(({ pos, chairDir }) => {
    placeModel(scene, models.tableRound, pos, 0, 2.0);
    const chairPos = pos.clone();
    chairPos.x += Math.sin(chairDir) * 1.2;
    chairPos.z += Math.cos(chairDir) * 1.2;
    placeModel(scene, models.chairCushion, chairPos, chairDir + Math.PI, 2.0);
  });

  // --- Decoration: plants around the edges ---
  const plantSpots = [
    { model: models.pottedPlant, pos: new THREE.Vector3(-9, 0, -9), scale: 2.2 },
    { model: models.pottedPlant, pos: new THREE.Vector3(9, 0, -9), scale: 2.0 },
    { model: models.plantSmall1, pos: new THREE.Vector3(-9, 0, 5), scale: 2.5 },
    { model: models.plantSmall2, pos: new THREE.Vector3(9, 0, 5), scale: 2.5 },
    { model: models.pottedPlant, pos: new THREE.Vector3(0, 0, 9), scale: 1.8 },
    { model: models.plantSmall1, pos: new THREE.Vector3(-5, 0, 9), scale: 2.0 },
  ];

  plantSpots.forEach(({ model, pos, scale }) => {
    placeModel(scene, model, pos, Math.random() * Math.PI * 2, scale);
  });

  // --- Hedge border (low green boxes along the edge) ---
  const hedgePositions = [
    // Back edge (Z = -10)
    { pos: new THREE.Vector3(-5, 0.3, -10.5), w: 10, d: 0.8 },
    { pos: new THREE.Vector3(5, 0.3, -10.5), w: 10, d: 0.8 },
    // Left edge (X = -10)
    { pos: new THREE.Vector3(-10.5, 0.3, -5), w: 0.8, d: 10 },
    { pos: new THREE.Vector3(-10.5, 0.3, 5), w: 0.8, d: 10 },
    // Right edge (X = 10) — partial, leave gap
    { pos: new THREE.Vector3(10.5, 0.3, -5), w: 0.8, d: 10 },
    // Front edge (Z = 10) — partial, leave gap for entrance
    { pos: new THREE.Vector3(-6, 0.3, 10.5), w: 8, d: 0.8 },
    { pos: new THREE.Vector3(6, 0.3, 10.5), w: 8, d: 0.8 },
  ];

  hedgePositions.forEach(({ pos, w, d }) => {
    const hedge = createBox(w, 0.6, d, C.hedge, pos);
    hedge.material.roughness = 0.9;
    scene.add(hedge);
  });

  // --- Floor lamp for atmosphere ---
  placeModel(scene, models.lampRoundFloor, new THREE.Vector3(-7, 0, -4), 0, 2.5);
  placeModel(scene, models.lampRoundFloor, new THREE.Vector3(7, 0, 4), 0, 2.5);

  // Warm point lights at lamp positions
  const lampLight1 = new THREE.PointLight(0xFFD699, 0.6, 10);
  lampLight1.position.set(-7, 2.2, -4);
  scene.add(lampLight1);

  const lampLight2 = new THREE.PointLight(0xFFD699, 0.6, 10);
  lampLight2.position.set(7, 2.2, 4);
  scene.add(lampLight2);

  // --- Rugs under tables ---
  placeModel(scene, models.rugRound, new THREE.Vector3(-3, 0.01, -3), 0, 2.5);
  placeModel(scene, models.rugRound, new THREE.Vector3(2, 0.01, 2), 0.5, 2.0);

  // --- Bench ---
  placeModel(scene, models.benchCushion, new THREE.Vector3(-9, 0, 0), Math.PI / 2, 2.2);

  // --- Zone label sprites ---
  const blogLabel = createTextSprite('Blog', 32, '#4A2F1A');
  blogLabel.position.set(0, 2.0, -7.5);
  scene.add(blogLabel);

  const projectsLabel = createTextSprite('Projects', 32, '#4A2F1A');
  projectsLabel.position.set(7.5, 2.0, 0);
  scene.add(projectsLabel);

  const aboutLabel = createTextSprite('About', 32, '#4A2F1A');
  aboutLabel.position.set(-7.5, 2.0, 0);
  scene.add(aboutLabel);

  // --- Exit portal ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.0, 9.5),
    C.accent
  );
  scene.add(exitPortal);

  // --- Ambient particles (dust motes / pollen) ---
  const dust = createParticles(60, { x: 20, y: 4, z: 20 }, 0xFFE4C4, 0.04);
  dust.position.set(0, 2, 0);
  scene.add(dust);

  animationCallbacks.push((_delta, elapsed) => {
    const positions = dust.geometry.attributes.position.array;
    for (let i = 0; i < 60; i++) {
      positions[i * 3 + 1] += Math.sin(elapsed + i) * 0.0005;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  });

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
    obstacles: [],
  };
}
