# Explore Portal Overhaul — Design Document

**Date:** 2026-02-17
**Status:** Approved

## Summary

Overhaul the 3D Explore environments to feel full and polished: replace primitive geometry with low-poly Kenney GLTF models, add ground-level clutter and props, and implement wall+furniture collision detection using Three.js Octree+Capsule.

## 1. Asset Strategy

### Source: Kenney.nl (CC0 Public Domain)
- **Furniture Kit** — 116 models (chairs, tables, bookshelves, lamps, sofas, plants, coffee machines, rugs)
- **Food Kit** — select coffee-related items if needed
- Format: GLB, ~5-50KB per model
- License: CC0 (no attribution required)

### File Structure
```
assets/models/
  cafe/        ~15 models (~200-400KB)
  cyberpunk/   ~3-5 models (~50-150KB)
  clouds/      ~3-5 models (~50-100KB)
```

### Model Loader
New file: `assets/js/explore/model-loader.js`
- Wraps Three.js GLTFLoader (from `three/addons/`)
- Returns promise-based API for async loading
- Shared across all environment builders
- Environment builders become async functions

## 2. Collision System

### Technology: Three.js Octree + Capsule
- Both available via existing importmap: `three/addons/math/Octree.js`, `three/addons/math/Capsule.js`
- No external dependencies

### Player Collider
- Capsule: radius 0.35m, bottom Y=0.35, top Y=1.7
- Smooth wall-sliding via Octree normal pushback

### Collidable vs Non-Collidable
| Collidable | Non-Collidable |
|---|---|
| Walls | Small decorations (plants, cups) |
| Large furniture (tables, bookshelves, counters) | Particles (rain, steam, sparkles) |
| Buildings | Content objects (books, billboards, scrolls) |
| Platforms + bridge planks | Zone labels/sprites |
| Invisible boundary walls | |

### Integration
- Each environment builder returns a `colliderGroup` (THREE.Group) containing all solid geometry
- `main.js` builds Octree from colliderGroup after scene loads
- `controls.js` update loop: move capsule → check Octree → push out of collisions → sync camera position
- Invisible boundary meshes at world edges prevent walking into void

## 3. Cafe Environment (beige) — Overhaul

### Replace Primitives with Kenney Models
| Current | Replacement |
|---|---|
| 5 primitive bookshelves (box frames) | `bookcase-open.glb` + `books.glb` on shelves |
| 5 display tables (box + cylinder legs) | `table-cross.glb` + `chair-cushion.glb` pairs |
| Armchair (boxes) | `lounge-chair.glb` + `lounge-sofa.glb` |
| 4 tiny lamp cubes (0.15m emissive boxes) | `lamp-round-floor.glb` (proper floor lamps) |
| Coffee counter (boxes) | Keep procedural + add `kitchen-coffee-machine.glb` |

### New Objects to Fill Space
- 3 additional seating groups (table + 2 chairs) in open floor area
- 3 `stool-bar-square.glb` at coffee counter
- 4-5 `potted-plant.glb` in corners and edges
- `rug-rectangle.glb` under reading nook and central area
- `coffee-table.glb` near lounge area
- Procedural wall art (framed rectangles on walls)
- `side-table.glb` next to lounge seating

### What Stays
- Room dimensions (24x24), walls, floor, ceiling
- Coffee counter shape and position
- Steam particles, dust motes
- Exit portal, zone labels
- Content slot positions

## 4. Cyberpunk Environment (dark) — Overhaul

### Procedural Enhancements (primary approach)
- **Double building count** from 10 to ~20, tighten street width
- **Ground-level props**: procedural crates, dumpsters, street barriers (emissive-trimmed boxes)
- **Neon vendor stalls**: small procedural structures along the street with emissive surfaces
- **More neon signage**: additional emissive text planes on building faces
- **Street puddles**: small reflective plane geometry (high metalness, low roughness)
- **Overhead wires**: thin cylinder geometry connecting buildings across the street
- **Visible light sources**: emissive cylinder tubes where PointLights exist (replace invisible lights)

### Kenney Model Accents
- `trashcan.glb` scattered at building bases (~4-6)
- `cardboard-box-closed.glb` in clusters near alleys (~3-5)
- `computer-screen.glb` in vendor stalls or on crates

### What Stays
- Building generation logic (enhanced, not replaced)
- Rain + data bit particles
- Neon strip ground lines
- About kiosk terminal
- Exit portal, zone labels
- Content slot positions

## 5. Clouds Environment (light) — Overhaul

### Platform Surface Detail
- Scattered procedural crystals (varying sizes) on each platform surface
- Procedural benches (box geometry) on blog + project platforms
- Decorative arches/pillar pairs at bridge entry points (cylinder geometry)
- Small floating book/scroll decorations orbiting near blog platform

### Kenney Model Accents
- `potted-plant.glb` clusters on about platform (~3)
- `plant-small.glb` on project platform edges (~4)

### Particle Enhancements
- Concentrate more sparkle particles near platform surfaces
- Add faint particle trail on bridge paths

### What Stays
- Platform layout and dimensions
- Bridge structures
- Main crystal centerpiece
- Cloud puff generation
- Exit portal, zone labels
- Content slot positions

## 6. Technical Changes

### New Files
- `assets/js/explore/model-loader.js` — GLTFLoader wrapper
- `assets/models/cafe/*.glb` — Kenney furniture models
- `assets/models/cyberpunk/*.glb` — Kenney accent models
- `assets/models/clouds/*.glb` — Kenney accent models

### Modified Files
- `controls.js` — Add Capsule + Octree collision to update loop
- `main.js` — Await async builders, build Octree, pass colliderGroup
- `cafe.js` — Replace primitives with GLTF models, return colliderGroup
- `cyberpunk.js` — Add density (buildings, ground props, wires), return colliderGroup
- `clouds.js` — Add platform props, return colliderGroup
- `shared.js` — Possibly add new helpers for common prop patterns

### Loading Strategy
- Models load during the "building environment" phase (setProgress 40→70)
- Loading is async but all models for one environment load in parallel (Promise.all)
- Progress bar reflects model loading progress
- Fallback: if a model fails to load, skip it gracefully (scene still works)

## What Stays the Same
- File structure and module organization
- Content objects system (content-objects.js unchanged)
- UI system (ui.js unchanged)
- Controls API (public interface unchanged)
- Theme system, loading screen, pause menu
- explore.html and explore.css
