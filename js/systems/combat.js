// Turn-based tactical combat system.

import { gainXP, gainSkillXP, getEffectiveSkill, getWeaponSkill, calculateDerivedStats } from './character.js';
import ITEMS from '../../data/items.js';
import ENEMIES from '../../data/enemies.js';

const COMBAT_W = 10;
const COMBAT_H = 8;

// Combat tile type constants
const CT_GRASS = 0;
const CT_TREES = 1;
const CT_ROCKS = 2;
const CT_MUD   = 3;

// Tile terrain by world terrain type (rough mapping)
const WORLD_TO_COMBAT_TILE = {
  0: CT_GRASS,  // plains
  1: CT_TREES,  // forest
  2: CT_ROCKS,  // hills
  3: CT_ROCKS,  // mountains
  4: CT_MUD,    // swamp
  5: CT_GRASS,  // snow
  6: CT_GRASS,  // road
  7: CT_GRASS,  // water (shouldn't happen)
  8: CT_GRASS,  // settlement
};

let _unitIdCounter = 0;
function _uid() { return `cu_${Date.now()}_${++_unitIdCounter}`; }

// -------------------------------------------------------------------------
// Combat initialisation
// -------------------------------------------------------------------------

/**
 * Set up combat state from player party and enemy party.
 * @param {object} state       - game state singleton
 * @param {Array}  playerParty - array of Character objects
 * @param {object} enemyParty  - enemy party object from world
 * @param {number} terrainType - world tile type of combat location
 */
export function initCombat(state, playerParty, enemyParty, terrainType = 0) {
  const combatTileType = WORLD_TO_COMBAT_TILE[terrainType] !== undefined
    ? WORLD_TO_COMBAT_TILE[terrainType]
    : CT_GRASS;

  // Generate combat tile grid
  const tiles = [];
  for (let row = 0; row < COMBAT_H; row++) {
    tiles[row] = [];
    for (let col = 0; col < COMBAT_W; col++) {
      // Scatter some terrain features
      let type = combatTileType;
      const r = Math.random();
      if (r < 0.08) type = CT_ROCKS;
      else if (r < 0.15 && combatTileType !== CT_MUD) type = CT_TREES;
      tiles[row][col] = { type, col, row, passable: true };
    }
  }

  // Create combat units from player characters
  const units = [];
  let playerRow = 0;
  for (const char of playerParty) {
    if (!char.alive || char.hp <= 0) continue;
    const weapon = char.equipment.mainhand ? ITEMS[char.equipment.mainhand] : null;
    const headArmor = char.equipment.head ? ITEMS[char.equipment.head] : null;
    const bodyArmor = char.equipment.body ? ITEMS[char.equipment.body] : null;
    const totalArmor = (bodyArmor ? bodyArmor.armor : 0) + (headArmor ? headArmor.armor : 0);
    const skillKey = getWeaponSkill(char, weapon);

    units.push({
      id: _uid(),
      name: char.name,
      col: 0,
      row: Math.min(COMBAT_H - 1, playerRow++),
      hp: char.hp,
      maxHP: char.maxHP,
      stamina: char.stamina,
      maxStamina: char.maxStamina,
      armor: totalArmor,
      isPlayer: true,
      char,                   // reference to source character
      baseAttack: weapon ? weapon.damage : [3, 8],
      hitChance: 50 + Math.floor(getEffectiveSkill(char, skillKey) / 2),
      armorPen: weapon ? (weapon.armorPen || 0) : 0,
      weaponRange: weapon ? (weapon.range || 1) : 1,
      morale: char.morale,
      acted: false,
      initiative: char.initiative,
      initiativeOrder: 0,
    });
  }

  // Create combat units from enemy units
  let enemyRow = 0;
  for (const eu of (enemyParty.units || [])) {
    const enemyTmpl = ENEMIES[eu.templateId] || {};
    const mainSkill = Object.keys(eu.skills || {})[0] || 'swords';
    const skillVal = eu.skills ? (eu.skills[mainSkill] || 20) : 20;
    const weapon = eu.equipment && eu.equipment.mainhand ? ITEMS[eu.equipment.mainhand] : null;

    units.push({
      id: _uid(),
      name: eu.name,
      col: COMBAT_W - 1,
      row: Math.min(COMBAT_H - 1, enemyRow++),
      hp: eu.hp,
      maxHP: eu.maxHP,
      stamina: 50,
      maxStamina: 50,
      armor: eu.armor,
      isPlayer: false,
      sourceUnit: eu,
      baseAttack: weapon ? weapon.damage : [3, 12],
      hitChance: 40 + Math.floor(skillVal / 2),
      armorPen: weapon ? (weapon.armorPen || 0) : 0,
      weaponRange: weapon ? (weapon.range || 1) : 1,
      morale: 50,
      acted: false,
      initiative: eu.initiative || 50,
      initiativeOrder: 0,
      ai: eu.ai || 'aggressive',
      xpReward: eu.xpReward || 20,
    });
  }

  // Sort by initiative descending to build turn order
  units.sort((a, b) => b.initiative - a.initiative);
  for (let i = 0; i < units.length; i++) {
    units[i].initiativeOrder = i;
  }

  state.combat = {
    active: true,
    tiles,
    width: COMBAT_W,
    height: COMBAT_H,
    units,
    turnOrder: units.map(u => u.id),
    currentTurnIndex: 0,
    round: 1,
    selectedUnit: units.find(u => u.isPlayer) || null,
    highlightedTiles: [],
    log: [],
    enemyPartyRef: enemyParty,
    result: null,
  };
}

