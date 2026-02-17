/**
 * model-loader.js — GLTF/GLB model loading utility
 *
 * Provides a promise-based wrapper around Three.js GLTFLoader
 * for loading 3D models in the Explore experience.
 *
 * Usage:
 *   import { loadModel, loadModels } from './model-loader.js';
 *   const gltf = await loadModel('/assets/models/cafe/chair.glb');
 *   scene.add(gltf.scene);
 */

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

/**
 * Loads a single GLTF/GLB model.
 *
 * @param {string} url - Path to the .glb file
 * @returns {Promise<import('three').Group>} The model's scene graph
 */
export function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        // Enable shadows on all meshes
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        console.warn(`[model-loader] Failed to load ${url}:`, error);
        reject(error);
      }
    );
  });
}

/**
 * Loads multiple models in parallel. If any model fails, it is
 * skipped (returns null for that entry) so the scene still works.
 *
 * @param {Record<string, string>} manifest - Map of name → url
 * @returns {Promise<Record<string, import('three').Group|null>>}
 */
export async function loadModels(manifest) {
  const entries = Object.entries(manifest);
  const results = await Promise.allSettled(
    entries.map(([, url]) => loadModel(url))
  );

  const models = {};
  entries.forEach(([name], i) => {
    models[name] = results[i].status === 'fulfilled' ? results[i].value : null;
  });

  return models;
}

/**
 * Clones a loaded model so it can be placed multiple times.
 *
 * @param {import('three').Group} model - The original model
 * @returns {import('three').Group} A deep clone
 */
export function cloneModel(model) {
  return model.clone();
}
