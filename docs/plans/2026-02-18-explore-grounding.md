# Explore Environment Grounding Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all floating objects and broken positioning across three 3D environments so every object sits on a surface, clouds world is walkable, and neon elements are attached to buildings.

**Architecture:** Five sequential tasks — one cross-cutting fix to main.js, then full rewrites of clouds.js and cyberpunk.js, then targeted fixes to cafe.js, then a final commit. All changes are edits to existing files. Floor convention: Y=0 for all environments. controls.js is unchanged (EYE_HEIGHT=1.7 assumes floor at Y=0).

**Tech Stack:** Three.js r170 (ES modules via importmap), Kenney CC0 GLB models, Octree+Capsule collision

---

### Task 1: Fix main.js spawn override

**Files:**
- Modify: `assets/js/explore/main.js:158-161`

**Step 1: Remove the hardcoded Y override**

In `main.js`, lines 158-161 currently read:

```javascript
  if (spawnPosition) {
    camera.position.copy(spawnPosition);
    camera.position.y = 1.7;
  }
```

Change to:

```javascript
  if (spawnPosition) {
    camera.position.copy(spawnPosition);
  }
```

This lets each environment control its own spawn height. Since all three environments already return `spawnPosition.y = 1.7` (floor at Y=0 + eye height 1.7), behaviour is identical today but now environments with different floor levels will work correctly.

**Step 2: Verify**

Open the explore page in browser. Confirm all three themes spawn correctly at standing height.

**Step 3: Commit**

```bash
git add assets/js/explore/main.js
git commit -m "fix: remove hardcoded spawn Y override in main.js"
```

---

### Task 2: Rewrite clouds.js — Fix all Y positions

**Files:**
- Modify: `assets/js/explore/environments/clouds.js` (full file rewrite)

**Key principle:** Walking surface at Y=0. Platform cylinder (0.4 thick) centered at Y=-0.2 so its top face is at Y=0. Cloud puffs hang below. All objects at Y=0 on the surface.

**Step 1: Fix `createCloudPlatform` — cylinder and puffs**

Line 64 — change cylinder top position:
```javascript
// OLD: top.position.set(center.x, center.y - 0.8, center.z);
top.position.set(center.x, center.y - 0.2, center.z);
```

Line 86-90 — change puff Y positions (hang further below):
```javascript
// OLD: center.y - 1.2 - Math.random() * 0.6,
center.y - 0.7 - Math.random() * 0.6,
```

Line 99-103 — change center puff cluster Y:
```javascript
// OLD: center.y - 1.0 - Math.random() * 0.4,
center.y - 0.5 - Math.random() * 0.4,
```

**Step 2: Fix `createLightBridge` — flat planks at surface level**

The bridge arc makes planks rise above Y=0, but `controls.js` locks camera.y to 1.7 (floor at 0). The player cannot walk up arcs. Solution: remove the arc and fix the Y offset.

Line 126 — change default arcHeight:
```javascript
// OLD: function createLightBridge(scene, from, to, arcHeight = 2) {
function createLightBridge(scene, from, to, arcHeight = 0) {
```

Line 167 — remove the -0.8 offset on plank Y:
```javascript
// OLD: plank.position.set(px, py - 0.8, pz);
plank.position.set(px, py, pz);
```

Lines 181, 186 — fix railing post Y (above the plank, not below):
```javascript
// OLD: leftPost.position.set(px + perpX, py - 0.5, pz + perpZ);
leftPost.position.set(px + perpX, py + 0.3, pz + perpZ);
// OLD: rightPost.position.set(px - perpX, py - 0.5, pz - perpZ);
rightPost.position.set(px - perpX, py + 0.3, pz - perpZ);
```

**Step 3: Fix `createEdgeBoundaries` — walls on surface**

Line 364 — remove the -0.6 offset:
```javascript
// OLD: wall.position.set(x, center.y - 0.6 + wallHeight * 0.5, z);
wall.position.set(x, center.y + wallHeight * 0.5, z);
```

