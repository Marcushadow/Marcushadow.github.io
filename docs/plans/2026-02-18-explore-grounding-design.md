# Explore Environment Grounding Fix — Design Document

**Date:** 2026-02-18
**Status:** Approved

## Problem

All three 3D environments have objects floating in the air. The clouds world is fundamentally broken (platforms underground, player spawns mid-air). The cyberpunk world has neon tubes, bars, and wires floating without support. The cafe has minor floating issues (wall lamps, books).

## Guiding Principle

**Every object sits on a surface.** Fewer objects placed well beats many objects placed badly. "Cozy and grounded" — furniture has weight, lights have fixtures, nothing floats unless it's explicitly a sky decoration.

## 1. Cross-Cutting Fix: main.js + controls.js

### main.js
- Remove `camera.position.y = 1.7` override on line 160
- Respect the full spawn position from the environment (each builder accounts for eye height)

### controls.js
- Keep `EYE_HEIGHT = 1.7`
- `syncCameraFromCapsule` preserves capsule-resolved Y rather than forcing a constant — this lets environments with non-zero floor levels work correctly

## 2. Clouds Environment (light theme) — Full Rewrite

### Root Cause
Platform top surfaces placed at `center.y - 0.8` = `-0.8` while player spawns at `1.7`. Everything is 0.8-2.5 units too high or too low.

### Coordinate Convention
- Platform centers at `y: 0`
- Platform cylinder: 0.4 thick, positioned so top surface is at `y: 0.2`
- Cloud puffs hang below: `y: -0.5` to `y: -1.5`
- Walking surface: `y: 0.2`
- Spawn: `(0, 1.9, 0)` — surface `0.2` + eye `1.7`

### Object Placement (all grounded on surface `y: 0.2`)
| Object | Count | Y Position | Notes |
|--------|-------|------------|-------|
| Crystal clusters | 3-5 per platform | 0.2 (surface) | Sitting on platform |
| Benches | 2-3 on blog+projects | 0.2 (surface) | Legs on surface |
| Arch pillars | 6 at bridge entries | 0.2 (surface) | Standing on surface |
| Kenney potted plants | 3 on about | 0.2 (surface) | On surface |
| Kenney small plants | 4 spread across | 0.2 (surface) | On surface |
| Main crystal | 1 on spawn | 0.8 | Sitting on surface, pointing up |
| Orbiting crystals | 4 near blog | 1.2-2.2 | Decorative flying objects (OK to float) |
| Content slots | Per platform | 0.9 | Waist height above surface |
| Exit portal | 1 on spawn | 1.4 | Eye level on surface |
| Sparkle particles | 350 | 0.2-2.2 concentrated near surfaces | |
| Decorative clouds | 20 | 5-15 | Sky decoration (OK to float) |

### Bridge Fix
- Both endpoints at surface `y: 0.2`
- Arc height reduced from 2.0-2.5 to 1.0 (gentle arc, not roller coaster)
- Planks positioned at arc point directly (remove the `- 0.8` offset)
- Railing posts standing on planks

### Collision Fix
- Platform collider cylinders at same position as visual cylinders
- Edge boundaries: invisible walls `y: 0.2` to `y: 1.2`
- Bridge plank colliders match visual plank positions

## 3. Cyberpunk Environment (dark theme) — Full Rewrite

### Principle: Everything Attached to Something

#### Neon Tubes
- Mount flush against building walls instead of floating at `y: 4-6`
- Add bracket mesh (0.2x0.1x0.1 box) connecting tube to building face
- Position at `y: 3-5` on the building surface

#### Neon Bars
- Press against building faces, not floating mid-air
- Same bracket treatment as tubes

#### Overhead Wires
- Add small pole geometry (cylinder 0.08 wide, 1.5 tall) at each endpoint
- Poles sit on building rooftops so wires connect between visible supports

#### Declutter Ground Level
| Object | Before | After |
|--------|--------|-------|
| Crates | 8 | 4 |
| Barriers | 4 | 2 |
| Dumpsters | 2 | 2 |
| Vendor stalls | 4 | 4 (flush with buildings) |
| Trashcans | 6 | 4 |
| Cardboard boxes | 7 | 4 |
| Computer screens | 4 | 3 |

All ground objects at `y: 0`.

#### Vendor Stalls
- Back walls flush with building faces, not floating mid-street
- Counter, roof, and trim all connected to the back wall

#### Content Slots
- Blog billboards on building faces
- Project storefronts at street level
- About kiosk grounded at `y: 0`

#### Keep As-Is
- 20 buildings (10 per side) — density is good
- Rain particles, data bits, puddles
- Ground neon strips
- Building window lights

## 4. Cafe Environment (beige theme) — Targeted Fixes

### Wall Lamps
- Add bracket box (0.1x0.1x0.1) behind each lamp touching the wall surface
- Lamps appear mounted to walls, not floating

### Books
- Recalculate Y positions to match bookshelf shelf surface heights
- 3 shelf levels at approximately 0.6, 1.3, 2.0 (based on bookcase model scaled 2.0x)
- Books sit flat on shelf surfaces

### Verification Pass
- All 4 floor lamps at `y: 0`
- All table/chair models at `y: 0`
- Content slot heights match furniture surface heights
- No other floating objects

## 5. Technical Changes

### Modified Files
- `main.js` — Remove spawn Y override
- `controls.js` — Adjust syncCameraFromCapsule for variable floor levels
- `clouds.js` — Full rewrite with correct coordinate system
- `cyberpunk.js` — Full rewrite with support structures
- `cafe.js` — Targeted fixes (brackets, book heights)

### No New Files
All changes are edits to existing files. No new models, no new dependencies.

### Testing
- Each environment: verify spawn position lands on surface
- Walk around and confirm no objects float above surfaces
- Confirm collision works (can't walk through walls/furniture)
- Confirm bridges are walkable in clouds world
- Confirm content objects are at reachable heights
