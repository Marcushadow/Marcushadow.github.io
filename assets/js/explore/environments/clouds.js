/**
 * clouds.js — Floating cloud platforms environment (light theme)
 *
 * Builds a sky-high scene with four cloud platforms (spawn, blog,
 * projects, about) connected by luminous bridges, surrounded by
 * decorative cloud puffs and gold sparkle particles.
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
  sky:      0x87CEEB,
  cloud:    0xffffff,
  platform: 0xf0f0f5,
  bridge:   0xe0e0f0,
  accent:   0x0066cc,
  crystal:  0x88bbff,
  gold:     0xffd700,
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
 * @returns {THREE.Group}
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
  top.position.set(center.x, center.y - 0.8, center.z);
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
      center.y - 1.2 - Math.random() * 0.6,
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
      center.y - 1.0 - Math.random() * 0.4,
      center.z + (Math.random() - 0.5) * 1.5
    );
    puff.scale.set(1, 0.6, 1);
    group.add(puff);
  }

  scene.add(group);
  return group;
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
 */
function createLightBridge(scene, from, to, arcHeight = 2) {
  const plankCount = 20;
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
    plank.position.set(px, py - 0.8, pz);
    plank.rotation.y = bridgeAngle;
    plank.receiveShadow = true;
    scene.add(plank);

    // Railing posts (every other plank)
    if (i % 2 === 0) {
      const perpX = Math.cos(bridgeAngle) * 0.5;
      const perpZ = -Math.sin(bridgeAngle) * 0.5;

      // Left post
      const leftPostGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
      const leftPost = new THREE.Mesh(leftPostGeo, railMat);
      leftPost.position.set(px + perpX, py - 0.5, pz + perpZ);
      scene.add(leftPost);

      // Right post
      const rightPost = new THREE.Mesh(leftPostGeo.clone(), railMat);
      rightPost.position.set(px - perpX, py - 0.5, pz - perpZ);
      scene.add(rightPost);
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
export function buildClouds(scene) {
  const animationCallbacks = [];

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
      radius: 5,
    },
    blog: {
      center: new THREE.Vector3(0, 0, -20),
      radius: 8,
    },
    projects: {
      center: new THREE.Vector3(20, 0, 0),
      radius: 7,
    },
    about: {
      center: new THREE.Vector3(-18, 0, 0),
      radius: 5,
    },
  };

  // Build each platform
  Object.values(platforms).forEach((p) => {
    createCloudPlatform(scene, p.center, p.radius);
  });

  // --- Light bridges ---
  // Main -> Blog
  createLightBridge(scene, platforms.main.center, platforms.blog.center, 2.5);
  // Main -> Projects
  createLightBridge(scene, platforms.main.center, platforms.projects.center, 2.0);
  // Main -> About
  createLightBridge(scene, platforms.main.center, platforms.about.center, 2.0);

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
    const cx = (Math.random() - 0.5) * 70;
    const cy = -3 + Math.random() * 15;
    const cz = (Math.random() - 0.5) * 70;

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
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.8,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.set(0, 0.2, 0);
  scene.add(crystal);

  // Rotate crystal slowly
  animationCallbacks.push((_delta, elapsed) => {
    crystal.rotation.y = elapsed * 0.3;
  });

  // --- Zone labels ---
  const blogLabel = createTextSprite('Blog', 36, '#0066cc');
  blogLabel.position.set(
    platforms.blog.center.x,
    platforms.blog.center.y + 2.5,
    platforms.blog.center.z
  );
  scene.add(blogLabel);

  const projectsLabel = createTextSprite('Projects', 36, '#0066cc');
  projectsLabel.position.set(
    platforms.projects.center.x,
    platforms.projects.center.y + 2.5,
    platforms.projects.center.z
  );
  scene.add(projectsLabel);

  const aboutLabel = createTextSprite('About', 36, '#0066cc');
  aboutLabel.position.set(
    platforms.about.center.x,
    platforms.about.center.y + 2.5,
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
    platforms.about.center.y + 1.5,
    platforms.about.center.z
  );

  // About pedestal
  const pedestal = createCylinder(
    0.6, 0.8, 0.4, 16, C.platform,
    new THREE.Vector3(
      platforms.about.center.x,
      platforms.about.center.y - 0.6,
      platforms.about.center.z
    )
  );
  scene.add(pedestal);

  // --- Gold sparkle particles ---
  const sparkleCount = 200;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleBaseY = new Float32Array(sparkleCount);

  for (let i = 0; i < sparkleCount; i++) {
    sparklePositions[i * 3]     = (Math.random() - 0.5) * 60;
    sparklePositions[i * 3 + 1] = -2 + Math.random() * 12;
    sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
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
    new THREE.Vector3(0, 1.0, 3.5),
    C.accent
  );
  scene.add(exitPortal);

  // --- Return ---
  return {
    spawnPosition: new THREE.Vector3(0, 1.7, 0),
    animationCallbacks,
    contentSlots: {
      blog: blogSlots,
      projects: projectSlots,
      about: aboutPosition,
    },
  };
}
