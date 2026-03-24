/**
 * character-stats.js
 * Battle Brothers Legends-style character stats screen.
 *
 * Opens a full-screen modal showing a single character's stats,
 * with left/right arrows to cycle through the party roster.
 *
 * Usage:
 *   import { CharacterStatsScreen } from './ui/character-stats.js';
 *   const screen = new CharacterStatsScreen(state);
 *   screen.open(characterId);  // or screen.openIndex(0)
 *   screen.close();
 */

import ITEMS      from '../../data/items.js';
import TRAITS     from '../../data/traits.js';
import BACKGROUNDS from '../../data/recruits.js';

// ──────────────────────────────────────────────────────────────────────────────
// Avatar colours per background
// ──────────────────────────────────────────────────────────────────────────────
const BG_COLORS = {
  farmer:     '#5a7a3a',
  militia:    '#3a5a8a',
  sellsword:  '#7a3a3a',
  hunter:     '#5a6a3a',
  thief:      '#4a3a6a',
  squire:     '#6a5a2a',
  blacksmith: '#6a4a2a',
  deserter:   '#4a4a4a',
};

// ──────────────────────────────────────────────────────────────────────────────
// Attribute display config
// ──────────────────────────────────────────────────────────────────────────────
const ATTR_CONFIG = [
  { key: 'str', label: 'Strength',    icon: '💪', desc: 'Raw physical power. Affects melee damage.' },
  { key: 'dex', label: 'Dexterity',   icon: '🤸', desc: 'Agility and precision. Affects hit chance.' },
  { key: 'end', label: 'Endurance',   icon: '❤️', desc: 'Stamina and toughness. Affects max HP.' },
  { key: 'per', label: 'Perception',  icon: '👁', desc: 'Awareness. Affects ranged attacks.' },
  { key: 'res', label: 'Resolve',     icon: '🧠', desc: 'Mental fortitude. Affects morale checks.' },
  { key: 'ini', label: 'Initiative',  icon: '⚡', desc: 'Reaction speed. Affects turn order.' },
];

const SKILL_ICONS = {
  swords:     '⚔️', axes:       '🪓', maces:     '🔨',
  spears:     '🗡️', bows:       '🏹', crossbows: '🎯',
  daggers:    '🔪', throwing:   '💫', shields:   '🛡️',
  medicine:   '🩺', survival:   '🏕️',
};

// ──────────────────────────────────────────────────────────────────────────────
// CharacterStatsScreen
// ──────────────────────────────────────────────────────────────────────────────

