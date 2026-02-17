# Explore Portal Polish Pass — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Smooth out movement, fix visual quality issues, and replace page navigation with an in-world iframe content panel.

**Architecture:** Three independent areas — movement (controls.js + main.js), visuals (environment + content-objects files), and in-world content panel (explore.html + explore.css + ui.js). All changes are value tweaks or additive; no structural refactors.

**Tech Stack:** Three.js, vanilla JS, CSS

**Design Doc:** `docs/plans/2026-02-17-explore-polish-design.md`

---

### Task 1: Fix movement — lerp-based acceleration & gentler deceleration

**Files:**
- Modify: `assets/js/explore/controls.js:17-18,194-210`

**Step 1: Change constants**

At line 17-18, change:
```js
const MOVE_SPEED = 6.0;
const DECELERATION = 8.0;
```
To:
```js
const MOVE_SPEED = 6.0;
const DECELERATION = 4.0;
const LERP_FACTOR = 0.08;
const VELOCITY_DEADZONE = 0.001;
```

**Step 2: Replace velocity accumulation with lerp-based approach**

At lines 194-210, replace:
```js
      if (_direction.lengthSq() > 0) {
        _direction.normalize();
        _velocity.x += _direction.x * MOVE_SPEED * delta;
        _velocity.z += _direction.z * MOVE_SPEED * delta;
      }

      // Apply deceleration (friction)
      const decay = Math.exp(-DECELERATION * delta);
      _velocity.x *= decay;
      _velocity.z *= decay;

      // Integrate position
      camera.position.x += _velocity.x * delta;
      camera.position.z += _velocity.z * delta;

      // Lock vertical position to eye height
      camera.position.y = EYE_HEIGHT;
```

With:
```js
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
```

**Step 3: Test in browser**

Open `http://localhost:4000/explore/`, enter the scene, and verify:
- Movement starts smoothly (no jerky ramp-up)
- Deceleration is gradual (no abrupt stop)
- No micro-drift when all keys released
- Movement feels "smooth & floaty"

**Step 4: Commit**

```bash
git add assets/js/explore/controls.js
git commit -m "fix: smooth movement with lerp acceleration and gentler deceleration"
```

---

### Task 2: Clamp frame delta in animation loop

**Files:**
- Modify: `assets/js/explore/main.js:238`

**Step 1: Add delta clamp**

At line 238, change:
```js
    const delta = clock.getDelta();
```
To:
```js
    const delta = Math.min(clock.getDelta(), 0.05);
```

This prevents position jumps when the tab loses focus and regains it.

**Step 2: Commit**

```bash
git add assets/js/explore/main.js
git commit -m "fix: clamp frame delta to prevent position jumps on focus loss"
```

---

### Task 3: Fix cafe lighting and content slot positions

**Files:**
- Modify: `assets/js/explore/environments/cafe.js:52,69,171,214`

**Step 1: Boost ambient light intensity**

At line 52, change:
```js
  const ambient = new THREE.AmbientLight(0xFFF5E6, 0.4);
```
To:
```js
  const ambient = new THREE.AmbientLight(0xFFF5E6, 0.6);
```

**Step 2: Boost table lamp intensity**

At line 69, change:
```js
    const lamp = new THREE.PointLight(0xFFD699, 0.6, 12);
```
To:
```js
    const lamp = new THREE.PointLight(0xFFD699, 0.85, 12);
```

**Step 3: Fix bookshelf content slot z-position**

Books should sit ON shelves, not float in front. At line 171, change:
```js
        new THREE.Vector3(sx, shelfHeights[j] + 0.4, sz + 0.1)
```
To:
```js
        new THREE.Vector3(sx, shelfHeights[j] + 0.4, sz - 0.15)
```

**Step 4: Fix project table content slot y-position**

Display items should sit ON tables, not float above them. At line 214, change:
```js
    projectSlots.push(new THREE.Vector3(tx, 1.4, tz));
```
To:
```js
    projectSlots.push(new THREE.Vector3(tx, 1.15, tz));
```

**Step 5: Commit**

```bash
git add assets/js/explore/environments/cafe.js
git commit -m "fix: cafe lighting boost and content slots sit on furniture"
```

