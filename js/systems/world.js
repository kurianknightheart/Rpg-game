// World generation and overworld movement system.

import { PerlinNoise, randInt, pick } from '../utils/rng.js';
import { findPath } from '../utils/math.js';
import { NAMED_SETTLEMENTS, generateSettlement, SETTLEMENT_TYPES } from '../../data/settlements.js';
import { ENCOUNTER_GROUPS, ENEMIES } from '../../data/enemies.js';

// Tile type constants
const T_PLAINS     = 0;
const T_FOREST     = 1;
const T_HILLS      = 2;
const T_MOUNTAINS  = 3;
const T_SWAMP      = 4;
const T_SNOW       = 5;
const T_ROAD       = 6;
const T_WATER      = 7;
const T_SETTLEMENT = 8;

// Movement cost per tile type
const MOVE_COST = {
  [T_PLAINS]:    1,
  [T_FOREST]:    2,
  [T_HILLS]:     2,
  [T_MOUNTAINS]: 4,
  [T_SWAMP]:     3,
  [T_SNOW]:      2,
  [T_ROAD]:      0.5,
  [T_WATER]:     Infinity,
  [T_SETTLEMENT]: 1,
};

// Hours of travel per tile
const HOURS_PER_TILE = {
  [T_PLAINS]:    2,
  [T_FOREST]:    4,
  [T_HILLS]:     4,
  [T_MOUNTAINS]: 8,
  [T_SWAMP]:     6,
  [T_SNOW]:      4,
  [T_ROAD]:      1,
  [T_WATER]:     0,
  [T_SETTLEMENT]: 2,
};

let _partyIdCounter = 0;
function _epId() { return `ep_${Date.now()}_${++_partyIdCounter}`; }

// -------------------------------------------------------------------------
// World generation
// -------------------------------------------------------------------------

/**
 * Procedurally generate a world of width x height isometric tiles.
 * Returns { tiles, settlements, enemyParties, partyStart }
 */