**Step 4: Fix `bridgeArchPosition` — arches on surface**

Line 479 — remove the -0.6 offset:
```javascript
// OLD: platformCenter.y - 0.6,
platformCenter.y,
```

**Step 5: Fix crystal clusters — on surface**

Lines 521-522 — remove -0.6 offset:
```javascript
// OLD: p.center.y - 0.6,
p.center.y,
```

**Step 6: Fix benches — on surface**

Lines 539-540 (blog benches) — remove -0.6 offset:
```javascript
// OLD: platforms.blog.center.y - 0.6,
platforms.blog.center.y,
```

Lines 554-555 (project benches) — remove -0.6 offset:
```javascript
// OLD: platforms.projects.center.y - 0.6,
platforms.projects.center.y,
```

**Step 7: Fix crystal accent on main platform**

Line 619 — adjust height so crystal sits on surface:
```javascript
// OLD: crystal.position.set(0, 0.2, 0);
crystal.position.set(0, 0.75, 0);
```

**Step 8: Fix content slot Y positions**

Lines 698-701 (blog slots) — raise to waist height above surface:
```javascript
// OLD: blogCenter.y + 0.5,
blogCenter.y + 0.9,
```

Lines 713-715 (project slots):
```javascript
// OLD: projCenter.y + 0.5,
projCenter.y + 0.9,
```

**Step 9: Fix about pedestal**

Lines 729-734 — remove -0.6 offset:
```javascript
// OLD: platforms.about.center.y - 0.6,
platforms.about.center.y,
```

**Step 10: Fix Kenney plant models — on surface**

Lines 751-753 (potted plants on about platform) — remove -0.6 offset:
```javascript
// OLD: platforms.about.center.y - 0.6,
platforms.about.center.y,
```

Lines 772-774 (small plants on various platforms) — remove -0.6 offset:
```javascript
// OLD: platform.center.y - 0.6,
platform.center.y,
```

Lines 793-795 (bench cushions) — remove -0.6 offset:
```javascript
// OLD: platform.center.y - 0.6,
platform.center.y,
```

**Step 11: Fix bridge arc height calls**

Lines 459-463 — remove arcs (or leave as 0 since default changed):
```javascript
// OLD: createLightBridge(scene, platforms.main.center, platforms.blog.center, 2.5);
createLightBridge(scene, platforms.main.center, platforms.blog.center);
// OLD: createLightBridge(scene, platforms.main.center, platforms.projects.center, 2.0);
createLightBridge(scene, platforms.main.center, platforms.projects.center);
// OLD: createLightBridge(scene, platforms.main.center, platforms.about.center, 2.0);
createLightBridge(scene, platforms.main.center, platforms.about.center);
```

**Step 12: Fix sparkle particle Y ranges**

Line 815 — adjust near-platform sparkles:
```javascript
// OLD: p.center.y - 0.5 + Math.random() * 3.0;
p.center.y + Math.random() * 2.5;
```

Line 823 — adjust sky sparkles:
```javascript
// OLD: -2 + Math.random() * 12;
Math.random() * 12;
```

**Step 13: Verify**

- Open explore page with light theme
- Confirm player spawns standing on main platform
- Confirm walking to edge triggers boundary collision
- Walk across bridges to blog, projects, about platforms
- Confirm crystals, benches, plants are all sitting on surfaces
- Confirm decorative clouds float in sky above (OK to float)
- Confirm exit portal is reachable

**Step 14: Commit**

```bash
git add assets/js/explore/environments/clouds.js
git commit -m "fix: rewrite clouds.js Y coordinates — platforms at surface, bridges flat, all objects grounded"
```

---

### Task 3: Rewrite cyberpunk.js — Attach neon elements and declutter

**Files:**
- Modify: `assets/js/explore/environments/cyberpunk.js`