---

### Task 4: Fix cyberpunk rain, windows, and neon strips

**Files:**
- Modify: `assets/js/explore/environments/cyberpunk.js:58,130,138,144,242-262`

**Step 1: Light 70% of building windows**

At line 58, change:
```js
      const lit = Math.random() > 0.45;
```
To:
```js
      const lit = Math.random() > 0.30;
```

**Step 2: Fix neon ground strip z-fighting**

At line 130 (center strip), change y from 0.01 to 0.02:
```js
    C.neonCyan, C.neonCyan, 1.0,
    new THREE.Vector3(0, 0.01, 0)
```
To:
```js
    C.neonCyan, C.neonCyan, 1.0,
    new THREE.Vector3(0, 0.02, 0)
```

At line 138 (left strip), change y from 0.01 to 0.02:
```js
    new THREE.Vector3(-5.5, 0.01, 0)
```
To:
```js
    new THREE.Vector3(-5.5, 0.02, 0)
```

At line 144 (right strip), change y from 0.01 to 0.02:
```js
    new THREE.Vector3(5.5, 0.01, 0)
```
To:
```js
    new THREE.Vector3(5.5, 0.02, 0)
```

**Step 3: Increase rain particle count, size, and opacity**

At line 242, change:
```js
  const rainCount = 800;
```
To:
```js
  const rainCount = 1500;
```

At lines 257-263, change:
```js
  const rainMaterial = new THREE.PointsMaterial({
    color: 0x8888cc,
    size: 0.05,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
  });
```
To:
```js
  const rainMaterial = new THREE.PointsMaterial({
    color: 0x8888cc,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
  });
```

**Step 4: Commit**

```bash
git add assets/js/explore/environments/cyberpunk.js
git commit -m "fix: cyberpunk heavier rain, more lit windows, no z-fighting on neon strips"
```

---

### Task 5: Fix clouds decorative cloud range and crystal emissive

**Files:**
- Modify: `assets/js/explore/environments/clouds.js:265,301`

**Step 1: Raise decorative cloud minimum y**

At line 265, change:
```js
    const cy = -3 + Math.random() * 15;
```
To:
```js
    const cy = 3 + Math.random() * 12;
```

This keeps decorative clouds above the camera (y range 3–15 instead of -3–12).

**Step 2: Boost crystal emissive intensity**

At line 301, change:
```js
    emissiveIntensity: 0.3,
```
To:
```js
    emissiveIntensity: 0.6,
```

**Step 3: Commit**

```bash
git add assets/js/explore/environments/clouds.js
git commit -m "fix: clouds keep decorative clouds above camera, brighter crystal"
```

---

### Task 6: Fix content object positions, emissive, and float animations

**Files:**
- Modify: `assets/js/explore/content-objects.js:195,234,382,444,494`

**Step 1: Fix display card proximity to base (cafe projects)**

At line 195, change:
```js
  card.position.y = 0.7;
```
To:
```js
  card.position.y = 0.35;
```

**Step 2: Boost cyberpunk billboard emissive intensity**

At line 234, change:
```js
    emissiveIntensity: 0.5,
```
To:
```js
    emissiveIntensity: 0.8,
```

**Step 3: Normalize scroll float animation (clouds blog posts)**

At line 382, change:
```js
    group.position.y = baseY + Math.sin(elapsed * 0.8 + offset) * 0.3;
```
To:
```js
    group.position.y = baseY + Math.sin(elapsed * 0.7 + offset) * 0.25;
```

**Step 4: Normalize crystal float animation (clouds projects)**

At line 444, change:
```js
    group.position.y = baseY + Math.sin(elapsed * 0.6 + offset) * 0.25;
```
To:
```js
    group.position.y = baseY + Math.sin(elapsed * 0.7 + offset) * 0.25;
```

**Step 5: Reduce about card size**

At line 494, change:
```js
  const cardGeo = new THREE.PlaneGeometry(2.0, 2.0);
```
To:
```js
  const cardGeo = new THREE.PlaneGeometry(1.6, 1.6);
```

