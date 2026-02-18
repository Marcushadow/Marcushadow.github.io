# Isometric Explore Diorama — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the first-person 3D explore experience with an isometric diorama — a compact themed world viewed from a fixed angle, navigated by walking a small character with WASD.

**Architecture:** Rewrite main.js (orthographic camera), controls.js (isometric WASD + character mesh + proximity detection), ui.js (E-key interaction instead of raycasting), and all three environment builders (compact dioramas). Keep model-loader.js, shared.js, content-objects.js, and all GLB models unchanged. Update explore.html UI text.

**Tech Stack:** Three.js v0.170.0 (ES modules via importmap), Kenney CC0 GLB models, Octree+Capsule collision

---

### Task 1: Update explore.html — Fix UI text for isometric

**Files:**
- Modify: `explore.html:11-12,91-114,121-124,140-146`

**Step 1: Update meta description and start prompt**

Line 11 — change meta description:
```html
<meta name="description" content="Explore {{ site.title }} in an isometric world.">
```

Lines 91-114 — update start prompt subtitle and controls hints:
```html
<div id="start-prompt" class="start-prompt hidden">
    <div class="start-prompt-box">
      <h1 class="start-prompt-title">Explore</h1>
      <p class="start-prompt-subtitle">Navigate the blog in an isometric world</p>

      <div class="controls-hint">
        <div class="controls-hint-row">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
          <span>Move</span>
        </div>
        <div class="controls-hint-row">
          <kbd>E</kbd>
          <span>Interact</span>
        </div>
        <div class="controls-hint-row">
          <kbd>Esc</kbd>
          <span>Exit</span>
        </div>
      </div>

      <button id="start-button" class="start-button">Click to Start</button>
      <a href="{{ '/' | relative_url }}" class="back-link">Back to blog</a>
    </div>
  </div>
```

Lines 120-124 — simplify HUD (remove crosshair, keep exit and label):
```html
<div id="hud" class="hud hidden">
    <div id="hud-label" class="hud-label hidden"></div>
    <button id="hud-exit" class="hud-exit">Exit</button>
  </div>
```

Lines 140-146 — update mobile notice text:
```html
<div id="mobile-notice" class="mobile-notice hidden">
    <div class="mobile-notice-box">
      <h2>Desktop Only</h2>
      <p>The isometric explore experience requires a keyboard. Please visit on a desktop browser.</p>
      <a href="{{ '/' | relative_url }}" class="mobile-notice-link">Back to blog</a>
    </div>
  </div>
```

**Step 2: Commit**

```bash
git add explore.html
git commit -m "feat: update explore.html UI text for isometric mode"
```

---

### Task 2: Rewrite main.js — Orthographic isometric camera

**Files:**
- Modify: `assets/js/explore/main.js` (full rewrite)

**Step 1: Write the new main.js**

Replace the entire file. Key changes from FPS version:
- OrthographicCamera instead of PerspectiveCamera
- Fixed isometric angle (45° Y rotation, ~35.264° X tilt)
- No pointer lock — canvas receives focus via click
- Camera follows character with smooth lerp
- Start button just starts (no pointer lock request)
- ESC goes back to blog (no pause menu needed — just show pause menu with resume)
- Pause/resume by clicking canvas vs clicking outside

```javascript
/**
 * main.js — Entry point for the Isometric Explore experience
 *
 * Sets up an orthographic camera at a fixed isometric angle,
 * builds the themed environment, places content, and runs
 * the animation loop with smooth camera follow.
 */

import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
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
const ISO_FRUSTUM = 18;                        // world units visible vertically
const ISO_ANGLE_Y = Math.PI / 4;               // 45 degrees
const ISO_ANGLE_X = Math.atan(1 / Math.sqrt(2)); // ~35.264 degrees (true isometric)
const ISO_DISTANCE = 30;                       // camera distance from origin
const CAMERA_LERP = 0.08;                      // smooth follow speed

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
   Mobile Detection
   ============================================ */

function isMobile() {
  const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const smallViewport = window.innerWidth < 768 || window.innerHeight < 500;
  return userAgent || smallViewport;
}

/* ============================================
   Progress Helper
   ============================================ */

function setProgress(pct) {
  if (progressBar) {
    progressBar.style.width = `${pct}%`;
  }
}

/* ============================================
   Theme Application
   ============================================ */

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
   Isometric Camera Setup
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

  // Position camera at isometric angle
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
  const { spawnPosition, animationCallbacks: envCallbacks, contentSlots, colliderGroup } =
    await theme.builder(scene);

  setProgress(70);

  // --- Place content objects ---
  const { objects: interactiveObjects, animationCallbacks: contentCallbacks } =
    placeContentObjects(scene, window.EXPLORE_DATA, themeName, contentSlots);

  setProgress(90);

  // --- Controls (isometric character) ---
  const controls = createControls(camera, renderer.domElement, scene, interactiveObjects);

  // Set spawn position for character
  if (spawnPosition) {
    controls.setPosition(spawnPosition.x, spawnPosition.z);
  }

  // --- Build collision octree ---
  if (colliderGroup) {
    const worldOctree = new Octree();
    worldOctree.fromGraphNode(colliderGroup);
    controls.setOctree(worldOctree);
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

  // --- Pause/resume via canvas focus ---
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
      // Only show pause if content panel isn't open
      if (controls._contentPanel && !controls._contentPanel.isOpen) {
        hud?.classList.add('hidden');
        pauseMenu?.classList.remove('hidden');
      }
    }
  });

  // --- Pause menu resume ---
  pauseResume?.addEventListener('click', () => {
    renderer.domElement.focus();
  });

  // --- ESC: close content panel or go back ---
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

  // --- Camera follow target ---
  const cameraOffset = camera.position.clone(); // initial offset from origin

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
git commit -m "feat: rewrite main.js for isometric orthographic camera"
```

