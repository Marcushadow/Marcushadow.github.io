/**
 * clouds.js — Floating cloud platforms environment (light theme)
 *
 * Builds a sky-high scene with four cloud platforms (spawn, blog,
 * projects, about) connected by luminous bridges, surrounded by
 * decorative cloud puffs, procedural crystals, benches, arches,
 * Kenney plant models, and gold sparkle particles.
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
  sky:      0x87CEEB,
  cloud:    0xffffff,
  platform: 0xf0f0f5,
  bridge:   0xe0e0f0,
  accent:   0x0066cc,
  crystal:  0x88bbff,
  gold:     0xffd700,
  stone:    0xd0d0d8,
  wood:     0xc4a882,
  bench:    0xb8a88a,
};

/* ============================================
   Platform Builder
   ============================================ */

/**
 * Creates a cloud platform: a flat cylinder topped with spherical
 * cloud puffs underneath for a fluffy appearance.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} center - World-space center of the platform
 * @param {number} radius - Platform radius
 * @returns {{ group: THREE.Group, topMesh: THREE.Mesh }}
 */
function createCloudPlatform(scene, center, radius) {
  const group = new THREE.Group();

  // Flat cylinder top
  const topGeo = new THREE.CylinderGeometry(radius, radius, 0.4, 32);
  const topMat = new THREE.MeshStandardMaterial({
    color: C.platform,
    roughness: 0.6,
    metalness: 0.0,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(center.x, center.y - 0.2, center.z);
  top.receiveShadow = true;
  top.castShadow = true;
  group.add(top);

  // Cloud puffs underneath
  const puffCount = Math.floor(radius * 4);
  const puffMat = new THREE.MeshStandardMaterial({
    color: C.cloud,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.85,
  });

  for (let i = 0; i < puffCount; i++) {
    const angle = (i / puffCount) * Math.PI * 2 + Math.random() * 0.5;
    const dist = Math.random() * radius * 0.85;
    const puffRadius = 0.5 + Math.random() * 0.8;

    const puffGeo = new THREE.SphereGeometry(puffRadius, 12, 10);
    const puff = new THREE.Mesh(puffGeo, puffMat);
    puff.position.set(
      center.x + Math.cos(angle) * dist,
      center.y - 0.7 - Math.random() * 0.6,
      center.z + Math.sin(angle) * dist
    );
    puff.scale.set(1, 0.5 + Math.random() * 0.3, 1);
    group.add(puff);
  }

  // Center puff cluster (extra fluffy)
  for (let i = 0; i < 3; i++) {
    const puffGeo = new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 12, 10);
    const puff = new THREE.Mesh(puffGeo, puffMat);
    puff.position.set(
      center.x + (Math.random() - 0.5) * 1.5,
      center.y - 0.5 - Math.random() * 0.4,
      center.z + (Math.random() - 0.5) * 1.5
    );
    puff.scale.set(1, 0.6, 1);
    group.add(puff);
  }

  scene.add(group);
  return { group, topMesh: top };
}

/* ============================================
   Light Bridge Builder
   ============================================ */

/**
 * Creates a bridge of translucent planks in an arc between two points,
 * with railing posts along each side.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} from - Start position
 * @param {THREE.Vector3} to   - End position
 * @param {number} [arcHeight=2] - Maximum arc height above midpoint
 * @returns {THREE.Mesh[]} Array of plank meshes for collision
 */
function createLightBridge(scene, from, to, arcHeight = 0) {
  const plankCount = 20;
  const planks = [];

  const bridgeMat = new THREE.MeshStandardMaterial({
    color: C.bridge,
    transparent: true,
    opacity: 0.7,
    roughness: 0.4,
    metalness: 0.1,
    emissive: C.crystal,
    emissiveIntensity: 0.15,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: C.crystal,
    transparent: true,
    opacity: 0.5,
    emissive: C.crystal,
    emissiveIntensity: 0.2,
  });

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const bridgeAngle = Math.atan2(dx, dz);

  for (let i = 0; i <= plankCount; i++) {
    const t = i / plankCount;

    // Position along line
    const px = from.x + dx * t;
    const pz = from.z + dz * t;

    // Arc: parabola peaking at t=0.5
    const arc = arcHeight * 4 * t * (1 - t);
    const py = from.y + dy * t + arc;

    // Plank
    const plankGeo = new THREE.BoxGeometry(1.2, 0.08, 0.4);
    const plank = new THREE.Mesh(plankGeo, bridgeMat);
    plank.position.set(px, py, pz);
    plank.rotation.y = bridgeAngle;
    plank.receiveShadow = true;
    scene.add(plank);
    planks.push(plank);

    // Railing posts (every other plank)
    if (i % 2 === 0) {
      const perpX = Math.cos(bridgeAngle) * 0.5;
      const perpZ = -Math.sin(bridgeAngle) * 0.5;

      // Left post
      const leftPostGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
      const leftPost = new THREE.Mesh(leftPostGeo, railMat);
      leftPost.position.set(px + perpX, py + 0.3, pz + perpZ);
      scene.add(leftPost);

      // Right post
      const rightPost = new THREE.Mesh(leftPostGeo.clone(), railMat);
      rightPost.position.set(px - perpX, py + 0.3, pz - perpZ);
      scene.add(rightPost);
    }
  }

  return planks;
}

/* ============================================
   Procedural Decoration Helpers
   ============================================ */

/**
 * Creates a crystal cluster of 2-4 octahedrons grouped together.
 */
function createCrystalCluster(position, baseSize) {
  const group = new THREE.Group();
  const crystalMat = new THREE.MeshStandardMaterial({
    color: C.crystal,
    emissive: C.crystal,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.8,
  });

  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const size = baseSize * (0.5 + Math.random() * 0.8);
    const geo = new THREE.OctahedronGeometry(size, 0);
    const mesh = new THREE.Mesh(geo, crystalMat);
    mesh.position.set(
      (Math.random() - 0.5) * baseSize * 1.5,
      size * 0.5,
      (Math.random() - 0.5) * baseSize * 1.5
    );
    mesh.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI * 2,
      Math.random() * 0.3
    );
    mesh.castShadow = true;
    group.add(mesh);
  }

  group.position.copy(position);
  return group;
}

