# Grid-Based Pixel Art Explore Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 3D isometric explore with a 2D pixel art RPG grid — click to move, smooth walking, procedural sprites, three themed palettes.

**Architecture:** Pixi.js v7 via CDN script tag (global `PIXI`). Three ES module files: `map.js` (grid data, BFS pathfinding, content assignment), `tiles.js` (procedural sprite generation, theme palettes), `game.js` (Pixi app, input handling, animation loop, content panel). explore.html updated for Pixi.js. Existing CSS kept with minor edits.

**Tech Stack:** Pixi.js v7.4.3 (CDN), ES modules, HTML5 Canvas (via Pixi), procedural pixel art

---

### Task 1: Delete old Three.js explore files

**Files:**
- Delete: `assets/js/explore/main.js`
- Delete: `assets/js/explore/controls.js`
- Delete: `assets/js/explore/ui.js`
- Delete: `assets/js/explore/content-objects.js`
- Delete: `assets/js/explore/model-loader.js`
- Delete: `assets/js/explore/environments/shared.js`
- Delete: `assets/js/explore/environments/cafe.js`
- Delete: `assets/js/explore/environments/cyberpunk.js`
- Delete: `assets/js/explore/environments/clouds.js`

**Step 1: Delete all old JS files**

```bash
rm assets/js/explore/main.js
rm assets/js/explore/controls.js
rm assets/js/explore/ui.js
rm assets/js/explore/content-objects.js
rm assets/js/explore/model-loader.js
rm -rf assets/js/explore/environments
```

**Step 2: Commit**

```bash
git add -u assets/js/explore/
git commit -m "chore: remove old Three.js explore files"
```

---

### Task 2: Create map.js — grid layout, BFS, content assignment

**Files:**
- Create: `assets/js/explore/map.js`

**Step 1: Write map.js**

This file defines the grid layout, assigns content to tiles, and provides BFS pathfinding.

