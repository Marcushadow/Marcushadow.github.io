/**
 * content-objects.js — Places interactive content objects in the 3D scene
 *
 * Each theme gets a unique visual style for blog posts, projects, and the
 * about display.  Every placed object carries userData with type, url,
 * title, meta, and tags so the UI system can show labels and navigate.
 *
 * Usage (called from main.js):
 *   const { objects, animationCallbacks } =
 *     placeContentObjects(scene, window.EXPLORE_DATA, themeName, contentSlots);
 */

import * as THREE from 'three';

/* ============================================
   Helpers
   ============================================ */

/**
 * Simple deterministic hash for a string, used to pick colours.
 * @param {string} str
 * @returns {number} 32-bit integer
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Creates a canvas texture with multi-line text.
 *
 * @param {Array<{text: string, font: string, color: string}>} lines
 * @param {{ width?: number, height?: number, bgColor?: string, padding?: number }} options
 * @returns {THREE.CanvasTexture}
 */
function createTextTexture(lines, options = {}) {
  const width   = options.width   || 512;
  const height  = options.height  || 256;
  const bgColor = options.bgColor || 'transparent';
  const padding = options.padding || 20;

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Background
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Render each line with word-wrapping
  let cursorY = padding;

  for (const line of lines) {
    ctx.font      = line.font;
    ctx.fillStyle = line.color;

    const maxWidth  = width - padding * 2;
    const lineHeight = parseInt(line.font, 10) * 1.3 || 20;
    const words     = (line.text || '').split(' ');

    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
      const metrics  = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        ctx.fillText(currentLine, padding, cursorY + lineHeight);
        currentLine = words[i];
        cursorY += lineHeight;
      } else {
        currentLine = testLine;
      }
    }

    // Draw remaining text
    if (currentLine) {
      ctx.fillText(currentLine, padding, cursorY + lineHeight);
      cursorY += lineHeight;
    }

    cursorY += 4; // small gap between logical lines
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/* ============================================
   Beige / Cafe Theme
   ============================================ */

const BOOK_COLORS = [
  0x8B0000, 0x006400, 0x00008B, 0x8B4513, 0x4B0082,
  0x2F4F4F, 0x800000, 0x556B2F, 0x483D8B, 0x8B6914,
];

/**
 * Creates a book mesh group for the cafe theme.
 */
function createBook(post, position) {
  const group = new THREE.Group();

  // Pick a deterministic colour based on the title
  const colorIdx = Math.abs(hashCode(post.title)) % BOOK_COLORS.length;
  const bookColor = BOOK_COLORS[colorIdx];

  // Book body
  const bodyGeo = new THREE.BoxGeometry(0.3, 0.8, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bookColor,
    roughness: 0.8,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Spine label (canvas texture on front face)
  const spineTexture = createTextTexture(
    [{ text: post.title, font: 'bold 28px Inter, sans-serif', color: '#ffffff' }],
    { width: 256, height: 512, bgColor: 'rgba(0,0,0,0.3)', padding: 16 }
  );

  const spineGeo = new THREE.PlaneGeometry(0.28, 0.78);
  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTexture,
    transparent: true,
    roughness: 0.7,
  });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.z = 0.301; // just in front of the book face
  group.add(spine);

  // Position the group
  group.position.copy(position);

  // Tag with metadata
  group.userData = {
    type: 'post',
    url: post.url,
    title: post.title,
    meta: post.date || '',
    tags: post.tags || [],
  };

  return group;
}

/**
 * Creates a display item (small box + floating label card) for cafe projects.
 */
function createDisplayItem(project, position) {
  const group = new THREE.Group();

  // Small display box
  const boxGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x6B4226,
    roughness: 0.6,
    metalness: 0.2,
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  group.add(box);

  // Floating label card above the box
  const desc = project.description
    ? project.description.substring(0, 80) + (project.description.length > 80 ? '...' : '')
    : '';

  const cardTexture = createTextTexture(
    [
      { text: project.title, font: 'bold 28px Inter, sans-serif', color: '#4A2F1A' },
      { text: desc, font: '18px Inter, sans-serif', color: '#6B4226' },
    ],
    { width: 512, height: 256, bgColor: '#FAF6F1', padding: 20 }
  );

  const cardGeo = new THREE.PlaneGeometry(1.2, 0.6);
  const cardMat = new THREE.MeshStandardMaterial({
    map: cardTexture,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.5,
  });
  const card = new THREE.Mesh(cardGeo, cardMat);
  card.position.y = 0.35;
  group.add(card);

  group.position.copy(position);

  group.userData = {
    type: 'project',
    url: project.url,
    title: project.title,
    meta: '',
    tags: project.tags || [],
  };

  return group;
}

/* ============================================
   Dark / Cyberpunk Theme
   ============================================ */

/**
 * Creates a neon billboard for a blog post in the cyberpunk theme.
 */
