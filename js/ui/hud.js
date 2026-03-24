// Main HUD - overworld HUD overlay
import state from '../state/gamestate.js';
import { getMoraleLabel, getMoraleColor } from '../systems/economy.js';

const MORALE_COLORS = {
  Excellent: '#44ff44', Good: '#88ff44', Steady: '#ffff44',
  Shaken: '#ffaa44', Poor: '#ff6644', Broken: '#ff4444'
};

export class HUD {
  constructor(container) {
    this.container = container || document.getElementById('hud');
    this.elements = {};
    this._build();
  }

  _build() {
    const hud = this.container;
    if (!hud) return;

    hud.innerHTML = `
      <div id="hud-top">
        <div id="hud-time">
          <span id="hud-day">Day 1</span>
          <span id="hud-clock">08:00</span>
          <span id="hud-period">Morning</span>
        </div>
        <div id="hud-resources">
          <span class="hud-res" id="hud-gold" title="Gold">💰 <span>500</span></span>
          <span class="hud-res" id="hud-food" title="Food">🍞 <span>30</span></span>
          <span class="hud-res" id="hud-morale" title="Morale">⚔️ <span>Steady</span></span>
          <span class="hud-res" id="hud-party" title="Party Size">👥 <span>3/12</span></span>
        </div>
      </div>
      <div id="hud-bottom">
        <button class="hud-btn" id="btn-roster" title="Roster (R)">📋 Roster</button>
        <button class="hud-btn" id="btn-inventory" title="Inventory (I)">🎒 Inventory</button>
        <button class="hud-btn" id="btn-camp" title="Camp (C)">⛺ Camp</button>
        <button class="hud-btn" id="btn-menu" title="Menu (Esc)">☰ Menu</button>
      </div>
      <div id="hud-notifications"></div>
    `;

    this.elements = {
      day: hud.querySelector('#hud-day'),
      clock: hud.querySelector('#hud-clock'),
      period: hud.querySelector('#hud-period'),
      gold: hud.querySelector('#hud-gold span'),
      food: hud.querySelector('#hud-food span'),
      morale: hud.querySelector('#hud-morale span'),
      party: hud.querySelector('#hud-party span'),
      notifications: hud.querySelector('#hud-notifications'),
    };

    // Button bindings
    hud.querySelector('#btn-roster').onclick = () => this._openScreen('roster');
    hud.querySelector('#btn-inventory').onclick = () => this._openScreen('inventory');
    hud.querySelector('#btn-camp').onclick = () => this._openCamp();
    hud.querySelector('#btn-menu').onclick = () => this._openMenu();
  }

  _openScreen(name) {
    const panel = document.getElementById(`panel-${name}`);
    if (panel) {
      // Close other panels
      document.querySelectorAll('.game-panel').forEach(p => {
        if (p.id !== `panel-${name}`) p.classList.remove('active');
      });
      panel.classList.toggle('active');
      if (panel.classList.contains('active')) {
        panel.dispatchEvent(new CustomEvent('panelOpen'));
      }
    }
  }

  _openCamp() {
    this.showCampMenu();
  }

  _openMenu() {
    const panel = document.getElementById('panel-menu');
    if (panel) {
      panel.classList.toggle('active');
    }
  }