export function generateWorld(width, height, rng) {
  const fn = rng || Math.random;
  const noiseSeed = Math.floor(fn() * 0xffffff);
  const noise = new PerlinNoise(noiseSeed);
  const noise2 = new PerlinNoise(noiseSeed + 12345);

  // Build height and humidity maps using octave noise
  const heightMap = [];
  const humidMap  = [];
  for (let row = 0; row < height; row++) {
    heightMap[row] = [];
    humidMap[row]  = [];
    for (let col = 0; col < width; col++) {
      // Normalize to 0..1
      const h = (noise.octave(col, row, 4, 0.5, 0.07) + 1) / 2;
      const m = (noise2.octave(col, row, 3, 0.5, 0.09) + 1) / 2;
      heightMap[row][col] = h;
      humidMap[row][col]  = m;
    }
  }

  // Create tiles
  const tiles = [];
  for (let row = 0; row < height; row++) {
    tiles[row] = [];
    for (let col = 0; col < width; col++) {
      const h = heightMap[row][col];
      const m = humidMap[row][col];
      let type;

      if (h < 0.18) {
        type = T_WATER;
      } else if (h < 0.28) {
        type = m > 0.55 ? T_SWAMP : T_PLAINS;
      } else if (h < 0.5) {
        type = m > 0.6 ? T_FOREST : T_PLAINS;
      } else if (h < 0.7) {
        type = m > 0.45 ? T_FOREST : T_HILLS;
      } else if (h < 0.85) {
        type = T_MOUNTAINS;
      } else {
        type = T_SNOW;
      }

      tiles[row][col] = {
        type,
        col,
        row,
        explored: false,
        settlementId: null,
        enemyPartyId: null,
      };
    }
  }

  // Place named settlements
  const settlements = [];
  const settlementTypes = ['city', 'town', 'town', 'village', 'village', 'fort', 'town'];
  const usedPositions = new Set();

  let namedIndex = 0;
  const targetCount = 4 + Math.floor(fn() * 5); // 4-8

  for (let attempt = 0; attempt < 200 && settlements.length < targetCount; attempt++) {
    let col, row;
    if (namedIndex < NAMED_SETTLEMENTS.length) {
      // Use predefined named settlements but place them on valid terrain
      const ns = NAMED_SETTLEMENTS[namedIndex];
      col = Math.min(width - 2, Math.max(1, Math.floor(ns.x * width / 40)));
      row = Math.min(height - 2, Math.max(1, Math.floor(ns.y * height / 40)));
      namedIndex++;
    } else {
      col = 2 + Math.floor(fn() * (width - 4));
      row = 2 + Math.floor(fn() * (height - 4));
    }

    const key = `${col},${row}`;
    if (usedPositions.has(key)) continue;

    const tile = tiles[row][col];
    if (!tile || tile.type === T_WATER || tile.type === T_MOUNTAINS || tile.type === T_SNOW) continue;

    // Check distance from other settlements
    let tooClose = false;
    for (const s of settlements) {
      const dx = s.col - col;
      const dy = s.row - row;
      if (Math.sqrt(dx * dx + dy * dy) < 5) { tooClose = true; break; }
    }
    if (tooClose) continue;

    usedPositions.add(key);

    const sType = namedIndex <= NAMED_SETTLEMENTS.length
      ? (NAMED_SETTLEMENTS[namedIndex - 1] ? NAMED_SETTLEMENTS[namedIndex - 1].type : settlementTypes[settlements.length % settlementTypes.length])
      : settlementTypes[settlements.length % settlementTypes.length];

    const sName = (namedIndex > 0 && namedIndex <= NAMED_SETTLEMENTS.length)
      ? NAMED_SETTLEMENTS[namedIndex - 1].name
      : `Settlement ${settlements.length + 1}`;

    const settlement = generateSettlement(sType, sName, col, row);
    settlement.col = col;
    settlement.row = row;
    settlement.id = `s_${settlements.length}`;

    settlements.push(settlement);
    tile.settlementId = settlement.id;
    tile.type = T_SETTLEMENT;
  }

  // Carve roads between adjacent settlements
  if (settlements.length >= 2) {
    for (let i = 0; i < settlements.length - 1; i++) {
      const from = settlements[i];
      const to   = settlements[i + 1];
      _carveRoad(tiles, from.col, from.row, to.col, to.row, width, height);
    }
  }

  // Place enemy parties
  const enemyParties = [];
  const enemyCount = 5 + Math.floor(fn() * 8); // 5-12
  const factionKeys = Object.keys(ENCOUNTER_GROUPS);

  for (let attempt = 0; attempt < 300 && enemyParties.length < enemyCount; attempt++) {
    const col = 1 + Math.floor(fn() * (width - 2));
    const row = 1 + Math.floor(fn() * (height - 2));
    const tile = tiles[row][col];
    if (!tile || tile.type === T_WATER || tile.type === T_SETTLEMENT || tile.enemyPartyId) continue;

    const strength = 1 + Math.floor(fn() * 4);
    const type = factionKeys[Math.floor(fn() * factionKeys.length)];
    const ep = generateEnemyParty(type, strength, fn);
    ep.col = col;
    ep.row = row;
    enemyParties.push(ep);
    tile.enemyPartyId = ep.id;
  }

  // Find a safe starting position for the party (near a settlement)
  let partyStart = { col: 5, row: 5 };
  if (settlements.length > 0) {
    const s = settlements[0];
    partyStart = { col: s.col, row: Math.max(0, s.row - 1) };
  }

  return { tiles, settlements, enemyParties, partyStart };
}

/** Carve a road path between two grid points using simple straight-line stepping. */
function _carveRoad(tiles, c1, r1, c2, r2, width, height) {
  let col = c1;
  let row = r1;

  while (col !== c2 || row !== r2) {
    const tile = tiles[row] && tiles[row][col];
    if (tile && tile.type !== T_WATER && tile.type !== T_SETTLEMENT) {
      tile.type = T_ROAD;
    }
    const dc = c2 - col;
    const dr = r2 - row;
    if (Math.abs(dc) > Math.abs(dr)) {
      col += dc > 0 ? 1 : -1;
    } else if (dr !== 0) {
      row += dr > 0 ? 1 : -1;
    } else {
      col += dc > 0 ? 1 : -1;
    }
    col = Math.max(0, Math.min(width - 1, col));
    row = Math.max(0, Math.min(height - 1, row));
  }
}

