// Math helper utilities

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function distManhattan(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export function distChebyshev(x1, y1, x2, y2) {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// Isometric conversions
export function cartToIso(cartX, cartY, tileW, tileH) {
  return {
    x: (cartX - cartY) * (tileW / 2),
    y: (cartX + cartY) * (tileH / 2)
  };
}

export function isoToCart(isoX, isoY, tileW, tileH) {
  return {
    x: Math.floor((isoX / (tileW / 2) + isoY / (tileH / 2)) / 2),
    y: Math.floor((isoY / (tileH / 2) - isoX / (tileW / 2)) / 2)
  };
}

// Screen to tile coordinate for isometric grid
export function screenToTile(screenX, screenY, camX, camY, tileW, tileH) {
  const worldX = screenX + camX;
  const worldY = screenY + camY;
  return isoToCart(worldX, worldY, tileW, tileH);
}

export function tileToScreen(tileX, tileY, camX, camY, tileW, tileH) {
  const iso = cartToIso(tileX, tileY, tileW, tileH);
  return {
    x: iso.x - camX,
    y: iso.y - camY
  };
}

export function normalizeAngle(angle) {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

export function sign(x) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

export function roundTo(n, places) {
  const factor = Math.pow(10, places);
  return Math.round(n * factor) / factor;
}

// Percentage calculation
export function pct(value, max) {
  if (max === 0) return 0;
  return clamp(value / max, 0, 1);
}

// Weighted random selection
export function weightedRandom(items) {
  // items: array of { weight, ... }
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

// Simple path finding (BFS) for grid
export function findPath(grid, startX, startY, endX, endY, maxWidth, maxHeight, isPassable) {
  if (startX === endX && startY === endY) return [];

  const queue = [[startX, startY]];
  const visited = new Set();
  const parent = new Map();
  const key = (x, y) => `${x},${y}`;

  visited.add(key(startX, startY));

  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();

    if (cx === endX && cy === endY) {
      // Reconstruct path
      const path = [];
      let cur = key(endX, endY);
      while (parent.has(cur)) {
        const [px, py] = cur.split(',').map(Number);
        path.unshift({ x: px, y: py });
        cur = parent.get(cur);
      }
      return path;
    }

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);

      if (nx < 0 || ny < 0 || nx >= maxWidth || ny >= maxHeight) continue;
      if (visited.has(nk)) continue;
      if (!isPassable(nx, ny)) continue;

      visited.add(nk);
      parent.set(nk, key(cx, cy));
      queue.push([nx, ny]);
    }
  }

  return null; // no path
}

export default {
  clamp, lerp, dist, distManhattan, distChebyshev,
  cartToIso, isoToCart, screenToTile, tileToScreen,
  normalizeAngle, sign, roundTo, pct, weightedRandom, findPath
};
