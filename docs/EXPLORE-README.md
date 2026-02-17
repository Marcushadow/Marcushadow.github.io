# 3D Explore Portal — Guide

## Overview

The 3D Explore page (`/explore`) lets visitors navigate your blog content in a first-person 3D environment. The environment changes based on the active blog theme:

- **Coffee/Beige** — Cozy café (books on shelves, items on tables)
- **Dark** — Cyberpunk city (neon billboards, arcade cabinets)
- **Light** — Cloud world (floating scrolls, crystal structures)

## How Content Auto-Populates

The 3D world reads your Jekyll posts and projects at build time via Liquid templates. **You don't need to touch any JavaScript to add content.**

### Adding a New Blog Post

1. Create a markdown file in `_posts/`:
   ```
   _posts/2026-03-01-my-new-post.md
   ```

2. Add front matter as usual:
   ```yaml
   ---
   layout: post
   title: "My New Post"
   date: 2026-03-01
   tags: [javascript, tutorial]
   category: tech
   description: "A short description of the post."
   ---
   ```

3. Push to GitHub. The post appears in the 3D world automatically as:
   - A **book** on the café shelves (beige theme)
   - A **neon billboard** on the cyberpunk street (dark theme)
   - A **floating scroll** on the cloud platform (light theme)

### Adding a New Project

1. Create a markdown file in `_projects/`:
   ```
   _projects/my-new-project.md
   ```

2. Add front matter:
   ```yaml
   ---
   title: My New Project
   description: What the project does.
   github: https://github.com/user/repo
   tags: [python, ml]
   featured: true
   permalink: /projects/my-new-project/
   ---
   ```

3. Push to GitHub. The project appears in the 3D world automatically as:
   - A **display item** on a café table (beige theme)
   - A **glowing arcade cabinet** on the cyberpunk street (dark theme)
   - A **crystal structure** on the cloud platform (light theme)

### Slot Limits

Each environment has a fixed number of content "slots." If you have more content than slots, excess items won't appear in the 3D world (but are still on the regular blog). To increase slots, edit the slot arrays in the respective environment file.

## File Structure

```
explore.html                          — Main page (Jekyll + Liquid data injection)
assets/css/explore.css                — All explore page styles
assets/js/explore/
  main.js                             — Entry point, scene init, render loop
  controls.js                         — First-person WASD + pointer lock
  content-objects.js                  — Reads data, spawns themed 3D objects
  ui.js                               — HUD, hover labels, raycasting
  environments/
    shared.js                         — Shared geometry helpers, layout constants
    cafe.js                           — Beige theme environment
    cyberpunk.js                      — Dark theme environment
    clouds.js                         — Light theme environment
```

## Adding a New Theme Environment

1. Create `assets/js/explore/environments/mytheme.js`
2. Export a build function with this signature:
   ```javascript
   import * as THREE from 'three';
   import { createBox, createExitPortal, /* ... */ } from './shared.js';

   export function buildMyTheme(scene) {
     // Build geometry, lighting, particles...
     return {
       spawnPosition: new THREE.Vector3(0, 1.7, 0),
       animationCallbacks: [],
       contentSlots: {
         blog: [/* THREE.Vector3 positions */],
         projects: [/* THREE.Vector3 positions */],
         about: new THREE.Vector3(x, y, z)
       }
     };
   }
   ```
3. In `main.js`, import and add to `THEME_CONFIG`
4. In `content-objects.js`, add matching theme styles under `THEME_STYLES`
5. In `explore.css`, add `.theme-mytheme` color variants for the loading screen

## Customizing Environments

Each environment file is self-contained. You can:

- **Change colors** — Edit the color constants at the top of each file
- **Add objects** — Use helpers from `shared.js` (createBox, createCylinder, etc.)
- **Modify lighting** — Adjust PointLight/AmbientLight parameters
- **Change particles** — Edit createParticles calls (count, area, color, size)
- **Move content slots** — Edit the slot position arrays

## Controls

| Action   | Desktop         |
|----------|-----------------|
| Move     | WASD / Arrows   |
| Look     | Mouse           |
| Interact | Left click      |
| Pause    | ESC             |
| Exit     | ESC → Back / Exit button |

Mobile visitors see a message suggesting desktop, with a link back to the normal blog.

## Dependencies

- **Three.js v0.170.0** — loaded from jsDelivr CDN via importmap
- No build tools, no npm, no bundler
- Works with GitHub Pages out of the box