```javascript
/**
 * map.js — Grid layout, tile types, BFS pathfinding, content assignment
 *
 * The map is a 12x10 grid. Tile types:
 *   0 = grass (walkable)
 *   1 = path  (walkable)
 *   2 = deco  (obstacle, not walkable)
 *   3 = blog  (walkable, content)
 *   4 = project (walkable, content)
 *   5 = about (walkable, content)
 *   6 = exit  (walkable, navigates to /)
 *   7 = spawn (walkable, character start)
 */

export const TILE = {
  GRASS:   0,
  PATH:    1,
  DECO:    2,
  BLOG:    3,
  PROJECT: 4,
  ABOUT:   5,
  EXIT:    6,
  SPAWN:   7,
};

// 12 columns x 10 rows
// Top = row 0, left = col 0
export const COLS = 12;
export const ROWS = 10;

const G = TILE.GRASS;
const P = TILE.PATH;
const D = TILE.DECO;
const B = TILE.BLOG;
const R = TILE.PROJECT;
const A = TILE.ABOUT;
const E = TILE.EXIT;
const S = TILE.SPAWN;

export const BASE_GRID = [
  [D, D, D, D, D, D, D, D, D, D, D, D],
  [D, G, G, B, B, B, B, B, B, G, G, D],
  [D, G, G, P, P, P, P, P, P, G, G, D],
  [D, G, G, P, G, G, G, G, P, G, G, D],
  [D, R, G, P, G, S, G, G, P, G, A, D],
  [D, R, G, P, G, G, G, G, P, G, G, D],
  [D, R, G, P, G, G, G, G, P, G, G, D],
  [D, G, G, P, P, P, P, P, P, G, G, D],
  [D, G, G, G, G, E, G, G, G, G, G, D],
  [D, D, D, D, D, D, D, D, D, D, D, D],
];

/**
 * Returns true if a tile type is walkable.
 */
export function isWalkable(tileType) {
  return tileType !== TILE.DECO;
}

/**
 * Finds the spawn position {col, row} in the grid.
 */
export function findSpawn(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE.SPAWN) return { col: c, row: r };
    }
  }
  return { col: 5, row: 4 }; // fallback
}

/**
 * Creates a deep copy of the grid and assigns content data to
 * BLOG, PROJECT, and ABOUT tiles.
 *
 * Returns { grid: number[][], contentMap: Map<string, object> }
 * where contentMap keys are "col,row" strings.
 */
export function buildGameGrid(exploreData) {
  // Deep copy
  const grid = BASE_GRID.map((row) => [...row]);
  const contentMap = new Map();

  const posts = (exploreData && exploreData.posts) || [];
  const projects = (exploreData && exploreData.projects) || [];
  const about = (exploreData && exploreData.about) || { url: '/about/' };

  // Collect positions for each content type
  const blogTiles = [];
  const projectTiles = [];
  let aboutTile = null;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE.BLOG) blogTiles.push({ col: c, row: r });
      if (grid[r][c] === TILE.PROJECT) projectTiles.push({ col: c, row: r });
      if (grid[r][c] === TILE.ABOUT && !aboutTile) aboutTile = { col: c, row: r };
    }
  }

  // Assign posts to blog tiles (excess tiles become grass)
  blogTiles.forEach((pos, i) => {
    if (i < posts.length) {
      contentMap.set(`${pos.col},${pos.row}`, {
        type: 'post',
        title: posts[i].title,
        url: posts[i].url,
        meta: posts[i].date || '',
      });
    } else {
      grid[pos.row][pos.col] = TILE.GRASS;
    }
  });

  // Assign projects
  projectTiles.forEach((pos, i) => {
    if (i < projects.length) {
      contentMap.set(`${pos.col},${pos.row}`, {
        type: 'project',
        title: projects[i].title,
        url: projects[i].url,
        meta: '',
      });
    } else {
      grid[pos.row][pos.col] = TILE.GRASS;
    }
  });

  // About tile
  if (aboutTile) {
    contentMap.set(`${aboutTile.col},${aboutTile.row}`, {
      type: 'about',
      title: 'About Me',
      url: about.url,
      meta: '',
    });
  }

  // Exit tile
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE.EXIT) {
        contentMap.set(`${c},${r}`, {
          type: 'exit',
          title: 'Exit',
          url: '/',
          meta: 'Back to blog',
        });
      }
    }
  }

  return { grid, contentMap };
}

/**
 * BFS pathfinding from (startCol, startRow) to (endCol, endRow).
 * Returns an array of {col, row} steps (excluding start, including end),
 * or empty array if no path exists.
 */
export function findPath(grid, startCol, startRow, endCol, endRow) {
  if (startCol === endCol && startRow === endRow) return [];
  if (!isWalkable(grid[endRow]?.[endCol])) return [];

  const key = (c, r) => `${c},${r}`;
  const visited = new Set();
  const parent = new Map();

  const queue = [{ col: startCol, row: startRow }];
  visited.add(key(startCol, startRow));

  const dirs = [
    { dc: 0, dr: -1 }, // up
    { dc: 0, dr: 1 },  // down
    { dc: -1, dr: 0 }, // left
    { dc: 1, dr: 0 },  // right
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.col === endCol && current.row === endRow) {
      // Reconstruct path
      const path = [];
      let node = { col: endCol, row: endRow };
      while (node.col !== startCol || node.row !== startRow) {
        path.unshift(node);
        node = parent.get(key(node.col, node.row));
      }
      return path;
    }

    for (const { dc, dr } of dirs) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      const k = key(nc, nr);

      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (visited.has(k)) continue;
      if (!isWalkable(grid[nr][nc])) continue;

      visited.add(k);
      parent.set(k, { col: current.col, row: current.row });
      queue.push({ col: nc, row: nr });
    }
  }

  return []; // no path found
}
```

**Step 2: Commit**

```bash
git add assets/js/explore/map.js
git commit -m "feat: add map.js with grid layout and BFS pathfinding"
```

---

### Task 3: Create tiles.js — procedural sprites and palettes

**Files:**
- Create: `assets/js/explore/tiles.js`

**Step 1: Write tiles.js**

Procedural pixel art tile and character sprites. Three theme palettes. All graphics generated on canvas — no external image files.

