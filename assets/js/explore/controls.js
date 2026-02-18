/**
 * controls.js — Isometric character controls with collision
 *
 * Provides WASD movement in isometric directions, a visible character
 * mesh, and proximity detection for interactive objects.
 *
 * Usage:
 *   const controls = createControls(camera, domElement, scene, interactiveObjects);
 *   controls.setOctree(worldOctree);
 *   controls.setPosition(x, z);
 *   controls.setActive(true);
 *   // in animation loop:
 *   controls.update(delta);
 */

import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

const MOVE_SPEED = 5.0;
const DECELERATION = 6.0;
const LERP_FACTOR = 0.12;
const VELOCITY_DEADZONE = 0.001;
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 0.5;
const PROXIMITY_RANGE = 2.5;

// Isometric basis vectors (camera at 45 degrees Y rotation)
// "Forward" on screen (up) = (-1, 0, -1) in world space
const ISO_FORWARD = new THREE.Vector3(-1, 0, -1).normalize();
// "Right" on screen = (1, 0, -1) in world space
const ISO_RIGHT = new THREE.Vector3(1, 0, -1).normalize();

/**
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D[]} interactiveObjects
 * @returns {object} controls API
 */
export function createControls(camera, domElement, scene, interactiveObjects) {
  let _active = false;
  const _velocity = new THREE.Vector3();
  const _direction = new THREE.Vector3();

  // Collision
  let _octree = null;
  const _capsule = new Capsule(
    new THREE.Vector3(0, PLAYER_RADIUS, 0),
    new THREE.Vector3(0, PLAYER_HEIGHT, 0),
    PLAYER_RADIUS
  );

  // Keyboard state
  const _keys = { forward: false, backward: false, left: false, right: false };

  // --- Character mesh ---
  const charGroup = new THREE.Group();

  // Body (cylinder)
  const bodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.35, 12);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4488cc,
    roughness: 0.5,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.175;
  body.castShadow = true;
  charGroup.add(body);

  // Head (sphere)
  const headGeo = new THREE.SphereGeometry(0.12, 12, 8);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x66aadd,
    roughness: 0.4,
    metalness: 0.1,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.42;
  head.castShadow = true;
  charGroup.add(head);

  // Direction indicator (small cone)
  const indicatorGeo = new THREE.ConeGeometry(0.06, 0.15, 6);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x4488cc,
    emissiveIntensity: 0.5,
  });
  const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
  indicator.position.set(0, 0.25, -0.22);
  indicator.rotation.x = -Math.PI / 2;
  charGroup.add(indicator);

  // Shadow circle on ground
  const shadowGeo = new THREE.CircleGeometry(0.25, 16);
  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  charGroup.add(shadow);

  scene.add(charGroup);

  // --- Proximity state ---
  let _nearestObject = null;
  let _onProximityChange = null;

  // --- Keyboard listeners ---
  function onKeyDown(event) {
    if (!_active) return;
    switch (event.code) {
      case 'KeyW': case 'ArrowUp':    _keys.forward = true; break;
      case 'KeyS': case 'ArrowDown':  _keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  _keys.left = true; break;
      case 'KeyD': case 'ArrowRight': _keys.right = true; break;
    }
  }

  function onKeyUp(event) {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp':    _keys.forward = false; break;
      case 'KeyS': case 'ArrowDown':  _keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  _keys.left = false; break;
      case 'KeyD': case 'ArrowRight': _keys.right = false; break;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // --- Collision ---
  function resolveCollisions() {
    if (!_octree) return;
    const result = _octree.capsuleIntersect(_capsule);
    if (result) {
      _capsule.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  function syncCapsuleFromCharacter() {
    _capsule.start.set(charGroup.position.x, PLAYER_RADIUS, charGroup.position.z);
    _capsule.end.set(charGroup.position.x, PLAYER_HEIGHT, charGroup.position.z);
  }

  function syncCharacterFromCapsule() {
    charGroup.position.x = _capsule.end.x;
    charGroup.position.z = _capsule.end.z;
  }

  // --- Proximity detection ---
  function updateProximity() {
    let nearest = null;
    let nearestDist = PROXIMITY_RANGE;

    const charPos = charGroup.position;

    for (const obj of interactiveObjects) {
      if (!obj.userData || !obj.userData.type) continue;
      const dx = obj.position.x - charPos.x;
      const dz = obj.position.z - charPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = obj;
      }
    }

    if (nearest !== _nearestObject) {
      _nearestObject = nearest;
      if (_onProximityChange) {
        _onProximityChange(_nearestObject);
      }
    }
  }

  // --- Public API ---
  const controls = {
    get isActive() { return _active; },

    get nearestObject() { return _nearestObject; },

    set onProximityChange(fn) { _onProximityChange = fn; },

    setActive(active) {
      _active = active;
      if (!active) {
        _keys.forward = false;
        _keys.backward = false;
        _keys.left = false;
        _keys.right = false;
        _velocity.set(0, 0, 0);
      }
    },

    setOctree(octree) {
      _octree = octree;
      syncCapsuleFromCharacter();
    },

    setPosition(x, z) {
      charGroup.position.set(x, 0, z);
      syncCapsuleFromCharacter();
    },

    getPosition() {
      return charGroup.position;
    },

    setCharacterColor(color) {
      bodyMat.color.set(color);
      headMat.color.set(color);
    },

    update(delta) {
      if (!_active) return;

      // Build direction from keys using isometric basis
      _direction.set(0, 0, 0);
      if (_keys.forward)  _direction.add(ISO_FORWARD);
      if (_keys.backward) _direction.sub(ISO_FORWARD);
      if (_keys.left)     _direction.sub(ISO_RIGHT);
      if (_keys.right)    _direction.add(ISO_RIGHT);

      if (_direction.lengthSq() > 0) {
        _direction.normalize();
        _velocity.x += (_direction.x * MOVE_SPEED - _velocity.x) * LERP_FACTOR;
        _velocity.z += (_direction.z * MOVE_SPEED - _velocity.z) * LERP_FACTOR;

        // Rotate character to face movement direction
        const angle = Math.atan2(_direction.x, _direction.z);
        charGroup.rotation.y = angle;
      }

      // Deceleration
      const decay = Math.exp(-DECELERATION * delta);
      _velocity.x *= decay;
      _velocity.z *= decay;
      if (Math.abs(_velocity.x) < VELOCITY_DEADZONE) _velocity.x = 0;
      if (Math.abs(_velocity.z) < VELOCITY_DEADZONE) _velocity.z = 0;

      // Integrate position
      charGroup.position.x += _velocity.x * delta;
      charGroup.position.z += _velocity.z * delta;
      charGroup.position.y = 0;

      // Collision
      if (_octree) {
        syncCapsuleFromCharacter();
        resolveCollisions();
        syncCharacterFromCapsule();
      }

      // Proximity detection
      updateProximity();
    },

    dispose() {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      scene.remove(charGroup);
    },
  };

  return controls;
}
