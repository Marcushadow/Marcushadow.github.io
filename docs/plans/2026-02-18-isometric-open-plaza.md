# Isometric Open Plaza Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild all three explore environments as open outdoor plazas with simple boundary collision, replacing the broken Octree/Capsule system.

**Architecture:** Remove Octree collision from controls.js and main.js. Replace with rectangular/circular boundary clamping + optional circle obstacles. Rewrite all three environment files as open-air scenes on flat ground with sparse decoration and no walls blocking the isometric camera.

**Tech Stack:** Three.js v0.170.0 (ES modules via importmap), Kenney GLB models (GLTFLoader), vanilla JS

---

### Task 1: Simplify collision in controls.js

**Files:**
- Modify: `assets/js/explore/controls.js`

**Step 1: Rewrite controls.js**

Replace the entire file with simplified collision. Remove Octree/Capsule imports. Add `setBounds()` and `setObstacles()` methods. Use simple XZ clamping + circle push-out.

```javascript
/**
 * controls.js — Isometric character controls with simple boundary collision
 *
 * Provides WASD movement in isometric directions, a visible character
 * mesh, and proximity detection for interactive objects.
 *
 * Usage:
 *   const controls = createControls(camera, domElement, scene, interactiveObjects);
 *   controls.setBounds({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 });
 *   controls.setObstacles([{ x: 5, z: 3, radius: 1.0 }]);
 *   controls.setPosition(x, z);
 *   controls.setActive(true);
 *   // in animation loop:
 *   controls.update(delta);
 */

import * as THREE from 'three';

const MOVE_SPEED = 5.0;
const DECELERATION = 6.0;
const LERP_FACTOR = 0.12;
const VELOCITY_DEADZONE = 0.001;
const PLAYER_RADIUS = 0.3;
const PROXIMITY_RANGE = 2.5;

// Isometric basis vectors (camera at 45 degrees Y rotation)
const ISO_FORWARD = new THREE.Vector3(-1, 0, -1).normalize();
const ISO_RIGHT = new THREE.Vector3(1, 0, -1).normalize();

/**
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} interactiveObjects
 * @returns {object} controls API
 */
export function createControls(camera, domElement, scene, interactiveObjects) {
  let _active = false;
  const _velocity = new THREE.Vector3();
  const _direction = new THREE.Vector3();

  // Simple collision
  let _bounds = null;       // { minX, maxX, minZ, maxZ } or { centerX, centerZ, radius }
  let _obstacles = [];      // [{ x, z, radius }]

  // Keyboard state
  const _keys = { forward: false, backward: false, left: false, right: false };

  // --- Character mesh ---
  const charGroup = new THREE.Group();

  // Body (cylinder)
  const bodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.35, 12);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4488cc,
    roughness: 0.5,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.175;
  body.castShadow = true;
  charGroup.add(body);

  // Head (sphere)
  const headGeo = new THREE.SphereGeometry(0.12, 12, 8);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x66aadd,
    roughness: 0.4,
    metalness: 0.1,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.42;
  head.castShadow = true;
  charGroup.add(head);

  // Direction indicator (small cone)
  const indicatorGeo = new THREE.ConeGeometry(0.06, 0.15, 6);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x4488cc,
    emissiveIntensity: 0.5,
  });
  const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
  indicator.position.set(0, 0.25, -0.22);
  indicator.rotation.x = -Math.PI / 2;
  charGroup.add(indicator);

  // Shadow circle on ground
  const shadowGeo = new THREE.CircleGeometry(0.25, 16);
  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  charGroup.add(shadow);

  scene.add(charGroup);

  // --- Proximity state ---
  let _nearestObject = null;
  let _onProximityChange = null;

  // --- Keyboard listeners ---
  function onKeyDown(event) {
    if (!_active) return;
    switch (event.code) {
      case 'KeyW': case 'ArrowUp':    _keys.forward = true; break;
      case 'KeyS': case 'ArrowDown':  _keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  _keys.left = true; break;
      case 'KeyD': case 'ArrowRight': _keys.right = true; break;
    }
  }

  function onKeyUp(event) {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp':    _keys.forward = false; break;
      case 'KeyS': case 'ArrowDown':  _keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  _keys.left = false; break;
      case 'KeyD': case 'ArrowRight': _keys.right = false; break;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // --- Simple boundary + obstacle collision ---
  function resolveBounds() {
    if (!_bounds) return;

    if (_bounds.radius !== undefined) {
      // Circular bounds
      const cx = _bounds.centerX || 0;
      const cz = _bounds.centerZ || 0;
      const dx = charGroup.position.x - cx;
      const dz = charGroup.position.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const maxDist = _bounds.radius - PLAYER_RADIUS;
      if (dist > maxDist && dist > 0) {
        charGroup.position.x = cx + (dx / dist) * maxDist;
        charGroup.position.z = cz + (dz / dist) * maxDist;
      }
    } else {
      // Rectangular bounds
      charGroup.position.x = Math.max(_bounds.minX + PLAYER_RADIUS,
        Math.min(_bounds.maxX - PLAYER_RADIUS, charGroup.position.x));
      charGroup.position.z = Math.max(_bounds.minZ + PLAYER_RADIUS,
        Math.min(_bounds.maxZ - PLAYER_RADIUS, charGroup.position.z));
    }
  }

  function resolveObstacles() {
    for (const obs of _obstacles) {
      const dx = charGroup.position.x - obs.x;
      const dz = charGroup.position.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = obs.radius + PLAYER_RADIUS;
      if (dist < minDist && dist > 0) {
        // Push character out
        const nx = dx / dist;
        const nz = dz / dist;
        charGroup.position.x = obs.x + nx * minDist;
        charGroup.position.z = obs.z + nz * minDist;
      }
    }
  }

  // --- Proximity detection ---
  function updateProximity() {
    let nearest = null;
    let nearestDist = PROXIMITY_RANGE;

    const charPos = charGroup.position;

    for (const obj of interactiveObjects) {
      if (!obj.userData || !obj.userData.type) continue;
      const dx = obj.position.x - charPos.x;
      const dz = obj.position.z - charPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = obj;
      }
    }

    if (nearest !== _nearestObject) {
      _nearestObject = nearest;
      if (_onProximityChange) {
        _onProximityChange(_nearestObject);
      }
    }
  }

  // --- Public API ---
  const controls = {
    get isActive() { return _active; },

    get nearestObject() { return _nearestObject; },

    set onProximityChange(fn) { _onProximityChange = fn; },

    setActive(active) {
      _active = active;
      if (!active) {
        _keys.forward = false;
        _keys.backward = false;
        _keys.left = false;
        _keys.right = false;
        _velocity.set(0, 0, 0);
      }
    },

    setBounds(bounds) {
      _bounds = bounds;
    },

    setObstacles(obstacles) {
      _obstacles = obstacles || [];
    },

    setPosition(x, z) {
      charGroup.position.set(x, 0, z);
    },

    getPosition() {
      return charGroup.position;
    },

    setCharacterColor(color) {
      bodyMat.color.set(color);
      headMat.color.set(color);
    },

    update(delta) {
      if (!_active) return;

      // Build direction from keys using isometric basis
      _direction.set(0, 0, 0);
      if (_keys.forward)  _direction.add(ISO_FORWARD);
      if (_keys.backward) _direction.sub(ISO_FORWARD);
      if (_keys.left)     _direction.sub(ISO_RIGHT);
      if (_keys.right)    _direction.add(ISO_RIGHT);

      if (_direction.lengthSq() > 0) {
        _direction.normalize();
        _velocity.x += (_direction.x * MOVE_SPEED - _velocity.x) * LERP_FACTOR;
        _velocity.z += (_direction.z * MOVE_SPEED - _velocity.z) * LERP_FACTOR;

        // Rotate character to face movement direction
        const angle = Math.atan2(_direction.x, _direction.z);
        charGroup.rotation.y = angle;
      }

      // Deceleration
      const decay = Math.exp(-DECELERATION * delta);
      _velocity.x *= decay;
      _velocity.z *= decay;
      if (Math.abs(_velocity.x) < VELOCITY_DEADZONE) _velocity.x = 0;
      if (Math.abs(_velocity.z) < VELOCITY_DEADZONE) _velocity.z = 0;

      // Integrate position
      charGroup.position.x += _velocity.x * delta;
      charGroup.position.z += _velocity.z * delta;
      charGroup.position.y = 0;

      // Simple collision
      resolveBounds();
      resolveObstacles();

      // Proximity detection
      updateProximity();
    },

    dispose() {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      scene.remove(charGroup);
    },
  };

  return controls;
}
```