```javascript
/**
 * tiles.js — Procedural pixel art tile/character sprites and theme palettes
 *
 * All sprites are generated on canvas at runtime. No external images.
 * Tile size is 16x16 pixels (rendered scaled up by Pixi).
 * Character is 16x16 with 4 walk frames per direction.
 */

const PIXI = window.PIXI;
const TS = 16; // tile size in pixels

/* ============================================
   Theme Palettes
   ============================================ */

export const PALETTES = {
  beige: {
    grass1:    '#b8a87a',
    grass2:    '#a89868',
    path1:     '#d4c4a0',
    path2:     '#c8b890',
    deco1:     '#4a7a3a',  // tree top
    deco2:     '#3a5a2a',  // tree trunk
    blog:      '#c4704c',
    project:   '#6b8e23',
    about:     '#8b6914',
    exit:      '#c4704c',
    char1:     '#8b6914',  // body
    char2:     '#f5e6d0',  // skin
    bg:        '#FAF6F1',
    label:     '#4A2F1A',
    labelBg:   'rgba(250,246,241,0.9)',
  },
  dark: {
    grass1:    '#1a1a2e',
    grass2:    '#16162a',
    path1:     '#2a2a40',
    path2:     '#242438',
    deco1:     '#3a1a5a',  // neon column top
    deco2:     '#2a1a3a',  // neon column base
    blog:      '#00d4ff',
    project:   '#ff00aa',
    about:     '#7c3aed',
    exit:      '#00ff88',
    char1:     '#00d4ff',  // body
    char2:     '#e0e0ff',  // skin
    bg:        '#050510',
    label:     '#e0e0ff',
    labelBg:   'rgba(10,10,20,0.9)',
  },
  light: {
    grass1:    '#c8e6c0',
    grass2:    '#b8d8b0',
    path1:     '#f0f0f0',
    path2:     '#e4e4e8',
    deco1:     '#88bbff',  // crystal
    deco2:     '#6699dd',  // crystal base
    blog:      '#0066cc',
    project:   '#4488cc',
    about:     '#6644aa',
    exit:      '#0066cc',
    char1:     '#4488cc',  // body
    char2:     '#f0f0ff',  // skin
    bg:        '#E0EEFF',
    label:     '#1d1d1f',
    labelBg:   'rgba(255,255,255,0.9)',
  },
};

/* ============================================
   Pixel Drawing Helpers
   ============================================ */

function createCanvas() {
  const c = document.createElement('canvas');
  c.width = TS;
  c.height = TS;
  return c;
}

function fill(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TS, TS);
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function canvasToTexture(canvas) {
  return PIXI.Texture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
}

/* ============================================
   Tile Textures
   ============================================ */

export function createTileTextures(palette) {
  const textures = {};

  // --- Grass ---
  const grassC = createCanvas();
  const grassCtx = grassC.getContext('2d');
  fill(grassCtx, palette.grass1);
  // Dithered noise pattern
  for (let y = 0; y < TS; y += 2) {
    for (let x = 0; x < TS; x += 2) {
      if ((x + y) % 4 === 0) px(grassCtx, x, y, 1, 1, palette.grass2);
    }
  }
  textures.grass = canvasToTexture(grassC);

  // --- Path ---
  const pathC = createCanvas();
  const pathCtx = pathC.getContext('2d');
  fill(pathCtx, palette.path1);
  // Subtle brick pattern
  for (let y = 0; y < TS; y += 4) {
    px(pathCtx, 0, y, TS, 1, palette.path2);
    const offset = (y % 8 === 0) ? 0 : 8;
    px(pathCtx, offset, y, 1, 4, palette.path2);
  }
  textures.path = canvasToTexture(pathC);

  // --- Deco (tree / neon pillar / crystal) ---
  const decoC = createCanvas();
  const decoCtx = decoC.getContext('2d');
  fill(decoCtx, palette.grass1); // grass background
  // Trunk/base
  px(decoCtx, 6, 10, 4, 6, palette.deco2);
  // Top/canopy
  px(decoCtx, 3, 2, 10, 9, palette.deco1);
  px(decoCtx, 5, 1, 6, 2, palette.deco1);
  // Highlight
  px(decoCtx, 5, 3, 3, 3, palette.deco2);
  textures.deco = canvasToTexture(decoC);

  // --- Content tile helper ---
  function contentTile(accentColor) {
    const c = createCanvas();
    const ctx = c.getContext('2d');
    fill(ctx, palette.path1);
    // Colored border (2px)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 14, 14);
    // Small icon dot in center
    px(ctx, 6, 6, 4, 4, accentColor);
    return canvasToTexture(c);
  }

  textures.blog = contentTile(palette.blog);
  textures.project = contentTile(palette.project);
  textures.about = contentTile(palette.about);

  // --- Exit tile ---
  const exitC = createCanvas();
  const exitCtx = exitC.getContext('2d');
  fill(exitCtx, palette.path1);
  // Arrow-down icon
  px(exitCtx, 7, 3, 2, 6, palette.exit);
  px(exitCtx, 5, 7, 6, 2, palette.exit);
  px(exitCtx, 6, 9, 4, 2, palette.exit);
  px(exitCtx, 7, 11, 2, 2, palette.exit);
  textures.exit = canvasToTexture(exitC);

  // --- Spawn tile (same as path, subtle marker) ---
  const spawnC = createCanvas();
  const spawnCtx = spawnC.getContext('2d');
  fill(spawnCtx, palette.path1);
  // Small diamond in center
  px(spawnCtx, 7, 5, 2, 1, palette.path2);
  px(spawnCtx, 6, 6, 4, 1, palette.path2);
  px(spawnCtx, 5, 7, 6, 2, palette.path2);
  px(spawnCtx, 6, 9, 4, 1, palette.path2);
  px(spawnCtx, 7, 10, 2, 1, palette.path2);
  textures.spawn = canvasToTexture(spawnC);

  return textures;
}

/* ============================================
   Character Sprite Frames
   ============================================ */

/**
 * Creates character walk-cycle textures.
 * Returns { down: [t1,t2], up: [t1,t2], left: [t1,t2], right: [t1,t2] }
 * Each frame is 16x16.
 */
export function createCharacterTextures(palette) {
  const body = palette.char1;
  const skin = palette.char2;
  const frames = {};

  // Direction configs: which pixels for each direction
  // We draw a simple 16x16 character:
  //   - Head: 4x4 at top-center
  //   - Body: 6x5 below head
  //   - Legs: 2x3 each, side by side

  function drawFrame(legOffset) {
    const c = createCanvas();
    const ctx = c.getContext('2d');

    // Head (skin color)
    px(ctx, 6, 2, 4, 4, skin);

    // Eyes (dark)
    px(ctx, 7, 3, 1, 1, '#222');
    px(ctx, 8, 3, 1, 1, '#222');

    // Body
    px(ctx, 5, 6, 6, 5, body);

    // Left leg
    px(ctx, 5, 11, 2, 3 + legOffset, body);
    // Right leg
    px(ctx, 9, 11, 2, 3 - legOffset, body);

    // Feet
    px(ctx, 5, 14 + legOffset, 2, 1, skin);
    px(ctx, 9, 14 - legOffset, 2, 1, skin);

    return canvasToTexture(c);
  }

  frames.down  = [drawFrame(0), drawFrame(1)];
  frames.up    = [drawFrame(0), drawFrame(-1)];
  frames.left  = [drawFrame(0), drawFrame(1)];
  frames.right = [drawFrame(0), drawFrame(-1)];

  return frames;
}

/* ============================================
   Tile Type to Texture Key Mapping
   ============================================ */

import { TILE } from './map.js';

export function tileTextureKey(tileType) {
  switch (tileType) {
    case TILE.GRASS:   return 'grass';
    case TILE.PATH:    return 'path';
    case TILE.DECO:    return 'deco';
    case TILE.BLOG:    return 'blog';
    case TILE.PROJECT: return 'project';
    case TILE.ABOUT:   return 'about';
    case TILE.EXIT:    return 'exit';
    case TILE.SPAWN:   return 'spawn';
    default:           return 'grass';
  }
}
```

