/**
 * tiles.js — Procedural pixel art tile/character sprites and theme palettes
 *
 * All sprites are generated on canvas at runtime. No external images.
 * Tile size is 16x16 pixels (rendered scaled up by Pixi).
 * Character is 16x16 with 2 walk frames per direction.
 */

import { TILE } from './map.js';

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
