// Combat interface UI – with hit-flash, bounce, screen-shake and death-fade animations
import state from '../state/gamestate.js';
import {
  initCombat, getMovableTiles, getAttackableTiles,
  moveUnit, attackUnit, endTurn, checkCombatEnd,
  retreatCombat, endCombat, generateLoot
} from '../systems/combat.js';
import { playSound } from '../engine/audio.js';

const COMBAT_TILE_W = 64;
const COMBAT_TILE_H = 32;

// ── Terrain palette ──────────────────────────────────────────────────────────
const TILE_COLORS   = ['#2e4a1c', '#1a3010', '#3e3e2e', '#2a1e0e', '#1a2a10'];
const TILE_BORDERS  = ['rgba(80,160,40,0.18)', 'rgba(40,100,20,0.18)',
                       'rgba(120,120,80,0.18)', 'rgba(80,60,30,0.18)',
                       'rgba(50,120,30,0.18)'];

// ── CombatUI ─────────────────────────────────────────────────────────────────
export class CombatUI {
  constructor(canvas, hudEl) {
    this.canvas    = canvas;
    this.ctx       = canvas ? canvas.getContext('2d') : null;
    this.hud       = hudEl;

    this._boundClick  = this._onCanvasClick.bind(this);
    this._boundRender = this._renderLoop.bind(this);
    this._rafId       = null;
    this._pendingEnemyTurn = false;

    // Camera offset for this canvas
    this._offsetX = 0;
    this._offsetY = 0;

    // Floating damage/miss numbers  { x, y, text, color, alpha, size, vy }
    this.floatNums = [];

    // Screen-shake  { frames, mag }
    this._shake = { frames: 0, mag: 0 };

    // Per-unit animation state keyed by unit.id
    // { flash: 0..10, bounce: { dx, dy, frames }, dyingAlpha: 1..0 }
    this._unitAnim = {};
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  start(playerParty, enemyParty, terrainType = 0) {
    if (!this.canvas || !this.ctx) return;
    initCombat(state, playerParty, enemyParty, terrainType);
    this._computeOffset();
    this.floatNums  = [];
    this._shake     = { frames: 0, mag: 0 };
    this._unitAnim  = {};
    this.canvas.addEventListener('click', this._boundClick);
    this._renderLoop();
    this._updateHUD();
    playSound('combat_start');
  }

  stop() {
    this.canvas.removeEventListener('click', this._boundClick);
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  _computeOffset() {
    if (!this.canvas) return;
    const gridH    = (state.combat.width + state.combat.height) * COMBAT_TILE_H / 2;
    this._offsetX  = this.canvas.width  / 2;
    this._offsetY  = this.canvas.height / 2 - gridH / 4;
  }

  _tileToScreen(col, row) {
    return {
      x: (col - row) * (COMBAT_TILE_W / 2) + this._offsetX,
      y: (col + row) * (COMBAT_TILE_H / 2) + this._offsetY,
    };
  }

  _screenToTile(sx, sy) {
    const wx  = sx - this._offsetX;
    const wy  = sy - this._offsetY;
    const col = Math.round(wx / (COMBAT_TILE_W / 2) / 2 + wy / (COMBAT_TILE_H / 2) / 2);
    const row = Math.round(wy / (COMBAT_TILE_H / 2) / 2 - wx / (COMBAT_TILE_W / 2) / 2);
    return { col, row };
  }

  // ── Render loop ──────────────────────────────────────────────────────────────

  _renderLoop() {
    this._render();
    this._rafId = requestAnimationFrame(this._boundRender);

    if (this._pendingEnemyTurn) {
      this._pendingEnemyTurn = false;
      setTimeout(() => this._processEnemyTurn(), 650);
    }

    // Tick float numbers
    this.floatNums = this.floatNums.filter(n => {
      n.alpha -= 0.022;
      n.y     -= 0.7;
      return n.alpha > 0;
    });

    // Tick screen shake
    if (this._shake.frames > 0) this._shake.frames--;

    // Tick unit animations
    for (const id in this._unitAnim) {
      const a = this._unitAnim[id];
      if (a.flash > 0) a.flash--;
      if (a.bounce) {
        a.bounce.frames--;
        if (a.bounce.frames <= 0) a.bounce = null;
      }
      // Dying: fade to 0
      const unit = state.combat.units.find(u => u.id === id);
      if (unit && unit.hp <= 0 && a.dyingAlpha > 0) {
        a.dyingAlpha = Math.max(0, a.dyingAlpha - 0.035);
      }
    }
  }

  _render() {
    if (!this.ctx || !state.combat.active) return;
    const ctx    = this.ctx;
    const canvas = this.canvas;

    // Background
    ctx.fillStyle = '#0e1118';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vignette
    const vgr = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.2,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.9
    );
    vgr.addColorStop(0, 'rgba(0,0,0,0)');
    vgr.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vgr;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (this._shake.frames > 0) {
      const mag = this._shake.mag * (this._shake.frames / 12);
      shakeX = (Math.random() - 0.5) * mag;
      shakeY = (Math.random() - 0.5) * mag;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this._renderTiles(ctx);
    this._renderHighlights(ctx);
    this._renderUnits(ctx);
    this._renderDamageNumbers(ctx);
    this._renderTurnIndicator(ctx);

    ctx.restore();
  }

  // ── Tile rendering ───────────────────────────────────────────────────────────

  _renderTiles(ctx) {
    const { tiles, width, height } = state.combat;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const tile = tiles[row] && tiles[row][col];
        if (!tile) continue;
        const { x, y } = this._tileToScreen(col, row);
        const ci = tile.type % TILE_COLORS.length;

        ctx.beginPath();
        ctx.moveTo(x,                     y - COMBAT_TILE_H / 2);
        ctx.lineTo(x + COMBAT_TILE_W / 2, y);
        ctx.lineTo(x,                     y + COMBAT_TILE_H / 2);
        ctx.lineTo(x - COMBAT_TILE_W / 2, y);
        ctx.closePath();

        ctx.fillStyle   = TILE_COLORS[ci];
        ctx.fill();
        ctx.strokeStyle = TILE_BORDERS[ci];
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
    }
  }

  _renderHighlights(ctx) {
    for (const ht of (state.combat.highlightedTiles || [])) {
      const { x, y } = this._tileToScreen(ht.col, ht.row);
      const isMove    = ht.type === 'move';

      ctx.beginPath();
      ctx.moveTo(x,                     y - COMBAT_TILE_H / 2);
      ctx.lineTo(x + COMBAT_TILE_W / 2, y);
      ctx.lineTo(x,                     y + COMBAT_TILE_H / 2);
      ctx.lineTo(x - COMBAT_TILE_W / 2, y);
      ctx.closePath();

      ctx.fillStyle   = isMove ? 'rgba(40,110,255,0.38)' : 'rgba(255,40,40,0.38)';
      ctx.fill();
      ctx.strokeStyle = isMove ? 'rgba(80,150,255,0.90)' : 'rgba(255,80,80,0.90)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Pulsing corners
      const now = Date.now() / 400;
      const pulse = 0.5 + 0.5 * Math.sin(now + ht.col * 0.7 + ht.row * 1.1);
      ctx.globalAlpha = 0.4 + 0.4 * pulse;
      ctx.strokeStyle = isMove ? '#88ccff' : '#ff8888';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── Unit rendering ───────────────────────────────────────────────────────────

  _renderUnits(ctx) {
    const { units, selectedUnit } = state.combat;
    const sorted = [...units].sort((a, b) => (a.row + a.col) - (b.row + b.col));

    for (const unit of sorted) {
      const anim       = this._getAnim(unit.id);
      const isDead     = unit.hp <= 0;
      const dyingAlpha = isDead ? anim.dyingAlpha : 1;
      if (isDead && dyingAlpha <= 0) continue;

      let { x, y } = this._tileToScreen(unit.col, unit.row);

      // Attack bounce
      if (anim.bounce) {
        const t = 1 - anim.bounce.frames / anim.bounce.totalFrames;
        const arc = Math.sin(t * Math.PI);
        x += anim.bounce.dx * arc;
        y += anim.bounce.dy * arc;
      }

      ctx.save();
      ctx.globalAlpha = dyingAlpha;
      const isSelected = selectedUnit && selectedUnit.id === unit.id;
      this._renderUnit(ctx, unit, x, y, isSelected, anim);
      ctx.restore();
    }
  }

  _renderUnit(ctx, unit, x, y, isSelected, anim) {
    const r   = 15;
    const uy  = y - r * 0.6;
    const flash = anim && anim.flash > 0;

    // Ground shadow
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.3, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // Selection ring (pulsing)
    if (isSelected) {
      const now   = Date.now() / 300;
      const glow  = 0.5 + 0.5 * Math.sin(now);
      const rOuter = r + 5 + glow * 3;
      ctx.beginPath();
      ctx.arc(x, uy, rOuter, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,220,80,${0.4 + 0.4 * glow})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // Body fill
    let bodyColor;
    if (flash) {
      bodyColor = '#ff2222';
    } else if (unit.isPlayer) {
      bodyColor = unit.acted ? '#1a3a6a' : '#2a6acc';
    } else {
      bodyColor = unit.acted ? '#5a1a1a' : '#aa2222';
    }

    // Gradient body
    const gr = ctx.createRadialGradient(x - r * 0.3, uy - r * 0.3, 1, x, uy, r);
    gr.addColorStop(0, flash ? '#ff8888' : (unit.isPlayer ? '#4488ff' : '#ff5555'));
    gr.addColorStop(1, bodyColor);

    ctx.beginPath();
    ctx.arc(x, uy, r, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();

    // Ring
    ctx.strokeStyle = isSelected
      ? '#ffd84a'
      : (unit.isPlayer ? 'rgba(80,150,255,0.85)' : 'rgba(255,80,80,0.85)');
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();

    // Initial letter
    ctx.fillStyle    = flash ? '#fff' : 'rgba(255,255,255,0.92)';
    ctx.font         = `bold 12px 'Cinzel', serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.name.charAt(0).toUpperCase(), x, uy);
    ctx.textBaseline = 'alphabetic';

    // HP bar
    const barW  = COMBAT_TILE_W * 0.68;
    const barH  = 5;
    const barX  = x - barW / 2;
    const barY  = uy + r + 3;
    const hpPct = Math.max(0, unit.hp / unit.maxHP);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#111';
    ctx.fillRect(barX, barY, barW, barH);

    const hpCol = hpPct > 0.6 ? '#44cc44' : hpPct > 0.3 ? '#cccc22' : '#cc2222';
    ctx.fillStyle = hpCol;
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // HP bar glow
    if (flash) {
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur  = 8;
      ctx.fillRect(barX, barY, barW * hpPct, barH);
      ctx.shadowBlur = 0;
    }

    // Acted overlay
    if (unit.acted && unit.hp > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.arc(x, uy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _getAnim(id) {
    if (!this._unitAnim[id]) {
      this._unitAnim[id] = { flash: 0, bounce: null, dyingAlpha: 1 };
    }
    return this._unitAnim[id];
  }

  // ── Floating damage numbers ──────────────────────────────────────────────────

  _renderDamageNumbers(ctx) {
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const n of this.floatNums) {
      ctx.globalAlpha = Math.max(0, n.alpha);
      ctx.font        = `bold ${n.size}px 'Cinzel', serif`;
      ctx.shadowColor = n.color;
      ctx.shadowBlur  = 6;
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 2.5;
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle   = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.shadowBlur   = 0;
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  _spawnFloat(x, y, text, color, size = 18) {
    this.floatNums.push({ x, y: y - 24, text, color, alpha: 1, size, vy: 0.7 });
  }

  // ── Turn indicator (top-left panel) ─────────────────────────────────────────

  _renderTurnIndicator(ctx) {
    const { units, currentTurnIndex, turnOrder, round } = state.combat;
    if (!turnOrder || !turnOrder.length) return;
    const cur = units.find(u => u.id === turnOrder[currentTurnIndex]);
    if (!cur) return;

    // Panel bg
    ctx.fillStyle = 'rgba(8,6,2,0.82)';
    this._roundRect(ctx, 10, 10, 190, 54, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,168,67,0.35)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, 10, 10, 190, 54, 6);
    ctx.stroke();

    // Text
    ctx.fillStyle    = 'rgba(212,168,67,0.65)';
    ctx.font         = `11px 'Cinzel', serif`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Round ${round}`, 18, 16);

    ctx.fillStyle = cur.isPlayer ? '#6eb0ff' : '#ff7070';
    ctx.font      = `bold 13px 'Cinzel', serif`;
    ctx.fillText(`${cur.name}`, 18, 33);

    ctx.fillStyle    = 'rgba(150,130,80,0.65)';
    ctx.font         = `10px 'Cinzel', serif`;
    ctx.fillText(cur.isPlayer ? "— Your turn —" : "— Enemy acting —", 18, 50);
    ctx.textBaseline = 'alphabetic';
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── HUD ──────────────────────────────────────────────────────────────────────

  _updateHUD() {
    if (!this.hud) return;
    const { units, currentTurnIndex, turnOrder, round } = state.combat;
    const currentId   = turnOrder ? turnOrder[currentTurnIndex] : null;
    const currentUnit = currentId ? units.find(u => u.id === currentId) : null;

    const playerUnits = units.filter(u => u.isPlayer);
    const enemyUnits  = units.filter(u => !u.isPlayer);

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
            <strong>Your Company (${playerUnits.filter(u => u.hp > 0).length}/${playerUnits.length})</strong>
            ${playerUnits.map(u => this._unitHUDItem(u, currentUnit)).join('')}
          </div>
          <div class="units-section enemy">
            <strong>Enemies (${enemyUnits.filter(u => u.hp > 0).length}/${enemyUnits.length})</strong>
            ${enemyUnits.map(u => this._unitHUDItem(u, currentUnit)).join('')}
          </div>
        </div>
        <div class="combat-log" id="combat-log">
          ${(state.combat.log || []).slice(-6).map(l => `<div class="log-entry">${l}</div>`).join('')}
        </div>
        <div class="combat-actions">
          ${currentUnit && currentUnit.isPlayer
            ? `<button class="btn-combat-action" id="btn-end-turn">End Turn</button>
               <button class="btn-combat-action btn-retreat" id="btn-retreat">Retreat</button>`
            : `<span class="enemy-turn-label">Enemy is acting…</span>`}
        </div>
      </div>
    `;

    const endBtn = this.hud.querySelector('#btn-end-turn');
    if (endBtn) endBtn.onclick = () => this._endPlayerTurn();

    const retBtn = this.hud.querySelector('#btn-retreat');
    if (retBtn) retBtn.onclick = () => this._doRetreat();

    const log = this.hud.querySelector('#combat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  _unitHUDItem(unit, currentUnit) {
    const hpPct    = Math.max(0, unit.hp / unit.maxHP);
    const isCur    = currentUnit && currentUnit.id === unit.id;
    const hpColor  = hpPct > 0.5 ? '#44cc44' : hpPct > 0.25 ? '#cccc22' : '#cc2222';
    return `
      <div class="unit-hud-item ${isCur ? 'current' : ''} ${unit.hp <= 0 ? 'dead' : ''}">
        <span class="unit-letter">${unit.name.charAt(0)}</span>
        <span class="unit-name">${unit.name}</span>
        <div class="unit-hp-bar">
          <div style="width:${hpPct * 100}%;background:${hpColor}"></div>
        </div>
        <span class="unit-hp">${unit.hp}/${unit.maxHP}</span>
      </div>`;
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  _onCanvasClick(e) {
    if (!state.combat.active) return;
    const { units, selectedUnit, currentTurnIndex, turnOrder } = state.combat;

    const rect  = this.canvas.getBoundingClientRect();
    const sx    = (e.clientX - rect.left) * (this.canvas.width  / rect.width);
    const sy    = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
    const { col, row } = this._screenToTile(sx, sy);

    if (col < 0 || col >= state.combat.width || row < 0 || row >= state.combat.height) return;

    const currentId   = turnOrder[currentTurnIndex];
    const currentUnit = units.find(u => u.id === currentId);
    if (!currentUnit || !currentUnit.isPlayer) return;

    const clickedUnit = units.find(u => u.col === col && u.row === row && u.hp > 0);

    if (clickedUnit && clickedUnit.isPlayer) {
      state.combat.selectedUnit      = clickedUnit;
      state.combat.highlightedTiles  = [];
      if (clickedUnit.id === currentUnit.id) this._showMoveHighlights(currentUnit);
      this._updateHUD();
      return;
    }

    const highlighted = (state.combat.highlightedTiles || [])
      .find(h => h.col === col && h.row === row);

    if (highlighted) {
      if (highlighted.type === 'move' && !currentUnit.acted) {
        moveUnit(state, currentUnit, col, row);
        playSound('world_step');
        state.combat.highlightedTiles = this._getAttackHighlights(currentUnit);
        this._updateHUD();

      } else if (highlighted.type === 'attack' && !currentUnit.acted) {
        const target = units.find(u => u.col === col && u.row === row && u.hp > 0);
        if (target) {
          // Attack bounce animation on attacker
          const { x: ax, y: ay } = this._tileToScreen(currentUnit.col, currentUnit.row);
          const { x: tx, y: ty } = this._tileToScreen(target.col, target.row);
          const anim = this._getAnim(currentUnit.id);
          anim.bounce = {
            dx: (tx - ax) * 0.38,
            dy: (ty - ay) * 0.38,
            frames: 14,
            totalFrames: 14,
          };

          const result = attackUnit(state, currentUnit, target);
          playSound(result.hit ? 'combat_hit' : 'combat_miss');
          if (result.killed) playSound('combat_death');

          const { x, y } = this._tileToScreen(target.col, target.row);

          if (result.hit) {
            // Flash target
            this._getAnim(target.id).flash = 10;
            this._spawnFloat(x, y, `-${result.reducedDamage}`, result.killed ? '#ff8800' : '#ff4444', result.killed ? 22 : 18);
            // Screen shake on heavy hit
            if (result.reducedDamage >= 12 || result.killed) {
              this._shake = { frames: 12, mag: result.killed ? 10 : 6 };
            }
          } else {
            this._spawnFloat(x, y, 'MISS', '#aaaaaa', 14);
          }

          if (result.killed) {
            this._spawnFloat(x, y - 28, '✝', '#ff6600', 20);
          }

          state.combat.highlightedTiles = [];
          currentUnit.acted = true;

          const endResult = checkCombatEnd(state);
          if (endResult) { this._handleCombatEnd(endResult); return; }
          this._updateHUD();
        }
      }
    } else {
      if (currentUnit && state.combat.selectedUnit?.id === currentUnit.id) {
        this._showMoveHighlights(currentUnit);
      }
    }
  }

  _showMoveHighlights(unit) {
    const moveTiles   = getMovableTiles(state, unit).map(t => ({ ...t, type: 'move' }));
    const attackTiles = this._getAttackHighlights(unit);
    state.combat.highlightedTiles = unit.acted ? attackTiles : [...moveTiles, ...attackTiles];
  }

  _getAttackHighlights(unit) {
    return getAttackableTiles(state, unit).map(t => ({ ...t, type: 'attack' }));
  }

  // ── Turn management ──────────────────────────────────────────────────────────

  _endPlayerTurn() {
    const { units, currentTurnIndex, turnOrder } = state.combat;
    const currentUnit = units.find(u => u.id === turnOrder[currentTurnIndex]);
    if (!currentUnit || !currentUnit.isPlayer) return;

    currentUnit.acted             = true;
    state.combat.highlightedTiles = [];
    const { nextUnit } = endTurn(state);

    const endResult = checkCombatEnd(state);
    if (endResult) { this._handleCombatEnd(endResult); return; }

    if (nextUnit && !nextUnit.isPlayer) this._pendingEnemyTurn = true;
    this._updateHUD();
  }

  _processEnemyTurn() {
    if (!state.combat.active) return;
    const { units } = state.combat;
    let safety = 0;

    while (safety++ < 20) {
      const currentUnit = units.find(
        u => u.id === state.combat.turnOrder[state.combat.currentTurnIndex]
      );
      if (!currentUnit || currentUnit.hp <= 0) {
        const { nextUnit } = endTurn(state);
        if (!nextUnit || nextUnit.isPlayer) break;
        continue;
      }
      if (currentUnit.isPlayer) break;

      this._runEnemyAI(currentUnit);

      const endResult = checkCombatEnd(state);
      if (endResult) { this._handleCombatEnd(endResult); return; }

      const { nextUnit } = endTurn(state);
      if (!nextUnit || nextUnit.isPlayer) break;
    }

    this._updateHUD();
  }

  _runEnemyAI(unit) {
    const { units } = state.combat;
    const players = units.filter(u => u.isPlayer && u.hp > 0);
    if (!players.length) return;

    // Find nearest player
    let nearest = null, minDist = Infinity;
    for (const p of players) {
      const d = Math.max(Math.abs(p.col - unit.col), Math.abs(p.row - unit.row));
      if (d < minDist) { minDist = d; nearest = p; }
    }
    if (!nearest) return;

    const range = unit.weaponRange || 1;

    if (minDist > range && !unit.acted) {
      const movables = getMovableTiles(state, unit);
      if (movables.length) {
        movables.sort((a, b) => {
          const da = Math.max(Math.abs(a.col - nearest.col), Math.abs(a.row - nearest.row));
          const db = Math.max(Math.abs(b.col - nearest.col), Math.abs(b.row - nearest.row));
          return da - db;
        });
        moveUnit(state, unit, movables[0].col, movables[0].row);
      }
    }

    const dist = Math.max(Math.abs(nearest.col - unit.col), Math.abs(nearest.row - unit.row));
    if (dist <= range) {
      // Bounce animation
      const { x: ax, y: ay } = this._tileToScreen(unit.col, unit.row);
      const { x: tx, y: ty } = this._tileToScreen(nearest.col, nearest.row);
      const anim = this._getAnim(unit.id);
      anim.bounce = {
        dx: (tx - ax) * 0.35,
        dy: (ty - ay) * 0.35,
        frames: 12,
        totalFrames: 12,
      };

      const result = attackUnit(state, unit, nearest);
      playSound(result.hit ? 'combat_hit' : 'combat_miss');

      const { x, y } = this._tileToScreen(nearest.col, nearest.row);
      if (result.hit) {
        this._getAnim(nearest.id).flash = 8;
        this._spawnFloat(x, y, `-${result.reducedDamage}`, '#ff6600', 16);
        if (result.reducedDamage >= 12 || result.killed) {
          this._shake = { frames: 10, mag: result.killed ? 9 : 5 };
        }
      } else {
        this._spawnFloat(x, y, 'miss', '#888888', 12);
      }

      if (result.killed) {
        playSound('combat_death');
        this._spawnFloat(x, y - 26, '✝', '#ff6600', 18);
      }
    }

    unit.acted = true;
  }

  _doRetreat() {
    retreatCombat(state);
    this._handleCombatEnd('retreat');
  }

  _handleCombatEnd(result) {
    this.stop();
    state.combat.result = result;
    if (this.canvas) {
      this.canvas.dispatchEvent(new CustomEvent('combatEnd', {
        detail: result, bubbles: true,
      }));
    }
  }
}

export default CombatUI;
