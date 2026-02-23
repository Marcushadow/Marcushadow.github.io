/**
 * game.js — Entry point for the Grid Explore experience
 *
 * Sets up Pixi.js app, renders tile grid, handles click-to-move
 * with smooth walking, and manages the content panel overlay.
 */

import { COLS, ROWS, TILE, buildGameGrid, findSpawn, findPath, isWalkable } from './map.js';
import { PALETTES, createTileTextures, createCharacterTextures, tileTextureKey } from './tiles.js';

const PIXI = window.PIXI;

/* ============================================
   Constants
   ============================================ */

const TILE_SIZE = 16;          // Sprite pixel size
const SCALE = 4;               // Render scale (16 * 4 = 64px per tile on screen)
const WALK_SPEED = 150;        // ms per tile
const ANIM_FRAME_RATE = 250;   // ms per walk frame toggle

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
const hudLabel        = document.getElementById('hud-label');
const contentPanel    = document.getElementById('content-panel');
const contentBackdrop = document.getElementById('content-panel-backdrop');
const contentIframe   = document.getElementById('content-panel-iframe');
const contentFullpage = document.getElementById('content-panel-fullpage');
const contentClose    = document.getElementById('content-panel-close');
const mobileNotice    = document.getElementById('mobile-notice');

/* ============================================
   Helpers
   ============================================ */

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768 || window.innerHeight < 500;
}

function setProgress(pct) {
  if (progressBar) progressBar.style.width = `${pct}%`;
}

function applyThemeClass(themeClass) {
  if (!themeClass) return;
  [document.body, loadingScreen, startPrompt, hud, mobileNotice].forEach((el) => {
    el?.classList.add(themeClass);
  });
}

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
}

/* ============================================
   Theme Config
   ============================================ */

const THEME_CONFIG = {
  beige: { loadingMsg: 'Setting up the caf\u00e9...', welcome: 'Welcome to the Caf\u00e9', themeClass: 'theme-beige' },
  dark:  { loadingMsg: 'Jacking into the grid...',     welcome: 'Welcome to the Grid',     themeClass: null },
  light: { loadingMsg: 'Ascending to the clouds...',   welcome: 'Welcome to the Clouds',   themeClass: 'theme-light' },
};

/* ============================================
   Content Panel
   ============================================ */

let panelOpen = false;

function openContentPanel(url) {
  if (!contentPanel || !contentIframe) return;
  contentIframe.src = url;
  if (contentFullpage) contentFullpage.href = url;
  contentBackdrop?.classList.remove('hidden');
  contentPanel.classList.remove('hidden');
  requestAnimationFrame(() => contentPanel.classList.add('visible'));
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
}

contentClose?.addEventListener('click', (e) => { e.stopPropagation(); closeContentPanel(); });
contentBackdrop?.addEventListener('click', closeContentPanel);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && panelOpen) { e.preventDefault(); closeContentPanel(); }
});

/* ============================================
   HUD Label
   ============================================ */

function showLabel(data) {
  if (!hudLabel) return;
  let html = `<div style="font-weight:600;font-size:1rem;">${escapeHTML(data.title)}</div>`;
  if (data.meta) html += `<div style="opacity:0.7;font-size:0.8rem;margin-top:2px;">${escapeHTML(data.meta)}</div>`;
  html += `<div style="opacity:0.5;font-size:0.7rem;margin-top:4px;">Press E or click to open</div>`;
  hudLabel.innerHTML = html;
  hudLabel.classList.remove('hidden');
}

function hideLabel() {
  hudLabel?.classList.add('hidden');
}

/* ============================================
   Main Init
   ============================================ */

