# Isometric Explore Diorama — Design Document

**Date:** 2026-02-18
**Status:** Approved

## Summary

Replace the first-person 3D explore experience with an isometric diorama. The user controls a small character that walks around a compact themed world, discovering blog posts, projects, and about content by walking near objects and pressing E. Inspired by Bruno Simon's navigable portfolio concept, but in isometric 2D.

## Guiding Principle

**Cozy miniature world.** Everything fits in one scene per theme. No loading transitions, no getting lost. A polished tabletop diorama you explore with a tiny character.

## 1. Camera & Rendering

### Orthographic Camera
- True isometric angle: 45 degrees Y rotation, ~35.264 degrees X tilt
- Fixed — no rotation, no zoom
- Frustum sized to show ~20-25 units of world width
- Smooth lerp-based follow: camera pans gently to keep character centered

### Renderer
- Three.js WebGLRenderer (same as current)
- Shadows enabled, ACES filmic tone mapping
- No pointer lock — canvas sits in page normally
- User clicks canvas to focus, WASD to move

## 2. Character

### Visual
- Small capsule (cylinder body + sphere top), ~0.5 units tall
- Theme-appropriate color
- Casts shadow
- Rotates to face movement direction

### Controls
- WASD / Arrow keys for isometric-aligned movement
- W = up-right on screen (NW in world), S = down-left, A = left-up, D = right-down
- Smooth acceleration/deceleration, ~4 units/sec
- No mouse look, no pointer lock
- Collision: Octree+Capsule but Y-axis locked at ground level

## 3. Themed Dioramas (~25x25 units each)

### Cafe (Beige Theme)
- Cozy room: back two walls visible, front two removed for camera visibility
- Wood floor, warm lighting
- Bookshelves along back wall (blog posts)
- Tables with chairs in middle (projects)
- Lounge corner with sofa (about)
- Decorative: floor lamps, plants, rugs, coffee counter with steam, coat rack
- Reuses all 26 cafe Kenney models

### Cyberpunk (Dark Theme)
- Tight neon alley: buildings on both sides (3-4 stories, iso-friendly)
- Street down center for character movement
- Neon billboards on walls (blog posts)
- Vendor stalls / storefronts at street level (projects)
- Info kiosk at end (about)
- Decorative: neon strips, puddles, rain particles, crates, trashcans
- Reuses all 4 cyberpunk Kenney models

### Clouds (Light Theme)
- Cluster of connected platforms (tighter spacing for iso view)
- Main platform (spawn + exit), blog platform, projects platform, about platform
- Short flat bridges connecting them
- Decorative: cloud puffs, sparkles, orbiting crystals, sky background
- Reuses all 3 clouds Kenney models

## 4. Content Interaction

### Proximity Detection
- When character is within ~2 units of a content object, floating tooltip appears (title)
- "Press E" prompt below the tooltip

### Content Panel
- Press E/Enter → DOM overlay slides in from right
- Shows: title, description/excerpt, tags, "Read more" link
- Press Escape or click outside to close

### Exit
- Walk to EXIT portal object, or press Escape when no panel is open → returns to main site

### Content Data
- Same `window.EXPLORE_DATA` injection from Jekyll (posts, projects, about)
- Same `content-objects.js` creates themed meshes

## 5. File Changes

### Rewritten
| File | Change |
|------|--------|
| `main.js` | Orthographic camera setup, no pointer lock, canvas focus, isometric animation loop |
| `controls.js` | Full rewrite: WASD iso movement, character mesh, proximity detection, E-to-interact |
| `environments/cafe.js` | Rebuild as compact isometric diorama (remove front walls, adjust layout) |
| `environments/cyberpunk.js` | Rebuild as isometric alley (shorter buildings, tighter layout) |
| `environments/clouds.js` | Rebuild as tight platform cluster |
| `ui.js` | Simplify: remove crosshair/raycasting, add proximity interaction, remove pointer lock management |

### Unchanged
| File | Why |
|------|-----|
| `explore.html` | Same page, data injection, importmap |
| `model-loader.js` | Still loads GLBs the same way |
| `content-objects.js` | Same themed content meshes (may need minor position adjustments) |
| `environments/shared.js` | Same geometry factories, text sprites, exit portal |
| All `.glb` models | Reused directly |

### No New Dependencies
Still just Three.js v0.170.0 via importmap.

## 6. Key Differences from Current 3D Experience

| Aspect | Current (FPS) | New (Isometric) |
|--------|---------------|-----------------|
| Camera | Perspective, first-person | Orthographic, fixed isometric angle |
| Movement | WASD + mouse look | WASD only, iso-aligned |
| Interaction | Crosshair raycasting + click | Proximity + press E |
| Pointer lock | Required | Not used |
| Character | Invisible (you ARE the camera) | Visible capsule avatar |
| View | See what's in front of you | See entire diorama |
| Mobile | Blocked (needs mouse) | Could support touch in future |