/**
 * Creates a procedural bench (box geometry seat + two leg supports).
 */
function createProceduralBench(position, rotationY) {
  const group = new THREE.Group();
  const benchMat = new THREE.MeshStandardMaterial({
    color: C.bench,
    roughness: 0.7,
    metalness: 0.1,
  });

  // Seat
  const seatGeo = new THREE.BoxGeometry(1.5, 0.12, 0.5);
  const seat = new THREE.Mesh(seatGeo, benchMat);
  seat.position.set(0, 0.35, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  // Two leg supports
  const legMat = new THREE.MeshStandardMaterial({
    color: C.stone,
    roughness: 0.5,
    metalness: 0.2,
  });
  const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.45);

  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.55, 0.175, 0);
  legL.castShadow = true;
  group.add(legL);

  const legR = new THREE.Mesh(legGeo.clone(), legMat);
  legR.position.set(0.55, 0.175, 0);
  legR.castShadow = true;
  group.add(legR);

  group.position.copy(position);
  group.rotation.y = rotationY || 0;
  return group;
}

/**
 * Creates a decorative arch/pillar pair: two cylinders with a connecting box on top.
 */
function createArchPillar(position, rotationY) {
  const group = new THREE.Group();
  const pillarMat = new THREE.MeshStandardMaterial({
    color: C.stone,
    roughness: 0.4,
    metalness: 0.3,
    emissive: C.crystal,
    emissiveIntensity: 0.05,
  });

  // Left pillar
  const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.0, 8);
  const pillarL = new THREE.Mesh(pillarGeo, pillarMat);
  pillarL.position.set(-0.6, 1.0, 0);
  pillarL.castShadow = true;
  group.add(pillarL);

  // Right pillar
  const pillarR = new THREE.Mesh(pillarGeo.clone(), pillarMat);
  pillarR.position.set(0.6, 1.0, 0);
  pillarR.castShadow = true;
  group.add(pillarR);

  // Connecting arch top (box spanning between pillars)
  const archMat = new THREE.MeshStandardMaterial({
    color: C.crystal,
    emissive: C.crystal,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
    metalness: 0.5,
  });
  const archGeo = new THREE.BoxGeometry(1.4, 0.15, 0.2);
  const archTop = new THREE.Mesh(archGeo, archMat);
  archTop.position.set(0, 2.05, 0);
  archTop.castShadow = true;
  group.add(archTop);

  // Small decorative sphere on top center
  const orbGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const orbMat = new THREE.MeshStandardMaterial({
    color: C.crystal,
    emissive: C.crystal,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.set(0, 2.2, 0);
  group.add(orb);

  group.position.copy(position);
  group.rotation.y = rotationY || 0;
  return group;
}

/**
 * Creates invisible edge boundary colliders arranged in a ring around a platform.
 * These prevent the player from walking off the edge.
 *
 * @param {THREE.Vector3} center
 * @param {number} radius
 * @param {number} segmentCount
 * @returns {THREE.Mesh[]} Array of invisible box colliders
 */
function createEdgeBoundaries(center, radius, segmentCount) {
  const boundaries = [];
  const wallHeight = 0.5;
  const wallThickness = 0.3;
  const arcLength = (2 * Math.PI * radius) / segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const angle = (i / segmentCount) * Math.PI * 2;
    const x = center.x + Math.cos(angle) * radius;
    const z = center.z + Math.sin(angle) * radius;

    const geo = new THREE.BoxGeometry(arcLength, wallHeight, wallThickness);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      visible: false,
    });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, center.y + wallHeight * 0.5, z);
    wall.rotation.y = -angle + Math.PI * 0.5;
    boundaries.push(wall);
  }

  return boundaries;
}