**Key principles:**
1. Neon tubes flush against building walls with bracket geometry
2. Neon bars pressed against building faces with brackets
3. Overhead wires have pole supports at endpoints
4. Declutter ground objects (fewer is better)
5. Vendor stalls flush against buildings

**Step 1: Fix neon tube positions — mount on building walls with brackets**

Replace lines 340-355 (neonLightConfigs and the forEach loop) with tubes positioned against building faces. X positions should be at the building face (left buildings at x≈-6.5, right at x≈6.5). Add a bracket box at each tube.

```javascript
  // Main neon lights — mounted on building walls with brackets
  const neonLightConfigs = [
    { pos: new THREE.Vector3(-6.4, 4, -8),  color: C.neonCyan,    intensity: 1.5, len: 1.8 },
    { pos: new THREE.Vector3(6.4, 4, -4),   color: C.neonMagenta, intensity: 1.5, len: 1.5 },
    { pos: new THREE.Vector3(-6.4, 4, 0),   color: C.neonPurple,  intensity: 1.2, len: 2.0 },
    { pos: new THREE.Vector3(6.4, 4, 4),    color: C.neonCyan,    intensity: 1.0, len: 1.5 },
    { pos: new THREE.Vector3(-6.4, 4, 8),   color: C.neonMagenta, intensity: 1.0, len: 1.8 },
    { pos: new THREE.Vector3(-6.4, 5, 14),  color: C.neonGreen,   intensity: 1.0, len: 1.2 },
    { pos: new THREE.Vector3(6.4, 5, 12),   color: C.neonPurple,  intensity: 1.0, len: 1.4 },
  ];

  const neonTubes = [];
  neonLightConfigs.forEach(({ pos, color, intensity, len }) => {
    const tube = createNeonTubeWithLight(scene, pos, color, intensity, len, 0.05);
    neonTubes.push(tube);

    // Wall bracket connecting tube to building face
    const bracketX = pos.x < 0 ? pos.x - 0.15 : pos.x + 0.15;
    const bracket = createBox(
      0.1, 0.1, 0.2, C.building,
      new THREE.Vector3(bracketX, pos.y, pos.z)
    );
    bracket.material.metalness = 0.6;
    bracket.material.roughness = 0.4;
    scene.add(bracket);
  });
```

Remove the floating tube at `(0, 6, -16)` — it's in the middle of the street with nothing to attach to.

**Step 2: Fix neon bars — flush against buildings with brackets**

Replace lines 470-484 with bars pressed against building faces:

```javascript
  // Decorative neon bars on building faces
  const neonBarConfigs = [
    { pos: new THREE.Vector3(-6.4, 6, -14),  color: C.neonCyan,    w: 3 },
    { pos: new THREE.Vector3(-6.4, 4, -6),   color: C.neonMagenta, w: 2.5 },
    { pos: new THREE.Vector3(6.4, 5, -12),   color: C.neonPurple,  w: 2 },
    { pos: new THREE.Vector3(6.4, 7, 0),     color: C.neonCyan,    w: 3.5 },
    { pos: new THREE.Vector3(-6.4, 8, 2),    color: C.neonMagenta, w: 2 },
    { pos: new THREE.Vector3(6.4, 3, 8),     color: C.neonGreen,   w: 2.5 },
    { pos: new THREE.Vector3(-6.4, 5, 10),   color: C.neonPurple,  w: 3 },
    { pos: new THREE.Vector3(6.4, 6, 16),    color: C.neonCyan,    w: 2 },
  ];

  neonBarConfigs.forEach(({ pos, color, w }) => {
    const bar = createEmissiveBox(w, 0.12, 0.12, color, color, 1.2, pos);
    scene.add(bar);

    // Bracket at each end of the bar
    const halfW = w / 2 - 0.1;
    const bracketX = pos.x < 0 ? pos.x - 0.1 : pos.x + 0.1;
    for (const offset of [-halfW, halfW]) {
      const bracket = createBox(
        0.08, 0.15, 0.15, C.building,
        new THREE.Vector3(bracketX, pos.y, pos.z + offset)
      );
      bracket.material.metalness = 0.6;
      scene.add(bracket);
    }
  });
```

