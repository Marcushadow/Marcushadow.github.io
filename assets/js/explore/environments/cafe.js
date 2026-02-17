/**
 * cafe.js — Cozy cafe interior environment (beige theme)
 *
 * Builds an indoor cafe scene with bookshelves, display tables,
 * an armchair reading nook, a coffee counter, warm lighting, and
 * rising steam particles.
 */

import * as THREE from 'three';
import {
  LAYOUT,
  createBox,
  createPlane,
  createCylinder,
  createEmissiveBox,
  createTextSprite,
  createParticles,
  createExitPortal,
} from './shared.js';

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
   Builder
   ============================================ */

/**
 * @param {THREE.Scene} scene
 * @returns {{ spawnPosition: THREE.Vector3, animationCallbacks: Function[], contentSlots: Object }}
 */
export function buildCafe(scene) {
  const animationCallbacks = [];

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
  const lampPositions = [
    new THREE.Vector3(-8, 2.2, -6),
    new THREE.Vector3(8, 2.2, -6),
    new THREE.Vector3(-8, 2.2, 6),
    new THREE.Vector3(6, 2.2, 4),
  ];

  lampPositions.forEach((pos) => {
    const lamp = new THREE.PointLight(0xFFD699, 0.85, 12);
    lamp.position.copy(pos);
    scene.add(lamp);

    // Small glowing bulb mesh
    const bulb = createEmissiveBox(
      0.15, 0.15, 0.15,
      0xFFD699, 0xFFD699, 1.5,
      pos
    );
    scene.add(bulb);
  });

  // --- Floor ---
  const floor = createPlane(
    24, 24, C.floor,
    new THREE.Vector3(0, 0, 0),
    new THREE.Euler(-Math.PI / 2, 0, 0)
  );
  floor.material.roughness = 0.7;
  floor.material.metalness = 0.1;
  scene.add(floor);

  // --- Ceiling ---
  const ceiling = createPlane(
    24, 24, C.ceiling,
    new THREE.Vector3(0, 4.5, 0),
    new THREE.Euler(Math.PI / 2, 0, 0)
  );
  scene.add(ceiling);

  // --- Walls ---
  // Front wall (blog zone wall, z = -12)
  const frontWall = createBox(
    24, 4.5, 0.3, C.wall,
    new THREE.Vector3(0, 2.25, -12)
  );
  scene.add(frontWall);

  // Back wall (exit zone, z = 12)
  const backWall = createBox(
    24, 4.5, 0.3, C.wall,
    new THREE.Vector3(0, 2.25, 12)
  );
  scene.add(backWall);

  // Left wall (about zone, x = -12)
  const leftWall = createBox(
    0.3, 4.5, 24, C.wall,
    new THREE.Vector3(-12, 2.25, 0)
  );
  scene.add(leftWall);

  // Right wall (projects zone side, x = 12)
  const rightWall = createBox(
    0.3, 4.5, 24, C.wall,
    new THREE.Vector3(12, 2.25, 0)
  );
  scene.add(rightWall);

  // --- Bookshelves along front wall (blog zone) ---
  const blogSlots = [];
  const shelfCount = 5;
  const shelfStartX = -8;
  const shelfSpacing = 4;

  for (let i = 0; i < shelfCount; i++) {
    const sx = shelfStartX + i * shelfSpacing;
    const sz = -11.2;

    // Shelf upright (back panel)
    const back = createBox(
      2.0, 3.2, 0.12, C.shelf,
      new THREE.Vector3(sx, 1.8, sz - 0.3)
    );
    scene.add(back);

    // Left upright
    const leftUpright = createBox(
      0.1, 3.2, 0.6, C.woodDark,
      new THREE.Vector3(sx - 1.0, 1.8, sz)
    );
    scene.add(leftUpright);

    // Right upright
    const rightUpright = createBox(
      0.1, 3.2, 0.6, C.woodDark,
      new THREE.Vector3(sx + 1.0, 1.8, sz)
    );
    scene.add(rightUpright);

    // Three shelf planks and content slots per shelf unit
    const shelfHeights = [0.8, 1.8, 2.8];
    for (let j = 0; j < shelfHeights.length; j++) {
      const plank = createBox(
        2.0, 0.08, 0.5, C.wood,
        new THREE.Vector3(sx, shelfHeights[j], sz)
      );
      scene.add(plank);

      // Content slot sits on top of each plank
      blogSlots.push(
        new THREE.Vector3(sx, shelfHeights[j] + 0.4, sz - 0.15)
      );
    }
  }

  // Trim to 12 blog slots
  const finalBlogSlots = blogSlots.slice(0, 12);

  // --- Display tables along left wall (projects zone) ---
  // Projects zone is at x=14 in LAYOUT, but the cafe is enclosed.
  // We place display tables on the right-hand side of the cafe interior.
  const projectSlots = [];
  const tableCount = 5;
  const tableStartZ = -6;
  const tableSpacing = 3;

  for (let i = 0; i < tableCount; i++) {
    const tz = tableStartZ + i * tableSpacing;
    const tx = 10;

    // Table top
    const top = createBox(
      1.8, 0.12, 1.2, C.wood,
      new THREE.Vector3(tx, 1.0, tz)
    );
    scene.add(top);

    // Four legs
    const legOffsets = [
      [-0.7, -0.45],
      [0.7, -0.45],
      [-0.7, 0.45],
      [0.7, 0.45],
    ];

    legOffsets.forEach(([dx, dz]) => {
      const leg = createCylinder(
        0.05, 0.05, 1.0, 8, C.woodDark,
        new THREE.Vector3(tx + dx, 0.5, tz + dz)
      );
      scene.add(leg);
    });

    projectSlots.push(new THREE.Vector3(tx, 1.15, tz));
  }

  // --- Armchair + side table for about zone ---
  // About zone centered at x=-14 in LAYOUT; we place at x=-10 inside walls.
  const chairX = -10;
  const chairZ = 0;

  // Seat
  const seat = createBox(
    1.6, 0.4, 1.4, C.accent,
    new THREE.Vector3(chairX, 0.6, chairZ)
  );
  scene.add(seat);

  // Backrest
  const backrest = createBox(
    1.6, 1.2, 0.2, C.accent,
    new THREE.Vector3(chairX, 1.2, chairZ - 0.6)
  );
  scene.add(backrest);

  // Armrests
  const armrestLeft = createBox(
    0.15, 0.5, 1.2, C.woodDark,
    new THREE.Vector3(chairX - 0.85, 1.0, chairZ)
  );
  scene.add(armrestLeft);

  const armrestRight = createBox(
    0.15, 0.5, 1.2, C.woodDark,
    new THREE.Vector3(chairX + 0.85, 1.0, chairZ)
  );
  scene.add(armrestRight);

  // Side table next to chair
  const sideTableTop = createBox(
    0.8, 0.08, 0.8, C.wood,
    new THREE.Vector3(chairX + 1.8, 0.9, chairZ)
  );
  scene.add(sideTableTop);

  const sideTableLeg = createCylinder(
    0.06, 0.06, 0.9, 8, C.woodDark,
    new THREE.Vector3(chairX + 1.8, 0.45, chairZ)
  );
  scene.add(sideTableLeg);

  const aboutPosition = new THREE.Vector3(chairX, 1.7, chairZ);

  // --- Coffee counter at back ---
  const counterZ = 10;

  // Main counter body
  const counter = createBox(
    6, 1.2, 1.0, C.woodDark,
    new THREE.Vector3(0, 0.6, counterZ)
  );
  scene.add(counter);

  // Counter top surface
  const counterTop = createBox(
    6.2, 0.1, 1.2, C.wood,
    new THREE.Vector3(0, 1.2, counterZ)
  );
  scene.add(counterTop);

  // Coffee cups on counter (small cylinders)
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

  // --- Steam particles ---
  const steamCount = 60;
  const steamPositions = new Float32Array(steamCount * 3);

  for (let i = 0; i < steamCount; i++) {
    // Start near coffee cups
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
  const dust = createParticles(80, { x: 20, y: 4, z: 20 }, 0xFFE4C4, 0.03);
  dust.position.set(0, 2, 0);
  scene.add(dust);

  animationCallbacks.push((_delta, elapsed) => {
    const positions = dust.geometry.attributes.position.array;
    for (let i = 0; i < 80; i++) {
      positions[i * 3 + 1] += Math.sin(elapsed + i) * 0.0005;
    }
    dust.geometry.attributes.position.needsUpdate = true;
  });

  // --- Exit portal ---
  const exitPortal = createExitPortal(
    new THREE.Vector3(0, 1.7, 11),
    C.accent
  );
  scene.add(exitPortal);

  // --- Zone label sprites ---
  const blogLabel = createTextSprite('Books & Blog', 32, '#4A2F1A');
  blogLabel.position.set(0, 3.8, -11);
  scene.add(blogLabel);

  const projectsLabel = createTextSprite('Projects', 32, '#4A2F1A');
  projectsLabel.position.set(10, 2.8, -8);
  scene.add(projectsLabel);

  const aboutLabel = createTextSprite('About', 32, '#4A2F1A');
  aboutLabel.position.set(chairX, 2.8, chairZ);
  scene.add(aboutLabel);

  // --- Return ---
  return {
    spawnPosition: LAYOUT.spawnPosition.clone(),
    animationCallbacks,
    contentSlots: {
      blog: finalBlogSlots,
      projects: projectSlots,
      about: aboutPosition,
    },
  };
}
