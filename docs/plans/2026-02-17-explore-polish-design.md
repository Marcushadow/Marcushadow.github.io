# Explore Portal Polish Pass — Design Document

**Date:** 2026-02-17
**Status:** Approved

## Summary

Polish pass on the 3D Explore Portal addressing three areas: clunky movement, visual quality issues, and replacing page navigation with an in-world iframe content window.

## 1. Movement Fixes (controls.js + main.js)

**Goal:** Smooth & floaty movement — gradual acceleration, graceful deceleration, no jerky ramp-up or micro-drift.

### Changes:
- **Lerp-based acceleration** — smoothly interpolate velocity toward target speed (lerp factor ~0.08) instead of accumulating velocity every frame
- **Velocity cap** — clamp velocity to max speed to prevent runaway accumulation
- **Gentler deceleration** — reduce decay constant from 8.0 to 4.0 for graceful stopping
- **Velocity deadzone** — zero out velocities below 0.001 to prevent eternal micro-drift
- **Frame-time clamp** in main.js — cap delta at 0.05s to prevent position jumps on focus loss

## 2. Visual Fixes (environments + content-objects)

### Cafe (beige)
- Boost ambient light intensity 0.4 → 0.6
- Boost table lamp intensity 0.6 → 0.85
- Fix bookshelf content slot z-position to sit ON shelves (not floating in front)
- Fix project table content slot y-position to sit ON tables (not floating above)

### Cyberpunk (dark)
- Increase rain particle count 800 → 1500
- Increase rain particle size 0.05 → 0.08, opacity 0.5 → 0.7
- Raise neon ground strip y from 0.01 to 0.02 (fix z-fighting)
- Light 70% of building windows instead of 55%
- Boost billboard emissive intensity 0.5 → 0.8

### Clouds (light)
- Raise decorative cloud y range from (-3, 12) to (3, 15) — keep above camera
- Boost crystal emissive intensity 0.3 → 0.6
- Normalize float animation params across scrolls and crystals (shared speed 0.7, magnitude 0.25)

### Content objects
- Fix display card proximity to base objects (y 0.7 → 0.35)
- Standardize float animation parameters
- Reduce about card size from 2.0 → 1.6
- Boost cyberpunk billboard emissive 0.5 → 0.8

## 3. In-World Content Window (ui.js + explore.css)

**Goal:** Clicking a content object opens an iframe overlay inside the 3D experience instead of navigating away.

### Behavior:
1. Player clicks interactive object while pointer-locked
2. Pointer lock releases
3. Iframe overlay panel slides in from the right (~70% viewport width, full height)
4. The iframe loads the actual blog post/project/about page URL
5. 3D scene stays rendered behind, dimmed with backdrop blur on the left 30%
6. Close button (X) in top-right of panel closes iframe, re-locks pointer
7. ESC closes the panel if open (before showing pause menu)
8. Optional "Open full page" link in panel header for leaving the 3D world

### Markup (added to explore.html):
```html
<div id="content-panel" class="content-panel hidden">
  <div class="content-panel-header">
    <a id="content-panel-fullpage" class="content-panel-link" target="_blank">Open full page</a>
    <button id="content-panel-close" class="content-panel-close">✕</button>
  </div>
  <iframe id="content-panel-iframe" class="content-panel-iframe"></iframe>
</div>
```

### CSS:
- Panel fixed right, 70% width, full height, themed background
- Backdrop overlay on left 30% with blur + dark tint
- Slide-in animation (transform translateX)
- Themed border matching current theme accent color

### JS flow:
- Click handler in ui.js: instead of `window.location.href = url`, show content panel with iframe src set to url
- Close handler: hide panel, clear iframe src, re-lock pointer
- ESC handler: if panel open, close panel first; if panel closed, show pause menu

## What stays the same
- Environment layouts and spatial structure unchanged
- Controls API unchanged
- File structure unchanged
- All existing functionality preserved