---

### Task 3: Rewrite controls.js — Isometric character movement

**Files:**
- Modify: `assets/js/explore/controls.js` (full rewrite)

**Step 1: Write the new controls.js**

Key changes:
- No pointer lock, no mouse look
- Character mesh (capsule) rendered in scene
- WASD mapped to isometric directions
- Proximity detection for nearby interactive objects
- Active/inactive state instead of locked/unlocked

```javascript
/**
 * controls.js — Isometric character controls with collision
 *
 * Provides WASD movement in isometric directions, a visible character
 * mesh, and proximity detection for interactive objects.
 *
 * Usage:
 *   const controls = createControls(camera, domElement, scene, interactiveObjects);
 *   controls.setOctree(worldOctree);
 *   controls.setPosition(x, z);
 *   controls.setActive(true);
 *   // in animation loop:
 *   controls.update(delta);
 */

import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

const MOVE_SPEED = 5.0;
const DECELERATION = 6.0;
const LERP_FACTOR = 0.12;
const VELOCITY_DEADZONE = 0.001;
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 0.5;
const PROXIMITY_RANGE = 2.0;

// Isometric basis vectors (camera at 45° Y rotation)
// "Forward" on screen (up) = moving toward top-right of screen = (-1, 0, -1) in world
const ISO_FORWARD = new THREE.Vector3(-1, 0, -1).normalize();
// "Right" on screen = moving toward bottom-right = (1, 0, -1) in world
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

  // Collision
  let _octree = null;
  const _capsule = new Capsule(
    new THREE.Vector3(0, PLAYER_RADIUS, 0),
    new THREE.Vector3(0, PLAYER_HEIGHT, 0),
    PLAYER_RADIUS
  );

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

  // Direction indicator (small cone pointing forward)
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

  // --- Collision ---
  function resolveCollisions() {
    if (!_octree) return;
    const result = _octree.capsuleIntersect(_capsule);
    if (result) {
      _capsule.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  function syncCapsuleFromCharacter() {
    _capsule.start.set(charGroup.position.x, PLAYER_RADIUS, charGroup.position.z);
    _capsule.end.set(charGroup.position.x, PLAYER_HEIGHT, charGroup.position.z);
  }

  function syncCharacterFromCapsule() {
    charGroup.position.x = _capsule.end.x;
    charGroup.position.z = _capsule.end.z;
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

    setOctree(octree) {
      _octree = octree;
      syncCapsuleFromCharacter();
    },

    setPosition(x, z) {
      charGroup.position.set(x, 0, z);
      syncCapsuleFromCharacter();
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
      charGroup.position.y = 0; // locked to ground

      // Collision
      if (_octree) {
        syncCapsuleFromCharacter();
        resolveCollisions();
        syncCharacterFromCapsule();
      }

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

**Step 2: Commit**

```bash
git add assets/js/explore/controls.js
git commit -m "feat: rewrite controls.js for isometric WASD movement with character mesh"
```

---

### Task 4: Rewrite ui.js — Proximity interaction with E key

**Files:**
- Modify: `assets/js/explore/ui.js` (full rewrite)

**Step 1: Write the new ui.js**

Key changes:
- Remove raycaster and crosshair logic
- Use controls.onProximityChange for tooltip display
- E key opens content panel
- Keep content panel open/close logic

```javascript
/**
 * ui.js — HUD interaction system for the Isometric Explore experience
 *
 * Shows proximity-based tooltips when near interactive objects,
 * handles E-key to open content panel, and manages the content
 * panel iframe overlay.
 *
 * Usage (called from main.js):
 *   setupUI(state, themeName);
 */

import * as THREE from 'three';

/* ============================================
   HTML Escaping
   ============================================ */

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
}