// -------------------------------------------------------------------------
// Party movement
// -------------------------------------------------------------------------

/**
 * Start moving party toward target using BFS pathfinding.
 * Sets state.world.moveTarget and state.world.movePath.
 */
export function moveParty(state, targetCol, targetRow) {
  const { tiles, width, height, partyPos } = state.world;

  // Check target is passable
  const targetTile = tiles[targetRow] && tiles[targetRow][targetCol];
  if (!targetTile || MOVE_COST[targetTile.type] === Infinity) return;

  // BFS pathfinding
  const path = findPath(
    tiles,
    partyPos.col, partyPos.row,
    targetCol, targetRow,
    width, height,
    (c, r) => {
      const t = tiles[r] && tiles[r][c];
      return t && MOVE_COST[t.type] !== Infinity;
    }
  );

  if (path && path.length > 0) {
    state.world.moveTarget = { col: targetCol, row: targetRow };
    // findPath returns {x, y} - map to {col, row}
    state.world.movePath = path.map(p => ({ col: p.x, row: p.y }));
    state.world.moveProgress = 0;
  }
}

/**
 * Update party movement each tick.
 * deltaTime in seconds; movement speed is ~1 tile per HOURS_PER_TILE real-world hours (scaled).
 * For game purposes we treat each path step as instant (turn-based movement).
 * Returns null | { type, ... }
 */
export function updateWorldMovement(state, deltaTime) {
  const world = state.world;
  if (!world.movePath || world.movePath.length === 0) return null;

  // Advance one step per call (turn-based feel)
  const nextStep = world.movePath.shift();
  if (!nextStep) {
    world.moveTarget = null;
    world.movePath = [];
    return null;
  }

  const prevTile = world.tiles[world.partyPos.row] && world.tiles[world.partyPos.row][world.partyPos.col];
  world.partyPos = { col: nextStep.col, row: nextStep.row };

  // Reveal fog around new position
  revealFog(state, nextStep.col, nextStep.row, 3);

  // Advance game time
  const tile = world.tiles[nextStep.row] && world.tiles[nextStep.row][nextStep.col];
  const hoursUsed = tile ? (HOURS_PER_TILE[tile.type] || 2) : 2;
  _advanceTime(state, hoursUsed);

  // Clear movePath if reached target
  if (world.movePath.length === 0) {
    world.moveTarget = null;
  }

  // Check for settlement
  const settlement = getSettlementAt(state, nextStep.col, nextStep.row);
  if (settlement) {
    return { type: 'settlement', settlement };
  }

  // Check for nearby enemies
  const enemy = getEnemyPartyAt(state, nextStep.col, nextStep.row, 0);
  if (enemy) {
    return { type: 'encounter', party: enemy };
  }

  return null;
}

function _advanceTime(state, hours) {
  state.hour = (state.hour || 6) + hours;
  while (state.hour >= 24) {
    state.hour -= 24;
    state.day = (state.day || 1) + 1;
    // Daily events handled elsewhere
  }
}

// -------------------------------------------------------------------------
// Fog of War
// -------------------------------------------------------------------------

/**
 * Mark tiles within radius of (col, row) as explored.
 */
export function revealFog(state, col, row, radius = 3) {
  const { tiles, width, height } = state.world;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr * dr + dc * dc > radius * radius) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= height || c < 0 || c >= width) continue;
      const tile = tiles[r][c];
      if (tile) {
        tile.explored = true;
        if (state.world.explored) state.world.explored.add(`${c},${r}`);
      }
    }
  }
}

// -------------------------------------------------------------------------
// Enemy party generation
// -------------------------------------------------------------------------

/**
 * Generate an enemy party object.
 */
