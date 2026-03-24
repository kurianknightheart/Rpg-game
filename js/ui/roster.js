// Roster/character screen UI
import state from '../state/gamestate.js';
import ITEMS from '../../data/items.js';
import TRAITS from '../../data/traits.js';
import BACKGROUNDS from '../../data/recruits.js';

export class RosterUI {
  constructor(container) {
    this.container = container;
    this.selectedChar = null;
    this._setup();
  }

  _setup() {
    if (!this.container) return;
    this.container.addEventListener('panelOpen', () => this.render());
  }

  render() {
    const container = this.container;
    if (!container) return;

    const roster = state.roster || [];

    container.innerHTML = `
      <div class="panel-header">
        <h2>Company Roster</h2>
        <span class="panel-subtitle">${roster.filter(c => c.alive).length} / ${state.maxRosterSize} mercenaries</span>
        <button class="btn-close-panel">✕</button>
      </div>
      <div class="roster-layout">
        <div class="roster-list" id="roster-list">
          ${roster.map((char, i) => this._renderCharCard(char, i)).join('')}
        </div>
        <div class="char-detail" id="char-detail">
          <p class="detail-placeholder">Select a mercenary to view details.</p>
        </div>
      </div>
    `;

    container.querySelector('.btn-close-panel').onclick = () => {
      container.classList.remove('active');
    };

    container.querySelectorAll('.char-card').forEach(el => {
      el.onclick = () => {
        const charId = el.dataset.charId;
        this.selectedChar = roster.find(c => c.id === charId);
        this._renderCharDetail(this.selectedChar);
        container.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
      };
    });
  }

  _renderCharCard(char, index) {
    const alive = char.alive && char.hp > 0;
    const hpPct = char.maxHP > 0 ? Math.max(0, char.hp / char.maxHP) : 0;
    const hpColor = hpPct > 0.5 ? '#44aa44' : hpPct > 0.25 ? '#aaaa44' : '#aa4444';
    const bg = BACKGROUNDS[char.background];
    const weapon = char.equipment.mainhand ? ITEMS[char.equipment.mainhand] : null;
    const bodyArmor = char.equipment.body ? ITEMS[char.equipment.body] : null;

    return `
      <div class="char-card ${!alive ? 'dead' : ''}" data-char-id="${char.id}">
        <div class="char-icon" style="background:${alive ? '#4488ff' : '#444'}">${char.name.charAt(0)}</div>
        <div class="char-info">
          <div class="char-name">${char.name}</div>
          <div class="char-sub">${bg ? bg.name : char.background} · Lv ${char.level}</div>
          <div class="hp-bar-wrap">
            <div class="hp-bar" style="width:${hpPct*100}%;background:${hpColor}"></div>
          </div>
          <div class="char-equip">${weapon ? weapon.name : 'Unarmed'} · ${bodyArmor ? bodyArmor.name : 'No Armor'}</div>
        </div>
        <div class="char-wage">${char.wage || 3}g/day</div>
      </div>
    `;
  }

  _renderCharDetail(char) {
    if (!char) return;
    const detail = this.container.querySelector('#char-detail');
    if (!detail) return;

    const a = char.attributes || {};
    const skills = char.skills || {};
    const bg = BACKGROUNDS[char.background];
    const alive = char.alive && char.hp > 0;

    const weapon = char.equipment.mainhand ? ITEMS[char.equipment.mainhand] : null;
    const offhand = char.equipment.offhand ? ITEMS[char.equipment.offhand] : null;
    const head = char.equipment.head ? ITEMS[char.equipment.head] : null;
    const body = char.equipment.body ? ITEMS[char.equipment.body] : null;

    const traits = (char.traits || []).map(tid => {
      const t = TRAITS[tid];
      return t ? `<span class="trait-badge trait-${t.type}" title="${t.desc}">${t.name}</span>` : '';
    }).join('');

    const wounds = (char.wounds || []).map(w => `<span class="wound-badge">${w}</span>`).join('');

    const xpThreshold = Math.round(100 * Math.pow(char.level, 1.5));
    const xpPct = Math.min(100, ((char.xp || 0) / xpThreshold) * 100);

    detail.innerHTML = `
      <div class="char-detail-header">
        <div class="char-detail-icon">${char.name.charAt(0)}</div>
        <div>
          <h3>${char.name}</h3>
          <div class="char-detail-sub">${bg ? bg.name : char.background} · Level ${char.level}</div>
          <div class="xp-bar-wrap" title="XP: ${char.xp || 0} / ${xpThreshold}">
            <div class="xp-bar" style="width:${xpPct}%"></div>
          </div>
        </div>
        <div class="char-hp-big">
          <span style="color:${alive ? '#44ff44' : '#ff4444'}">${char.hp}/${char.maxHP}</span>
          <small>HP</small>
        </div>
      </div>

      <div class="detail-section">
        <h4>Attributes</h4>
        <div class="attr-grid">
          <div class="attr-item"><span>STR</span><strong>${a.str || 0}</strong></div>
          <div class="attr-item"><span>DEX</span><strong>${a.dex || 0}</strong></div>
          <div class="attr-item"><span>END</span><strong>${a.end || 0}</strong></div>
          <div class="attr-item"><span>PER</span><strong>${a.per || 0}</strong></div>
          <div class="attr-item"><span>RES</span><strong>${a.res || 0}</strong></div>
          <div class="attr-item"><span>INI</span><strong>${a.ini || 0}</strong></div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Skills</h4>
        <div class="skills-grid">
          ${Object.entries(skills).map(([name, val]) => `
            <div class="skill-item">
              <span>${name}</span>
              <div class="skill-bar-wrap">
                <div class="skill-bar" style="width:${val}%"></div>
              </div>
              <strong>${val}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="detail-section">
        <h4>Equipment</h4>
        <div class="equip-slots">
          <div class="equip-slot"><span>Main Hand</span><strong>${weapon ? weapon.name : '—'}</strong></div>
          <div class="equip-slot"><span>Off Hand</span><strong>${offhand ? offhand.name : '—'}</strong></div>
          <div class="equip-slot"><span>Head</span><strong>${head ? head.name : '—'}</strong></div>
          <div class="equip-slot"><span>Body</span><strong>${body ? body.name : '—'}</strong></div>
        </div>
      </div>

      ${traits ? `<div class="detail-section"><h4>Traits</h4><div class="traits-list">${traits}</div></div>` : ''}
      ${wounds ? `<div class="detail-section"><h4>Wounds</h4><div class="wounds-list">${wounds}</div></div>` : ''}

      <div class="detail-footer">
        <span>Wage: ${char.wage || 3} gold/day</span>
        <span>Morale: ${char.morale || 50}</span>
      </div>
    `;
  }
}

export default RosterUI;