  showCampMenu() {
    const existing = document.getElementById('camp-modal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'camp-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <h2>🏕️ Camp</h2>
        <div class="modal-section">
          <p>Rest for the night to recover HP and fatigue.</p>
          <button class="btn-primary" id="camp-rest">Rest (8 hours)</button>
        </div>
        <div class="modal-section">
          <p>Current food: <strong>${state.company.food || 0}</strong> rations</p>
          <p>Party needs <strong>${state.roster.filter(c => c.alive).length}</strong> food per day</p>
        </div>
        <button class="btn-close" id="camp-close">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#camp-rest').onclick = () => {
      this._doRest();
      modal.remove();
    };
    modal.querySelector('#camp-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  _doRest() {
    // Consume food
    const partySize = state.roster.filter(c => c.alive).length;
    const foodNeeded = partySize;

    if (state.company.food >= foodNeeded) {
      state.company.food -= foodNeeded;
    } else {
      state.company.food = 0;
      state.company.morale = Math.max(0, state.company.morale - 5);
    }

    // Restore HP
    for (const char of state.roster) {
      if (!char.alive) continue;
      const heal = Math.floor(char.maxHP * 0.3);
      char.hp = Math.min(char.maxHP, char.hp + heal);
    }

    // Advance time
    state.hour = (state.hour || 6) + 8;
    while (state.hour >= 24) {
      state.hour -= 24;
      state.day++;
    }

    state.company.morale = Math.min(100, state.company.morale + 5);
    this.showNotification('The company rests. HP restored.', 'positive');
    this.update();
  }

  update() {
    if (!this.elements.day) return;

    const h = Math.floor(state.hour || 6);
    const m = Math.floor(((state.hour || 6) - h) * 60);
    const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;

    this.elements.day.textContent = `Day ${state.day || 1}`;
    this.elements.clock.textContent = timeStr;
    this.elements.period.textContent = this._getTimePeriod(h);

    const gold = state.company.gold || 0;
    this.elements.gold.textContent = gold >= 1000 ? `${(gold/1000).toFixed(1)}k` : gold;

    this.elements.food.textContent = state.company.food || 0;

    const morale = state.company.morale || 50;
    const moraleLabel = getMoraleLabel(morale);
    this.elements.morale.textContent = moraleLabel;
    this.elements.morale.style.color = getMoraleColor(morale);

    const aliveCount = state.roster.filter(c => c.alive).length;
    this.elements.party.textContent = `${aliveCount}/${state.maxRosterSize || 12}`;
  }

  _getTimePeriod(h) {
    if (h >= 5 && h < 7) return 'Dawn';
    if (h >= 7 && h < 12) return 'Morning';
    if (h >= 12 && h < 14) return 'Midday';
    if (h >= 14 && h < 17) return 'Afternoon';
    if (h >= 17 && h < 19) return 'Evening';
    if (h >= 19 && h < 22) return 'Dusk';
    return 'Night';
  }

  showNotification(message, type = 'info') {
    const notif = this.elements.notifications;
    if (!notif) return;

    const el = document.createElement('div');
    el.className = `notification notification-${type}`;
    el.textContent = message;
    notif.appendChild(el);

    // Animate out
    setTimeout(() => el.classList.add('fade-out'), 2500);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
  }

  show() {
    if (this.container) this.container.style.display = '';
    this.update();
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }
}

export default HUD;

// Standalone helpers for dynamic imports in menus.js
export function updateHUD(state) {
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  if (!state) return;
  const h = Math.floor(state.hour || 6);
  const m = Math.floor(((state.hour || 6) - h) * 60);
  set('hudDay', `Day ${state.day || 1}`);
  set('hudTime', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  const gold = state.company?.gold || 0;
  set('hudGold', gold >= 1000 ? `${(gold/1000).toFixed(1)}k` : gold);
  set('hudFood', state.company?.food || 0);
  set('hudMorale', state.company?.morale || 50);
  const alive = (state.roster || []).filter(c => c.alive).length;
  set('hudPartySize', `${alive}/${state.maxRosterSize || 12}`);
}

// Signature: addTravelLog(stateOrMsg, msg?, type?)
// Supports both addTravelLog('text') and addTravelLog(state, 'text', 'type')
export function addTravelLog(stateOrMsg, msg, type) {
  const text = typeof stateOrMsg === 'string' ? stateOrMsg : (msg || '');
  const log = document.getElementById('travelLog');
  if (!log) return;
  const div = document.createElement('div');
  div.className = `log-entry${type ? ' log-' + type : ''}`;
  div.textContent = text;
  log.insertBefore(div, log.firstChild);
  while (log.children.length > 8) log.removeChild(log.lastChild);
}