export class CharacterStatsScreen {
  constructor(state) {
    this.state     = state;
    this._modal    = null;
    this._charIdx  = 0;
    this._open     = false;
    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  open(charId) {
    const roster = this._aliveRoster();
    const idx    = roster.findIndex(c => c.id === charId);
    this._charIdx = idx >= 0 ? idx : 0;
    this._show();
  }

  openIndex(idx) {
    this._charIdx = Math.max(0, idx);
    this._show();
  }

  close() {
    if (this._modal) {
      this._modal.classList.remove('cs-visible');
      setTimeout(() => {
        if (this._modal) this._modal.style.display = 'none';
      }, 200);
    }
    this._open = false;
  }

  isOpen() { return this._open; }

  // ── Build modal skeleton ────────────────────────────────────────────────────

  _build() {
    const m = document.createElement('div');
    m.id = 'characterStatsScreen';
    m.className = 'cs-overlay';
    m.style.display = 'none';
    m.innerHTML = `
      <div class="cs-panel">
        <!-- Header -->
        <div class="cs-header">
          <button class="cs-nav-btn" id="csPrev" title="Previous member">&#8249;</button>
          <div class="cs-header-center">
            <div class="cs-title" id="csTitle">Character</div>
            <div class="cs-subtitle" id="csSubtitle"></div>
          </div>
          <button class="cs-nav-btn" id="csNext" title="Next member">&#8250;</button>
          <button class="cs-close-btn" id="csClose" title="Close">✕</button>
        </div>

        <!-- Body -->
        <div class="cs-body">
          <!-- Left column: portrait + vital bars -->
          <div class="cs-col cs-col-left">
            <div class="cs-portrait" id="csPortrait">
              <div class="cs-avatar" id="csAvatar"></div>
              <div class="cs-level-badge" id="csLevel">Lv 1</div>
            </div>
            <div class="cs-vitals" id="csVitals"></div>
            <div class="cs-morale-section" id="csMorale"></div>
            <div class="cs-wage-section" id="csWage"></div>
          </div>

          <!-- Middle column: attributes + derived -->
          <div class="cs-col cs-col-mid">
            <div class="cs-section-title">Attributes</div>
            <div class="cs-attrs" id="csAttrs"></div>
            <div class="cs-section-title" style="margin-top:14px">Combat Stats</div>
            <div class="cs-derived" id="csDerived"></div>
          </div>

          <!-- Right column: equipment + traits/wounds -->
          <div class="cs-col cs-col-right">
            <div class="cs-section-title">Equipment</div>
            <div class="cs-equip-layout" id="csEquip"></div>
            <div id="csTraitsSection" class="cs-badges-section"></div>
            <div id="csWoundsSection" class="cs-badges-section"></div>
          </div>
        </div>

        <!-- Skills row at bottom -->
        <div class="cs-skills-section">
          <div class="cs-section-title">Skills</div>
          <div class="cs-skills-grid" id="csSkills"></div>
        </div>
      </div>

      <!-- Click outside to close -->
      <div class="cs-backdrop" id="csBackdrop"></div>
    `;

    document.body.appendChild(m);
    this._modal = m;

    // Close button
    m.querySelector('#csClose').addEventListener('click', () => this.close());
    m.querySelector('#csBackdrop').addEventListener('click', () => this.close());

    // Navigation
    m.querySelector('#csPrev').addEventListener('click', () => this._navigate(-1));
    m.querySelector('#csNext').addEventListener('click', () => this._navigate(1));

    // Keyboard nav
    this._keyHandler = (e) => {
      if (!this._open) return;
      if (e.key === 'Escape')      this.close();
      if (e.key === 'ArrowLeft')   this._navigate(-1);
      if (e.key === 'ArrowRight')  this._navigate(1);
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  // ── Show & render ───────────────────────────────────────────────────────────

  _show() {
    const roster = this._aliveRoster();
    if (roster.length === 0) return;
    this._charIdx = Math.min(this._charIdx, roster.length - 1);
    this._open = true;
    this._modal.style.display = 'flex';
    requestAnimationFrame(() => {
      this._modal.classList.add('cs-visible');
    });
    this._render(roster[this._charIdx], roster);
  }

  _navigate(delta) {
    const roster = this._aliveRoster();
    if (roster.length === 0) return;
    this._charIdx = (this._charIdx + delta + roster.length) % roster.length;
    this._render(roster[this._charIdx], roster);
  }

  _aliveRoster() {
    return (this.state.roster || []).filter(c => c.alive);
  }

  // ── Render character data ───────────────────────────────────────────────────

  _render(char, roster) {
    if (!char) return;
    const bg      = BACKGROUNDS[char.background];
    const bgLabel = bg ? bg.name : (char.background || 'Unknown');
    const alive   = char.alive && char.hp > 0;
    const color   = BG_COLORS[char.background] || '#4a6a8a';

    // Header
    this._set('csTitle',    char.name);
    this._set('csSubtitle', `${bgLabel} · Level ${char.level}`);

    // Nav buttons visibility
    const prevBtn = this._el('csPrev');
    const nextBtn = this._el('csNext');
    if (prevBtn) prevBtn.style.opacity = roster.length > 1 ? '1' : '0.3';
    if (nextBtn) nextBtn.style.opacity = roster.length > 1 ? '1' : '0.3';

    // Portrait
    const avatar = this._el('csAvatar');
    if (avatar) {
      avatar.textContent = char.name.charAt(0).toUpperCase();
      avatar.style.background = `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66)`;
      avatar.style.borderColor = alive ? '#d4a843' : '#666';
    }
    this._set('csLevel', `Lv ${char.level}`);

    // Vitals
    this._renderVitals(char, alive);

    // Attributes
    this._renderAttrs(char);

    // Derived combat stats
    this._renderDerived(char);

    // Equipment
    this._renderEquip(char);

    // Traits & Wounds
    this._renderBadges(char);

    // Skills
    this._renderSkills(char);
  }

  _renderVitals(char, alive) {
    const hpPct = Math.max(0, Math.min(100, (char.hp / (char.maxHP || 1)) * 100));
    const spPct = Math.max(0, Math.min(100, ((char.stamina || 0) / (char.maxStamina || 1)) * 100));
    const hpCol = hpPct > 60 ? '#44cc66' : hpPct > 30 ? '#ddaa22' : '#cc3322';

    const vitals = this._el('csVitals');
    if (!vitals) return;
    vitals.innerHTML = `
      <div class="cs-vital-row">
        <span class="cs-vital-label">HP</span>
        <div class="cs-vital-bar-bg">
          <div class="cs-vital-bar-fill" style="width:${hpPct}%;background:${hpCol}"></div>
        </div>
        <span class="cs-vital-val">${char.hp}/${char.maxHP}</span>
      </div>
      <div class="cs-vital-row">
        <span class="cs-vital-label">ST</span>
        <div class="cs-vital-bar-bg">
          <div class="cs-vital-bar-fill" style="width:${spPct}%;background:#4488cc"></div>
        </div>
        <span class="cs-vital-val">${char.stamina || 0}/${char.maxStamina || 0}</span>
      </div>
    `;

    const moraleEl = this._el('csMorale');
    if (moraleEl) {
      const mor = char.morale || 50;
      const morLabel = mor >= 80 ? 'Fearless' : mor >= 60 ? 'Steady' :
                       mor >= 40 ? 'Wavering' : mor >= 20 ? 'Shaken' : 'Broken';
      const morCol   = mor >= 60 ? '#44cc66' : mor >= 40 ? '#ddaa22' : '#cc3322';
      moraleEl.innerHTML = `
        <div class="cs-morale-row">
          <span class="cs-vital-label">Morale</span>
          <span class="cs-morale-label" style="color:${morCol}">${morLabel}</span>
          <span class="cs-vital-val">${mor}</span>
        </div>
      `;
    }

    const wageEl = this._el('csWage');
    if (wageEl) {
      wageEl.innerHTML = `<div class="cs-wage">Wage: <strong>${char.wage || 3} gold</strong>/day</div>`;
    }
  }

  _renderAttrs(char) {
    const a    = char.attributes || {};
    const el   = this._el('csAttrs');
    if (!el) return;

    el.innerHTML = ATTR_CONFIG.map(cfg => {
      const val  = a[cfg.key] || 0;
      const pct  = Math.min(100, (val / 80) * 100); // 80 = ~max base
      return `
        <div class="cs-attr-row" title="${cfg.desc}">
          <span class="cs-attr-icon">${cfg.icon}</span>
          <span class="cs-attr-label">${cfg.label}</span>
          <div class="cs-attr-bar-bg">
            <div class="cs-attr-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="cs-attr-val">${val}</span>
        </div>
      `;
    }).join('');
  }

  _renderDerived(char) {
    const a   = char.attributes || {};
    const el  = this._el('csDerived');
    if (!el) return;

    const attack   = Math.round((a.dex || 0) * 0.6 + (a.str || 0) * 0.2);
    const defense  = Math.round((a.dex || 0) * 0.4 + (a.res || 0) * 0.2);
    const ranged   = Math.round((a.per || 0) * 0.5 + (a.dex || 0) * 0.3);
    const initiative = Math.round((a.ini || 0) * 3 + Math.floor((a.dex || 0) / 2));

    el.innerHTML = `
      <div class="cs-derived-grid">
        <div class="cs-derived-item">
          <span class="cs-derived-icon">⚔</span>
          <span class="cs-derived-label">Melee Atk</span>
          <span class="cs-derived-val">${attack}</span>
        </div>
        <div class="cs-derived-item">
          <span class="cs-derived-icon">🛡</span>
          <span class="cs-derived-label">Defense</span>
          <span class="cs-derived-val">${defense}</span>
        </div>
        <div class="cs-derived-item">
          <span class="cs-derived-icon">🏹</span>
          <span class="cs-derived-label">Ranged Atk</span>
          <span class="cs-derived-val">${ranged}</span>
        </div>
        <div class="cs-derived-item">
          <span class="cs-derived-icon">⚡</span>
          <span class="cs-derived-label">Initiative</span>
          <span class="cs-derived-val">${initiative}</span>
        </div>
      </div>
    `;
  }

  _renderEquip(char) {
    const eq  = char.equipment || {};
    const el  = this._el('csEquip');
    if (!el) return;

    const slot = (key, label, icon) => {
      const item = eq[key] ? ITEMS[eq[key]] : null;
      const name = item ? item.name : '—';
      const filled = !!item;
      return `
        <div class="cs-equip-slot ${filled ? 'slot-filled' : 'slot-empty'}">
          <div class="cs-slot-icon">${icon}</div>
          <div class="cs-slot-info">
            <div class="cs-slot-label">${label}</div>
            <div class="cs-slot-name">${name}</div>
          </div>
        </div>
      `;
    };

    el.innerHTML = `
      <div class="cs-equip-body">
        <div class="cs-equip-top">
          ${slot('head',     'Head',      '🪖')}
        </div>
        <div class="cs-equip-mid">
          ${slot('mainhand', 'Main Hand', '⚔️')}
          ${slot('body',     'Body',      '🥋')}
          ${slot('offhand',  'Off Hand',  '🛡️')}
        </div>
      </div>
    `;
  }

  _renderBadges(char) {
    const traitsEl  = this._el('csTraitsSection');
    const woundsEl  = this._el('csWoundsSection');

    if (traitsEl) {
      const traits = (char.traits || []).map(tid => {
        const t = TRAITS[tid];
        if (!t) return '';
        const typeClass = t.type === 'positive' ? 'badge-positive' :
                          t.type === 'negative' ? 'badge-negative' : 'badge-neutral';
        return `<span class="cs-badge ${typeClass}" title="${t.desc || ''}">${t.name}</span>`;
      }).join('');

      traitsEl.innerHTML = traits
        ? `<div class="cs-section-title">Traits</div><div class="cs-badge-row">${traits}</div>`
        : '';
    }

    if (woundsEl) {
      const wounds = (char.wounds || []).map(w =>
        `<span class="cs-badge badge-wound">${w.replace(/_/g, ' ')}</span>`
      ).join('');

      woundsEl.innerHTML = wounds
        ? `<div class="cs-section-title" style="color:#cc5555">Wounds</div><div class="cs-badge-row">${wounds}</div>`
        : '';
    }
  }

  _renderSkills(char) {
    const skills = char.skills || {};
    const el     = this._el('csSkills');
    if (!el) return;

    el.innerHTML = Object.entries(skills).map(([name, val]) => {
      const icon = SKILL_ICONS[name] || '•';
      const pct  = Math.min(100, val);
      const col  = val >= 70 ? '#d4a843' : val >= 40 ? '#88aa55' : '#6688aa';
      return `
        <div class="cs-skill-item">
          <span class="cs-skill-icon">${icon}</span>
          <span class="cs-skill-name">${name.charAt(0).toUpperCase() + name.slice(1)}</span>
          <div class="cs-skill-bar-bg">
            <div class="cs-skill-bar-fill" style="width:${pct}%;background:${col}"></div>
          </div>
          <span class="cs-skill-val">${val}</span>
        </div>
      `;
    }).join('');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _el(id)        { return document.getElementById(id); }
  _set(id, val)  { const e = this._el(id); if (e) e.textContent = val; }
}

// ── Singleton factory ────────────────────────────────────────────────────────

let _instance = null;

export function getCharacterStatsScreen(state) {
  if (!_instance) _instance = new CharacterStatsScreen(state);
  return _instance;
}
