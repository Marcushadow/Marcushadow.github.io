# Grid-Based Pixel Art Explore — Design

## Problem
The 3D isometric explore experience has bad graphics (Three.js primitive shapes look ugly) and broken collision. The user wants a fundamentally different approach.

## Solution
Replace the entire 3D explore system with a **2D grid-based pixel art RPG** using Pixi.js. Top-down tile map (~12x10), click-to-move with smooth tile-by-tile walking, BFS pathfinding. Each content item (blog post, project, about) occupies one tile. One map layout, three color palettes for themes.

## Design Decisions

### Tech Stack
- **Pixi.js v8** via CDN (replaces Three.js)
- ES modules, no build tools
- Procedural pixel art (no external sprite sheets)

### Grid Map
- ~12x10 tile grid, fixed camera (no scrolling)
- Tile size: 48x48 pixels, rendered at 2x scale (96px)
- Tile types: grass, path, blog, project, about, deco (obstacle), exit
- Content tiles assigned dynamically from `window.EXPLORE_DATA`

### Character & Movement
- Procedural 16x16 pixel character sprite with 4-direction walk frames
- Click any walkable tile → BFS shortest path → smooth walk ~200ms/tile
- WASD/Arrow keys also move one tile per press
- On arrival at content tile → content panel slides in (iframe overlay, same as current)

### Theming
One map, three palettes (beige/dark/light). Theme read from localStorage. Changes tile colors, character colors, background. All tiles drawn procedurally on canvas.

### Architecture
- **Delete**: main.js, controls.js, ui.js, content-objects.js, all environment files, shared.js, model-loader.js
- **Create**: game.js (entry point, Pixi app, input, animation), tiles.js (tile sprites, palettes), map.js (grid layout, BFS, content assignment)
- **Rewrite**: explore.html (Pixi.js CDN instead of Three.js importmap)
- **Keep**: explore.css (modified), content panel HTML, GLB models on disk (unused)