/* ============================================
   Builder
   ============================================ */

/**
 * @param {THREE.Scene} scene
 * @returns {Promise<{ spawnPosition: THREE.Vector3, animationCallbacks: Function[], contentSlots: Object, colliderGroup: THREE.Group }>}
 */
export async function buildClouds(scene) {
  const animationCallbacks = [];

  // --- Load Kenney models ---
  const models = await loadModels({
    pottedPlant:  '/assets/models/clouds/pottedPlant.glb',
    plantSmall1:  '/assets/models/clouds/plantSmall1.glb',
    benchCushion: '/assets/models/clouds/benchCushion.glb',
  });

  // --- Collider group (populated throughout, returned at end) ---
  const colliderGroup = new THREE.Group();

  // --- Sky & fog ---
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 30, 80);

  // --- Lighting ---
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xddeeff, 0.4);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x87CEEB, 0xf0f0f5, 0.3);
  scene.add(hemi);

  // --- Platform definitions ---
  const platforms = {
    main: {
      center: new THREE.Vector3(0, 0, 0),
      radius: 4,
    },
    blog: {
      center: new THREE.Vector3(0, 0, -10),
      radius: 5,
    },
    projects: {
      center: new THREE.Vector3(10, 0, 0),
      radius: 5,
    },
    about: {
      center: new THREE.Vector3(-10, 0, 0),
      radius: 4,
    },
  };

  // Build each platform and collect top meshes for collision
  const platformMeshes = {};
  Object.entries(platforms).forEach(([name, p]) => {
    const { group, topMesh } = createCloudPlatform(scene, p.center, p.radius);
    platformMeshes[name] = topMesh;

    // Add the cylinder top to the collider group (clone for octree)
    const colliderCylinder = topMesh.clone();
    colliderCylinder.position.copy(topMesh.position);
    colliderGroup.add(colliderCylinder);

    // Add invisible edge boundaries to prevent falling off
    const edgeSegments = Math.max(12, Math.floor(p.radius * 3));
    const boundaries = createEdgeBoundaries(p.center, p.radius + 0.1, edgeSegments);
    boundaries.forEach((wall) => {
      scene.add(wall);
      colliderGroup.add(wall.clone());
    });
  });

  // --- Light bridges ---
  // Main -> Blog
  const bridgePlanks1 = createLightBridge(scene, platforms.main.center, platforms.blog.center);
  // Main -> Projects
  const bridgePlanks2 = createLightBridge(scene, platforms.main.center, platforms.projects.center);
  // Main -> About
  const bridgePlanks3 = createLightBridge(scene, platforms.main.center, platforms.about.center);

  // Add bridge planks to collider group
  [...bridgePlanks1, ...bridgePlanks2, ...bridgePlanks3].forEach((plank) => {
    const plankCollider = plank.clone();
    plankCollider.position.copy(plank.position);
    plankCollider.rotation.copy(plank.rotation);
    colliderGroup.add(plankCollider);
  });

  // --- Decorative arch/pillars at bridge entry points (6 total, one at each end of each bridge) ---
  // Helper: compute position on platform edge facing a direction
  function bridgeArchPosition(platformCenter, platformRadius, targetCenter) {
    const dir = new THREE.Vector3().subVectors(targetCenter, platformCenter).normalize();
    const edgePos = new THREE.Vector3(
      platformCenter.x + dir.x * (platformRadius - 0.5),
      platformCenter.y,
      platformCenter.z + dir.z * (platformRadius - 0.5)
    );
    const rotY = Math.atan2(dir.x, dir.z);
    return { position: edgePos, rotationY: rotY };
  }

  // Main -> Blog bridge arches
  const archMB1 = bridgeArchPosition(platforms.main.center, platforms.main.radius, platforms.blog.center);
  const arch1 = createArchPillar(archMB1.position, archMB1.rotationY);
  scene.add(arch1);

  const archMB2 = bridgeArchPosition(platforms.blog.center, platforms.blog.radius, platforms.main.center);
  const arch2 = createArchPillar(archMB2.position, archMB2.rotationY);
  scene.add(arch2);

  // Main -> Projects bridge arches
  const archMP1 = bridgeArchPosition(platforms.main.center, platforms.main.radius, platforms.projects.center);
  const arch3 = createArchPillar(archMP1.position, archMP1.rotationY);
  scene.add(arch3);

  const archMP2 = bridgeArchPosition(platforms.projects.center, platforms.projects.radius, platforms.main.center);
  const arch4 = createArchPillar(archMP2.position, archMP2.rotationY);
  scene.add(arch4);

  // Main -> About bridge arches
  const archMA1 = bridgeArchPosition(platforms.main.center, platforms.main.radius, platforms.about.center);
  const arch5 = createArchPillar(archMA1.position, archMA1.rotationY);
  scene.add(arch5);

  const archMA2 = bridgeArchPosition(platforms.about.center, platforms.about.radius, platforms.main.center);
  const arch6 = createArchPillar(archMA2.position, archMA2.rotationY);
  scene.add(arch6);

  // --- Procedural crystal clusters on each platform (3-5 per platform) ---
  Object.values(platforms).forEach((p) => {
    const clusterCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clusterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.0 + Math.random() * (p.radius - 2.0);
      const baseSize = 0.3 + Math.random() * 0.5;
      const pos = new THREE.Vector3(
        p.center.x + Math.cos(angle) * dist,
        p.center.y,
        p.center.z + Math.sin(angle) * dist
      );
      const cluster = createCrystalCluster(pos, baseSize);
      scene.add(cluster);
    }
  });

  // --- Procedural benches on blog and projects platforms (2-3 each) ---
  // Blog platform benches
  const blogBenchPositions = [
    { angle: Math.PI * 0.3, dist: 3.5, rot: Math.PI * 0.3 },
    { angle: Math.PI * 1.0, dist: 4.0, rot: Math.PI * 1.0 },
    { angle: Math.PI * 1.6, dist: 3.0, rot: Math.PI * 1.6 },
  ];
  blogBenchPositions.forEach(({ angle, dist, rot }) => {
    const pos = new THREE.Vector3(
      platforms.blog.center.x + Math.cos(angle) * dist,
      platforms.blog.center.y,
      platforms.blog.center.z + Math.sin(angle) * dist
    );
    const bench = createProceduralBench(pos, rot);
    scene.add(bench);
  });

  // Projects platform benches
  const projBenchPositions = [
    { angle: Math.PI * 0.7, dist: 3.0, rot: Math.PI * 0.7 },
    { angle: Math.PI * 1.4, dist: 4.0, rot: Math.PI * 1.4 },
  ];
  projBenchPositions.forEach(({ angle, dist, rot }) => {
    const pos = new THREE.Vector3(
      platforms.projects.center.x + Math.cos(angle) * dist,
      platforms.projects.center.y,
      platforms.projects.center.z + Math.sin(angle) * dist
    );
    const bench = createProceduralBench(pos, rot);
    scene.add(bench);
  });

  // --- Decorative floating clouds ---
  const decorativeCloudMat = new THREE.MeshStandardMaterial({
    color: C.cloud,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.6,
  });

  const decorativeClouds = [];

  for (let i = 0; i < 20; i++) {
    const cloudGroup = new THREE.Group();
    const cx = (Math.random() - 0.5) * 40;
    const cy = 3 + Math.random() * 12;
    const cz = (Math.random() - 0.5) * 40;

    // 2-4 stretched spheres per cloud
    const puffCount = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < puffCount; j++) {
      const size = 1.0 + Math.random() * 2.0;
      const puffGeo = new THREE.SphereGeometry(size, 10, 8);
      const puff = new THREE.Mesh(puffGeo, decorativeCloudMat);
      puff.position.set(
        (Math.random() - 0.5) * size * 2,
        (Math.random() - 0.5) * size * 0.3,
        (Math.random() - 0.5) * size * 1.5
      );
      puff.scale.set(1.5 + Math.random(), 0.4 + Math.random() * 0.3, 1);
      cloudGroup.add(puff);
    }

    cloudGroup.position.set(cx, cy, cz);
    scene.add(cloudGroup);
    decorativeClouds.push(cloudGroup);
  }

  // Gently drift decorative clouds
  animationCallbacks.push((_delta, elapsed) => {
    decorativeClouds.forEach((cloud, i) => {
      cloud.position.x += Math.sin(elapsed * 0.1 + i) * 0.003;
      cloud.position.y += Math.sin(elapsed * 0.15 + i * 2) * 0.001;
    });
  });

  // --- Crystal accent on main platform ---
  const crystalGeo = new THREE.CylinderGeometry(0.15, 0.4, 1.5, 6);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: C.crystal,
    emissive: C.crystal,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.8,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.set(0, 0.75, 0);
  scene.add(crystal);

  // Rotate crystal slowly
  animationCallbacks.push((_delta, elapsed) => {
    crystal.rotation.y = elapsed * 0.3;
  });

  // --- Floating crystal decorations orbiting near blog platform (4 small octahedrons) ---
  const orbitingCrystals = [];
  const orbitCrystalMat = new THREE.MeshStandardMaterial({
    color: C.crystal,
    emissive: C.crystal,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.8,
    roughness: 0.05,
    metalness: 0.9,
  });

  for (let i = 0; i < 4; i++) {
    const size = 0.15 + Math.random() * 0.2;
    const geo = new THREE.OctahedronGeometry(size, 0);
    const mesh = new THREE.Mesh(geo, orbitCrystalMat);
    const baseAngle = (i / 4) * Math.PI * 2;
    const orbitRadius = 3.0 + Math.random() * 2.0;
    const baseY = platforms.blog.center.y + 1.0 + Math.random() * 2.0;
    mesh.castShadow = true;
    scene.add(mesh);
    orbitingCrystals.push({ mesh, baseAngle, orbitRadius, baseY, speed: 0.3 + Math.random() * 0.3 });
  }

  // Animate orbiting crystals with sin-wave vertical motion
  animationCallbacks.push((_delta, elapsed) => {
    orbitingCrystals.forEach(({ mesh, baseAngle, orbitRadius, baseY, speed }) => {
      const angle = baseAngle + elapsed * speed;
      mesh.position.set(
        platforms.blog.center.x + Math.cos(angle) * orbitRadius,
        baseY + Math.sin(elapsed * 1.2 + baseAngle) * 0.5,
        platforms.blog.center.z + Math.sin(angle) * orbitRadius
      );
      mesh.rotation.y = elapsed * 0.8;
      mesh.rotation.x = elapsed * 0.5;
    });
  });

  // --- Zone labels ---
  const blogLabel = createTextSprite('Blog', 36, '#0066cc');
  blogLabel.position.set(
    platforms.blog.center.x,
    platforms.blog.center.y + 1.5,
    platforms.blog.center.z
  );
  scene.add(blogLabel);

  const projectsLabel = createTextSprite('Projects', 36, '#0066cc');
  projectsLabel.position.set(
    platforms.projects.center.x,
    platforms.projects.center.y + 1.5,
    platforms.projects.center.z
  );
  scene.add(projectsLabel);

  const aboutLabel = createTextSprite('About', 36, '#0066cc');
  aboutLabel.position.set(
    platforms.about.center.x,
    platforms.about.center.y + 1.5,
    platforms.about.center.z
  );
  scene.add(aboutLabel);

  // --- Content slots: Blog (circle arrangement on blog platform) ---
  const blogSlots = [];
  const blogCenter = platforms.blog.center;
  const blogCount = 10;

  for (let i = 0; i < blogCount; i++) {
    const angle = (i / blogCount) * Math.PI * 2;
    const radius = 5.0;
    blogSlots.push(new THREE.Vector3(
      blogCenter.x + Math.cos(angle) * radius,
      blogCenter.y + 0.5,
      blogCenter.z + Math.sin(angle) * radius
    ));
  }

  // --- Content slots: Projects (semicircle on projects platform) ---
  const projectSlots = [];
  const projCenter = platforms.projects.center;
  const projCount = 8;

  for (let i = 0; i < projCount; i++) {
    const angle = Math.PI * 0.2 + (i / (projCount - 1)) * Math.PI * 0.6 + Math.PI;
    const radius = 4.5;
    projectSlots.push(new THREE.Vector3(
      projCenter.x + Math.cos(angle) * radius,
      projCenter.y + 0.5,
      projCenter.z + Math.sin(angle) * radius
    ));
  }

  // --- Content slot: About (center of about platform) ---
  const aboutPosition = new THREE.Vector3(
    platforms.about.center.x,
    0.5,
    platforms.about.center.z
  );

  // About pedestal
  const pedestal = createCylinder(
    0.6, 0.8, 0.4, 16, C.platform,
    new THREE.Vector3(
      platforms.about.center.x,
      platforms.about.center.y,
      platforms.about.center.z
    )
  );
  scene.add(pedestal);

  // --- Kenney plant models ---
  // 3 pottedPlant on about platform
  if (models.pottedPlant) {
    const pottedPositions = [
      { angle: Math.PI * 0.4,  dist: 2.5 },
      { angle: Math.PI * 1.1,  dist: 3.0 },
      { angle: Math.PI * 1.7,  dist: 2.2 },
    ];
    pottedPositions.forEach(({ angle, dist }) => {
      const plant = cloneModel(models.pottedPlant);
      const scale = 1.2 + Math.random() * 0.6;
      plant.scale.set(scale, scale, scale);
      plant.position.set(
        platforms.about.center.x + Math.cos(angle) * dist,
        platforms.about.center.y,
        platforms.about.center.z + Math.sin(angle) * dist
      );
      plant.rotation.y = Math.random() * Math.PI * 2;
      scene.add(plant);
    });
  }

  // 4 plantSmall1 on various platform edges
  if (models.plantSmall1) {
    const smallPlantPlacements = [
      { platform: platforms.main,     angle: Math.PI * 0.8,  dist: 3.5 },
      { platform: platforms.blog,     angle: Math.PI * 0.5,  dist: 6.0 },
      { platform: platforms.projects, angle: Math.PI * 1.2,  dist: 5.0 },
      { platform: platforms.about,    angle: Math.PI * 0.0,  dist: 3.8 },
    ];
    smallPlantPlacements.forEach(({ platform, angle, dist }) => {
      const plant = cloneModel(models.plantSmall1);
      const scale = 1.0 + Math.random() * 0.8;
      plant.scale.set(scale, scale, scale);
      plant.position.set(
        platform.center.x + Math.cos(angle) * dist,
        platform.center.y,
        platform.center.z + Math.sin(angle) * dist
      );
      plant.rotation.y = Math.random() * Math.PI * 2;
      scene.add(plant);
    });
  }

  // 2-3 benchCushion on blog and projects platforms
  if (models.benchCushion) {
    const cushionPlacements = [
      { platform: platforms.blog,     angle: Math.PI * 0.3,  dist: 3.5, rot: Math.PI * 0.3 },
      { platform: platforms.blog,     angle: Math.PI * 1.6,  dist: 3.0, rot: Math.PI * 1.6 },
      { platform: platforms.projects, angle: Math.PI * 0.7,  dist: 3.0, rot: Math.PI * 0.7 },
    ];
    cushionPlacements.forEach(({ platform, angle, dist, rot }) => {
      const bench = cloneModel(models.benchCushion);
      const scale = 1.5;
      bench.scale.set(scale, scale, scale);
      bench.position.set(
        platform.center.x + Math.cos(angle) * dist,
        platform.center.y,
        platform.center.z + Math.sin(angle) * dist
      );
      bench.rotation.y = rot;
      scene.add(bench);
    });
  }

  // --- Gold sparkle particles (more concentrated near platform surfaces) ---
  const sparkleCount = 350;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleBaseY = new Float32Array(sparkleCount);

  // First 200 particles: concentrated near platform surfaces
  const platformsList = Object.values(platforms);
  for (let i = 0; i < 200; i++) {
    const p = platformsList[i % platformsList.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (p.radius + 2);
    sparklePositions[i * 3]     = p.center.x + Math.cos(angle) * dist;
    sparklePositions[i * 3 + 1] = p.center.y + Math.random() * 2.5;
    sparklePositions[i * 3 + 2] = p.center.z + Math.sin(angle) * dist;
    sparkleBaseY[i] = sparklePositions[i * 3 + 1];
  }

  // Remaining 150 particles: spread out in the sky
  for (let i = 200; i < sparkleCount; i++) {
    sparklePositions[i * 3]     = (Math.random() - 0.5) * 40;
    sparklePositions[i * 3 + 1] = Math.random() * 12;
    sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    sparkleBaseY[i] = sparklePositions[i * 3 + 1];
  }

  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(sparklePositions, 3)
  );

  const sparkleMaterial = new THREE.PointsMaterial({
    color: C.gold,
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
  });

  const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
  scene.add(sparkles);

  // Sin-wave float for sparkles
  animationCallbacks.push((_delta, elapsed) => {
    const positions = sparkles.geometry.attributes.position.array;

    for (let i = 0; i < sparkleCount; i++) {
      positions[i * 3 + 1] =
        sparkleBaseY[i] + Math.sin(elapsed * 0.4 + i * 0.3) * 0.5;
    }

    sparkles.geometry.attributes.position.needsUpdate = true;

    // Pulse opacity for twinkle effect
    sparkleMaterial.opacity = 0.5 + 0.3 * Math.sin(elapsed * 1.5);
  });

  // --- Exit portal on main platform ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 0.5, 3),
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
    colliderGroup,
  };
}
