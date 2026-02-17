/**
 * ui.js — HUD interaction system for the 3D Explore experience
 *
 * Handles raycasting from the camera center to detect interactive
 * objects, showing / hiding hover labels, click-to-navigate, and
 * the exit button.
 *
 * NOTE: Pointer-lock state changes, pause menu, and the start button
 * are handled in main.js — this module must NOT duplicate that logic.
 *
 * Usage (called from main.js):
 *   setupUI(state, themeName);
 */

import * as THREE from 'three';

/* ============================================
   HTML Escaping
   ============================================ */

const ESC_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes a string for safe insertion into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
}

/* ============================================
   Label Helpers
   ============================================ */

const hudLabel = document.getElementById('hud-label');

/**
 * Shows the HUD label with title, optional meta line, and a click hint.
 * @param {{ title: string, meta?: string, type: string }} data
 */
function showLabel(data) {
  if (!hudLabel) return;

  let html = `<div style="font-weight:600;font-size:1.05rem;">${escapeHTML(data.title)}</div>`;

  if (data.meta) {
    html += `<div style="opacity:0.7;font-size:0.85rem;margin-top:2px;">${escapeHTML(data.meta)}</div>`;
  }

  html += `<div style="opacity:0.5;font-size:0.75rem;margin-top:4px;">Click to visit</div>`;

  hudLabel.innerHTML = html;
  hudLabel.classList.remove('hidden');
}

/**
 * Hides the HUD label.
 */
function hideLabel() {
  if (!hudLabel) return;
  hudLabel.classList.add('hidden');
}

/* ============================================
   Raycaster Utilities
   ============================================ */

/**
 * Collects all Mesh children from an array of groups / objects so
 * the raycaster can test against them.
 *
 * @param {THREE.Object3D[]} interactiveObjects
 * @returns {THREE.Mesh[]}
 */
function collectMeshes(interactiveObjects) {
  const meshes = [];

  for (const obj of interactiveObjects) {
    obj.traverse((child) => {
      if (child.isMesh) {
        meshes.push(child);
      }
    });
  }

  return meshes;
}

/**
 * Walks up the parent chain from a hit object until it finds one
 * whose userData has a `type` field, or returns null.
 *
 * @param {THREE.Object3D} object
 * @returns {THREE.Object3D|null}
 */
function findInteractiveAncestor(object) {
  let current = object;

  while (current) {
    if (current.userData && current.userData.type) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

/* ============================================
   Main Setup
   ============================================ */

/**
 * Wires up the HUD interaction system.
 *
 * @param {{ scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer,
 *           controls: object, interactiveObjects: THREE.Object3D[],
 *           animationCallbacks: Function[] }} state
 * @param {string} theme - 'beige' | 'dark' | 'light'
 */
export function setupUI(state, theme) {
  const { camera, controls, interactiveObjects, animationCallbacks } = state;

  // --- Raycaster setup ---
  const raycaster = new THREE.Raycaster();
  raycaster.far = 8;

  // Screen center (normalised device coords)
  const screenCenter = new THREE.Vector2(0, 0);

  // Currently hovered interactive target (the group with userData.type)
  let currentTarget = null;

  // --- Per-frame raycasting callback ---
  animationCallbacks.push(() => {
    if (!controls.isLocked) {
      // Not in-game — clear any existing label
      if (currentTarget) {
        hideLabel();
        currentTarget = null;
      }
      return;
    }

    // Cast ray from camera center
    raycaster.setFromCamera(screenCenter, camera);

    // Gather all child meshes from interactive objects
    const meshes = collectMeshes(interactiveObjects);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      // Walk up parent chain to find the tagged group
      const ancestor = findInteractiveAncestor(intersects[0].object);

      if (ancestor && ancestor !== currentTarget) {
        currentTarget = ancestor;
        showLabel({
          title: ancestor.userData.title || 'Unknown',
          meta: ancestor.userData.meta || '',
          type: ancestor.userData.type,
        });
      } else if (!ancestor) {
        // Hit a mesh but no interactive ancestor
        if (currentTarget) {
          hideLabel();
          currentTarget = null;
        }
      }
    } else {
      // No intersections — hide label
      if (currentTarget) {
        hideLabel();
        currentTarget = null;
      }
    }
  });

  // --- Content panel references ---
  const contentPanel    = document.getElementById('content-panel');
  const contentBackdrop = document.getElementById('content-panel-backdrop');
  const contentIframe   = document.getElementById('content-panel-iframe');
  const contentFullpage = document.getElementById('content-panel-fullpage');
  const contentClose    = document.getElementById('content-panel-close');

  let panelOpen = false;

  /**
   * Opens the content panel with the given URL.
   */
  function openContentPanel(url) {
    if (!contentPanel || !contentIframe) return;

    contentIframe.src = url;
    if (contentFullpage) {
      contentFullpage.href = url;
    }

    controls.unlock();

    // Show backdrop + panel
    contentBackdrop?.classList.remove('hidden');
    contentPanel.classList.remove('hidden');

    // Trigger slide-in on next frame so the transition plays
    requestAnimationFrame(() => {
      contentPanel.classList.add('visible');
    });

    panelOpen = true;
  }

  /**
   * Closes the content panel and re-locks the pointer.
   */
  function closeContentPanel() {
    if (!contentPanel) return;

    contentPanel.classList.remove('visible');

    // Hide backdrop and clear iframe after slide-out transition
    setTimeout(() => {
      contentBackdrop?.classList.add('hidden');
      contentPanel.classList.add('hidden');
      if (contentIframe) contentIframe.src = '';
    }, 350);

    panelOpen = false;

    // Re-lock pointer after a short delay to avoid immediate ESC conflict
    setTimeout(() => {
      controls.lock();
    }, 100);
  }

  // Expose panel state for main.js ESC handling
  controls._contentPanel = {
    get isOpen() { return panelOpen; },
    close: closeContentPanel,
  };

  // --- Click handler: open content panel ---
  document.addEventListener('click', () => {
    if (!controls.isLocked) return;
    if (!currentTarget) return;

    const url = currentTarget.userData.url;
    if (!url) return;

    openContentPanel(url);
  });

  // --- Close button ---
  contentClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContentPanel();
  });

  // --- Backdrop click closes panel ---
  contentBackdrop?.addEventListener('click', () => {
    closeContentPanel();
  });

  // --- Exit button ---
  const hudExit = document.getElementById('hud-exit');

  if (hudExit) {
    hudExit.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't trigger the content-click handler
      window.location.href = '/';
    });
  }
}