Also update the dark theme frame at line 507 to match:
```js
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.05, 2.05, 0.02));
```
To:
```js
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.65, 1.65, 0.02));
```

**Step 6: Commit**

```bash
git add assets/js/explore/content-objects.js
git commit -m "fix: content object positioning, emissive boost, normalized float animations"
```

---

### Task 7: Add content panel HTML to explore.html

**Files:**
- Modify: `explore.html` — add new div before the `<script type="module">` tag

**Step 1: Add content panel markup**

Before line 148 (`<!-- Application Entry -->`), add:
```html
  <!-- ============================================
       In-World Content Panel
       ============================================ -->
  <div id="content-panel" class="content-panel hidden">
    <div class="content-panel-header">
      <a id="content-panel-fullpage" class="content-panel-link" target="_blank">Open full page</a>
      <button id="content-panel-close" class="content-panel-close">&times;</button>
    </div>
    <iframe id="content-panel-iframe" class="content-panel-iframe"></iframe>
  </div>
  <div id="content-panel-backdrop" class="content-panel-backdrop hidden"></div>
```

**Step 2: Commit**

```bash
git add explore.html
git commit -m "feat: add in-world content panel markup to explore.html"
```

---

### Task 8: Add content panel CSS styles

**Files:**
- Modify: `assets/css/explore.css` — append new section at end of file

**Step 1: Add content panel styles**

Append to end of `explore.css`:
```css

/* ============================================
   In-World Content Panel
   ============================================ */

/* Backdrop overlay — covers the left portion with blur + dark tint */
.content-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 850;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  cursor: pointer;
}

/* Panel — slides in from the right */
.content-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 70%;
  height: 100%;
  z-index: 860;
  display: flex;
  flex-direction: column;
  background: #0a0a0f;
  border-left: 2px solid #00d4ff;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.content-panel.visible {
  transform: translateX(0);
}

/* Header bar */
.content-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

/* Full-page link */
.content-panel-link {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: #00d4ff;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.content-panel-link:hover {
  opacity: 0.7;
}

/* Close button */
.content-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 1.4rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.content-panel-close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
}

/* Iframe */
.content-panel-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: #ffffff;
}

/* --- Beige theme --- */
.theme-beige .content-panel {
  background: #FAF6F1;
  border-left-color: #C4704C;
}

.theme-beige .content-panel-header {
  background: rgba(74, 47, 26, 0.06);
  border-bottom-color: rgba(74, 47, 26, 0.12);
}

.theme-beige .content-panel-link {
  color: #C4704C;
}

.theme-beige .content-panel-close {
  color: rgba(45, 43, 40, 0.7);
  background: rgba(45, 43, 40, 0.06);
  border-color: rgba(45, 43, 40, 0.12);
}

.theme-beige .content-panel-close:hover {
  color: #2D2B28;
  background: rgba(45, 43, 40, 0.1);
}

/* --- Light theme --- */
.theme-light .content-panel {
  background: #ffffff;
  border-left-color: #0066cc;
}

.theme-light .content-panel-header {
  background: rgba(29, 29, 31, 0.03);
  border-bottom-color: rgba(29, 29, 31, 0.1);
}

.theme-light .content-panel-link {
  color: #0066cc;
}

.theme-light .content-panel-close {
  color: rgba(29, 29, 31, 0.7);
  background: rgba(29, 29, 31, 0.06);
  border-color: rgba(29, 29, 31, 0.12);
}

.theme-light .content-panel-close:hover {
  color: #1d1d1f;
  background: rgba(29, 29, 31, 0.1);
}
```

**Step 2: Commit**

```bash
git add assets/css/explore.css
git commit -m "feat: content panel CSS with slide-in animation and theme variants"
```

---

### Task 9: Wire up content panel in ui.js and main.js

**Files:**
- Modify: `assets/js/explore/ui.js:186-197`
- Modify: `assets/js/explore/main.js:206-218`

**Step 1: Replace click handler and add panel logic in ui.js**

Replace the entire click handler section at lines 186-197:
```js
  // --- Click handler: navigate to content URL ---
  document.addEventListener('click', () => {
    if (!controls.isLocked) return;
    if (!currentTarget) return;

    const url = currentTarget.userData.url;
    if (!url) return;

    // Unlock pointer before navigating so the browser allows it
    controls.unlock();
    window.location.href = url;
  });
```