**Step 2: Verify no syntax errors**

Open the browser console and load the explore page. The page will fail on main.js (it still references Octree), but controls.js should parse correctly.

**Step 3: Commit**

```bash
git add assets/js/explore/controls.js
git commit -m "refactor: replace Octree collision with simple bounds in controls.js"
```

---

### Task 2: Update main.js to use new collision API

**Files:**
- Modify: `assets/js/explore/main.js`

**Step 1: Rewrite main.js**

Remove the Octree import and construction. Use the new `setBounds()` and `setObstacles()` API from the environment's return value. The environment now returns `bounds` and `obstacles` instead of `colliderGroup`.

```javascript
/**
 * main.js — Entry point for the Isometric Explore experience
 *
 * Sets up an orthographic camera at a fixed isometric angle,
 * builds the themed environment, places content, and runs
 * the animation loop with smooth camera follow.
 */

import * as THREE from 'three';
import { createControls } from './controls.js';
import { buildCafe } from './environments/cafe.js';
import { buildCyberpunk } from './environments/cyberpunk.js';
import { buildClouds } from './environments/clouds.js';
import { placeContentObjects } from './content-objects.js';
import { setupUI } from './ui.js';

/* ============================================
   Constants
   ============================================ */

const THEME_CONFIG = {
  beige: {
    builder: buildCafe,
    loadingMessage: 'Brewing the caf\u00e9...',
    welcomeTitle: 'Welcome to the Caf\u00e9',
    themeClass: 'theme-beige',
  },
  dark: {
    builder: buildCyberpunk,
    loadingMessage: 'Booting cyberpunk city...',
    welcomeTitle: 'Welcome to the City',
    themeClass: null,
  },
  light: {
    builder: buildClouds,
    loadingMessage: 'Ascending to the clouds...',
    welcomeTitle: 'Welcome to the Clouds',
    themeClass: 'theme-light',
  },
};

// Isometric camera constants
const ISO_FRUSTUM = 18;
const ISO_ANGLE_Y = Math.PI / 4;
const ISO_ANGLE_X = Math.atan(1 / Math.sqrt(2));
const ISO_DISTANCE = 30;
const CAMERA_LERP = 0.08;

/* ============================================
   DOM References
   ============================================ */

const loadingScreen   = document.getElementById('loading-screen');
const progressBar     = document.getElementById('loading-progress-bar');
const loadingText     = document.querySelector('.loading-text');
const startPrompt     = document.getElementById('start-prompt');
const startButton     = document.getElementById('start-button');
const startTitle      = document.querySelector('.start-prompt-title');
const hud             = document.getElementById('hud');
const pauseMenu       = document.getElementById('pause-menu');
const pauseResume     = document.getElementById('pause-resume');
const mobileNotice    = document.getElementById('mobile-notice');

/* ============================================
   Helpers
   ============================================ */

function isMobile() {
  const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const smallViewport = window.innerWidth < 768 || window.innerHeight < 500;
  return userAgent || smallViewport;
}

function setProgress(pct) {
  if (progressBar) {
    progressBar.style.width = `${pct}%`;
  }
}

function applyThemeClass(themeClass) {
  if (!themeClass) return;
  document.body.classList.add(themeClass);
  loadingScreen?.classList.add(themeClass);
  startPrompt?.classList.add(themeClass);
  hud?.classList.add(themeClass);
  pauseMenu?.classList.add(themeClass);
  mobileNotice?.classList.add(themeClass);
}

/* ============================================
   Isometric Camera
   ============================================ */

function createIsometricCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    ISO_FRUSTUM * aspect / -2,
    ISO_FRUSTUM * aspect / 2,
    ISO_FRUSTUM / 2,
    ISO_FRUSTUM / -2,
    0.1,
    200
  );

  camera.position.set(
    ISO_DISTANCE * Math.sin(ISO_ANGLE_Y) * Math.cos(ISO_ANGLE_X),
    ISO_DISTANCE * Math.sin(ISO_ANGLE_X),
    ISO_DISTANCE * Math.cos(ISO_ANGLE_Y) * Math.cos(ISO_ANGLE_X)
  );
  camera.lookAt(0, 0, 0);

  return camera;
}

/* ============================================
   Initialisation
   ============================================ */

async function init() {
  const themeName = window.EXPLORE_THEME || 'beige';
  const theme = THEME_CONFIG[themeName] || THEME_CONFIG.beige;

  applyThemeClass(theme.themeClass);

  if (loadingText) {
    loadingText.textContent = theme.loadingMessage;
  }

  setProgress(10);

  if (isMobile()) {
    loadingScreen?.classList.add('hidden');
    mobileNotice?.classList.remove('hidden');
    return;
  }

  setProgress(20);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  // Make canvas focusable
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.outline = 'none';

  setProgress(30);

  // --- Scene & Camera ---
  const scene = new THREE.Scene();
  const camera = createIsometricCamera();

  setProgress(40);

  // --- Build environment ---
  const { spawnPosition, animationCallbacks: envCallbacks, contentSlots, bounds, obstacles } =
    await theme.builder(scene);

  setProgress(70);

  // --- Place content objects ---
  const { objects: interactiveObjects, animationCallbacks: contentCallbacks } =
    placeContentObjects(scene, window.EXPLORE_DATA, themeName, contentSlots);

  setProgress(90);

  // --- Controls ---
  const controls = createControls(camera, renderer.domElement, scene, interactiveObjects);

  if (spawnPosition) {
    controls.setPosition(spawnPosition.x, spawnPosition.z);
  }

  // --- Set up simple collision ---
  if (bounds) {
    controls.setBounds(bounds);
  }
  if (obstacles) {
    controls.setObstacles(obstacles);
  }

  const allCallbacks = [...(envCallbacks || []), ...(contentCallbacks || [])];

  // --- UI Setup ---
  const state = {
    scene,
    camera,
    renderer,
    controls,
    interactiveObjects,
    animationCallbacks: allCallbacks,
  };

  setupUI(state, themeName);

  setProgress(100);

  // --- Fade out loading screen ---
  await fadeOutLoading();

  if (startTitle) {
    startTitle.textContent = theme.welcomeTitle;
  }
  startPrompt?.classList.remove('hidden');

  // --- Start button ---
  let gameStarted = false;

  startButton?.addEventListener('click', () => {
    startPrompt?.classList.add('hidden');
    hud?.classList.remove('hidden');
    renderer.domElement.focus();
    controls.setActive(true);
    gameStarted = true;
  });

  // --- Focus/blur for pause/resume ---
  renderer.domElement.addEventListener('focus', () => {
    if (gameStarted) {
      controls.setActive(true);
      hud?.classList.remove('hidden');
      pauseMenu?.classList.add('hidden');
    }
  });

  renderer.domElement.addEventListener('blur', () => {
    if (gameStarted) {
      controls.setActive(false);
      if (!(controls._contentPanel && controls._contentPanel.isOpen)) {
        hud?.classList.add('hidden');
        pauseMenu?.classList.remove('hidden');
      }
    }
  });

  // --- Pause menu resume ---
  pauseResume?.addEventListener('click', () => {
    renderer.domElement.focus();
  });

  // --- ESC: close content panel ---
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (controls._contentPanel && controls._contentPanel.isOpen) {
      e.preventDefault();
      controls._contentPanel.close();
      renderer.domElement.focus();
    }
  });

  // --- Resize handler ---
  window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left   = ISO_FRUSTUM * aspect / -2;
    camera.right  = ISO_FRUSTUM * aspect / 2;
    camera.top    = ISO_FRUSTUM / 2;
    camera.bottom = ISO_FRUSTUM / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Camera follow ---
  const cameraOffset = camera.position.clone();

  // --- Animation loop ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    controls.update(delta);

    // Smooth camera follow
    const charPos = controls.getPosition();
    const targetX = charPos.x + cameraOffset.x;
    const targetZ = charPos.z + cameraOffset.z;
    camera.position.x += (targetX - camera.position.x) * CAMERA_LERP;
    camera.position.z += (targetZ - camera.position.z) * CAMERA_LERP;
    camera.lookAt(
      camera.position.x - cameraOffset.x,
      0,
      camera.position.z - cameraOffset.z
    );

    for (const cb of allCallbacks) {
      cb(delta, clock.elapsedTime);
    }

    renderer.render(scene, camera);
  }

  animate();
}

/* ============================================
   Loading Screen Fade
   ============================================ */

function fadeOutLoading() {
  return new Promise((resolve) => {
    if (!loadingScreen) { resolve(); return; }
    loadingScreen.style.opacity = '0';
    const onEnd = () => {
      loadingScreen.classList.add('hidden');
      loadingScreen.removeEventListener('transitionend', onEnd);
      resolve();
    };
    loadingScreen.addEventListener('transitionend', onEnd);
    setTimeout(() => { loadingScreen.classList.add('hidden'); resolve(); }, 600);
  });
}

/* ============================================
   Start
   ============================================ */

init().catch((err) => {
  console.error('[explore] Initialisation failed:', err);
});
```