**Step 3: Fix overhead wires — add pole supports at endpoints**

After the existing `createOverheadWire` calls, add pole geometry. Replace lines 549-561:

```javascript
  // --- Overhead wires with pole supports ---
  const wireConfigs = [
    { start: new THREE.Vector3(-6.5, 8,  -18), end: new THREE.Vector3(6.5, 7.5, -18) },
    { start: new THREE.Vector3(-6.5, 9,  -10), end: new THREE.Vector3(6.5, 8,   -10) },
    { start: new THREE.Vector3(-6.5, 7,  -2),  end: new THREE.Vector3(6.5, 7.5, -2) },
    { start: new THREE.Vector3(-6.5, 10, 4),   end: new THREE.Vector3(6.5, 9,   4) },
    { start: new THREE.Vector3(-6.5, 8,  10),  end: new THREE.Vector3(6.5, 8.5, 10) },
    { start: new THREE.Vector3(-6.5, 7,  16),  end: new THREE.Vector3(6.5, 7,   16) },
  ];

  wireConfigs.forEach(({ start, end }) => {
    createOverheadWire(scene, start, end);

    // Pole at each endpoint — sits on building rooftop
    [start, end].forEach((point) => {
      // Find the building at this point to get its height
      const side = point.x < 0 ? leftBuildings : rightBuildings;
      const building = side.find(b => Math.abs(b.z - point.z) < 3);
      const roofY = building ? building.h : point.y;
      const poleHeight = point.y - roofY + 1.5;

      if (poleHeight > 0.1) {
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, poleHeight, 6);
        const poleMat = new THREE.MeshStandardMaterial({
          color: C.wire,
          roughness: 0.7,
          metalness: 0.5,
        });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(point.x, roofY + poleHeight / 2, point.z);
        scene.add(pole);
      }
    });
  });
```

**Step 4: Declutter ground objects**

Reduce crates from 8 to 4 (lines 487-504):
```javascript
  const cratePositions = [
    { x: -6.2, z: -17, size: 0.6 },
    { x: 6.2,  z: -14, size: 0.55 },
    { x: -6.0, z: 3,   size: 0.7 },
    { x: 6.0,  z: 10,  size: 0.5 },
  ];
```

Reduce barriers from 4 to 2 (lines 507-519):
```javascript
  const barrierConfigs = [
    { x: -3, z: -10, rot: 0.3 },
    { x: 3,  z: 5,   rot: -0.2 },
  ];
```

Reduce trashcan placements from 6 to 4 (lines 578-596):
```javascript
    const trashcanPlacements = [
      { x: -6.3, z: -19, scale: 1.2 },
      { x: 6.3,  z: -11, scale: 1.0 },
      { x: -6.1, z: -1,  scale: 1.1 },
      { x: 6.1,  z: 7,   scale: 1.3 },
    ];
```

Reduce closed cardboard boxes from 4 to 2 (lines 601-615):
```javascript
    const closedBoxPlacements = [
      { x: -6.0, z: -15, scale: 1.0 },
      { x: 6.0,  z: -5,  scale: 1.2 },
    ];
```

Reduce open cardboard boxes from 3 to 2 (lines 618-631):
```javascript
    const openBoxPlacements = [
      { x: -5.9, z: -14.5, scale: 1.0 },
      { x: 5.9,  z: -4.5,  scale: 1.3 },
    ];
```

Reduce computer screens from 4 to 3 (lines 635-649):
```javascript
    const screenPlacements = [
      { x: -4.5, z: -4.7, y: 1.1, scale: 1.2, rotY: 0 },
      { x: 4.5,  z: 2.3,  y: 1.1, scale: 1.0, rotY: Math.PI },
      { x: -4.0, z: 9.3,  y: 1.1, scale: 1.1, rotY: 0 },
    ];
```

**Step 5: Verify**