async function init() {
  const themeName = window.EXPLORE_THEME || 'beige';
  const config = THEME_CONFIG[themeName] || THEME_CONFIG.beige;
  const palette = PALETTES[themeName] || PALETTES.beige;

  applyThemeClass(config.themeClass);
  if (loadingText) loadingText.textContent = config.loadingMsg;
  setProgress(10);

  if (isMobile()) {
    loadingScreen?.classList.add('hidden');
    mobileNotice?.classList.remove('hidden');
    return;
  }

  setProgress(30);

  // --- Build game grid ---
  const { grid, contentMap } = buildGameGrid(window.EXPLORE_DATA);
  const spawn = findSpawn(grid);

  setProgress(50);

  // --- Create textures ---
  const tileTextures = createTileTextures(palette);
  const charFrames = createCharacterTextures(palette);

  setProgress(70);

  // --- Pixi Application ---
  const gameWidth = COLS * TILE_SIZE * SCALE;
  const gameHeight = ROWS * TILE_SIZE * SCALE;

  const app = new PIXI.Application({
    width: gameWidth,
    height: gameHeight,
    backgroundColor: PIXI.utils.string2hex(palette.bg),
    antialias: false,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
  });

  // Style the canvas to center and fit
  const canvas = app.view;
  canvas.style.position = 'fixed';
  canvas.style.imageRendering = 'pixelated';
  canvas.style.imageRendering = 'crisp-edges';
  document.body.appendChild(canvas);

  function resizeCanvas() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const scaleX = maxW / gameWidth;
    const scaleY = maxH / gameHeight;
    const s = Math.min(scaleX, scaleY, 1); // don't upscale beyond native
    const w = Math.floor(gameWidth * s);
    const h = Math.floor(gameHeight * s);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.left = `${Math.floor((maxW - w) / 2)}px`;
    canvas.style.top = `${Math.floor((maxH - h) / 2)}px`;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  setProgress(85);

  // --- Render tile grid ---
  const tileContainer = new PIXI.Container();
  app.stage.addChild(tileContainer);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tileType = grid[r][c];
      const key = tileTextureKey(tileType);
      const sprite = new PIXI.Sprite(tileTextures[key]);
      sprite.x = c * TILE_SIZE;
      sprite.y = r * TILE_SIZE;
      sprite.width = TILE_SIZE;
      sprite.height = TILE_SIZE;
      tileContainer.addChild(sprite);
    }
  }

  tileContainer.scale.set(SCALE);

  // --- Character sprite ---
  let charCol = spawn.col;
  let charRow = spawn.row;
  let charDir = 'down';
  let charAnimFrame = 0;

  const charSprite = new PIXI.Sprite(charFrames.down[0]);
  charSprite.width = TILE_SIZE;
  charSprite.height = TILE_SIZE;
  charSprite.x = charCol * TILE_SIZE;
  charSprite.y = charRow * TILE_SIZE;

  // Character container at same scale as tiles
  const charContainer = new PIXI.Container();
  charContainer.scale.set(SCALE);
  charContainer.addChild(charSprite);
  app.stage.addChild(charContainer);

  // --- Walking state ---
  let walkPath = [];
  let isWalking = false;
  let walkProgress = 0;
  let walkFromCol = charCol;
  let walkFromRow = charRow;
  let walkToCol = charCol;
  let walkToRow = charRow;
  let animTimer = 0;

  function startWalkStep() {
    if (walkPath.length === 0) {
      isWalking = false;
      charAnimFrame = 0;
      charSprite.texture = charFrames[charDir][0];
      // Check if we landed on a content tile
      onArrival(charCol, charRow);
      return;
    }

    const next = walkPath.shift();
    walkFromCol = charCol;
    walkFromRow = charRow;
    walkToCol = next.col;
    walkToRow = next.row;
    walkProgress = 0;
    isWalking = true;

    // Determine direction
    const dc = walkToCol - walkFromCol;
    const dr = walkToRow - walkFromRow;
    if (dr < 0) charDir = 'up';
    else if (dr > 0) charDir = 'down';
    else if (dc < 0) charDir = 'left';
    else if (dc > 0) charDir = 'right';
  }

  function onArrival(col, row) {
    const key = `${col},${row}`;
    const content = contentMap.get(key);
    if (!content) {
      hideLabel();
      return;
    }

    if (content.type === 'exit') {
      window.location.href = content.url;
      return;
    }

    showLabel(content);
  }

  // --- Click handler ---
  let gameStarted = false;

  canvas.addEventListener('click', (e) => {
    if (panelOpen) return;
    if (!gameStarted) return;

    const rect = canvas.getBoundingClientRect();
    const scaleRatio = gameWidth / rect.width;
    const mx = (e.clientX - rect.left) * scaleRatio;
    const my = (e.clientY - rect.top) * scaleRatio;

    const clickCol = Math.floor(mx / (TILE_SIZE * SCALE));
    const clickRow = Math.floor(my / (TILE_SIZE * SCALE));

    if (clickCol < 0 || clickCol >= COLS || clickRow < 0 || clickRow >= ROWS) return;

    // If clicking current content tile, open it
    const contentKey = `${clickCol},${clickRow}`;
    const content = contentMap.get(contentKey);
    if (clickCol === charCol && clickRow === charRow && content && content.type !== 'exit') {
      openContentPanel(content.url);
      return;
    }

    // Find path and walk
    const path = findPath(grid, charCol, charRow, clickCol, clickRow);
    if (path.length === 0) return;

    walkPath = path;
    hideLabel();
    startWalkStep();
  });

  // --- Keyboard handler ---
  document.addEventListener('keydown', (e) => {
    if (panelOpen) return;
    if (!gameStarted) return;
    if (isWalking) return;

    let dc = 0, dr = 0;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    dr = -1; break;
      case 'KeyS': case 'ArrowDown':  dr = 1; break;
      case 'KeyA': case 'ArrowLeft':  dc = -1; break;
      case 'KeyD': case 'ArrowRight': dc = 1; break;
      case 'KeyE': case 'Enter': {
        // Interact with current tile
        const key = `${charCol},${charRow}`;
        const content = contentMap.get(key);
        if (content && content.type !== 'exit') {
          openContentPanel(content.url);
        }
        return;
      }
      default: return;
    }

    const nc = charCol + dc;
    const nr = charRow + dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;
    if (!isWalkable(grid[nr][nc])) return;

    walkPath = [{ col: nc, row: nr }];
    hideLabel();
    startWalkStep();
  });

  // --- Animation loop ---
  app.ticker.add(() => {
    if (!isWalking) return;

    const dt = app.ticker.deltaMS;
    walkProgress += dt / WALK_SPEED;
    animTimer += dt;

    // Walk animation frame toggle
    if (animTimer > ANIM_FRAME_RATE) {
      animTimer = 0;
      charAnimFrame = (charAnimFrame + 1) % 2;
    }
    charSprite.texture = charFrames[charDir][charAnimFrame];

    if (walkProgress >= 1) {
      // Snap to target
      charCol = walkToCol;
      charRow = walkToRow;
      charSprite.x = charCol * TILE_SIZE;
      charSprite.y = charRow * TILE_SIZE;
      startWalkStep();
    } else {
      // Interpolate
      charSprite.x = (walkFromCol + (walkToCol - walkFromCol) * walkProgress) * TILE_SIZE;
      charSprite.y = (walkFromRow + (walkToRow - walkFromRow) * walkProgress) * TILE_SIZE;
    }
  });

  setProgress(100);

  // --- Fade out loading, show start prompt ---
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.classList.add('hidden'), 500);
  }

  await new Promise((r) => setTimeout(r, 500));

  if (startTitle) startTitle.textContent = config.welcome;
  startPrompt?.classList.remove('hidden');

  startButton?.addEventListener('click', () => {
    startPrompt?.classList.add('hidden');
    hud?.classList.remove('hidden');
    gameStarted = true;
  });

  // --- Exit button ---
  const hudExit = document.getElementById('hud-exit');
  hudExit?.addEventListener('click', () => { window.location.href = '/'; });
}

/* ============================================
   Start
   ============================================ */

init().catch((err) => console.error('[explore] Init failed:', err));
