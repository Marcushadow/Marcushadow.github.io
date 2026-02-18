/**
 * cafe.js — Cozy cafe interior environment (beige theme)
 *
 * Builds an indoor cafe scene using Kenney GLB models for furniture,
 * with procedural walls/floor/ceiling for collision. Returns a
 * colliderGroup containing walls and invisible box colliders for
 * large furniture pieces.
 *
 * Designed for isometric camera view — camera looks from (+X, +Y, +Z)
 * toward the origin. The +X (right) and +Z (back) walls are removed
 * so the interior is visible. Room is 20x20.
 */

import * as THREE from 'three';
import {
  LAYOUT,
  createBox,
  createPlane,
  createCylinder,
  createTextSprite,
  createParticles,
  createExitPortal,
} from './shared.js';
import { loadModels, cloneModel } from '../model-loader.js';

/* ============================================
   Palette
   ============================================ */

const C = {
  floor:    0x8B6914,
  wall:     0xF5E6D8,
  ceiling:  0xFAF0E6,
  wood:     0x6B4226,
  woodDark: 0x4A2F1A,
  shelf:    0x5C3A1E,
  accent:   0xC4704C,
  cream:    0xFAF6F1,
};

/* ============================================
   Helper: invisible box collider
   ============================================ */

/**
 * Creates an invisible box mesh for collision detection.
 * Added to both the scene and the collider group.
 */
function createColliderBox(w, h, d, position) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({ visible: false });
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.copy(position);
  return mesh;
}

/**
 * Places a GLTF model clone in the scene at the given position,
 * rotation, and scale. Returns the placed mesh group, or null
 * if the source model failed to load.
 */
function placeModel(scene, model, position, rotationY, scale) {
  if (!model) return null;
  const instance = cloneModel(model);
  instance.position.copy(position);
  if (rotationY !== undefined) instance.rotation.y = rotationY;
  const s = scale || 1;
  instance.scale.set(s, s, s);
  scene.add(instance);
  return instance;
}

/* ============================================
   Builder
   ============================================ */

/**
 * @param {THREE.Scene} scene
 * @returns {Promise<{ spawnPosition: THREE.Vector3, animationCallbacks: Function[], contentSlots: Object, colliderGroup: THREE.Group }>}
 */
