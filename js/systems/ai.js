// Enemy AI system for combat
import { getMeleeHitChance, getRangedHitChance } from './character.js';
import { getMainWeapon } from './inventory.js';
import { distManhattan, distChebyshev } from '../utils/math.js';

// AI behavior types
export const AI_TYPES = {
  aggressive: 'aggressive',   // Move toward nearest enemy, attack
  ranged: 'ranged',           // Stay at range, shoot
  cowardly: 'cowardly',       // Attack but flee when low HP
  slow: 'slow',               // Plods forward, always attacks
  berserker: 'berserker',     // Ignores defense, always attacks nearest
  leader: 'leader',           // Buffs nearby allies, attacks carefully
  caster: 'caster',           // Stays back, special attacks
};

export class AIController {
  constructor(unit, combat) {
    this.unit = unit;
    this.combat = combat;
    this.aiType = unit.aiType || 'aggressive';
  }

  // Decide and execute AI action
  takeTurn() {
    const unit = this.unit;
    const combat = this.combat;

    if (!unit.alive || unit.hp <= 0) return { type: 'skip' };

    const enemies = combat.getPlayerUnits().filter(u => u.alive && u.hp > 0);
    if (enemies.length === 0) return { type: 'skip' };

    switch (this.aiType) {
      case 'aggressive':
      case 'slow':
        return this._aggressiveAction(enemies);
      case 'ranged':
        return this._rangedAction(enemies);
      case 'berserker':
        return this._berserkerAction(enemies);
      case 'cowardly':
        return this._cowardlyAction(enemies);
      case 'leader':
        return this._aggressiveAction(enemies);
      case 'caster':
        return this._rangedAction(enemies);
      default:
        return this._aggressiveAction(enemies);
    }
  }

