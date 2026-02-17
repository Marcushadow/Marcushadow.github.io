/**
 * controls.js — First-person pointer-lock controls with collision
 *
 * Provides WASD + Arrow key movement, mouse-look with pointer lock,
 * and Octree-based collision detection against world geometry.
 * Camera Y is fixed at 1.7 (eye height) — no jumping or gravity.
 *
 * Usage:
 *   const controls = createControls(camera, renderer.domElement);
 *   controls.setOctree(worldOctree);  // enable collision
 *   controls.onLockChange = (locked) => { ... };
 *   controls.lock();
 *   // in animation loop:
 *   controls.update(delta);
 */

import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

const MOVE_SPEED = 6.0;
const DECELERATION = 4.0;
const LERP_FACTOR = 0.08;
const VELOCITY_DEADZONE = 0.001;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = THREE.MathUtils.degToRad(89);
const EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.35;

/**
 * Creates a first-person controls object.
 *
 * @param {THREE.PerspectiveCamera} camera     - The camera to control
 * @param {HTMLElement}             domElement  - The element to request pointer lock on
 * @returns {object} controls API
 */
export function createControls(camera, domElement) {
  // --- Internal state ---
  let _locked = false;
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _velocity = new THREE.Vector3();
  const _direction = new THREE.Vector3();

  // Collision state
  let _octree = null;
  const _capsule = new Capsule(
    new THREE.Vector3(0, PLAYER_RADIUS, 0),
    new THREE.Vector3(0, EYE_HEIGHT, 0),
    PLAYER_RADIUS
  );

  // Keyboard state
  const _keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  // Public callback — called with boolean when lock state changes
  let _onLockChange = null;

  // --- Pointer Lock listeners ---

  function onPointerLockChange() {
    const wasLocked = _locked;
    _locked = document.pointerLockElement === domElement;

    if (wasLocked !== _locked && _onLockChange) {
      _onLockChange(_locked);
    }
  }

  function onPointerLockError() {
    console.warn('[controls] Pointer lock error');
  }

  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('pointerlockerror', onPointerLockError);

  // --- Mouse look ---

  function onMouseMove(event) {
    if (!_locked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    _euler.setFromQuaternion(camera.quaternion, 'YXZ');
    _euler.y -= movementX * MOUSE_SENSITIVITY;
    _euler.x -= movementY * MOUSE_SENSITIVITY;
    _euler.x = THREE.MathUtils.clamp(_euler.x, -PITCH_LIMIT, PITCH_LIMIT);

    camera.quaternion.setFromEuler(_euler);
  }

  document.addEventListener('mousemove', onMouseMove);

  // --- Keyboard ---

  function onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        _keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        _keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        _keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        _keys.right = true;
        break;
    }
  }

  function onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        _keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        _keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        _keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        _keys.right = false;
        break;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // --- Reusable vectors (allocated once) ---
  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);

  // --- Collision helper ---

  /**
   * Checks for capsule intersection with the octree and
   * pushes the capsule out of any colliding geometry.
   */
  function resolveCollisions() {
    if (!_octree) return;

    const result = _octree.capsuleIntersect(_capsule);
    if (result) {
      // Push capsule out of collision along the surface normal
      _capsule.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  // --- Sync helpers ---

  /** Copies camera position into the capsule. */
  function syncCapsuleFromCamera() {
    _capsule.start.set(
      camera.position.x,
      camera.position.y - EYE_HEIGHT + PLAYER_RADIUS,
      camera.position.z
    );
    _capsule.end.set(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );
  }

  /** Copies capsule top position back to the camera. */
  function syncCameraFromCapsule() {
    camera.position.set(
      _capsule.end.x,
      EYE_HEIGHT,
      _capsule.end.z
    );
  }

  // --- Public API ---

  const controls = {
    /**
     * Whether pointer lock is currently active.
     */
    get isLocked() {
      return _locked;
    },

    /**
     * Callback property — called with a boolean whenever the lock
     * state changes.
     */
    get onLockChange() {
      return _onLockChange;
    },
    set onLockChange(fn) {
      _onLockChange = fn;
    },

    /**
     * Sets the Octree used for collision detection.
     * Call once after the environment is built.
     *
     * @param {import('three/addons/math/Octree.js').Octree} octree
     */
    setOctree(octree) {
      _octree = octree;
      // Sync capsule to current camera position
      syncCapsuleFromCamera();
    },

    /**
     * Requests pointer lock on the target element.
     */
    lock() {
      domElement.requestPointerLock();
    },

    /**
     * Exits pointer lock.
     */
    unlock() {
      document.exitPointerLock();
    },

    /**
     * Per-frame update — call from the animation loop.
     *
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
      if (!_locked) return;

      // Build desired movement direction from camera facing
      camera.getWorldDirection(_forward);
      _forward.y = 0;
      _forward.normalize();

      _right.crossVectors(_forward, _up).normalize();

      // Accumulate desired direction
      _direction.set(0, 0, 0);

      if (_keys.forward)  _direction.add(_forward);
      if (_keys.backward) _direction.sub(_forward);
      if (_keys.left)     _direction.sub(_right);
      if (_keys.right)    _direction.add(_right);

      if (_direction.lengthSq() > 0) {
        _direction.normalize();
        // Lerp velocity toward target speed for smooth acceleration
        const targetX = _direction.x * MOVE_SPEED;
        const targetZ = _direction.z * MOVE_SPEED;
        _velocity.x += (targetX - _velocity.x) * LERP_FACTOR;
        _velocity.z += (targetZ - _velocity.z) * LERP_FACTOR;
      }

      // Clamp velocity to max speed
      const speed = Math.sqrt(_velocity.x * _velocity.x + _velocity.z * _velocity.z);
      if (speed > MOVE_SPEED) {
        const scale = MOVE_SPEED / speed;
        _velocity.x *= scale;
        _velocity.z *= scale;
      }

      // Apply deceleration (friction)
      const decay = Math.exp(-DECELERATION * delta);
      _velocity.x *= decay;
      _velocity.z *= decay;

      // Zero out micro-drift
      if (Math.abs(_velocity.x) < VELOCITY_DEADZONE) _velocity.x = 0;
      if (Math.abs(_velocity.z) < VELOCITY_DEADZONE) _velocity.z = 0;

      // Integrate position
      camera.position.x += _velocity.x * delta;
      camera.position.z += _velocity.z * delta;

      // Lock vertical position to eye height
      camera.position.y = EYE_HEIGHT;

      // --- Collision resolution ---
      if (_octree) {
        syncCapsuleFromCamera();
        resolveCollisions();
        syncCameraFromCapsule();
      }
    },

    /**
     * Removes all event listeners. Call when tearing down.
     */
    dispose() {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    },
  };

  return controls;
}