// -------------------------------------------------------------------------
// Movement helpers
// -------------------------------------------------------------------------

/**
 * BFS to find all tiles a unit can move to within range.
 * Range is based on unit speed (simplified: 3 tiles default).
 */
export function getMovableTiles(state, unit) {
  const { tiles, width, height, units } = state.combat;
  const moveRange = 3;
  const occupied = new Set(units.filter(u => u.hp > 0 && u !== unit).map(u => `${u.col},${u.row}`));

  const reachable = [];
  const visited = new Map(); // key -> cost
  const queue = [{ col: unit.col, row: unit.row, cost: 0 }];
  visited.set(`${unit.col},${unit.row}`, 0);

  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];

  while (queue.length > 0) {
    const { col, row, cost } = queue.shift();
    for (const [dc, dr] of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= width || nr >= height) continue;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      if (occupied.has(key)) continue;
      const t = tiles[nr][nc];
      if (!t || !t.passable) continue;

      // Tile movement cost
      const tileCost = t.type === CT_ROCKS ? 2 : t.type === CT_MUD ? 2 : 1;
      const newCost = cost + tileCost;
      if (newCost > moveRange) continue;

      visited.set(key, newCost);
      reachable.push({ col: nc, row: nr });
      queue.push({ col: nc, row: nr, cost: newCost });
    }
  }

  return reachable;
}

/**
 * Get all tiles that could be attacked from unit's current position.
 * Uses weapon range. Returns tiles containing enemies.
 */
export function getAttackableTiles(state, unit) {
  const { units } = state.combat;
  const range = unit.weaponRange || 1;
  const enemies = units.filter(u => u.hp > 0 && u.isPlayer !== unit.isPlayer);

  return enemies
    .filter(e => {
      const dx = Math.abs(e.col - unit.col);
      const dy = Math.abs(e.row - unit.row);
      // Chebyshev distance for grid range
      return Math.max(dx, dy) <= range;
    })
    .map(e => ({ col: e.col, row: e.row, unitId: e.id }));
}

// -------------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------------

