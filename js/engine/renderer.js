// WorldRenderer - draws the isometric world map and the tactical combat grid.

const TILE_W = 64;
const TILE_H = 32;

// Compact colours for the minimap (same palette as TILE_COLORS)
const MINI_COLORS = {
  0: '#3a5a2a', 1: '#1a3a1a', 2: '#5a4a2a', 3: '#4a4a4a',
  4: '#2a3a1a', 5: '#c0c8d0', 6: '#6a5a3a', 7: '#1a2a5a', 8: '#8B7355',
};

// World tile colors by type index
const TILE_COLORS = {
  0: '#3a5a2a', // plains
  1: '#1a3a1a', // forest
  2: '#5a4a2a', // hills
  3: '#4a4a4a', // mountains
  4: '#2a3a1a', // swamp
  5: '#c0c8d0', // snow
  6: '#6a5a3a', // road
  7: '#1a2a5a', // water
  8: '#8B7355', // settlement
};

// Lighter edge color per tile type for subtle shading
const TILE_EDGE_COLORS = {
  0: '#4a7a3a',
  1: '#254025',
  2: '#7a6040',
  3: '#5a5a5a',
  4: '#3a4a2a',
  5: '#d8e0e8',
  6: '#8a7050',
  7: '#2a3a7a',
  8: '#a0896a',
};

// Combat tile colors
const COMBAT_TILE_COLORS = {
  0: '#3a5a2a', // grass
  1: '#1a3a1a', // trees
  2: '#4a4a4a', // rocks
  3: '#3a2a1a', // mud
};

/**
 * Convert tile grid coordinates to isometric screen coordinates.
 */
function tileToIso(col, row, offsetX, offsetY) {
  return {
    x: (col - row) * (TILE_W / 2) + offsetX,
    y: (col + row) * (TILE_H / 2) + offsetY,
  };
}

function drawDiamond(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
}

export class WorldRenderer {
  constructor() {
    this.tileW = TILE_W;
    this.tileH = TILE_H;
  }

  _defaultOffset(canvas) {
    return {
      offsetX: canvas.width / 2,
      offsetY: TILE_H * 2,
    };
  }

