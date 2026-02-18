# Isometric Open Plaza — Redesign

## Problem
The current isometric environments are unplayable: enclosed rooms block the camera view, collision boxes are too dense (1 collider per 8-22 sq units), and the character spawns surrounded by obstacles in all three themes.

## Solution
Rebuild all three environments as **open outdoor plazas** on a 20x20 ground plane. Replace the Octree/Capsule collision system with a simple rectangular bounds clamp + optional circular obstacles for large objects only. Keep the isometric camera, character controls, and UI system unchanged.

## Design Decisions

### Collision: Simple Bounds + Circles
- Remove Octree and Capsule imports entirely
- Environment returns `bounds: { minX, maxX, minZ, maxZ }` (or `{ center, radius }` for circular)
- Environment optionally returns `obstacles: [{ x, z, radius }]` for large objects
- Controls clamp position to bounds, push out of circle obstacles
- Decorative objects are walk-through (no collision)

### Environment Rules
- 20x20 ground plane, spawn at (0, 0, 0)
- Open sky, no roofs, no walls blocking camera
- Sparse decoration: 5-10 small objects max
- Only large structures get collision (radius ~0.5-1.0)
- Content zones spread evenly across the space
- GLB models for accents, primitives for main structures

### Cafe (beige)
Open outdoor patio with warm stone ground, small tables/chairs (walk-through), potted plants, a counter at one edge. Warm lighting.

### Cyberpunk (dark)
Open neon-lit plaza with wet asphalt, 2-3 neon pillars (collision), holographic signs, neon ground strips, rain. Low ambient + colored neon point lights.

### Clouds (light)
Single floating island (radius 10), crystals (walk-through), sparkle particles, soft glow. Circular boundary.

## Files Changed
- `controls.js` — Remove Octree/Capsule, add setBounds/setObstacles
- `main.js` — Remove Octree construction, use new collision API
- `cafe.js` — Full rewrite as open patio
- `cyberpunk.js` — Full rewrite as open plaza
- `clouds.js` — Full rewrite as single island
