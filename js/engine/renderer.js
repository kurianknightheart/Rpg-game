// Canvas 2D rendering engine

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.tileW = 64;
    this.tileH = 32;
    this._spriteCache = {};
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w;
    this.height = h;
  }

  clear(color = '#1a1a2e') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Draw isometric tile
  drawTile(x, y, fillColor, strokeColor = null, alpha = 1) {
    const ctx = this.ctx;
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Draw isometric tile with sides (3D box look)
  drawIsoTile(x, y, fillColor, depth = 8, highlight = false) {
    const ctx = this.ctx;
    const hw = this.tileW / 2;
    const hh = this.tileH / 2;

    // Top face
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();

    if (highlight) {
      ctx.fillStyle = lightenColor(fillColor, 30);
    } else {
      ctx.fillStyle = fillColor;
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (depth > 0) {
      // Left side
      ctx.beginPath();
      ctx.moveTo(x - hw, y);
      ctx.lineTo(x, y + hh);
      ctx.lineTo(x, y + hh + depth);
      ctx.lineTo(x - hw, y + depth);
      ctx.closePath();
      ctx.fillStyle = darkenColor(fillColor, 35);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.stroke();

      // Right side
      ctx.beginPath();
      ctx.moveTo(x, y + hh);
      ctx.lineTo(x + hw, y);
      ctx.lineTo(x + hw, y + depth);
      ctx.lineTo(x, y + hh + depth);
      ctx.closePath();
      ctx.fillStyle = darkenColor(fillColor, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.stroke();
    }
  }

  // Draw a unit/character sprite on tile
  drawUnit(x, y, color, letter, isEnemy = false, hp = 1, maxHp = 1, selected = false) {
    const ctx = this.ctx;
    const r = 10;

    // Selection ring
    if (selected) {
      ctx.beginPath();
      ctx.arc(x, y - 8, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 2, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Body circle
    ctx.beginPath();
    ctx.arc(x, y - 8, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = isEnemy ? '#ff4444' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Letter
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x, y - 8);

    // HP bar
    if (maxHp > 0) {
      const barW = 20;
      const barH = 3;
      const bx = x - barW / 2;
      const by = y + 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      ctx.fillStyle = hp / maxHp > 0.5 ? '#44ff44' :
                      hp / maxHp > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(bx, by, Math.max(0, barW * (hp / maxHp)), barH);
    }
  }

  // Draw a settlement icon
  drawSettlement(x, y, type, name, hovered = false) {
    const ctx = this.ctx;
    const sizes = { village: 14, town: 18, city: 22, fort: 16 };
    const colors = { village: '#8B7355', town: '#6B5B45', city: '#c0a060', fort: '#888' };
    const r = sizes[type] || 14;
    const color = colors[type] || '#8B7355';

    // Glow on hover
    if (hovered) {
      ctx.beginPath();
      ctx.arc(x, y - r, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fill();
    }

    // Building shape
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffcc88';
    ctx.lineWidth = 1.5;

    if (type === 'city') {
      // Castle/city shape
      ctx.beginPath();
      ctx.rect(x - r, y - r * 1.5, r * 2, r * 1.5);
      ctx.fill(); ctx.stroke();
      // Battlements
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x - r + i * (r * 0.7), y - r * 1.5 - 5, r * 0.5, 5);
      }
    } else if (type === 'town') {
      ctx.beginPath();
      ctx.rect(x - r * 0.8, y - r, r * 1.6, r);
      ctx.fill(); ctx.stroke();
      // Tower
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y - r);
      ctx.lineTo(x, y - r * 1.8);
      ctx.lineTo(x + r * 0.4, y - r);
      ctx.fill(); ctx.stroke();
    } else if (type === 'fort') {
      ctx.beginPath();
      ctx.rect(x - r, y - r, r * 2, r);
      ctx.fill(); ctx.stroke();
      ctx.fillRect(x - r - 4, y - r * 1.2, 8, r * 1.2);
      ctx.fillRect(x + r - 4, y - r * 1.2, 8, r * 1.2);
    } else {
      // Village - cluster of small houses
      ctx.beginPath();
      ctx.rect(x - r * 0.6, y - r * 0.8, r * 1.2, r * 0.8);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.8);
      ctx.lineTo(x, y - r * 1.4);
      ctx.lineTo(x + r * 0.6, y - r * 0.8);
      ctx.fill(); ctx.stroke();
    }

    // Name label
    ctx.fillStyle = '#fff';
    ctx.font = hovered ? 'bold 11px sans-serif' : '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(name, x, y + 4);
    ctx.shadowBlur = 0;
  }

  // Draw party sprite
  drawParty(x, y, color = '#4488ff', size = 5) {
    const ctx = this.ctx;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 4, size + 2, (size + 2) * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Flag/banner
    ctx.fillStyle = color;
    ctx.fillRect(x - 1, y - size * 3, 2, size * 3);
    ctx.beginPath();
    ctx.moveTo(x + 1, y - size * 3);
    ctx.lineTo(x + size + 3, y - size * 2);
    ctx.lineTo(x + 1, y - size);
    ctx.fillStyle = '#FFD700';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(x, y - size, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Helmet
    ctx.beginPath();
    ctx.arc(x, y - size - 3, size * 0.7, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
  }

  // Draw enemy party on overworld
  drawEnemyParty(x, y, color = '#ff4444') {
    const ctx = this.ctx;
    // Skull-like icon
    ctx.beginPath();
    ctx.arc(x, y - 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', x, y - 8);
  }

  // Draw text with shadow
  drawText(text, x, y, color = '#fff', font = '14px sans-serif', align = 'left') {
    const ctx = this.ctx;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  // Draw a damage number floating effect
  drawDamageNumber(x, y, damage, type = 'hit') {
    // This is called from the combat renderer
    const colors = { hit: '#ff4444', miss: '#888', heal: '#44ff44', crit: '#ffaa00' };
    this.drawText(
      type === 'miss' ? 'MISS' : (type === 'crit' ? `${damage}!` : String(damage)),
      x, y,
      colors[type] || '#fff',
      'bold 14px sans-serif',
      'center'
    );
  }

  // Draw night overlay
  drawNightOverlay(alpha) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0, 0, 30, ${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  // Draw a simple progress bar
  drawProgressBar(x, y, w, h, value, maxValue, fillColor = '#44ff44', bgColor = '#333') {
    const ctx = this.ctx;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, Math.max(0, w * (value / maxValue)), h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
}

// Color helpers
function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

export default Renderer;
