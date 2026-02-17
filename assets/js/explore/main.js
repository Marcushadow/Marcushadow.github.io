/**
 * main.js — Entry point for the 3D Explore experience
 *
 * Orchestrates mobile detection, renderer/scene/camera setup,
 * environment building, content placement, UI wiring, loading
 * progress, and the main animation loop.
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
    themeClass: null, // dark is the default — no class needed
  },
  light: {
    builder: buildClouds,
    loadingMessage: 'Ascending to the clouds...',
    welcomeTitle: 'Welcome to the Clouds',
    themeClass: 'theme-light',
  },
};

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

/**
 * Applies the appropriate theme class to the loading screen, body,
 * and all overlay containers so CSS theme selectors take effect.
 */
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
   Initialisation
   ============================================ */

async function init() {
  // --- Resolve theme ---
  const themeName = window.EXPLORE_THEME || 'beige';
  const theme = THEME_CONFIG[themeName] || THEME_CONFIG.beige;

  // Apply theme class immediately so loading screen is styled
  applyThemeClass(theme.themeClass);

  // Set loading message
  if (loadingText) {
    loadingText.textContent = theme.loadingMessage;
  }

  setProgress(10);

  // --- Mobile gate ---
  if (isMobile()) {
    loadingScreen?.classList.add('hidden');
    mobileNotice?.classList.remove('hidden');
    return;
  }

  setProgress(20);

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  setProgress(30);

  // --- Scene & Camera ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 1.7, 0);

  setProgress(40);

  // --- Build environment (async for model loading) ---
  const { spawnPosition, animationCallbacks: envCallbacks, contentSlots, colliderGroup } =
    await theme.builder(scene);

  // Place camera at spawn
  if (spawnPosition) {
    camera.position.copy(spawnPosition);
    camera.position.y = 1.7;
  }

  setProgress(70);

  // --- Place content objects ---
  const { objects: interactiveObjects, animationCallbacks: contentCallbacks } =
    placeContentObjects(scene, window.EXPLORE_DATA, themeName, contentSlots);

  setProgress(90);

  // --- Controls ---
  const controls = createControls(camera, renderer.domElement);

  // --- Build collision octree ---
  if (colliderGroup) {
    const worldOctree = new Octree();
    worldOctree.fromGraphNode(colliderGroup);
    controls.setOctree(worldOctree);
  }

  // Merge all animation callbacks
  const allCallbacks = [...(envCallbacks || []), ...(contentCallbacks || [])];

  // --- Build state object for UI ---
  const state = {
    scene,
    camera,
    renderer,
    controls,
    interactiveObjects,
    animationCallbacks: allCallbacks,
  };

  // --- UI Setup ---
  setupUI(state, themeName);

  setProgress(100);

  // --- Fade out loading screen, show start prompt ---
  await fadeOutLoading();

  // Update start prompt title
  if (startTitle) {
    startTitle.textContent = theme.welcomeTitle;
  }
  startPrompt?.classList.remove('hidden');

  // --- Start button handler ---
  startButton?.addEventListener('click', () => {
    startPrompt?.classList.add('hidden');
    controls.lock();
  });

  // --- Pointer-lock state changes ---
  controls.onLockChange = (locked) => {
    if (locked) {
      hud?.classList.remove('hidden');
      pauseMenu?.classList.add('hidden');
    } else {
      hud?.classList.add('hidden');
      // Show pause menu only if we were in-game and content panel is not open
      if (startPrompt?.classList.contains('hidden') &&
          !(controls._contentPanel && controls._contentPanel.isOpen)) {
        pauseMenu?.classList.remove('hidden');
      }
    }
  };

  // --- Pause menu resume ---
  pauseResume?.addEventListener('click', () => {
    controls.lock();
  });

  // --- ESC key: close content panel before showing pause menu ---
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;

    // If content panel is open, close it instead of showing pause menu
    if (controls._contentPanel && controls._contentPanel.isOpen) {
      e.preventDefault();
      controls._contentPanel.close();
    }
  });

  // --- Resize handler ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Animation loop ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    // Update controls (only moves when locked)
    controls.update(delta);

    // Run all animation callbacks
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
    if (!loadingScreen) {
      resolve();
      return;
    }

    loadingScreen.style.opacity = '0';

    const onTransitionEnd = () => {
      loadingScreen.classList.add('hidden');
      loadingScreen.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    };

    loadingScreen.addEventListener('transitionend', onTransitionEnd);

    // Fallback in case transitionend never fires
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      resolve();
    }, 600);
  });
}

/* ============================================
   Start
   ============================================ */

init().catch((err) => {
  console.error('[explore] Initialisation failed:', err);
});
