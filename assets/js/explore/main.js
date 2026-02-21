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
