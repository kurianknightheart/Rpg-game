// Combat interface UI
import state from '../state/gamestate.js';
import {
  initCombat, getMovableTiles, getAttackableTiles,
  moveUnit, attackUnit, endTurn, checkCombatEnd,
  retreatCombat, endCombat, generateLoot
} from '../systems/combat.js';
import { playSound } from '../engine/audio.js';
import ITEMS from '../../data/items.js';

const COMBAT_TILE_W = 64;
const COMBAT_TILE_H = 32;

export class CombatUI {
  constructor(canvas, hudEl) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.hud = hudEl;
    this.animating = false;
    this.damageNumbers = []; // { x, y, text, color, timer }
    this._boundClick = this._onCanvasClick.bind(this);
    this._boundRender = this._renderLoop.bind(this);
    this._rafId = null;
    this._enemyTurnTimer = 0;
    this._pendingEnemyTurn = false;
    this._offsetX = 0;
    this._offsetY = 0;
  }

  start(playerParty, enemyParty, terrainType = 0) {
    if (!this.canvas || !this.ctx) return;

    initCombat(state, playerParty, enemyParty, terrainType);
    this._computeOffset();

    // Bind input
    this.canvas.addEventListener('click', this._boundClick);

    this._renderLoop();
    this._updateHUD();

    playSound('combat_start');
  }

  stop() {
    this.canvas.removeEventListener('click', this._boundClick);
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _computeOffset() {
    if (!this.canvas) return;
    const cx = this.canvas.width;
    const cy = this.canvas.height;
    // Center the grid
    const gridW = (state.combat.width + state.combat.height) * COMBAT_TILE_W / 2;
    const gridH = (state.combat.width + state.combat.height) * COMBAT_TILE_H / 2;
    this._offsetX = cx / 2;
    this._offsetY = cy / 2 - gridH / 4;
  }

  _tileToScreen(col, row) {
    return {
      x: (col - row) * (COMBAT_TILE_W / 2) + this._offsetX,
      y: (col + row) * (COMBAT_TILE_H / 2) + this._offsetY,
    };
  }

  _screenToTile(sx, sy) {
    const wx = sx - this._offsetX;
    const wy = sy - this._offsetY;
    const col = Math.round(wx / (COMBAT_TILE_W / 2) / 2 + wy / (COMBAT_TILE_H / 2) / 2);
    const row = Math.round(wy / (COMBAT_TILE_H / 2) / 2 - wx / (COMBAT_TILE_W / 2) / 2);
    return { col, row };
  }

  _renderLoop() {
    this._render();
    this._rafId = requestAnimationFrame(this._boundRender);

    // Process pending enemy turn
    if (this._pendingEnemyTurn) {
      this._pendingEnemyTurn = false;
      setTimeout(() => this._processEnemyTurn(), 600);
    }

    // Tick damage numbers
    this.damageNumbers = this.damageNumbers.filter(d => {
      d.timer--;
      d.y -= 0.5;
      return d.timer > 0;
    });
  }

  _render() {
    if (!this.ctx || !state.combat.active) return;
    const ctx = this.ctx;
    const canvas = this.canvas;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this._renderTiles(ctx);
    this._renderHighlights(ctx);
    this._renderUnits(ctx);
    this._renderDamageNumbers(ctx);
    this._renderTurnIndicator(ctx);
  }

  _renderTiles(ctx) {
    const { tiles, width, height } = state.combat;
    const TILE_COLORS = ['#3a5a2a', '#1a3a1a', '#4a4a4a', '#3a2a1a'];

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const tile = tiles[row] && tiles[row][col];
        if (!tile) continue;
        const { x, y } = this._tileToScreen(col, row);

        ctx.beginPath();
        ctx.moveTo(x, y - COMBAT_TILE_H / 2);
        ctx.lineTo(x + COMBAT_TILE_W / 2, y);
        ctx.lineTo(x, y + COMBAT_TILE_H / 2);
        ctx.lineTo(x - COMBAT_TILE_W / 2, y);
        ctx.closePath();

        ctx.fillStyle = TILE_COLORS[tile.type] || TILE_COLORS[0];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  _renderHighlights(ctx) {
    const highlights = state.combat.highlightedTiles || [];
    for (const ht of highlights) {
      const { x, y } = this._tileToScreen(ht.col, ht.row);
      ctx.beginPath();
      ctx.moveTo(x, y - COMBAT_TILE_H / 2);
      ctx.lineTo(x + COMBAT_TILE_W / 2, y);
      ctx.lineTo(x, y + COMBAT_TILE_H / 2);
      ctx.lineTo(x - COMBAT_TILE_W / 2, y);
      ctx.closePath();
      ctx.fillStyle = ht.type === 'move' ? 'rgba(50,120,255,0.45)' : 'rgba(255,50,50,0.45)';
      ctx.fill();
      ctx.strokeStyle = ht.type === 'move' ? '#4488ff' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  _renderUnits(ctx) {
    const { units, selectedUnit } = state.combat;
    // Sort by row+col for painter's order
    const sorted = [...units].sort((a, b) => (a.row + a.col) - (b.row + b.col));

    for (const unit of sorted) {
      if (unit.hp <= 0) continue;
      const { x, y } = this._tileToScreen(unit.col, unit.row);
      const isSelected = selectedUnit && selectedUnit.id === unit.id;
      this._renderUnit(ctx, unit, x, y, isSelected);
    }
  }

  _renderUnit(ctx, unit, x, y, isSelected) {
    const r = 14;
    const uy = y - r * 0.5;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(x, uy, r, 0, Math.PI * 2);
    ctx.fillStyle = unit.isPlayer ? '#2266cc' : '#882222';
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = unit.isPlayer ? '#4488ff' : '#ff4444';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();

    // Letter
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.name.charAt(0).toUpperCase(), x, uy);
    ctx.textBaseline = 'alphabetic';

    // HP bar
    const barW = COMBAT_TILE_W * 0.65;
    const barH = 4;
    const barX = x - barW / 2;
    const barY = uy + r + 2;
    const hpPct = Math.max(0, unit.hp / unit.maxHP);
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.6 ? '#44cc44' : hpPct > 0.3 ? '#cccc22' : '#cc2222';
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // Acted marker
    if (unit.acted) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(x, uy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderDamageNumbers(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of this.damageNumbers) {
      const alpha = Math.min(1, d.timer / 20);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${d.size || 16}px sans-serif`;
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  _renderTurnIndicator(ctx) {
    const { units, currentTurnIndex, turnOrder, round } = state.combat;
    if (!turnOrder || turnOrder.length === 0) return;

    const currentId = turnOrder[currentTurnIndex];
    const currentUnit = units.find(u => u.id === currentId);
    if (!currentUnit) return;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 10, 200, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Round ${round}`, 15, 15);
    ctx.fillStyle = currentUnit.isPlayer ? '#4488ff' : '#ff4444';
    ctx.fillText(`Turn: ${currentUnit.name}`, 15, 32);
    ctx.textBaseline = 'alphabetic';
  }

  _updateHUD() {
    if (!this.hud) return;
    const { units, currentTurnIndex, turnOrder, round } = state.combat;
    const currentId = turnOrder ? turnOrder[currentTurnIndex] : null;
    const currentUnit = currentId ? units.find(u => u.id === currentId) : null;

    const playerUnits = units.filter(u => u.isPlayer);
    const enemyUnits = units.filter(u => !u.isPlayer);

    this.hud.innerHTML = `
      <div class="combat-hud-content">
        <div class="combat-turn-info">
          <span class="combat-round">Round ${round}</span>
          ${currentUnit ? `<span class="combat-turn ${currentUnit.isPlayer ? 'player' : 'enemy'}">
            ${currentUnit.name}'s Turn
          </span>` : ''}
        </div>
        <div class="combat-units-list">
          <div class="units-section">
            <strong>Your Company (${playerUnits.filter(u=>u.hp>0).length}/${playerUnits.length})</strong>
            ${playerUnits.map(u => this._renderUnitHUDItem(u, currentUnit)).join('')}
          </div>
          <div class="units-section enemy">
            <strong>Enemies (${enemyUnits.filter(u=>u.hp>0).length}/${enemyUnits.length})</strong>
            ${enemyUnits.map(u => this._renderUnitHUDItem(u, currentUnit)).join('')}
          </div>
        </div>
        <div class="combat-log" id="combat-log">
          ${(state.combat.log || []).slice(-6).map(l => `<div class="log-entry">${l}</div>`).join('')}
        </div>
        <div class="combat-actions">
          ${currentUnit && currentUnit.isPlayer ? `
            <button class="btn-combat-action" id="btn-end-turn">End Turn</button>
            <button class="btn-combat-action btn-retreat" id="btn-retreat">Retreat</button>
          ` : `<span class="enemy-turn-label">Enemy is acting...</span>`}
        </div>
      </div>
    `;

    const endTurnBtn = this.hud.querySelector('#btn-end-turn');
    if (endTurnBtn) {
      endTurnBtn.onclick = () => {
        this._endPlayerTurn();
      };
    }

    const retreatBtn = this.hud.querySelector('#btn-retreat');
    if (retreatBtn) {
      retreatBtn.onclick = () => {
        this._doRetreat();
      };
    }

    // Scroll log to bottom
    const log = this.hud.querySelector('#combat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  _renderUnitHUDItem(unit, currentUnit) {
    const hpPct = Math.max(0, unit.hp / unit.maxHP);
    const isCurrent = currentUnit && currentUnit.id === unit.id;
    const hpColor = hpPct > 0.5 ? '#44cc44' : hpPct > 0.25 ? '#cccc22' : '#cc2222';
    return `
      <div class="unit-hud-item ${isCurrent ? 'current' : ''} ${unit.hp <= 0 ? 'dead' : ''}">
        <span class="unit-letter">${unit.name.charAt(0)}</span>
        <span class="unit-name">${unit.name}</span>
        <div class="unit-hp-bar">
          <div style="width:${hpPct*100}%;background:${hpColor}"></div>
        </div>
        <span class="unit-hp">${unit.hp}/${unit.maxHP}</span>
      </div>
    `;
  }

  _onCanvasClick(e) {
    if (!state.combat.active) return;
    const { units, selectedUnit, currentTurnIndex, turnOrder } = state.combat;

    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const { col, row } = this._screenToTile(sx, sy);

    // Validate bounds
    if (col < 0 || col >= state.combat.width || row < 0 || row >= state.combat.height) return;

    const currentId = turnOrder[currentTurnIndex];
    const currentUnit = units.find(u => u.id === currentId);
    if (!currentUnit || !currentUnit.isPlayer) return;

    // Check if clicking on a unit
    const clickedUnit = units.find(u => u.col === col && u.row === row && u.hp > 0);

    if (clickedUnit && clickedUnit.isPlayer) {
      // Select the unit
      state.combat.selectedUnit = clickedUnit;
      state.combat.highlightedTiles = [];
      if (clickedUnit.id === currentUnit.id) {
        this._showMoveHighlights(currentUnit);
      }
      this._updateHUD();
      return;
    }

    // Check highlights
    const highlighted = (state.combat.highlightedTiles || []).find(h => h.col === col && h.row === row);

    if (highlighted) {
      if (highlighted.type === 'move' && !currentUnit.acted) {
        moveUnit(state, currentUnit, col, row);
        playSound('world_step');
        state.combat.highlightedTiles = this._getAttackHighlights(currentUnit);
        this._updateHUD();
      } else if (highlighted.type === 'attack' && !currentUnit.acted) {
        const target = units.find(u => u.col === col && u.row === row && u.hp > 0);
        if (target) {
          const result = attackUnit(state, currentUnit, target);
          playSound(result.hit ? 'combat_hit' : 'combat_miss');
          if (result.killed) playSound('combat_death');

          // Show damage number
          const { x, y } = this._tileToScreen(target.col, target.row);
          if (result.hit) {
            this.damageNumbers.push({
              x, y: y - 20, text: String(result.reducedDamage),
              color: result.killed ? '#ff8800' : '#ff4444', timer: 45, size: 18
            });
          } else {
            this.damageNumbers.push({ x, y: y - 20, text: 'MISS', color: '#aaaaaa', timer: 45, size: 14 });
          }

          state.combat.highlightedTiles = [];
          currentUnit.acted = true;

          const endResult = checkCombatEnd(state);
          if (endResult) {
            this._handleCombatEnd(endResult);
            return;
          }
          this._updateHUD();
        }
      }
    } else {
      // Show highlights for current unit
      if (currentUnit && state.combat.selectedUnit?.id === currentUnit.id) {
        this._showMoveHighlights(currentUnit);
      }
    }
  }

  _showMoveHighlights(unit) {
    const moveTiles = getMovableTiles(state, unit).map(t => ({ ...t, type: 'move' }));
    const attackTiles = this._getAttackHighlights(unit);
    state.combat.highlightedTiles = unit.acted ? attackTiles : [...moveTiles, ...attackTiles];
  }

  _getAttackHighlights(unit) {
    return getAttackableTiles(state, unit).map(t => ({ ...t, type: 'attack' }));
  }

  _endPlayerTurn() {
    const { units, currentTurnIndex, turnOrder } = state.combat;
    const currentId = turnOrder[currentTurnIndex];
    const currentUnit = units.find(u => u.id === currentId);
    if (!currentUnit || !currentUnit.isPlayer) return;

    currentUnit.acted = true;
    state.combat.highlightedTiles = [];
    const { nextUnit } = endTurn(state);

    const endResult = checkCombatEnd(state);
    if (endResult) {
      this._handleCombatEnd(endResult);
      return;
    }

    if (nextUnit && !nextUnit.isPlayer) {
      this._pendingEnemyTurn = true;
    }
    this._updateHUD();
  }

  _processEnemyTurn() {
    if (!state.combat.active) return;

    const { units, currentTurnIndex, turnOrder } = state.combat;
    let safetyCount = 0;

    // Process all consecutive enemy turns
    while (safetyCount < 20) {
      safetyCount++;
      const currentId = state.combat.turnOrder[state.combat.currentTurnIndex];
      const currentUnit = units.find(u => u.id === currentId);

      if (!currentUnit || !currentUnit.hp || currentUnit.hp <= 0) {
        const { nextUnit } = endTurn(state);
        if (!nextUnit || nextUnit.isPlayer) break;
        continue;
      }

      if (currentUnit.isPlayer) break;

      // Run AI
      this._runSingleEnemyAI(currentUnit);

      const endResult = checkCombatEnd(state);
      if (endResult) {
        this._handleCombatEnd(endResult);
        return;
      }

      const { nextUnit } = endTurn(state);
      if (!nextUnit || nextUnit.isPlayer) break;
    }

    this._updateHUD();
  }

  _runSingleEnemyAI(unit) {
    const { units } = state.combat;
    const playerUnits = units.filter(u => u.isPlayer && u.hp > 0);
    if (playerUnits.length === 0) return;

    // Find nearest player
    let nearest = null;
    let minDist = Infinity;
    for (const pu of playerUnits) {
      const dx = Math.abs(pu.col - unit.col);
      const dy = Math.abs(pu.row - unit.row);
      const d = Math.max(dx, dy); // Chebyshev distance
      if (d < minDist) { minDist = d; nearest = pu; }
    }
    if (!nearest) return;

    const range = unit.weaponRange || 1;

    // Move toward player if not in range
    if (minDist > range && !unit.acted) {
      const movables = getMovableTiles(state, unit);
      if (movables.length > 0) {
        // Pick tile closest to target
        movables.sort((a, b) => {
          const da = Math.max(Math.abs(a.col - nearest.col), Math.abs(a.row - nearest.row));
          const db = Math.max(Math.abs(b.col - nearest.col), Math.abs(b.row - nearest.row));
          return da - db;
        });
        const dest = movables[0];
        moveUnit(state, unit, dest.col, dest.row);
      }
    }

    // Attack if in range
    const dx = Math.abs(nearest.col - unit.col);
    const dy = Math.abs(nearest.row - unit.row);
    const dist = Math.max(dx, dy);

    if (dist <= range) {
      const result = attackUnit(state, unit, nearest);
      playSound(result.hit ? 'combat_hit' : 'combat_miss');

      const { x, y } = this._tileToScreen(nearest.col, nearest.row);
      if (result.hit) {
        this.damageNumbers.push({
          x, y: y - 20, text: String(result.reducedDamage),
          color: '#ff6600', timer: 45, size: 16
        });
      } else {
        this.damageNumbers.push({ x, y: y - 20, text: 'miss', color: '#888', timer: 30, size: 12 });
      }

      if (result.killed) playSound('combat_death');
    }

    unit.acted = true;
  }

  _doRetreat() {
    retreatCombat(state);
    this._handleCombatEnd('retreat');
  }

  _handleCombatEnd(result) {
    this.stop();
    state.combat.active = false;
    state.combat.result = result;

    if (result === 'player_win') {
      const ep = state.combat.enemyPartyRef;
      endCombat(state, 'player_win');
      const loot = ep ? generateLoot(state, ep) : [];
      this._showVictoryScreen(loot);
    } else if (result === 'enemy_win') {
      endCombat(state, 'enemy_win');
      this._showDefeatScreen();
    } else if (result === 'retreat') {
      endCombat(state, 'retreat');
      this._returnToWorld();
    }
  }

  _showVictoryScreen(loot) {
    playSound('combat_end');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box victory">
        <h2>⚔️ Victory!</h2>
        <p>Your company prevails!</p>
        <div class="loot-list">
          <h4>Loot:</h4>
          ${loot.map(l => {
            if (l.isGold) return `<div class="loot-item">💰 ${l.qty} gold</div>`;
            const item = ITEMS[l.itemId];
            return `<div class="loot-item">${item ? item.name : l.itemId} x${l.qty}</div>`;
          }).join('') || '<p>No loot found.</p>'}
        </div>
        <button class="btn-primary" id="victory-ok">Continue</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Add loot to company inventory
    for (const l of loot) {
      if (l.isGold) {
        state.company.gold = (state.company.gold || 0) + l.qty;
      } else {
        const item = ITEMS[l.itemId];
        if (item) {
          const { addItem: addItemFn } = window._invModule || {};
          if (!state.inventory) state.inventory = [];
          const existing = state.inventory.find(s => s.itemId === l.itemId && item.stackable);
          if (existing) {
            existing.qty = (existing.qty || 1) + l.qty;
          } else {
            state.inventory.push({ itemId: l.itemId, qty: l.qty, ...item });
          }
        }
      }
    }

    modal.querySelector('#victory-ok').onclick = () => {
      modal.remove();
      this._returnToWorld();
    };
  }

  _showDefeatScreen() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box defeat">
        <h2>💀 Defeat</h2>
        <p>Your company has been routed. Many good men died today.</p>
        <button class="btn-primary" id="defeat-ok">Continue</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#defeat-ok').onclick = () => {
      modal.remove();
      this._returnToWorld();
    };
  }

  _returnToWorld() {
    // Show world canvas, hide combat canvas
    const worldCanvas = document.getElementById('world-canvas');
    const combatCanvas = document.getElementById('combat-canvas');
    const combatHUD = document.getElementById('combat-hud');
    const mainHUD = document.getElementById('hud');

    if (combatCanvas) combatCanvas.style.display = 'none';
    if (combatHUD) combatHUD.style.display = 'none';
    if (worldCanvas) worldCanvas.style.display = '';
    if (mainHUD) mainHUD.style.display = '';

    state.phase = 'world';
    state.combat.active = false;
  }
}

export default CombatUI;