  /**
   * Draw the full isometric world map.
   */
  drawWorld(ctx, worldTiles, worldW, worldH, settlements, enemyParties, partyPos, camera, state) {
    const canvas = ctx.canvas;
    const { offsetX, offsetY } = this._defaultOffset(canvas);

    camera.apply(ctx);

    const hour = state ? (state.hour || 6) : 6;
    const nightAlpha = this._nightAlpha(hour);

    // Viewport culling bounds in world space
    const margin = TILE_W * 2;
    const topLeft = camera.screenToWorld(-margin, -margin);
    const bottomRight = camera.screenToWorld(canvas.width + margin, canvas.height + margin);

    // Draw tiles row by row (painter's order)
    for (let row = 0; row < worldH; row++) {
      for (let col = 0; col < worldW; col++) {
        const { x, y } = tileToIso(col, row, offsetX, offsetY);

        // Viewport culling
        if (x + TILE_W / 2 < topLeft.x || x - TILE_W / 2 > bottomRight.x) continue;
        if (y + TILE_H / 2 < topLeft.y || y - TILE_H / 2 > bottomRight.y) continue;

        const tile = worldTiles[row] && worldTiles[row][col];
        if (!tile) continue;

        const isExplored = tile.explored;
        const tileType = tile.type;

        let baseColor = TILE_COLORS[tileType] !== undefined ? TILE_COLORS[tileType] : TILE_COLORS[0];
        let edgeColor = TILE_EDGE_COLORS[tileType] !== undefined ? TILE_EDGE_COLORS[tileType] : TILE_EDGE_COLORS[0];

        if (!isExplored) {
          baseColor = '#111111';
          edgeColor = '#1a1a1a';
        }

        drawDiamond(ctx, x, y, TILE_W, TILE_H);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Draw move path highlight
    if (state && state.world && state.world.movePath) {
      for (const step of state.world.movePath) {
        const { x, y } = tileToIso(step.col, step.row, offsetX, offsetY);
        drawDiamond(ctx, x, y, TILE_W, TILE_H);
        ctx.fillStyle = 'rgba(255, 255, 100, 0.15)';
        ctx.fill();
      }
    }

    // Draw move target – animated pulsing ring
    if (state && state.world && state.world.moveTarget) {
      const mt = state.world.moveTarget;
      const { x, y } = tileToIso(mt.col, mt.row, offsetX, offsetY);
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);   // 0..1 oscillation
      drawDiamond(ctx, x, y, TILE_W, TILE_H);
      ctx.strokeStyle = `rgba(255, 255, 100, ${0.5 + 0.5 * pulse})`;
      ctx.lineWidth   = 2 + pulse * 1.5;
      ctx.stroke();
      // Inner fill glow
      drawDiamond(ctx, x, y, TILE_W * 0.55, TILE_H * 0.55);
      ctx.fillStyle = `rgba(255, 255, 120, ${0.08 * pulse})`;
      ctx.fill();
    }

    // Draw settlements
    if (settlements) {
      for (const s of settlements) {
        if (!s) continue;
        const tile = worldTiles[s.row] && worldTiles[s.row][s.col];
        if (!tile || !tile.explored) continue;
        const { x, y } = tileToIso(s.col, s.row, offsetX, offsetY);
        this._drawSettlement(ctx, x, y, s);
      }
    }

    // Draw enemy parties
    if (enemyParties) {
      for (const ep of enemyParties) {
        if (!ep || !ep.alive) continue;
        const tile = worldTiles[ep.row] && worldTiles[ep.row][ep.col];
        if (!tile || !tile.explored) continue;
        const { x, y } = tileToIso(ep.col, ep.row, offsetX, offsetY);
        this._drawEnemyParty(ctx, x, y, ep);
      }
    }

    // Draw player party
    if (partyPos) {
      const { x, y } = tileToIso(partyPos.col, partyPos.row, offsetX, offsetY);
      this._drawParty(ctx, x, y, state);
    }

    camera.restore(ctx);

    // Day/night overlay in screen space
    if (nightAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 40, ${nightAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  _nightAlpha(hour) {
    if (hour >= 6 && hour < 20) return 0;
    let t;
    if (hour >= 20) {
      t = (hour - 20) / 4;
    } else {
      t = 1 - hour / 6;
    }
    return Math.min(0.65, t * 0.65);
  }

  _drawSettlement(ctx, x, y, settlement) {
    const size = settlement.type === 'city' ? 10 : settlement.type === 'town' ? 8 : 6;
    const color = settlement.type === 'city' ? '#d4af37' : settlement.type === 'town' ? '#c4a028' : '#b49018';

    // House body
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.rect(x - size, y - size / 2, size * 2, size);
    ctx.fill();
    ctx.stroke();

    // Roof triangle
    ctx.beginPath();
    ctx.moveTo(x - size - 2, y - size / 2);
    ctx.lineTo(x, y - size - 6);
    ctx.lineTo(x + size + 2, y - size / 2);
    ctx.closePath();
    ctx.fillStyle = this._darken(color);
    ctx.fill();
    ctx.stroke();

    // Settlement name
    ctx.font = `bold ${size}px sans-serif`;
    ctx.fillStyle = '#ffffcc';
    ctx.textAlign = 'center';
    ctx.fillText(settlement.name, x, y + size + 10);
  }

  _drawEnemyParty(ctx, x, y, party) {
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.5);
    ctx.lineTo(x + r, y - r * 0.5);
    ctx.lineTo(x, y + r * 0.5);
    ctx.lineTo(x - r, y - r * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#cc2222';
    ctx.fill();
    ctx.strokeStyle = '#ff7777';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y - r * 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  _drawParty(ctx, x, y, state) {
    const r = 10;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 2, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Circle body
    ctx.beginPath();
    ctx.arc(x, y - r, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1a6aff';
    ctx.fill();
    ctx.strokeStyle = '#88aaff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Banner letter
    const letter = (state && state.company && state.company.name)
      ? state.company.name.charAt(0).toUpperCase()
      : 'I';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x, y - r);
    ctx.textBaseline = 'alphabetic';
  }

  _darken(hex) {
    // Darken a hex color by 30%
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - 50);
    const g = Math.max(0, ((n >> 8) & 0xff) - 50);
    const b = Math.max(0, (n & 0xff) - 50);
    return `rgb(${r},${g},${b})`;
  }

  // -------------------------------------------------------------------------
  // Combat renderer
  // -------------------------------------------------------------------------

  drawCombat(ctx, combatTiles, combatW, combatH, units, selectedUnit, highlightedTiles, camera) {
    const cTW = 48;
    const cTH = 24;
    const canvas = ctx.canvas;
    const offsetX = canvas.width / 2;
    const offsetY = cTH * 3;

    camera.apply(ctx);

    for (let row = 0; row < combatH; row++) {
      for (let col = 0; col < combatW; col++) {
        const x = (col - row) * (cTW / 2) + offsetX;
        const y = (col + row) * (cTH / 2) + offsetY;

        const tile = combatTiles[row] && combatTiles[row][col];
        const tileType = tile ? tile.type : 0;
        let color = COMBAT_TILE_COLORS[tileType] !== undefined ? COMBAT_TILE_COLORS[tileType] : COMBAT_TILE_COLORS[0];

        // Find highlight
        let highlight = null;
        if (highlightedTiles) {
          for (const ht of highlightedTiles) {
            if (ht.col === col && ht.row === row) {
              highlight = ht.type;
              break;
            }
          }
        }

        ctx.beginPath();
        ctx.moveTo(x, y - cTH / 2);
        ctx.lineTo(x + cTW / 2, y);
        ctx.lineTo(x, y + cTH / 2);
        ctx.lineTo(x - cTW / 2, y);
        ctx.closePath();

        if (highlight === 'move') {
          ctx.fillStyle = 'rgba(50, 100, 255, 0.6)';
        } else if (highlight === 'attack') {
          ctx.fillStyle = 'rgba(255, 40, 40, 0.6)';
        } else {
          ctx.fillStyle = color;
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Draw units in painter's order
    if (units) {
      const sorted = [...units].sort((a, b) => (a.row + a.col) - (b.row + b.col));
      for (const unit of sorted) {
        if (unit.hp <= 0) continue;
        const x = (unit.col - unit.row) * (cTW / 2) + offsetX;
        const y = (unit.col + unit.row) * (cTH / 2) + offsetY;
        this._drawCombatUnit(ctx, x, y, unit, selectedUnit, cTW, cTH);
      }
    }

    camera.restore(ctx);
  }

  _drawCombatUnit(ctx, x, y, unit, selectedUnit, cTW, cTH) {
    const r = Math.min(cTW, cTH) * 0.38;
    const isSelected = selectedUnit && selectedUnit.id === unit.id;
    const uy = y - r * 0.5;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.3, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Body circle
    ctx.beginPath();
    ctx.arc(x, uy, r, 0, Math.PI * 2);
    ctx.fillStyle = unit.isPlayer ? '#d4a020' : '#cc2020';
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = unit.isPlayer ? '#f0c040' : '#ff5555';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();

    // Name letter
    ctx.font = `bold ${Math.max(8, Math.round(r))}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.name.charAt(0).toUpperCase(), x, uy);
    ctx.textBaseline = 'alphabetic';

    // HP bar
    const barW = cTW * 0.7;
    const barH = 4;
    const barX = x - barW / 2;
    const barY = y + r * 0.15;
    const hpPct = Math.max(0, unit.hp / unit.maxHP);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.6 ? '#44cc44' : hpPct > 0.3 ? '#cccc22' : '#cc2222';
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // Initiative order badge
    if (unit.initiativeOrder !== undefined) {
      ctx.font = '8px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.textAlign = 'right';
      ctx.fillText(`#${unit.initiativeOrder + 1}`, x + r * 0.95, uy - r * 0.65);
    }
  }

  // -------------------------------------------------------------------------
  // Minimap renderer
  // -------------------------------------------------------------------------

  /**
   * Draw an overhead minimap onto a small canvas.
   * Shows explored terrain, settlements (gold), enemy parties (red), party (blue).
   * @param {CanvasRenderingContext2D} ctx   – the minimap canvas context
   * @param {object}                  state  – game state singleton
   */
  drawMinimap(ctx, state) {
    const { tiles, width, height, settlements, enemyParties, partyPos } = state.world;
    if (!tiles || !width || !height) return;

    const canvas   = ctx.canvas;
    const tileSize = Math.max(1, Math.floor(Math.min(canvas.width / width, canvas.height / height)));

    // Background
    ctx.fillStyle = '#06060a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Terrain tiles
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const tile = tiles[row] && tiles[row][col];
        if (!tile) continue;
        ctx.fillStyle = tile.explored
          ? (MINI_COLORS[tile.type] || MINI_COLORS[0])
          : '#0e0e14';
        ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      }
    }

    // Settlements (gold dots)
    if (settlements) {
      for (const s of settlements) {
        if (!s) continue;
        const t = tiles[s.row] && tiles[s.row][s.col];
        if (!t || !t.explored) continue;
        ctx.fillStyle = '#d4af37';
        const x = s.col * tileSize - 1;
        const y = s.row * tileSize - 1;
        ctx.fillRect(x, y, tileSize + 2, tileSize + 2);
      }
    }

    // Enemy parties (red dots)
    if (enemyParties) {
      for (const ep of enemyParties) {
        if (!ep || !ep.alive) continue;
        const t = tiles[ep.row] && tiles[ep.row][ep.col];
        if (!t || !t.explored) continue;
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(ep.col * tileSize, ep.row * tileSize, tileSize, tileSize);
      }
    }

    // Party position (bright blue, slightly larger)
    if (partyPos) {
      ctx.fillStyle = '#4499ff';
      const px = partyPos.col * tileSize - 1;
      const py = partyPos.row * tileSize - 1;
      ctx.fillRect(px, py, tileSize + 2, tileSize + 2);
    }

    // Border
    ctx.strokeStyle = 'rgba(212,168,67,0.35)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }
}

export function initWorldRenderer() {
  return new WorldRenderer();
}

export default WorldRenderer;
