/**
 * map.js — Grid layout, tile types, BFS pathfinding, content assignment
 *
 * The map is a 12x10 grid. Tile types:
 *   0 = grass (walkable)
 *   1 = path  (walkable)
 *   2 = deco  (obstacle, not walkable)
 *   3 = blog  (walkable, content)
 *   4 = project (walkable, content)
 *   5 = about (walkable, content)
 *   6 = exit  (walkable, navigates to /)
 *   7 = spawn (walkable, character start)
 */

export const TILE = {
  GRASS:   0,
  PATH:    1,
  DECO:    2,
  BLOG:    3,
  PROJECT: 4,
  ABOUT:   5,
  EXIT:    6,
  SPAWN:   7,
};

// 12 columns x 10 rows
// Top = row 0, left = col 0
export const COLS = 12;
export const ROWS = 10;

const G = TILE.GRASS;
const P = TILE.PATH;
const D = TILE.DECO;
const B = TILE.BLOG;
const R = TILE.PROJECT;
const A = TILE.ABOUT;
const E = TILE.EXIT;
const S = TILE.SPAWN;

export const BASE_GRID = [
  [D, D, D, D, D, D, D, D, D, D, D, D],
  [D, G, G, B, B, B, B, B, B, G, G, D],
  [D, G, G, P, P, P, P, P, P, G, G, D],
  [D, G, G, P, G, G, G, G, P, G, G, D],
  [D, R, G, P, G, S, G, G, P, G, A, D],
  [D, R, G, P, G, G, G, G, P, G, G, D],
  [D, R, G, P, G, G, G, G, P, G, G, D],
  [D, G, G, P, P, P, P, P, P, G, G, D],
  [D, G, G, G, G, E, G, G, G, G, G, D],
  [D, D, D, D, D, D, D, D, D, D, D, D],
];

/**
 * Returns true if a tile type is walkable.
 */
export function isWalkable(tileType) {
  return tileType !== TILE.DECO;
}

/**
 * Finds the spawn position {col, row} in the grid.
 */
export function findSpawn(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE.SPAWN) return { col: c, row: r };
    }
  }
  return { col: 5, row: 4 }; // fallback
}

/**
 * Creates a deep copy of the grid and assigns content data to
 * BLOG, PROJECT, and ABOUT tiles.
 *
 * Returns { grid: number[][], contentMap: Map<string, object> }
 * where contentMap keys are "col,row" strings.
 */
export function buildGameGrid(exploreData) {
  // Deep copy
  const grid = BASE_GRID.map((row) => [...row]);
  const contentMap = new Map();

  const posts = (exploreData && exploreData.posts) || [];
  const projects = (exploreData && exploreData.projects) || [];
  const about = (exploreData && exploreData.about) || { url: '/about/' };

  // Collect positions for each content type
  const blogTiles = [];
  const projectTiles = [];
  let aboutTile = null;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE.BLOG) blogTiles.push({ col: c, row: r });
      if (grid[r][c] === TILE.PROJECT) projectTiles.push({ col: c, row: r });
      if (grid[r][c] === TILE.ABOUT && !aboutTile) aboutTile = { col: c, row: r };
    }
  }

  // Assign posts to blog tiles (excess tiles become grass)
  blogTiles.forEach((pos, i) => {
    if (i < posts.length) {
      contentMap.set(`${pos.col},${pos.row}`, {
        type: 'post',
        title: posts[i].title,
        url: posts[i].url,
        meta: posts[i].date || '',
      });
    } else {
      grid[pos.row][pos.col] = TILE.GRASS;
    }
  });

  // Assign projects
  projectTiles.forEach((pos, i) => {
    if (i < projects.length) {
      contentMap.set(`${pos.col},${pos.row}`, {
        type: 'project',
        title: projects[i].title,
        url: projects[i].url,
        meta: '',
      });
    } else {
      grid[pos.row][pos.col] = TILE.GRASS;
    }
  });

  // About tile
  if (aboutTile) {
    contentMap.set(`${aboutTile.col},${aboutTile.row}`, {
      type: 'about',
      title: 'About Me',
      url: about.url,
      meta: '',
    });
  }

  // Exit tile
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE.EXIT) {
        contentMap.set(`${c},${r}`, {
          type: 'exit',
          title: 'Exit',
          url: '/',
          meta: 'Back to blog',
        });
      }
    }
  }

  return { grid, contentMap };
}

/**
 * BFS pathfinding from (startCol, startRow) to (endCol, endRow).
 * Returns an array of {col, row} steps (excluding start, including end),
 * or empty array if no path exists.
 */
export function findPath(grid, startCol, startRow, endCol, endRow) {
  if (startCol === endCol && startRow === endRow) return [];
  if (!isWalkable(grid[endRow]?.[endCol])) return [];

  const key = (c, r) => `${c},${r}`;
  const visited = new Set();
  const parent = new Map();

  const queue = [{ col: startCol, row: startRow }];
  visited.add(key(startCol, startRow));

  const dirs = [
    { dc: 0, dr: -1 }, // up
    { dc: 0, dr: 1 },  // down
    { dc: -1, dr: 0 }, // left
    { dc: 1, dr: 0 },  // right
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.col === endCol && current.row === endRow) {
      // Reconstruct path
      const path = [];
      let node = { col: endCol, row: endRow };
      while (node.col !== startCol || node.row !== startRow) {
        path.unshift(node);
        node = parent.get(key(node.col, node.row));
      }
      return path;
    }

    for (const { dc, dr } of dirs) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      const k = key(nc, nr);

      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (visited.has(k)) continue;
      if (!isWalkable(grid[nr][nc])) continue;

      visited.add(k);
      parent.set(k, { col: current.col, row: current.row });
      queue.push({ col: nc, row: nr });
    }
  }

  return []; // no path found
}
