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