With:
```js
  // --- Content panel references ---
  const contentPanel    = document.getElementById('content-panel');
  const contentBackdrop = document.getElementById('content-panel-backdrop');
  const contentIframe   = document.getElementById('content-panel-iframe');
  const contentFullpage = document.getElementById('content-panel-fullpage');
  const contentClose    = document.getElementById('content-panel-close');

  let panelOpen = false;

  /**
   * Opens the content panel with the given URL.
   */
  function openContentPanel(url) {
    if (!contentPanel || !contentIframe) return;

    contentIframe.src = url;
    if (contentFullpage) {
      contentFullpage.href = url;
    }

    controls.unlock();

    // Show backdrop + panel
    contentBackdrop?.classList.remove('hidden');
    contentPanel.classList.remove('hidden');

    // Trigger slide-in on next frame so the transition plays
    requestAnimationFrame(() => {
      contentPanel.classList.add('visible');
    });

    panelOpen = true;
  }

  /**
   * Closes the content panel and re-locks the pointer.
   */
  function closeContentPanel() {
    if (!contentPanel) return;

    contentPanel.classList.remove('visible');
    contentBackdrop?.classList.add('hidden');

    // Clear iframe after slide-out transition
    setTimeout(() => {
      contentPanel.classList.add('hidden');
      if (contentIframe) contentIframe.src = '';
    }, 350);

    panelOpen = false;

    // Re-lock pointer after a short delay to avoid immediate ESC conflict
    setTimeout(() => {
      controls.lock();
    }, 100);
  }

  // Expose panel state for main.js ESC handling
  controls._contentPanel = {
    get isOpen() { return panelOpen; },
    close: closeContentPanel,
  };

  // --- Click handler: open content panel ---
  document.addEventListener('click', () => {
    if (!controls.isLocked) return;
    if (!currentTarget) return;

    const url = currentTarget.userData.url;
    if (!url) return;

    openContentPanel(url);
  });

  // --- Close button ---
  contentClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeContentPanel();
  });

  // --- Backdrop click closes panel ---
  contentBackdrop?.addEventListener('click', () => {
    closeContentPanel();
  });
```

**Step 2: Add ESC handling in main.js**

In main.js, after the pointer-lock state change handler (after line 218), add ESC key handling. Insert this block after the `pauseResume` event listener (after line 223):

```js
  // --- ESC key: close content panel before showing pause menu ---
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;

    // If content panel is open, close it instead of showing pause menu
    if (controls._contentPanel && controls._contentPanel.isOpen) {
      e.preventDefault();
      controls._contentPanel.close();
    }
  });
```

**Step 3: Test the full flow in browser**

1. Enter the 3D experience
2. Walk up to a content object (book, billboard, scroll, etc.)
3. Click — panel should slide in from the right with the page loaded
4. Verify "Open full page" link works
5. Click X or backdrop to close — pointer should re-lock
6. Press ESC while panel is open — should close panel (not show pause menu)
7. Press ESC with panel closed — should show pause menu as before
8. Test in all three themes (beige, dark, light)

**Step 4: Commit**

```bash
git add assets/js/explore/ui.js assets/js/explore/main.js
git commit -m "feat: in-world content panel replaces page navigation with iframe overlay"
```

---

### Task 10: Final smoke test and commit

**Step 1: Test all changes together**

Open each theme and verify:
- **Movement**: Smooth acceleration, gradual deceleration, no micro-drift, no position jumps on tab switch
- **Cafe (beige)**: Brighter lighting, books sit on shelves, projects sit on tables
- **Cyberpunk (dark)**: More lit windows, heavier rain, no neon strip z-fighting, brighter billboards
- **Clouds (light)**: Decorative clouds above camera, brighter crystal, normalized float animations
- **Content panel**: Slides in on click, closes on X/backdrop/ESC, re-locks pointer, themed correctly
- **About card**: Smaller (1.6 instead of 2.0)

**Step 2: Commit any final fixes if needed**

If everything is clean from individual commits, no additional commit needed.