- Open explore page with dark theme
- Confirm neon tubes are flush against building walls with visible brackets
- Confirm neon bars have bracket geometry connecting to building faces
- Confirm overhead wires have pole supports at endpoints
- Confirm reduced ground clutter — fewer but cleaner objects
- Confirm all ground objects at y=0
- Confirm walking works normally with collision

**Step 6: Commit**

```bash
git add assets/js/explore/environments/cyberpunk.js
git commit -m "fix: attach neon to buildings with brackets, add wire poles, declutter ground objects"
```

---

### Task 4: Fix cafe.js — Wall lamp brackets and book heights

**Files:**
- Modify: `assets/js/explore/environments/cafe.js:429-432` (wall lamps)
- Modify: `assets/js/explore/environments/cafe.js:240-248` (books)

**Step 1: Add wall bracket boxes behind each wall lamp**

Replace lines 429-432 with lamp placement + bracket box behind each:

```javascript
  // --- Wall lamps with mounting brackets ---
  const wallLampPlacements = [
    { pos: new THREE.Vector3(-11.7, 2.8, -6), rotY: Math.PI / 2 },
    { pos: new THREE.Vector3(11.7, 2.8, -6), rotY: -Math.PI / 2 },
    { pos: new THREE.Vector3(-11.7, 2.8, 6), rotY: Math.PI / 2 },
  ];

  wallLampPlacements.forEach(({ pos, rotY }) => {
    placeModel(scene, models.lampWall, pos, rotY, 2.0);

    // Mounting bracket (small box touching the wall behind the lamp)
    const bracketX = pos.x < 0 ? pos.x - 0.15 : pos.x + 0.15;
    const bracket = createBox(
      0.1, 0.1, 0.1, C.woodDark,
      new THREE.Vector3(bracketX, pos.y, pos.z)
    );
    scene.add(bracket);
  });
```

**Step 2: Fix book heights to match shelf surfaces**

The bookcases are scaled 2.0x. The three shelf surface heights for books should be approximately:
- Bottom shelf: y ≈ 0.6 (scaled)
- Middle shelf: y ≈ 1.6 (scaled)
- Top shelf: y ≈ 2.6 (scaled)

Books placed on shelves should sit on these surfaces. Replace lines 240-248:

```javascript
  const bookPositions = [
    { pos: new THREE.Vector3(-8, 0.6, -10.5), rotY: 0.3, scale: 1.8 },
    { pos: new THREE.Vector3(-4, 1.6, -10.6), rotY: -0.5, scale: 1.6 },
    { pos: new THREE.Vector3(0, 0.6, -10.4), rotY: 0.8, scale: 2.0 },
    { pos: new THREE.Vector3(4, 2.6, -10.5), rotY: -0.2, scale: 1.7 },
    { pos: new THREE.Vector3(8, 1.6, -10.6), rotY: 1.1, scale: 1.5 },
    { pos: new THREE.Vector3(-6, 0, -10.0), rotY: 0.6, scale: 2.0 },
    { pos: new THREE.Vector3(2, 0, -10.2), rotY: -0.9, scale: 1.8 },
  ];
```

The last two books are on the floor which is fine.

**Step 3: Verify**

- Open explore page with beige theme
- Confirm wall lamps have visible brackets connecting to walls
- Confirm books sit on shelf surfaces (not floating between shelves)
- Confirm all floor lamps at y=0
- Confirm all furniture at y=0
- Confirm no other floating objects

**Step 4: Commit**

```bash
git add assets/js/explore/environments/cafe.js
git commit -m "fix: add wall lamp brackets, align book heights to shelf surfaces"
```

---

### Task 5: Final push

**Step 1: Verify all three environments**

- Light theme (clouds): platforms walkable, bridges work, objects grounded
- Dark theme (cyberpunk): neon attached, decluttered, collision works
- Beige theme (cafe): lamps bracketed, books on shelves, cozy and clean

**Step 2: Push**

```bash
git push origin main
```