**Step 2: Commit**

```bash
git add assets/js/explore/tiles.js
git commit -m "feat: add tiles.js with procedural pixel art and palettes"
```

---

### Task 4: Create game.js — Pixi app, input, animation, content panel

**Files:**
- Create: `assets/js/explore/game.js`

**Step 1: Write game.js**

Entry point. Sets up Pixi.js application, renders the grid, handles click/keyboard input, animates character walking, and manages the content panel.

```javascript
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
  html += `<div style="opacity:0.5;font-size:0.7rem;margin-top:4px;">Click to visit</div>`;
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
  app.ticker.add((delta) => {
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

  let gameStarted = false;

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
```

**Step 2: Commit**

```bash
git add assets/js/explore/game.js
git commit -m "feat: add game.js with Pixi app, click-to-move, and content panel"
```

---

### Task 5: Rewrite explore.html for Pixi.js

**Files:**
- Modify: `explore.html`

**Step 1: Rewrite explore.html**

Replace Three.js importmap with Pixi.js CDN script tag. Update text content. Remove pause menu (not needed for click-based game). Keep content panel, loading screen, start prompt, HUD, mobile notice.

```html
---
layout: null
permalink: /explore/
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Explore — {{ site.title }}</title>
  <meta name="description" content="Explore {{ site.title }} in a pixel art RPG world.">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

  <!-- Explore styles -->
  <link rel="stylesheet" href="{{ '/assets/css/explore.css' | relative_url }}">
</head>
<body>

  <!-- ============================================
       Jekyll Data Injection
       ============================================ -->
  <script>
    window.EXPLORE_DATA = {
      posts: [
        {% for post in site.posts %}
        {
          title: {{ post.title | jsonify }},
          url: {{ post.url | relative_url | jsonify }},
          date: {{ post.date | date: "%Y-%m-%d" | jsonify }},
          tags: {{ post.tags | jsonify }},
          category: {{ post.category | jsonify }},
          description: {{ post.description | jsonify }}
        }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      ],
      projects: [
        {% for project in site.projects %}
        {
          title: {{ project.title | jsonify }},
          url: {{ project.url | relative_url | jsonify }},
          description: {{ project.description | jsonify }},
          tags: {{ project.tags | jsonify }},
          featured: {{ project.featured | jsonify }}
        }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      ],
      about: {
        url: {{ "/about/" | relative_url | jsonify }}
      }
    };

    window.EXPLORE_THEME = localStorage.getItem('theme') || 'beige';
  </script>

  <!-- ============================================
       Pixi.js
       ============================================ -->
  <script src="https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.js"></script>

  <!-- ============================================
       Loading Screen
       ============================================ -->
  <div id="loading-screen" class="loading-screen">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading world...</p>
      <div class="loading-progress-track">
        <div id="loading-progress-bar" class="loading-progress-bar"></div>
      </div>
    </div>
  </div>

  <!-- ============================================
       Start Prompt
       ============================================ -->
  <div id="start-prompt" class="start-prompt hidden">
    <div class="start-prompt-box">
      <h1 class="start-prompt-title">Explore</h1>
      <p class="start-prompt-subtitle">Navigate the blog in a pixel art world</p>

      <div class="controls-hint">
        <div class="controls-hint-row">
          <span>Click a tile to move</span>
        </div>
        <div class="controls-hint-row">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
          <span>Move</span>
        </div>
        <div class="controls-hint-row">
          <kbd>E</kbd>
          <span>Interact</span>
        </div>
      </div>

      <button id="start-button" class="start-button">Click to Start</button>
      <a href="{{ '/' | relative_url }}" class="back-link">Back to blog</a>
    </div>
  </div>

  <!-- ============================================
       HUD Overlay
       ============================================ -->
  <div id="hud" class="hud hidden">
    <div id="hud-label" class="hud-label hidden"></div>
    <button id="hud-exit" class="hud-exit">Exit</button>
  </div>

  <!-- ============================================
       Mobile Notice
       ============================================ -->
  <div id="mobile-notice" class="mobile-notice hidden">
    <div class="mobile-notice-box">
      <h2>Desktop Only</h2>
      <p>The pixel art explore experience requires a larger screen. Please visit on a desktop browser.</p>
      <a href="{{ '/' | relative_url }}" class="mobile-notice-link">Back to blog</a>
    </div>
  </div>

  <!-- ============================================
       In-World Content Panel
       ============================================ -->
  <div id="content-panel" class="content-panel hidden">
    <div class="content-panel-header">
      <a id="content-panel-fullpage" class="content-panel-link" target="_blank" rel="noopener noreferrer">Open full page</a>
      <button id="content-panel-close" class="content-panel-close">&times;</button>
    </div>
    <iframe id="content-panel-iframe" class="content-panel-iframe"></iframe>
  </div>
  <div id="content-panel-backdrop" class="content-panel-backdrop hidden"></div>

  <!-- ============================================
       Application Entry
       ============================================ -->
  <script type="module" src="{{ '/assets/js/explore/game.js' | relative_url }}"></script>

</body>
</html>
```