function createNeonBillboard(post, position) {
  const group = new THREE.Group();

  // Billboard plane with canvas texture
  const billboardTexture = createTextTexture(
    [
      { text: post.title, font: 'bold 36px JetBrains Mono, monospace', color: '#00d4ff' },
      { text: post.date || '', font: '20px JetBrains Mono, monospace', color: '#888888' },
    ],
    { width: 512, height: 256, bgColor: '#0a0a18', padding: 24 }
  );

  const planeGeo = new THREE.PlaneGeometry(2.5, 1.2);
  const planeMat = new THREE.MeshStandardMaterial({
    map: billboardTexture,
    emissive: 0x001122,
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  group.add(plane);

  // Neon frame using EdgesGeometry
  const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.55, 1.25, 0.05));
  const frameMat = new THREE.LineBasicMaterial({
    color: 0x00d4ff,
    linewidth: 2,
  });
  const frame = new THREE.LineSegments(frameGeo, frameMat);
  group.add(frame);

  group.position.copy(position);

  group.userData = {
    type: 'post',
    url: post.url,
    title: post.title,
    meta: post.date || '',
    tags: post.tags || [],
  };

  return group;
}

/**
 * Creates an arcade cabinet for a project in the cyberpunk theme.
 */
function createArcadeCabinet(project, position) {
  const group = new THREE.Group();

  // Cabinet body
  const bodyGeo = new THREE.BoxGeometry(1.2, 2.0, 0.8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.7,
    metalness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Screen on front face
  const desc = project.description
    ? project.description.substring(0, 60) + (project.description.length > 60 ? '...' : '')
    : '';

  const screenTexture = createTextTexture(
    [
      { text: project.title, font: 'bold 30px JetBrains Mono, monospace', color: '#ff00aa' },
      { text: desc, font: '16px JetBrains Mono, monospace', color: '#00d4ff' },
    ],
    { width: 512, height: 512, bgColor: '#050510', padding: 24 }
  );

  const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTexture,
    emissive: 0x110022,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.4, 0.41); // on front face, upper half
  group.add(screen);

  group.position.copy(position);

  group.userData = {
    type: 'project',
    url: project.url,
    title: project.title,
    meta: '',
    tags: project.tags || [],
  };

  return group;
}

/* ============================================
   Light / Clouds Theme
   ============================================ */

/**
 * Creates a floating scroll for a blog post in the clouds theme.
 * Returns { group, animationCallback } since scrolls float.
 */
function createFloatingScroll(post, position) {
  const group = new THREE.Group();

  // Scroll cylinder (rolled ends)
  const scrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 12);
  const scrollMat = new THREE.MeshStandardMaterial({
    color: 0xFAF0E6,
    roughness: 0.8,
    metalness: 0.0,
  });
  const scrollTop = new THREE.Mesh(scrollGeo, scrollMat);
  scrollTop.rotation.z = Math.PI / 2;
  scrollTop.position.y = 0.5;
  group.add(scrollTop);

  const scrollBottom = new THREE.Mesh(scrollGeo.clone(), scrollMat);
  scrollBottom.rotation.z = Math.PI / 2;
  scrollBottom.position.y = -0.5;
  group.add(scrollBottom);

  // Paper plane between the scroll ends
  const paperTexture = createTextTexture(
    [
      { text: post.title, font: 'bold 28px Inter, sans-serif', color: '#333333' },
      { text: post.date || '', font: '18px Inter, sans-serif', color: '#666666' },
    ],
    { width: 512, height: 512, bgColor: '#FFFEF5', padding: 24 }
  );

  const paperGeo = new THREE.PlaneGeometry(0.9, 1.0);
  const paperMat = new THREE.MeshStandardMaterial({
    map: paperTexture,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
  });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  group.add(paper);

  group.position.copy(position);

  group.userData = {
    type: 'post',
    url: post.url,
    title: post.title,
    meta: post.date || '',
    tags: post.tags || [],
  };

  // Float animation: sin wave on y + slow rotation
  const baseY = position.y;
  const offset = Math.abs(hashCode(post.title)) % 100; // phase offset

  const animationCallback = (_delta, elapsed) => {
    group.position.y = baseY + Math.sin(elapsed * 0.7 + offset) * 0.25;
    group.rotation.y += 0.002;
  };

  return { group, animationCallback };
}

/**
 * Creates a crystal structure for a project in the clouds theme.
 * Returns { group, animationCallback }.
 */
function createCrystalStructure(project, position) {
  const group = new THREE.Group();

  // Octahedron crystal
  const crystalGeo = new THREE.OctahedronGeometry(0.6, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x88bbff,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.3,
    emissive: 0x4488cc,
    emissiveIntensity: 0.2,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  group.add(crystal);

  // Floating label above crystal
  const labelTexture = createTextTexture(
    [
      { text: project.title, font: 'bold 28px Inter, sans-serif', color: '#0066cc' },
    ],
    { width: 512, height: 128, bgColor: 'rgba(255,255,255,0.85)', padding: 16 }
  );

  const labelGeo = new THREE.PlaneGeometry(1.4, 0.35);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTexture,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.5,
  });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = 1.0;
  group.add(label);

  group.position.copy(position);

  group.userData = {
    type: 'project',
    url: project.url,
    title: project.title,
    meta: '',
    tags: project.tags || [],
  };

  // Gentle float + rotation
  const baseY = position.y;
  const offset = Math.abs(hashCode(project.title)) % 100;

  const animationCallback = (_delta, elapsed) => {
    group.position.y = baseY + Math.sin(elapsed * 0.7 + offset) * 0.25;
    group.rotation.y += 0.003;
  };

  return { group, animationCallback };
}