export function generateEnemyParty(type, strength, rng) {
  const fn = rng || Math.random;
  const group = ENCOUNTER_GROUPS[type];
  const units = [];

  if (group) {
    for (const entry of group.enemies) {
      const count = entry.count[0] + Math.floor(fn() * (entry.count[1] - entry.count[0] + 1));
      const enemyTemplate = ENEMIES[entry.type];
      for (let i = 0; i < count; i++) {
        if (!enemyTemplate) continue;
        const hp = enemyTemplate.hp[0] + Math.floor(fn() * (enemyTemplate.hp[1] - enemyTemplate.hp[0] + 1));
        const armor = enemyTemplate.armor[0] + Math.floor(fn() * (enemyTemplate.armor[1] - enemyTemplate.armor[0] + 1));
        units.push({
          id: `eu_${Date.now()}_${Math.floor(fn() * 99999)}`,
          templateId: entry.type,
          name: enemyTemplate.name,
          hp,
          maxHP: hp,
          armor,
          initiative: enemyTemplate.initiative[0] + Math.floor(fn() * (enemyTemplate.initiative[1] - enemyTemplate.initiative[0] + 1)),
          skills: { ...enemyTemplate.skills },
          equipment: { ...enemyTemplate.equipment },
          ai: enemyTemplate.ai,
          xpReward: enemyTemplate.xpReward,
          goldReward: enemyTemplate.goldReward,
          lootTable: enemyTemplate.lootTable || [],
        });
      }
    }
  }

  const factionMap = {
    bandit_patrol: 'bandits', bandit_camp: 'bandits',
    wolf_pack: 'animals', undead_horde: 'undead',
    goblin_raid: 'goblins', barbarian_warband: 'barbarians',
  };

  return {
    id: _epId(),
    type,
    col: 0,
    row: 0,
    units,
    strength,
    faction: factionMap[type] || 'unknown',
    alive: true,
    name: group ? group.name : type,
  };
}

// -------------------------------------------------------------------------
// Utility queries
// -------------------------------------------------------------------------

/** Return settlement at exact grid position, or null. */
export function getSettlementAt(state, col, row) {
  for (const s of state.world.settlements) {
    if (s.col === col && s.row === row) return s;
  }
  return null;
}

/** Return first alive enemy party within radius tiles of (col, row), or null. */
export function getEnemyPartyAt(state, col, row, radius = 1) {
  for (const ep of state.world.enemyParties) {
    if (!ep.alive) continue;
    const dx = ep.col - col;
    const dy = ep.row - row;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) return ep;
  }
  return null;
}

// ── Random roaming for all alive enemy parties ────────────────────────────

// 8-directional moves shuffled each call
const _ROAM_DIRS = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],       [1, 0],
  [-1, 1],[0, 1],[1, 1],
];

function _shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Move each alive enemy party one tile in a random passable direction.
 * Call periodically (e.g. every 8+ game-hours) from the game loop.
 * moveChance: probability (0–1) that a given party actually moves this tick.
 */
export function updateEnemyRoaming(state, moveChance = 0.45) {
  const { tiles, enemyParties, width, height, partyPos } = state.world;
  if (!enemyParties || !tiles) return;

  for (const ep of enemyParties) {
    if (!ep.alive) continue;
    if (Math.random() > moveChance) continue;

    const dirs = _shuffle(_ROAM_DIRS);
    for (const [dc, dr] of dirs) {
      const nc = ep.col + dc;
      const nr = ep.row + dr;
      if (nc < 0 || nr < 0 || nc >= width || nr >= height) continue;

      const tile = tiles[nr] && tiles[nr][nc];
      if (!tile) continue;
      const type = tile.type;
      // Impassable for roaming enemies
      if (type === T_WATER || type === T_MOUNTAINS || type === T_SETTLEMENT) continue;

      // Don't walk onto player position
      if (partyPos && nc === partyPos.col && nr === partyPos.row) continue;

      // Don't collide with another enemy party
      const occupied = enemyParties.some(
        p => p !== ep && p.alive && p.col === nc && p.row === nr
      );
      if (occupied) continue;

      ep.col = nc;
      ep.row = nr;
      break;
    }
  }
}