  _getNearestEnemy(enemies) {
    let nearest = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const d = distManhattan(this.unit.combatX, this.unit.combatY, e.combatX, e.combatY);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  _aggressiveAction(enemies) {
    const unit = this.unit;
    const target = this._getNearestEnemy(enemies);
    if (!target) return { type: 'skip' };

    const weapon = getMainWeapon(unit);
    const range = weapon ? weapon.range : 1;
    const dist = distChebyshev(unit.combatX, unit.combatY, target.combatX, target.combatY);

    if (dist <= range) {
      // Attack
      return { type: 'attack', target, weapon };
    } else {
      // Move toward target
      const move = this._getMoveToward(target, range);
      return { type: 'move', ...move };
    }
  }

  _rangedAction(enemies) {
    const unit = this.unit;
    const target = this._getNearestEnemy(enemies);
    if (!target) return { type: 'skip' };

    const weapon = getMainWeapon(unit);
    const range = weapon ? weapon.range : 4;
    const dist = distChebyshev(unit.combatX, unit.combatY, target.combatX, target.combatY);

    // Try to maintain range
    if (dist <= 1) {
      // Too close - try to back away
      const retreat = this._getRetreatFrom(target);
      if (retreat) return { type: 'move', ...retreat };
      return { type: 'attack', target, weapon };
    }

    if (dist <= range) {
      return { type: 'attack', target, weapon };
    } else {
      const move = this._getMoveToward(target, Math.floor(range * 0.7));
      return { type: 'move', ...move };
    }
  }

  _berserkerAction(enemies) {
    // Always attack the most wounded enemy
    const unit = this.unit;
    let target = enemies.reduce((a, b) =>
      (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b
    );

    const weapon = getMainWeapon(unit);
    const range = weapon ? weapon.range : 1;
    const dist = distChebyshev(unit.combatX, unit.combatY, target.combatX, target.combatY);

    if (dist <= range) {
      return { type: 'attack', target, weapon };
    } else {
      const move = this._getMoveToward(target, range);
      return { type: 'move', ...move };
    }
  }

  _cowardlyAction(enemies) {
    const unit = this.unit;
    // If below 30% HP, try to flee
    if (unit.hp / unit.maxHp < 0.3) {
      // Move away from nearest enemy
      const target = this._getNearestEnemy(enemies);
      if (target) {
        const retreat = this._getRetreatFrom(target);
        if (retreat) return { type: 'move', ...retreat };
      }
    }
    return this._aggressiveAction(enemies);
  }

  _getMoveToward(target, preferRange = 1) {
    const unit = this.unit;
    const combat = this.combat;
    const tx = target.combatX;
    const ty = target.combatY;
    const dx = tx - unit.combatX;
    const dy = ty - unit.combatY;

    // Try to move one step toward target
    const candidates = [];

    if (dx !== 0) candidates.push({ nx: unit.combatX + Math.sign(dx), ny: unit.combatY });
    if (dy !== 0) candidates.push({ nx: unit.combatX, ny: unit.combatY + Math.sign(dy) });
    // Diagonal
    if (dx !== 0 && dy !== 0) {
      candidates.push({ nx: unit.combatX + Math.sign(dx), ny: unit.combatY + Math.sign(dy) });
    }

    // Sort by distance to target's range
    candidates.sort((a, b) => {
      const da = distChebyshev(a.nx, a.ny, tx, ty);
      const db = distChebyshev(b.nx, b.ny, tx, ty);
      return Math.abs(da - preferRange) - Math.abs(db - preferRange);
    });

    for (const { nx, ny } of candidates) {
      if (combat.isCellPassable(nx, ny)) {
        return { x: nx, y: ny };
      }
    }

    return { x: unit.combatX, y: unit.combatY }; // Stay put
  }

  _getRetreatFrom(threat) {
    const unit = this.unit;
    const combat = this.combat;
    const dx = unit.combatX - threat.combatX;
    const dy = unit.combatY - threat.combatY;

    // Move in opposite direction
    const candidates = [
      { nx: unit.combatX + Math.sign(dx), ny: unit.combatY + Math.sign(dy) },
      { nx: unit.combatX + Math.sign(dx), ny: unit.combatY },
      { nx: unit.combatX, ny: unit.combatY + Math.sign(dy) },
    ];

    for (const { nx, ny } of candidates) {
      if (combat.isCellPassable(nx, ny)) {
        return { x: nx, y: ny };
      }
    }
    return null;
  }
}

export default AIController;

// Free-function API for main.js

/**
 * Run the AI turn for all enemy units in combat state.
 * Called from combat-ui.js after player action.
 * @param {object} state - game state
 * @param {object} combatSystem - { moveUnit, attackUnit, endTurn }
 */
export function runEnemyAI(state, combatSystem) {
  if (!state.combat || !state.combat.active) return;

  const enemyUnits = (state.combat.enemyUnits || []).filter(u => u.alive && u.hp > 0);
  const playerUnits = (state.combat.playerUnits || []).filter(u => u.alive && u.hp > 0);

  if (playerUnits.length === 0 || enemyUnits.length === 0) return;

  for (const enemy of enemyUnits) {
    if (enemy.hasActed && enemy.hasMoved) continue;

    // Find nearest player
    let nearest = null;
    let minDist = Infinity;
    for (const pu of playerUnits) {
      const d = distManhattan(enemy.combatX, enemy.combatY, pu.combatX, pu.combatY);
      if (d < minDist) { minDist = d; nearest = pu; }
    }
    if (!nearest) continue;

    const weapon = getMainWeapon(enemy);
    const range = weapon ? weapon.range : 1;

    // Move if needed and not moved
    if (!enemy.hasMoved) {
      const dist = distChebyshev(enemy.combatX, enemy.combatY, nearest.combatX, nearest.combatY);
      if (dist > range) {
        // Move one step toward player
        const dx = nearest.combatX - enemy.combatX;
        const dy = nearest.combatY - enemy.combatY;
        const nx = enemy.combatX + Math.sign(dx);
        const ny = enemy.combatY + Math.sign(dy);
        // Check not occupied
        const occupied = (state.combat.units || []).some(u => u !== enemy && u.alive && u.combatX === nx && u.combatY === ny);
        if (!occupied && nx >= 0 && ny >= 0 && nx < state.combat.width && ny < state.combat.height) {
          if (combatSystem.moveUnit) {
            combatSystem.moveUnit(state, enemy, nx, ny);
          } else {
            enemy.combatX = nx;
            enemy.combatY = ny;
            enemy.hasMoved = true;
          }
        } else {
          enemy.hasMoved = true;
        }
      } else {
        enemy.hasMoved = true;
      }
    }

    // Attack if not acted and in range
    if (!enemy.hasActed) {
      const dist = distChebyshev(enemy.combatX, enemy.combatY, nearest.combatX, nearest.combatY);
      if (dist <= range) {
        if (combatSystem.attackUnit) {
          combatSystem.attackUnit(state, enemy, nearest);
        }
        enemy.hasActed = true;
      } else {
        enemy.hasActed = true;
      }
    }
  }
}