/* ============================================
   Label Helpers
   ============================================ */

const hudLabel = document.getElementById('hud-label');

function showLabel(data) {
  if (!hudLabel) return;

  let html = `<div style="font-weight:600;font-size:1.05rem;">${escapeHTML(data.title)}</div>`;
  if (data.meta) {
    html += `<div style="opacity:0.7;font-size:0.85rem;margin-top:2px;">${escapeHTML(data.meta)}</div>`;
  }
  html += `<div style="opacity:0.5;font-size:0.75rem;margin-top:4px;">Press E to interact</div>`;

  hudLabel.innerHTML = html;
  hudLabel.classList.remove('hidden');
}

function hideLabel() {
  if (!hudLabel) return;
  hudLabel.classList.add('hidden');
}

/* ============================================
   Main Setup
   ============================================ */

/**
 * @param {{ scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer,
 *           controls: object, interactiveObjects: THREE.Object3D[],
 *           animationCallbacks: Function[] }} state
 * @param {string} theme
 */
export function setupUI(state, theme) {
  const { controls, renderer } = state;

  // --- Proximity-based label display ---
  controls.onProximityChange = (nearestObj) => {
    if (nearestObj && nearestObj.userData) {
      showLabel({
        title: nearestObj.userData.title || 'Unknown',
        meta: nearestObj.userData.meta || '',
        type: nearestObj.userData.type,
      });
    } else {
      hideLabel();
    }
  };

  // --- Content panel references ---
  const contentPanel    = document.getElementById('content-panel');
  const contentBackdrop = document.getElementById('content-panel-backdrop');
  const contentIframe   = document.getElementById('content-panel-iframe');
  const contentFullpage = document.getElementById('content-panel-fullpage');
  const contentClose    = document.getElementById('content-panel-close');

  let panelOpen = false;

  function openContentPanel(url) {
    if (!contentPanel || !contentIframe) return;

    contentIframe.src = url;
    if (contentFullpage) contentFullpage.href = url;

    controls.setActive(false);

    contentBackdrop?.classList.remove('hidden');
    contentPanel.classList.remove('hidden');
    requestAnimationFrame(() => {
      contentPanel.classList.add('visible');
    });

    panelOpen = true;
  }

  function closeContentPanel() {
    if (!contentPanel) return;

    contentPanel.classList.remove('visible');
    setTimeout(() => {
      contentBackdrop?.classList.add('hidden');
      contentPanel.classList.add('hidden');
      if (contentIframe) contentIframe.src = '';
    }, 350);

    panelOpen = false;

    setTimeout(() => {
      renderer.domElement.focus();
      controls.setActive(true);
    }, 100);
  }

  // Expose panel state
  controls._contentPanel = {
    get isOpen() { return panelOpen; },
    close: closeContentPanel,
  };

  // --- E key to interact ---
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' && e.code !== 'Enter') return;
    if (!controls.isActive) return;
    if (panelOpen) return;

    const target = controls.nearestObject;
    if (!target || !target.userData || !target.userData.url) return;

    openContentPanel(target.userData.url);
  });

  // --- Close button ---
  contentClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContentPanel();
  });

  // --- Backdrop click ---
  contentBackdrop?.addEventListener('click', () => {
    closeContentPanel();
  });

  // --- Exit button ---
  const hudExit = document.getElementById('hud-exit');
  if (hudExit) {
    hudExit.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = '/';
    });
  }
}
```

**Step 2: Commit**

```bash
git add assets/js/explore/ui.js
git commit -m "feat: rewrite ui.js for proximity-based E-key interaction"
```

---

### Task 5: Rewrite cafe.js — Isometric cafe diorama

**Files:**
- Modify: `assets/js/explore/environments/cafe.js`

**Step 1: Adjust cafe for isometric view**

The cafe is an indoor room. For isometric viewing, we need to remove the two walls that face the camera (the "front" walls from the camera's perspective). Since the camera looks from +X, +Y, +Z toward origin, the walls at +X (right wall) and +Z (back wall) would block the view. Remove those two walls and keep the -X (left) and -Z (front) walls.

Key changes:
- Remove right wall (x=12) and back wall (z=12) — these face the camera
- Keep left wall (x=-12) and front wall (z=-12) — these are behind the scene from camera view
- Reduce room size from 24x24 to 20x20 for a tighter diorama
- Adjust all furniture positions proportionally
- Spawn position: center of room on XZ plane, Y=0
- Return `spawnPosition: new THREE.Vector3(0, 0, 0)` (no eye height — character is at ground level)
- Content slot Y values: objects at ground level with small Y offset for table height

Important: The `spawnPosition` now returns `(x, 0, z)` — the controls.js uses `setPosition(x, z)` and the character is always at Y=0.

Major edits to make:
1. Change room dimensions from 24 to 20
2. Remove right wall and back wall (keep left and front)
3. Add a visible back-left corner wall for depth
4. Tighten furniture layout to fit 20x20
5. Change `spawnPosition` to `new THREE.Vector3(0, 0, 2)` (center-ish, y=0)
6. Adjust all content slot Y values — blog slots on shelves stay the same heights, project slots on tables at `y: 1.15` (table surface)

**Step 2: Verify**

Open explore page with beige theme. Confirm:
- Room is visible from isometric angle (no walls blocking view)
- Character spawns inside the room
- Furniture is properly placed
- Can walk to bookshelves, tables, lounge area
- Content objects are reachable

**Step 3: Commit**

```bash
git add assets/js/explore/environments/cafe.js
git commit -m "feat: rebuild cafe.js as isometric diorama with open walls"
```

---

### Task 6: Rewrite cyberpunk.js — Isometric cyberpunk alley

**Files:**
- Modify: `assets/js/explore/environments/cyberpunk.js`

**Step 1: Adjust cyberpunk for isometric view**

The cyberpunk alley runs along the Z axis with buildings on both sides. For isometric view:
- Shorten the street (reduce Z range from -22 to +22 down to -12 to +12)
- Make buildings shorter (max 6-8 stories instead of 10-16) so they don't dominate the view
- Reduce building count from 10 per side to 6 per side
- Keep the street width (~12 units between building faces)
- All neon, clutter, and vendor stalls stay but with adjusted Z positions
- Spawn at center of street

Key changes:
1. Reduce `leftBuildings` and `rightBuildings` arrays to 6 entries each
2. Reduce building heights to 6-10 range
3. Compress Z positions to -12 to +12
4. Adjust all neon tube, bar, wire, and clutter positions to fit shorter street
5. Move about kiosk to z=10 instead of z=20
6. Move exit portal to z=-14 instead of z=-22
7. Return `spawnPosition: new THREE.Vector3(0, 0, 0)` (y=0, controls handle ground level)

**Step 2: Verify**

Open explore with dark theme. Confirm isometric view shows the alley, buildings visible, neon effects work, character walks along street.

**Step 3: Commit**

```bash
git add assets/js/explore/environments/cyberpunk.js
git commit -m "feat: rebuild cyberpunk.js as compact isometric alley"
```

---

### Task 7: Rewrite clouds.js — Isometric cloud platforms

**Files:**
- Modify: `assets/js/explore/environments/clouds.js`

**Step 1: Adjust clouds for isometric view**

The cloud platforms are spread far apart. For isometric view, tighten them so all 4 are visible:
- Main platform at (0, 0, 0), radius 4
- Blog at (0, 0, -10), radius 5
- Projects at (10, 0, 0), radius 5
- About at (-10, 0, 0), radius 4

All Z distances reduced from 18-20 to 10. Bridges shortened.

Key changes:
1. Tighten platform positions (closer together)
2. Reduce platform radii slightly
3. Keep bridges flat (arcHeight=0 already from grounding fix)
4. Keep all decorations but adjust positions
5. Decorative clouds should be above the platforms (y: 5-15 range)
6. Return `spawnPosition: new THREE.Vector3(0, 0, 0)` (y=0)

**Step 2: Verify**

Open explore with light theme. Confirm all 4 platforms visible from iso angle, bridges walkable, decorations grounded.

**Step 3: Commit**

```bash
git add assets/js/explore/environments/clouds.js
git commit -m "feat: rebuild clouds.js as compact isometric platform cluster"
```

---

### Task 8: Adjust content-objects.js — Face isometric camera

**Files:**
- Modify: `assets/js/explore/content-objects.js`

**Step 1: Rotate content labels to face isometric camera**

The isometric camera looks from a 45° angle. Flat planes (billboards, labels, cards) need to face the camera. Add `group.rotation.y = Math.PI / 4` to each content group so text faces the camera.

In `placeContentObjects`, after creating each group:
```javascript
// Rotate to face isometric camera (45° Y)
group.rotation.y = Math.PI / 4;
```

This applies to: books (spine labels), display items (cards), neon billboards, arcade cabinets (screens), scrolls (papers), crystal structures (labels), and about displays.

Add this line after each `scene.add(group)` call in the main function body (6 locations).

**Step 2: Commit**

```bash
git add assets/js/explore/content-objects.js
git commit -m "feat: rotate content objects to face isometric camera"
```

---

### Task 9: Final verification and push

**Step 1: Test all three themes**

- Beige: cafe diorama visible, character walks, bookshelves and tables reachable, E to interact
- Dark: cyberpunk alley visible, neon effects, street walkable, billboards and stalls reachable
- Light: cloud platforms all visible, bridges walkable, content objects reachable

**Step 2: Push**

```bash
git push origin main
```