**Step 2: Commit**

```bash
git add explore.html
git commit -m "feat: rewrite explore.html for Pixi.js grid game"
```

---

### Task 6: Update explore.css

**Files:**
- Modify: `assets/css/explore.css`

**Step 1: Update CSS**

Reposition the HUD label to bottom-center (instead of below crosshair). Remove crosshair styles. Adjust canvas styles.

Changes needed:
1. Remove `.hud-crosshair` and related styles (lines ~317-358)
2. Change `.hud-label` from `top: calc(50% + 28px)` to `bottom: 2rem`
3. Keep everything else as-is

**Step 2: Commit**

```bash
git add assets/css/explore.css
git commit -m "style: update explore.css for grid game HUD"
```

---

### Task 7: Final commit and push

**Step 1: Verify all files**

```bash
git status
git log --oneline -8
```

Expected files:
- Deleted: main.js, controls.js, ui.js, content-objects.js, model-loader.js, environments/*
- Created: game.js, tiles.js, map.js
- Modified: explore.html, explore.css

**Step 2: Push**

```bash
git push
```

**Step 3: Visual verification**

Visit the explore page after GitHub Pages builds. Check:
- Loading screen appears and fades
- Start prompt shows with pixel art world behind it
- Click "Start" hides prompt, shows HUD
- Click a tile → character walks smoothly tile-by-tile
- WASD moves one tile per press
- Walking onto a blog/project/about tile shows the HUD label
- Clicking the tile you're standing on (or pressing E) opens content panel
- Close button and Escape close the panel
- Exit tile navigates to /
- All three themes display different colors