/* ============================================
   About Display (all themes)
   ============================================ */

/**
 * Creates an About Me card appropriate for the given theme.
 */
function createAboutDisplay(aboutData, position, theme) {
  const group = new THREE.Group();

  // Theme-specific styling
  let bgColor, titleColor, subtitleColor, hintColor;
  if (theme === 'dark') {
    bgColor      = '#0a0a18';
    titleColor   = '#00d4ff';
    subtitleColor = '#ff00aa';
    hintColor    = '#888888';
  } else if (theme === 'light') {
    bgColor      = 'rgba(255,255,255,0.9)';
    titleColor   = '#0066cc';
    subtitleColor = '#333333';
    hintColor    = '#666666';
  } else {
    // beige
    bgColor      = '#FAF6F1';
    titleColor   = '#4A2F1A';
    subtitleColor = '#6B4226';
    hintColor    = '#8B6914';
  }

  const cardTexture = createTextTexture(
    [
      { text: 'About Me', font: 'bold 40px Inter, sans-serif', color: titleColor },
      { text: '', font: '10px Inter, sans-serif', color: titleColor }, // spacer
      { text: 'Marcus Wee', font: 'bold 32px Inter, sans-serif', color: subtitleColor },
      { text: '', font: '8px Inter, sans-serif', color: titleColor }, // spacer
      { text: 'Developer & Creator', font: '22px Inter, sans-serif', color: subtitleColor },
      { text: '', font: '16px Inter, sans-serif', color: titleColor }, // spacer
      { text: '[Click to read more]', font: 'italic 20px Inter, sans-serif', color: hintColor },
    ],
    { width: 512, height: 512, bgColor, padding: 30 }
  );

  const cardGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const cardMat = new THREE.MeshStandardMaterial({
    map: cardTexture,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0.0,
  });
  const card = new THREE.Mesh(cardGeo, cardMat);
  group.add(card);

  // Decorative frame for dark theme
  if (theme === 'dark') {
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.65, 1.65, 0.02));
    const frameMat = new THREE.LineBasicMaterial({ color: 0x00d4ff });
    const frame = new THREE.LineSegments(frameGeo, frameMat);
    group.add(frame);
  }

  group.position.copy(position);

  group.userData = {
    type: 'about',
    url: aboutData.url,
    title: 'About Me',
    meta: '',
    tags: [],
  };

  return group;
}

/* ============================================
   Main Export
   ============================================ */

/**
 * Places themed content objects for posts, projects, and about in the scene.
 *
 * @param {THREE.Scene} scene
 * @param {{ posts: Array, projects: Array, about: { url: string } }} data
 * @param {string} theme - 'beige' | 'dark' | 'light'
 * @param {{ blog: THREE.Vector3[], projects: THREE.Vector3[], about: THREE.Vector3 }} slots
 * @returns {{ objects: THREE.Group[], animationCallbacks: Function[] }}
 */
export function placeContentObjects(scene, data, theme, slots) {
  const objects = [];
  const animationCallbacks = [];

  if (!data || !slots) {
    return { objects, animationCallbacks };
  }

  const posts    = data.posts    || [];
  const projects = data.projects || [];
  const about    = data.about    || { url: '/about/' };

  // --- Place blog posts ---
  const blogSlots = slots.blog || [];
  const postCount = Math.min(posts.length, blogSlots.length);

  for (let i = 0; i < postCount; i++) {
    const post = posts[i];
    const pos  = blogSlots[i];

    let group;

    if (theme === 'beige') {
      group = createBook(post, pos);
    } else if (theme === 'dark') {
      group = createNeonBillboard(post, pos);
    } else {
      // light / clouds
      const result = createFloatingScroll(post, pos);
      group = result.group;
      animationCallbacks.push(result.animationCallback);
    }

    scene.add(group);
    objects.push(group);
  }

  // --- Place projects ---
  const projectSlots = slots.projects || [];
  const projCount = Math.min(projects.length, projectSlots.length);

  for (let i = 0; i < projCount; i++) {
    const project = projects[i];
    const pos     = projectSlots[i];

    let group;

    if (theme === 'beige') {
      group = createDisplayItem(project, pos);
    } else if (theme === 'dark') {
      group = createArcadeCabinet(project, pos);
    } else {
      // light / clouds
      const result = createCrystalStructure(project, pos);
      group = result.group;
      animationCallbacks.push(result.animationCallback);
    }

    scene.add(group);
    objects.push(group);
  }

  // --- Place about display ---
  if (slots.about) {
    const aboutGroup = createAboutDisplay(about, slots.about, theme);
    scene.add(aboutGroup);
    objects.push(aboutGroup);
  }

  return { objects, animationCallbacks };
}