export async function buildCafe(scene) {
  const animationCallbacks = [];
  const colliderGroup = new THREE.Group();
  colliderGroup.name = 'cafeColliders';

  // --- Load all Kenney models ---
  const manifest = {
    bookcaseOpen:       '/assets/models/cafe/bookcaseOpen.glb',
    bookcaseClosed:     '/assets/models/cafe/bookcaseClosed.glb',
    bookcaseClosedWide: '/assets/models/cafe/bookcaseClosedWide.glb',
    books:              '/assets/models/cafe/books.glb',
    tableCross:         '/assets/models/cafe/tableCross.glb',
    tableRound:         '/assets/models/cafe/tableRound.glb',
    tableCoffeeSquare:  '/assets/models/cafe/tableCoffeeSquare.glb',
    tableCoffee:        '/assets/models/cafe/tableCoffee.glb',
    chairCushion:       '/assets/models/cafe/chairCushion.glb',
    chairRounded:       '/assets/models/cafe/chairRounded.glb',
    stoolBarSquare:     '/assets/models/cafe/stoolBarSquare.glb',
    loungeChair:        '/assets/models/cafe/loungeChair.glb',
    loungeSofa:         '/assets/models/cafe/loungeSofa.glb',
    loungeSofaOttoman:  '/assets/models/cafe/loungeSofaOttoman.glb',
    lampRoundFloor:     '/assets/models/cafe/lampRoundFloor.glb',
    lampRoundTable:     '/assets/models/cafe/lampRoundTable.glb',
    lampWall:           '/assets/models/cafe/lampWall.glb',
    pottedPlant:        '/assets/models/cafe/pottedPlant.glb',
    plantSmall1:        '/assets/models/cafe/plantSmall1.glb',
    plantSmall2:        '/assets/models/cafe/plantSmall2.glb',
    rugRectangle:       '/assets/models/cafe/rugRectangle.glb',
    rugRound:           '/assets/models/cafe/rugRound.glb',
    kitchenCoffeeMachine: '/assets/models/cafe/kitchenCoffeeMachine.glb',
    sideTable:          '/assets/models/cafe/sideTable.glb',
    coatRackStanding:   '/assets/models/cafe/coatRackStanding.glb',
    benchCushion:       '/assets/models/cafe/benchCushion.glb',
  };

  const models = await loadModels(manifest);

  // --- Fog & background ---
  scene.fog = new THREE.Fog(0xFAF6F1, 15, 35);
  scene.background = new THREE.Color(0xFAF6F1);

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xFFF5E6, 0.6);
  scene.add(ambient);

  const overhead = new THREE.PointLight(0xFFE4C4, 1.2, 30);
  overhead.position.set(0, 3.5, -4);
  overhead.castShadow = true;
  scene.add(overhead);

  // Table lamps — four warm point-lights scattered around the cafe
  // (positions scaled ~10/12 from original)
  const lampPositions = [
    new THREE.Vector3(-6.7, 2.2, -5),
    new THREE.Vector3(6.7, 2.2, -5),
    new THREE.Vector3(-6.7, 2.2, 5),
    new THREE.Vector3(5, 2.2, 3.3),
  ];

  lampPositions.forEach((pos) => {
    const lamp = new THREE.PointLight(0xFFD699, 0.85, 12);
    lamp.position.copy(pos);
    scene.add(lamp);
  });

  // --- Floor (20x20, centered at origin) ---
  const floor = createPlane(
    20, 20, C.floor,
    new THREE.Vector3(0, 0, 0),
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );
  floor.material.roughness = 0.7;
  floor.material.metalness = 0.1;
  scene.add(floor);

  // --- Ceiling (20x20, centered at origin) ---
  const ceiling = createPlane(
    20, 20, C.ceiling,
    new THREE.Vector3(0, 4.5, 0),
    new THREE.Euler(Math.PI / 2, 0, 0)
  );
  scene.add(ceiling);

  // --- Walls (only LEFT and FRONT — camera-facing walls removed) ---

  // Front wall (blog zone wall, z = -10)
  const frontWall = createBox(
    20, 4.5, 0.3, C.wall,
    new THREE.Vector3(0, 2.25, -10)
  );
  scene.add(frontWall);
  colliderGroup.add(frontWall.clone());

  // Left wall (about zone, x = -10)
  const leftWall = createBox(
    0.3, 4.5, 20, C.wall,
    new THREE.Vector3(-10, 2.25, 0)
  );
  scene.add(leftWall);
  colliderGroup.add(leftWall.clone());

  // --- Angled corner walls for enclosure at open corners ---

  // Corner wall at (+10, 0, -10): short angled piece bridging the
  // end of the front wall to where the removed right wall would be
  const cornerWall1 = createBox(
    4, 4.5, 0.3, C.wall,
    new THREE.Vector3(10, 2.25, -10)
  );
  cornerWall1.rotation.y = Math.PI / 4;
  scene.add(cornerWall1);
  colliderGroup.add(cornerWall1.clone());

  // Corner wall at (-10, 0, +10): short angled piece bridging the
  // end of the left wall to where the removed back wall would be
  const cornerWall2 = createBox(
    4, 4.5, 0.3, C.wall,
    new THREE.Vector3(-10, 2.25, 10)
  );
  cornerWall2.rotation.y = Math.PI / 4;
  scene.add(cornerWall2);
  colliderGroup.add(cornerWall2.clone());

  // Floor collider (20x20)
  const floorCollider = createColliderBox(20, 0.3, 20, new THREE.Vector3(0, -0.15, 0));
  scene.add(floorCollider);
  colliderGroup.add(floorCollider.clone());

  // =============================================
  // GLTF MODEL PLACEMENT
  // =============================================

  // --- Bookshelves along front wall (blog zone, z ~ -9.2) ---
  // Positions scaled ~10/12 from original
  const blogSlots = [];
  const shelfCount = 5;
  const shelfStartX = -6.7;      // was -8, scaled by 10/12
  const shelfSpacing = 3.3;      // was 4, scaled by 10/12
  const bookcaseTypes = [
    models.bookcaseOpen,
    models.bookcaseClosed,
    models.bookcaseClosedWide,
    models.bookcaseOpen,
    models.bookcaseClosed,
  ];

  for (let i = 0; i < shelfCount; i++) {
    const sx = shelfStartX + i * shelfSpacing;
    const sz = -9.2;             // was -11.2, scaled
    const bookcaseModel = bookcaseTypes[i];
    const bookcaseScale = 2.0;

    placeModel(scene, bookcaseModel, new THREE.Vector3(sx, 0, sz), 0, bookcaseScale);

    // Invisible collider for bookcase (approx 2m wide, 3.2m tall, 0.8m deep)
    const bcCollider = createColliderBox(2.0, 3.2, 0.8, new THREE.Vector3(sx, 1.6, sz));
    scene.add(bcCollider);
    colliderGroup.add(bcCollider.clone());

    // Content slots: three levels per bookcase (on the shelf surfaces)
    const shelfHeights = [0.8, 1.8, 2.8];
    for (let j = 0; j < shelfHeights.length; j++) {
      blogSlots.push(
        new THREE.Vector3(sx, shelfHeights[j] + 0.4, sz - 0.15)
      );
    }
  }

  // Trim to 12 blog slots
  const finalBlogSlots = blogSlots.slice(0, 12);

  // --- Books scattered on/near bookshelves ---
  // Z positions scaled from ~-10.x to ~-8.x range
  const bookPositions = [
    { pos: new THREE.Vector3(-6.7, 0.6, -8.7), rotY: 0.3, scale: 1.8 },
    { pos: new THREE.Vector3(-3.3, 1.6, -8.8), rotY: -0.5, scale: 1.6 },
    { pos: new THREE.Vector3(0, 0.6, -8.6), rotY: 0.8, scale: 2.0 },
    { pos: new THREE.Vector3(3.3, 2.6, -8.7), rotY: -0.2, scale: 1.7 },
    { pos: new THREE.Vector3(6.7, 1.6, -8.8), rotY: 1.1, scale: 1.5 },
    { pos: new THREE.Vector3(-5.0, 0, -8.3), rotY: 0.6, scale: 2.0 },
    { pos: new THREE.Vector3(1.7, 0, -8.5), rotY: -0.9, scale: 1.8 },
  ];

  bookPositions.forEach(({ pos, rotY, scale }) => {
    placeModel(scene, models.books, pos, rotY, scale);
  });

  // --- Display tables + chairs along right side (projects zone, x ~ 8) ---
  const projectSlots = [];
  const tableCount = 5;
  const tableStartZ = -5;        // was -6, scaled
  const tableSpacing = 2.5;      // was 3, scaled

  for (let i = 0; i < tableCount; i++) {
    const tz = tableStartZ + i * tableSpacing;
    const tx = 8;                 // was 10, scaled
    const tableScale = 2.0;

    // Alternate between tableCross and tableRound
    const tableModel = i % 2 === 0 ? models.tableCross : models.tableRound;
    placeModel(scene, tableModel, new THREE.Vector3(tx, 0, tz), 0, tableScale);

    // Chair next to each table (facing the table, offset in z)
    const chairModel = i % 2 === 0 ? models.chairCushion : models.chairRounded;
    placeModel(scene, chairModel, new THREE.Vector3(tx - 1.4, 0, tz), Math.PI / 2, 2.0);

    // Invisible collider for table (approx 1.8 wide, 1.0 tall, 1.2 deep)
    const tCollider = createColliderBox(1.8, 1.0, 1.2, new THREE.Vector3(tx, 0.5, tz));
    scene.add(tCollider);
    colliderGroup.add(tCollider.clone());

    // Content slot on top of table
    projectSlots.push(new THREE.Vector3(tx, 1.15, tz));
  }

  // --- 3 additional seating groups in the open floor area ---
  const floorSeatingGroups = [
    { tablePos: new THREE.Vector3(-2.5, 0, -3.3), chair1Offset: new THREE.Vector3(-1.5, 0, 0), chair2Offset: new THREE.Vector3(1.5, 0, 0), chair1RotY: Math.PI / 2, chair2RotY: -Math.PI / 2 },
    { tablePos: new THREE.Vector3(2.5, 0, 1.7), chair1Offset: new THREE.Vector3(0, 0, -1.5), chair2Offset: new THREE.Vector3(0, 0, 1.5), chair1RotY: 0, chair2RotY: Math.PI },
    { tablePos: new THREE.Vector3(-1.7, 0, 5), chair1Offset: new THREE.Vector3(-1.5, 0, 0), chair2Offset: new THREE.Vector3(1.5, 0, 0), chair1RotY: Math.PI / 2, chair2RotY: -Math.PI / 2 },
  ];

  floorSeatingGroups.forEach(({ tablePos, chair1Offset, chair2Offset, chair1RotY, chair2RotY }, idx) => {
    const tModel = idx % 2 === 0 ? models.tableRound : models.tableCross;
    placeModel(scene, tModel, tablePos, 0, 2.0);

    const c1Pos = new THREE.Vector3().addVectors(tablePos, chair1Offset);
    const c2Pos = new THREE.Vector3().addVectors(tablePos, chair2Offset);

    placeModel(scene, models.chairRounded, c1Pos, chair1RotY, 2.0);
    placeModel(scene, models.chairCushion, c2Pos, chair2RotY, 2.0);

    // Table collider
    const ftCollider = createColliderBox(1.6, 1.0, 1.6, new THREE.Vector3(tablePos.x, 0.5, tablePos.z));
    scene.add(ftCollider);
    colliderGroup.add(ftCollider.clone());
  });

  // --- Lounge area (about zone, x ~ -8, z = 0) ---
  const loungeX = -8;            // was -10, scaled
  const loungeZ = 0;

  // Lounge sofa (facing right, towards center of room)
  placeModel(scene, models.loungeSofa, new THREE.Vector3(loungeX - 0.5, 0, loungeZ), Math.PI / 2, 2.2);

  // Lounge chair opposite the sofa
  placeModel(scene, models.loungeChair, new THREE.Vector3(loungeX + 2.5, 0, loungeZ), -Math.PI / 2, 2.2);

  // Coffee table between sofa and chair
  placeModel(scene, models.tableCoffee, new THREE.Vector3(loungeX + 1.0, 0, loungeZ), 0, 2.0);

  // Rug under the lounge area
  placeModel(scene, models.rugRectangle, new THREE.Vector3(loungeX + 1.0, 0.01, loungeZ), 0, 2.5);

  // Ottoman near the sofa
  placeModel(scene, models.loungeSofaOttoman, new THREE.Vector3(loungeX - 0.5, 0, loungeZ + 2.2), Math.PI / 2, 2.0);

  // Colliders for lounge furniture
  // Sofa collider
  const sofaCollider = createColliderBox(1.2, 1.0, 2.4, new THREE.Vector3(loungeX - 0.5, 0.5, loungeZ));
  scene.add(sofaCollider);
  colliderGroup.add(sofaCollider.clone());

  // Lounge chair collider
  const lChairCollider = createColliderBox(1.2, 1.0, 1.2, new THREE.Vector3(loungeX + 2.5, 0.5, loungeZ));
  scene.add(lChairCollider);
  colliderGroup.add(lChairCollider.clone());

  // Coffee table collider
  const ctCollider = createColliderBox(1.2, 0.5, 0.8, new THREE.Vector3(loungeX + 1.0, 0.25, loungeZ));
  scene.add(ctCollider);
  colliderGroup.add(ctCollider.clone());

  // About position at ground level (y=0)
  const aboutPosition = new THREE.Vector3(loungeX, 0, loungeZ);

  // --- Floor lamps at existing lamp positions ---
  // (scaled proportionally)
  const floorLampPositions = [
    new THREE.Vector3(-6.7, 0, -5),
    new THREE.Vector3(6.7, 0, -5),
    new THREE.Vector3(-6.7, 0, 5),
    new THREE.Vector3(5, 0, 3.3),
  ];

  floorLampPositions.forEach((pos) => {
    placeModel(scene, models.lampRoundFloor, pos, 0, 2.5);
  });

  // --- Potted plants in corners and edges ---
  // Scaled from +/-11 to +/-9.2 range
  const plantPlacements = [
    { model: models.pottedPlant, pos: new THREE.Vector3(-9.2, 0, -9.2), rotY: 0.4, scale: 2.2 },
    { model: models.pottedPlant, pos: new THREE.Vector3(9.2, 0, -9.2), rotY: -0.6, scale: 2.0 },
    { model: models.plantSmall1, pos: new THREE.Vector3(-9.2, 0, 6.7), rotY: 0.8, scale: 2.5 },
    { model: models.plantSmall2, pos: new THREE.Vector3(9.2, 0, 6.7), rotY: -0.3, scale: 2.5 },
    { model: models.pottedPlant, pos: new THREE.Vector3(4.2, 0, -9.2), rotY: 1.2, scale: 1.8 },
  ];

  plantPlacements.forEach(({ model, pos, rotY, scale }) => {
    placeModel(scene, model, pos, rotY, scale);
  });

  // --- Coffee counter at back (z ~ 8) ---
  const counterZ = 8;            // was 10, scaled

  // Main counter body (procedural for collision)
  const counter = createBox(
    6, 1.2, 1.0, C.woodDark,
    new THREE.Vector3(0, 0.6, counterZ)
  );
  scene.add(counter);

  // Counter collider
  const counterCollider = createColliderBox(6, 1.2, 1.0, new THREE.Vector3(0, 0.6, counterZ));
  scene.add(counterCollider);
  colliderGroup.add(counterCollider.clone());

  // Counter top surface
  const counterTop = createBox(
    6.2, 0.1, 1.2, C.wood,
    new THREE.Vector3(0, 1.2, counterZ)
  );
  scene.add(counterTop);

  // --- Bar stools at the coffee counter (facing the counter) ---
  const stoolPositions = [
    new THREE.Vector3(-2, 0, counterZ - 1.3),
    new THREE.Vector3(0, 0, counterZ - 1.3),
    new THREE.Vector3(2, 0, counterZ - 1.3),
  ];

  stoolPositions.forEach((pos) => {
    placeModel(scene, models.stoolBarSquare, pos, 0, 2.0);
  });

  // --- Coffee machine on the counter ---
  placeModel(scene, models.kitchenCoffeeMachine, new THREE.Vector3(2.0, 1.25, counterZ), 0, 1.8);

  // --- Coffee cups on counter (small cylinders for decoration) ---
  const cupPositions = [
    new THREE.Vector3(-1.5, 1.4, counterZ),
    new THREE.Vector3(0, 1.4, counterZ),
    new THREE.Vector3(1.5, 1.4, counterZ),
  ];

  cupPositions.forEach((pos) => {
    const cup = createCylinder(0.1, 0.08, 0.2, 12, C.cream, pos);
    scene.add(cup);
  });

  // "MENU" sign above counter
  const menuSign = createTextSprite('MENU', 36, '#4A2F1A');
  menuSign.position.set(0, 3.0, counterZ - 0.6);
  scene.add(menuSign);

  // --- Coat rack near entrance area (center of room) ---
  placeModel(scene, models.coatRackStanding, new THREE.Vector3(2.5, 0, -0.8), 0, 2.2);

  // --- Bench along left wall ---
  placeModel(scene, models.benchCushion, new THREE.Vector3(-9.2, 0, -4.2), Math.PI / 2, 2.2);

  // --- Side table near lounge ---
  placeModel(scene, models.sideTable, new THREE.Vector3(loungeX + 1.0, 0, loungeZ - 2.5), 0, 2.0);

  // --- Wall lamps with mounting brackets ---
  // Only on left wall and front wall now (removed right-wall lamps)
  const wallLampPlacements = [
    { pos: new THREE.Vector3(-9.7, 2.8, -5), rotY: Math.PI / 2 },
    { pos: new THREE.Vector3(-9.7, 2.8, 5), rotY: Math.PI / 2 },
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

  // --- Table lamp on the counter for decoration ---
  placeModel(scene, models.lampRoundTable, new THREE.Vector3(-1.0, 1.25, counterZ), 0, 1.5);

  // --- Additional rugs ---
  placeModel(scene, models.rugRound, new THREE.Vector3(-2.5, 0.01, -3.3), 0, 2.5);
  placeModel(scene, models.rugRound, new THREE.Vector3(2.5, 0.01, 1.7), 0.5, 2.0);

  // =============================================
  // PARTICLES
  // =============================================

  // --- Steam particles ---
  const steamCount = 60;
  const steamPositions = new Float32Array(steamCount * 3);

  for (let i = 0; i < steamCount; i++) {
    const cupIdx = Math.floor(Math.random() * cupPositions.length);
    const cup = cupPositions[cupIdx];
    steamPositions[i * 3]     = cup.x + (Math.random() - 0.5) * 0.3;
    steamPositions[i * 3 + 1] = cup.y + Math.random() * 1.5;
    steamPositions[i * 3 + 2] = cup.z + (Math.random() - 0.5) * 0.3;
  }

  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(steamPositions, 3)
  );

  const steamMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
  });

  const steam = new THREE.Points(steamGeometry, steamMaterial);
  scene.add(steam);

  // Steam animation callback
  animationCallbacks.push((_delta, _elapsed) => {
    const positions = steam.geometry.attributes.position.array;

    for (let i = 0; i < steamCount; i++) {
      // Rise slowly
      positions[i * 3 + 1] += 0.008;

      // Gentle drift
      positions[i * 3]     += (Math.random() - 0.5) * 0.002;
      positions[i * 3 + 2] += (Math.random() - 0.5) * 0.002;

      // Reset when too high
      if (positions[i * 3 + 1] > cupPositions[0].y + 2.0) {
        const cupIdx = Math.floor(Math.random() * cupPositions.length);
        const cup = cupPositions[cupIdx];
        positions[i * 3]     = cup.x + (Math.random() - 0.5) * 0.3;
        positions[i * 3 + 1] = cup.y + 0.1;
        positions[i * 3 + 2] = cup.z + (Math.random() - 0.5) * 0.3;
      }
    }

    steam.geometry.attributes.position.needsUpdate = true;
  });

  // --- Ambient particles (dust motes) ---
  const dust = createParticles(80, { x: 18, y: 4, z: 18 }, 0xFFE4C4, 0.03);
  dust.position.set(0, 2, 0);
  scene.add(dust);

  animationCallbacks.push((_delta, elapsed) => {
    const positions = dust.geometry.attributes.position.array;
    for (let i = 0; i < 80; i++) {
      positions[i * 3 + 1] += Math.sin(elapsed + i) * 0.0005;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  });

  // =============================================
  // PORTAL & LABELS
  // =============================================

  // --- Exit portal (near the open back edge, z ~ 9) ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.7, 9),
    C.accent
  );
  scene.add(exitPortal);

  // --- Zone label sprites ---
  const blogLabel = createTextSprite('Books & Blog', 32, '#4A2F1A');
  blogLabel.position.set(0, 3.8, -9.2);
  scene.add(blogLabel);

  const projectsLabel = createTextSprite('Projects', 32, '#4A2F1A');
  projectsLabel.position.set(8, 2.8, -6.7);
  scene.add(projectsLabel);

  const aboutLabel = createTextSprite('About', 32, '#4A2F1A');
  aboutLabel.position.set(loungeX, 2.8, loungeZ);
  scene.add(aboutLabel);

  // =============================================
  // RETURN
  // =============================================

  return {
    spawnPosition: new THREE.Vector3(0, 0, 2),
    animationCallbacks,
    contentSlots: {
      blog: finalBlogSlots,
      projects: projectSlots,
      about: aboutPosition,
    },
    colliderGroup,
  };
}