/** Move a unit to target position. Costs stamina. */
export function moveUnit(state, unit, col, row) {
  const dx = Math.abs(col - unit.col);
  const dy = Math.abs(row - unit.row);
  const dist = Math.max(dx, dy);

  unit.col = col;
  unit.row = row;
  unit.stamina = Math.max(0, unit.stamina - dist * 3);

  _logCombat(state, `${unit.name} moves to (${col}, ${row}).`);
}

/**
 * Resolve an attack from attacker against target.
 * Returns { hit, damage, reducedDamage, killed }
 */
export function attackUnit(state, attacker, target) {
  // Hit chance calculation
  const defDodge = 10 + Math.floor((target.isPlayer && target.char
    ? target.char.attributes.dex : 5) / 2);
  const hitRoll = Math.floor(Math.random() * 100);
  const hit = hitRoll < (attacker.hitChance - defDodge);

  if (!hit) {
    _logCombat(state, `${attacker.name} misses ${target.name}.`);
    // Still gain small skill XP on miss
    if (attacker.isPlayer && attacker.char) {
      const weapon = attacker.char.equipment.mainhand ? ITEMS[attacker.char.equipment.mainhand] : null;
      const skillKey = getWeaponSkill(attacker.char, weapon);
      gainSkillXP(attacker.char, skillKey, 0.5);
    }
    return { hit: false, damage: 0, reducedDamage: 0, killed: false };
  }

  // Roll damage
  const dmgMin = attacker.baseAttack[0];
  const dmgMax = attacker.baseAttack[1];
  const rawDamage = dmgMin + Math.floor(Math.random() * (dmgMax - dmgMin + 1));

  // Armor reduction: damage * (1 - armor / (armor + 50)) * (1 - armorPen/100)
  const armorFactor = target.armor / (target.armor + 50);
  const penFactor = 1 - (attacker.armorPen || 0) / 100;
  const reducedDamage = Math.max(1, Math.round(rawDamage * (1 - armorFactor) * penFactor));

  target.hp = Math.max(0, target.hp - reducedDamage);

  // Sync hp back to source character
  if (target.isPlayer && target.char) {
    target.char.hp = target.hp;
  }

  _logCombat(state, `${attacker.name} hits ${target.name} for ${reducedDamage} damage (${rawDamage} raw).`);

  const killed = target.hp <= 0;
  if (killed) {
    _logCombat(state, `${target.name} is slain!`);
    if (target.isPlayer && target.char) {
      target.char.alive = false;
      target.char.hp = 0;
    }
  }

  // Gain skill XP for attacker
  if (attacker.isPlayer && attacker.char) {
    const weapon = attacker.char.equipment.mainhand ? ITEMS[attacker.char.equipment.mainhand] : null;
    const skillKey = getWeaponSkill(attacker.char, weapon);
    gainSkillXP(attacker.char, skillKey, killed ? 3 : 1.5);
  }

  return { hit: true, damage: rawDamage, reducedDamage, killed };
}

// -------------------------------------------------------------------------
// Turn management
// -------------------------------------------------------------------------

/**
 * Advance to the next unit in turn order.
 * Returns { roundComplete, nextUnit }
 */
export function endTurn(state) {
  const { units, turnOrder } = state.combat;
  state.combat.currentTurnIndex++;

  // Skip dead units
  let safetyCounter = 0;
  while (safetyCounter < turnOrder.length * 2) {
    if (state.combat.currentTurnIndex >= turnOrder.length) {
      // New round
      state.combat.currentTurnIndex = 0;
      state.combat.round++;
      for (const u of units) {
        u.acted = false;
        // Recover some stamina each round
        u.stamina = Math.min(u.maxStamina, u.stamina + 10);
      }
      // Rebuild turn order (remove dead units)
      state.combat.turnOrder = units
        .filter(u => u.hp > 0)
        .sort((a, b) => b.initiative - a.initiative)
        .map(u => u.id);

      if (state.combat.turnOrder.length === 0) {
        return { roundComplete: true, nextUnit: null };
      }
    }

    const nextId = turnOrder[state.combat.currentTurnIndex];
    const nextUnit = units.find(u => u.id === nextId);
    if (nextUnit && nextUnit.hp > 0) {
      state.combat.selectedUnit = nextUnit.isPlayer ? nextUnit : null;
      state.combat.highlightedTiles = [];
      return { roundComplete: state.combat.currentTurnIndex === 0, nextUnit };
    }
    state.combat.currentTurnIndex++;
    safetyCounter++;
  }

  return { roundComplete: true, nextUnit: null };
}