**Step 2: Commit**

```bash
git add assets/js/explore/main.js
git commit -m "refactor: remove Octree from main.js, use bounds/obstacles API"
```

---

### Task 3: Rebuild cafe.js as open outdoor patio

**Files:**
- Modify: `assets/js/explore/environments/cafe.js`

**Step 1: Rewrite cafe.js**

Complete rewrite as an open outdoor patio on a 20x20 ground plane. No walls, no ceiling. Sparse furniture as walk-through decoration. GLB models for accent pieces. Returns `bounds` and `obstacles` instead of `colliderGroup`.

```javascript
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
```

**Step 2: Commit**

```bash
git add assets/js/explore/environments/cafe.js
git commit -m "feat: rebuild cafe.js as open outdoor patio"
```

---

### Task 4: Rebuild cyberpunk.js as open neon plaza

**Files:**
- Modify: `assets/js/explore/environments/cyberpunk.js`

**Step 1: Rewrite cyberpunk.js**

Complete rewrite as an open neon-lit plaza. Flat wet asphalt ground, a few neon pillars (with circle collision), holographic signs, neon ground strips, rain. No tall buildings blocking the isometric view.

```javascript
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
```

**Step 2: Commit**

```bash
git add assets/js/explore/environments/cyberpunk.js
git commit -m "feat: rebuild cyberpunk.js as open neon plaza"
```

---

### Task 5: Rebuild clouds.js as floating island

**Files:**
- Modify: `assets/js/explore/environments/clouds.js`

**Step 1: Rewrite clouds.js**

Single large floating island (radius 10) with circular boundary. Crystals as walk-through decoration. Sparkle particles. No edge walls, no bridges, no multiple platforms.

```javascript
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
```

**Step 2: Commit**

```bash
git add assets/js/explore/environments/clouds.js
git commit -m "feat: rebuild clouds.js as single floating island"
```

---

### Task 6: Final verification and push

**Step 1: Check git status**

```bash
git status
git log --oneline -8
```

Verify all 5 files are committed: controls.js, main.js, cafe.js, cyberpunk.js, clouds.js.

**Step 2: Push to remote**

```bash
git push
```

**Step 3: Verify on GitHub Pages**

Wait for the GitHub Pages build to complete, then visit the explore page. Check:
- Character spawns in center and can walk freely in all directions
- No invisible walls blocking movement
- Isometric camera view is unobstructed (open sky)
- Content objects (blog, projects, about) are visible and interactable with E key
- All three themes work (switch theme in localStorage)
- Rain animation works in cyberpunk
- Crystal float animation works in clouds
- Dust particles work in cafe
