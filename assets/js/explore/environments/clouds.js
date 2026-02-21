/**
 * clouds.js — Floating island environment (light theme)
 *
 * A single large floating island with crystals, sparkles, and
 * gentle clouds. Open-air with circular boundary.
 * Designed for unobstructed isometric camera view.
 */

import * as THREE from 'three';
import {
  createCylinder,
  createTextSprite,
  createExitPortal,
} from './shared.js';
import { loadModels, cloneModel } from '../model-loader.js';

/* ============================================
   Palette
   ============================================ */

const C = {
  island:    0xE8E0D4,
  islandTop: 0xF5F0E8,
  crystal:   0x88bbff,
  accent:    0x4488cc,
};

/* ============================================
   Helpers
   ============================================ */

function createCrystal(scene, x, z, height, color) {
  const geo = new THREE.OctahedronGeometry(height * 0.3, 0);
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.3,
    emissive: color,
    emissiveIntensity: 0.2,
  });
  const crystal = new THREE.Mesh(geo, mat);
  crystal.position.set(x, height * 0.5, z);
  crystal.castShadow = true;
  scene.add(crystal);
  return crystal;
}

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

export async function buildClouds(scene) {
  const animationCallbacks = [];

  // --- Load GLB models ---
  const models = await loadModels({
    benchCushion: '/assets/models/clouds/benchCushion.glb',
    pottedPlant:  '/assets/models/clouds/pottedPlant.glb',
    plantSmall1:  '/assets/models/clouds/plantSmall1.glb',
  });

  // --- Sky & fog ---
  scene.background = new THREE.Color(0xE0EEFF);
  scene.fog = new THREE.Fog(0xE0EEFF, 20, 50);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xCCDDFF, 0.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFFFEE, 1.0);
  sun.position.set(6, 15, 8);
  sun.castShadow = true;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);

  // Soft blue fill light from below/side
  const fill = new THREE.DirectionalLight(0x88AAFF, 0.3);
  fill.position.set(-5, -2, -5);
  scene.add(fill);

  // --- Island platform (large cylinder) ---
  const islandRadius = 10;
  const islandGeo = new THREE.CylinderGeometry(islandRadius, islandRadius * 0.85, 1.5, 32);
  const islandMat = new THREE.MeshStandardMaterial({
    color: C.island,
    roughness: 0.7,
    metalness: 0.05,
  });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = -0.75;
  island.receiveShadow = true;
  scene.add(island);

  // Top surface (slightly different color)
  const topGeo = new THREE.CircleGeometry(islandRadius, 32);
  const topMat = new THREE.MeshStandardMaterial({
    color: C.islandTop,
    roughness: 0.8,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.001;
  top.receiveShadow = true;
  scene.add(top);

  // --- Content slots ---
  // Blog zone: spread in negative-Z arc
  const blogSlots = [];
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (i - 3.5) * 0.25;
    const r = 7;
    blogSlots.push(new THREE.Vector3(
      Math.cos(angle) * r,
      0.8,
      Math.sin(angle) * r
    ));
  }

  // Projects zone: positive-X arc
  const projectSlots = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i - 2) * 0.3;
    const r = 7;
    projectSlots.push(new THREE.Vector3(
      Math.cos(angle) * r,
      0.8,
      Math.sin(angle) * r
    ));
  }

  // About zone: negative-X side
  const aboutPosition = new THREE.Vector3(-7, 0.8, 0);

  // --- Zone labels ---
  const blogLabel = createTextSprite('Blog', 32, '#0066cc');
  blogLabel.position.set(0, 2.0, -7.5);
  scene.add(blogLabel);

  const projectsLabel = createTextSprite('Projects', 32, '#0066cc');
  projectsLabel.position.set(7.5, 2.0, 0);
  scene.add(projectsLabel);

  const aboutLabel = createTextSprite('About', 32, '#0066cc');
  aboutLabel.position.set(-7.5, 2.0, 0);
  scene.add(aboutLabel);

  // --- Crystals (walk-through decoration) ---
  const crystals = [];
  const crystalSpots = [
    { x: -3, z: -4, h: 1.2, color: 0x88bbff },
    { x: 5, z: -3, h: 0.9, color: 0xaaddff },
    { x: -5, z: 3, h: 1.5, color: 0x6699ff },
    { x: 4, z: 5, h: 1.0, color: 0x99ccff },
    { x: 0, z: 0, h: 1.8, color: 0x88bbff },
    { x: -7, z: -5, h: 0.7, color: 0xbbddff },
    { x: 7, z: 3, h: 0.8, color: 0x88aaff },
  ];

  crystalSpots.forEach(({ x, z, h, color }) => {
    const crystal = createCrystal(scene, x, z, h, color);
    crystals.push(crystal);
  });

  // Crystal float + rotation animation
  animationCallbacks.push((_delta, elapsed) => {
    crystals.forEach((crystal, i) => {
      const baseY = crystalSpots[i].h * 0.5;
      crystal.position.y = baseY + Math.sin(elapsed * 0.7 + i * 1.3) * 0.15;
      crystal.rotation.y += 0.003;
    });
  });

  // --- GLB accent models ---
  placeModel(scene, models.benchCushion, new THREE.Vector3(-3, 0, 5), Math.PI / 4, 2.0);
  placeModel(scene, models.benchCushion, new THREE.Vector3(4, 0, -5), -Math.PI / 4, 2.0);
  placeModel(scene, models.pottedPlant, new THREE.Vector3(-8, 0, -2), 0, 2.0);
  placeModel(scene, models.plantSmall1, new THREE.Vector3(6, 0, -6), 0.5, 2.5);

  // --- Sparkle particles ---
  const sparkleCount = 120;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleBaseY = new Float32Array(sparkleCount);

  for (let i = 0; i < sparkleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (islandRadius + 5);
    sparklePositions[i * 3]     = Math.cos(angle) * r;
    sparklePositions[i * 3 + 1] = 0.5 + Math.random() * 5;
    sparklePositions[i * 3 + 2] = Math.sin(angle) * r;
    sparkleBaseY[i] = sparklePositions[i * 3 + 1];
  }

  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));

  const sparkleMat = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });

  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  scene.add(sparkles);

  animationCallbacks.push((_delta, elapsed) => {
    const positions = sparkles.geometry.attributes.position.array;
    for (let i = 0; i < sparkleCount; i++) {
      positions[i * 3 + 1] = sparkleBaseY[i] + Math.sin(elapsed * 0.4 + i * 0.5) * 0.3;
    }
    sparkles.geometry.attributes.position.needsUpdate = true;
  });

  // --- Decorative clouds (floating spheres around the island) ---
  const cloudCount = 8;
  const cloudGroup = new THREE.Group();

  for (let i = 0; i < cloudCount; i++) {
    const angle = (i / cloudCount) * Math.PI * 2;
    const r = islandRadius + 4 + Math.random() * 6;
    const y = -1 + Math.random() * 3;

    const cloudGeo = new THREE.SphereGeometry(1.5 + Math.random() * 1.5, 8, 6);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.4,
      roughness: 1.0,
    });
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    cloud.scale.set(1.5, 0.6, 1);
    cloudGroup.add(cloud);
  }

  scene.add(cloudGroup);

  // Slow cloud rotation
  animationCallbacks.push((_delta) => {
    cloudGroup.rotation.y += 0.0005;
  });

  // --- Exit portal ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.0, 8),
    C.accent
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
    bounds: { centerX: 0, centerZ: 0, radius: islandRadius },
    obstacles: [],
  };
}
