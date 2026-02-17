/**
 * shared.js — Shared utilities for all environment builders
 *
 * Provides reusable geometry factories, layout constants, and common
 * objects (text sprites, particle systems, exit portal) used across
 * the cafe, cyberpunk, and clouds environments.
 */

import * as THREE from 'three';

/* ============================================
   Layout Constants
   ============================================ */

/**
 * Predefined world-space positions for each content zone and spawn.
 * Every environment builder should place its content anchors at these
 * coordinates so the content-objects module can populate them
 * consistently regardless of theme.
 */
export const LAYOUT = {
  spawnPosition: new THREE.Vector3(0, 1.7, 0),

  blogZone: {
    center: new THREE.Vector3(0, 1.7, -12),
    radius: 8,
    direction: new THREE.Vector3(0, 0, -1),
  },

  projectsZone: {
    center: new THREE.Vector3(14, 1.7, 0),
    radius: 8,
    direction: new THREE.Vector3(1, 0, 0),
  },

  aboutZone: {
    center: new THREE.Vector3(-14, 1.7, 0),
    radius: 4,
    direction: new THREE.Vector3(-1, 0, 0),
  },

  exitZone: {
    center: new THREE.Vector3(0, 1.7, 14),
    direction: new THREE.Vector3(0, 0, 1),
  },
};

/* ============================================
   Geometry Factories
   ============================================ */

/**
 * Creates a box mesh with MeshStandardMaterial.
 *
 * @param {number} w        - Width
 * @param {number} h        - Height
 * @param {number} d        - Depth
 * @param {number|string} color - Material color
 * @param {THREE.Vector3} [position] - World position
 * @param {THREE.Euler} [rotation]   - Euler rotation
 * @returns {THREE.Mesh}
 */
export function createBox(w, h, d, color, position, rotation) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);

  if (position) mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Creates a plane mesh with MeshStandardMaterial (DoubleSide).
 *
 * @param {number} w        - Width
 * @param {number} h        - Height
 * @param {number|string} color - Material color
 * @param {THREE.Vector3} [position] - World position
 * @param {THREE.Euler} [rotation]   - Euler rotation
 * @returns {THREE.Mesh}
 */
export function createPlane(w, h, color, position, rotation) {
  const geometry = new THREE.PlaneGeometry(w, h);
  const material = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);

  if (position) mesh.position.copy(position);
  if (rotation) mesh.rotation.copy(rotation);

  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Creates a cylinder mesh with MeshStandardMaterial.
 *
 * @param {number} rTop     - Radius top
 * @param {number} rBot     - Radius bottom
 * @param {number} h        - Height
 * @param {number} segments - Radial segments
 * @param {number|string} color - Material color
 * @param {THREE.Vector3} [position] - World position
 * @returns {THREE.Mesh}
 */
export function createCylinder(rTop, rBot, h, segments, color, position) {
  const geometry = new THREE.CylinderGeometry(rTop, rBot, h, segments);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);

  if (position) mesh.position.copy(position);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Creates a box mesh with emissive MeshStandardMaterial.
 *
 * @param {number} w  - Width
 * @param {number} h  - Height
 * @param {number} d  - Depth
 * @param {number|string} color          - Base color
 * @param {number|string} emissiveColor  - Emissive color
 * @param {number} intensity             - Emissive intensity
 * @param {THREE.Vector3} [position]     - World position
 * @returns {THREE.Mesh}
 */
export function createEmissiveBox(w, h, d, color, emissiveColor, intensity, position) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor,
    emissiveIntensity: intensity,
  });
  const mesh = new THREE.Mesh(geometry, material);

  if (position) mesh.position.copy(position);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/* ============================================
   Text Sprite
   ============================================ */

/**
 * Creates a Sprite with canvas-rendered text.
 *
 * The sprite auto-sizes its canvas to fit the text and produces a
 * power-of-two texture for GPU friendliness.
 *
 * @param {string} text       - The text to render
 * @param {number} [fontSize=48] - Font size in canvas pixels
 * @param {string} [color='#ffffff'] - CSS color string
 * @returns {THREE.Sprite}
 */
export function createTextSprite(text, fontSize = 48, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;

  // Pad to power-of-two dimensions for better GPU handling
  const padding = fontSize * 0.5;
  canvas.width = nextPow2(textWidth + padding * 2);
  canvas.height = nextPow2(fontSize * 1.4 + padding * 2);

  // Re-set font after canvas resize clears state
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);

  // Scale so the sprite is roughly proportional to the text
  const aspect = canvas.width / canvas.height;
  const height = fontSize / 48; // normalise to ~1 unit tall per 48px
  sprite.scale.set(height * aspect, height, 1);

  return sprite;
}

/**
 * Returns the next power of two >= n.
 */
function nextPow2(n) {
  let v = Math.ceil(n);
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return Math.max(v, 1);
}

/* ============================================
   Particle System
   ============================================ */

/**
 * Creates a Points object with randomly-placed particles.
 *
 * @param {number} count - Number of particles
 * @param {{ x: number, y: number, z: number }} area - Bounding box dimensions
 * @param {number|string} color - Particle color
 * @param {number} size - Point size
 * @returns {THREE.Points}
 */
export function createParticles(count, area, color, size) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * area.x;
    positions[i * 3 + 1] = Math.random() * area.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
  });

  return new THREE.Points(geometry, material);
}

/* ============================================
   Exit Portal
   ============================================ */

/**
 * Creates an exit-portal Group consisting of:
 *   - A torus ring (radius 1, tube 0.08)
 *   - A translucent inner-glow circle
 *   - An "EXIT" text sprite label above the ring
 *
 * The group's userData is tagged so the interaction system can detect it:
 *   { type: 'exit', url: '/' }
 *
 * @param {THREE.Vector3} position - World position for the portal center
 * @param {number|string} color    - Accent color for ring and glow
 * @returns {THREE.Group}
 */
export function createExitPortal(position, color) {
  const group = new THREE.Group();

  // --- Torus ring ---
  const ringGeometry = new THREE.TorusGeometry(1, 0.08, 16, 48);
  const ringMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(ring);

  // --- Inner glow circle ---
  const circleGeometry = new THREE.CircleGeometry(0.95, 48);
  const circleMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  group.add(circle);

  // --- "EXIT" label ---
  const label = createTextSprite('EXIT', 36, '#ffffff');
  label.position.set(0, 1.5, 0);
  group.add(label);

  // Position the whole group
  if (position) group.position.copy(position);

  // Tag for the interaction / UI system
  group.userData = { type: 'exit', url: '/' };

  // Also tag children so raycasting hits propagate
  group.traverse((child) => {
    child.userData = { type: 'exit', url: '/' };
  });

  return group;
}