// -------------------------------------------------------------------------
// Combat end conditions
// -------------------------------------------------------------------------

/**
 * Check if combat should end.
 * Returns 'player_win' | 'enemy_win' | 'retreat' | null
 */
export function checkCombatEnd(state) {
  if (state.combat.result) return state.combat.result;

  const { units } = state.combat;
  const playersAlive = units.some(u => u.isPlayer && u.hp > 0);
  const enemiesAlive = units.some(u => !u.isPlayer && u.hp > 0);

  if (!playersAlive) return 'enemy_win';
  if (!enemiesAlive) return 'player_win';
  return null;
}

/**
 * Generate loot items from defeated enemies.
 * Returns array of { itemId, qty }.
 */
export function generateLoot(state, enemyParty) {
  const loot = [];
  let totalGold = 0;

  for (const unit of (enemyParty.units || [])) {
    if (!unit.lootTable) continue;
    for (const entry of unit.lootTable) {
      if (Math.random() < entry.chance) {
        const qty = entry.count
          ? entry.count[0] + Math.floor(Math.random() * (entry.count[1] - entry.count[0] + 1))
          : 1;
        loot.push({ itemId: entry.item, qty });
      }
    }
    // Gold reward
    const goldMin = unit.goldReward ? unit.goldReward[0] : 0;
    const goldMax = unit.goldReward ? unit.goldReward[1] : 0;
    if (goldMax > 0) {
      totalGold += goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
    }
  }

  if (totalGold > 0) {
    loot.push({ itemId: 'gold_coin', qty: totalGold, isGold: true });
  }

  return loot;
}

/**
 * Mark combat as retreat and end it.
 */
export function retreatCombat(state) {
  state.combat.result = 'retreat';
  _logCombat(state, 'The company retreats from battle!');
  // Morale penalty
  state.company.morale = Math.max(0, state.company.morale - 10);
  endCombat(state, 'retreat');
}

/**
 * Clean up combat state, award XP, sync characters.
 * @param {object} state
 * @param {string} result - 'player_win' | 'enemy_win' | 'retreat'
 */
export function endCombat(state, result) {
  state.combat.result = result;
  state.combat.active = false;

  const ep = state.combat.enemyPartyRef;

  if (result === 'player_win') {
    // Mark enemy party as dead
    if (ep) ep.alive = false;

    // Award XP to surviving player units
    const xpTotal = state.combat.units
      .filter(u => !u.isPlayer && u.hp <= 0)
      .reduce((sum, u) => sum + (u.xpReward || 20), 0);

    const survivors = state.combat.units.filter(u => u.isPlayer && u.hp > 0);
    if (survivors.length > 0) {
      const xpPer = Math.ceil(xpTotal / survivors.length);
      for (const u of survivors) {
        if (u.char) gainXP(u.char, xpPer);
      }
    }

    // Sync HP back to characters
    for (const u of state.combat.units) {
      if (u.isPlayer && u.char) {
        u.char.hp = u.hp;
        u.char.stamina = u.stamina;
      }
    }
  } else if (result === 'enemy_win') {
    state.company.morale = Math.max(0, state.company.morale - 20);
  }

  _logCombat(state, `Combat ended: ${result}.`);
}

function _logCombat(state, msg) {
  if (!state.combat.log) state.combat.log = [];
  state.combat.log.push(msg);
  // Keep log manageable
  if (state.combat.log.length > 100) state.combat.log.shift();
}
