// Settlement UI - tabs: Market, Tavern, Contracts, Smith
import state from '../state/gamestate.js';
import ITEMS from '../../data/items.js';
import BACKGROUNDS from '../../data/recruits.js';
import { generateMarketInventory, getBuyPrice, getSellPrice } from '../systems/economy.js';
import { addItem, removeItem, equipItem } from '../systems/inventory.js';
import { createCharacter } from '../systems/character.js';
import { acceptContract } from '../systems/contracts.js';
import { generateContractBoard } from '../../data/contracts.js';

export class SettlementUI {
  constructor(container) {
    this.container = container;
    this.settlement = null;
    this.activeTab = 'market';
    this._market = null;
    this._recruits = [];
  }

  open(settlement) {
    this.settlement = settlement;
    this.activeTab = 'market';
    this._generateMarket();
    this._generateRecruits();
    this.render();
    if (this.container) this.container.classList.add('active');
  }

  close() {
    if (this.container) this.container.classList.remove('active');
    this.settlement = null;
  }

  _generateMarket() {
    if (!this.settlement) return;
    // Check if market exists, otherwise generate
    if (!this.settlement.market || this.settlement.lastVisited !== state.day) {
      this.settlement.market = generateMarketInventory(this.settlement.type || 'village');
      this.settlement.lastVisited = state.day;
    }
    this._market = this.settlement.market;
  }

  _generateRecruits() {
    if (!this.settlement) return;
    if (!this.settlement.recruits || this.settlement.recruits.length === 0) {
      const [min, max] = this.settlement.recruitCount || [1, 3];
      const count = min + Math.floor(Math.random() * (max - min + 1));
      const bgList = Object.keys(BACKGROUNDS);
      this.settlement.recruits = [];
      for (let i = 0; i < count; i++) {
        const bg = bgList[Math.floor(Math.random() * bgList.length)];
        try {
          const char = createCharacter(bg);
          char.hireCost = char.wage * 5 + Math.floor(Math.random() * 30);
          this.settlement.recruits.push(char);
        } catch(e) {}
      }
    }
    this._recruits = this.settlement.recruits;
  }

  render() {
    if (!this.container || !this.settlement) return;

    const services = this.settlement.services || ['market'];
    const tabs = [
      { id: 'market', label: '⚔️ Market', show: true },
      { id: 'tavern', label: '🍺 Tavern', show: services.includes('tavern') },
      { id: 'contracts', label: '📜 Contracts', show: services.includes('contracts') },
      { id: 'smith', label: '🔨 Smith', show: services.includes('smith') },
    ].filter(t => t.show);

    this.container.innerHTML = `
      <div class="panel-header">
        <h2>${this.settlement.type === 'city' ? '🏯' : this.settlement.type === 'town' ? '🏰' : '🏘️'} ${this.settlement.name}</h2>
        <p class="settlement-desc">${this.settlement.desc || ''}</p>
        <button class="btn-close-panel">✕ Leave</button>
      </div>
      <div class="settlement-tabs">
        ${tabs.map(t => `<button class="tab-btn ${t.id === this.activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      <div class="settlement-content" id="settlement-content"></div>
    `;

    this.container.querySelector('.btn-close-panel').onclick = () => this.close();
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.tab;
        this.container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderTabContent();
      };
    });

    this._renderTabContent();
  }

  _renderTabContent() {
    const content = this.container.querySelector('#settlement-content');
    if (!content) return;

    switch (this.activeTab) {
      case 'market': this._renderMarket(content); break;
      case 'tavern': this._renderTavern(content); break;
      case 'contracts': this._renderContracts(content); break;
      case 'smith': this._renderSmith(content); break;
    }
  }

  _renderMarket(content) {
    const gold = state.company.gold || 0;
    const market = this._market || [];

    content.innerHTML = `
      <div class="market-header">
        <span>💰 Your Gold: <strong>${gold}</strong></span>
        <span>Settlement type: <strong>${this.settlement.type}</strong></span>
      </div>
      <div class="market-categories">
        <div class="market-section">
          <h4>Available Items</h4>
          <div class="market-list" id="market-buy-list">
            ${market.map((item, i) => `
              <div class="market-item" data-index="${i}">
                <span class="item-name">${ITEMS[item.itemId]?.name || item.itemId}</span>
                <span class="item-qty">x${item.quantity}</span>
                <span class="item-price">${item.price}g</span>
                <button class="btn-buy" data-index="${i}" ${item.quantity < 1 ? 'disabled' : ''}>Buy</button>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="market-section">
          <h4>Sell Items</h4>
          <div class="market-list" id="market-sell-list">
            ${this._renderSellList()}
          </div>
        </div>
      </div>
      <div id="market-msg" class="market-msg"></div>
    `;

    content.querySelectorAll('.btn-buy').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        this._buyItem(idx, content);
      };
    });

    content.querySelectorAll('.btn-sell').forEach(btn => {
      btn.onclick = () => {
        const itemId = btn.dataset.itemId;
        this._sellItem(itemId, content);
      };
    });
  }

  _renderSellList() {
    const inv = state.inventory || [];
    if (inv.length === 0) return '<p class="empty-msg">No items to sell.</p>';

    return inv.map(slot => {
      const item = ITEMS[slot.itemId];
      if (!item || item.type === 'currency') return '';
      const sellPrice = getSellPrice(slot.itemId, this.settlement?.type || 'village');
      return `
        <div class="market-item">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">x${slot.qty || 1}</span>
          <span class="item-price">${sellPrice}g</span>
          <button class="btn-sell" data-item-id="${slot.itemId}">Sell</button>
        </div>
      `;
    }).join('');
  }

  _buyItem(idx, content) {
    const item = this._market[idx];
    if (!item || item.quantity < 1) return;
    const price = item.price;

    if ((state.company.gold || 0) < price) {
      this._showMsg(content, 'Not enough gold!', 'error');
      return;
    }

    state.company.gold -= price;
    item.quantity--;
    addItem(state.inventory, { id: item.itemId, ...ITEMS[item.itemId] }, 1);
    this._showMsg(content, `Bought ${ITEMS[item.itemId]?.name || item.itemId} for ${price}g.`, 'success');
    this._renderMarket(content);
  }

  _sellItem(itemId, content) {
    const slot = state.inventory.find(s => s.itemId === itemId);
    if (!slot) return;

    const sellPrice = getSellPrice(itemId, this.settlement?.type || 'village');
    state.company.gold += sellPrice;
    removeItem(state.inventory, itemId, 1);

    this._showMsg(content, `Sold for ${sellPrice}g.`, 'success');
    this._renderMarket(content);
  }

  _renderTavern(content) {
    const recruits = this._recruits || [];

    content.innerHTML = `
      <div class="tavern-header">
        <h4>🍺 ${this.settlement.tavernName || 'The Tavern'}</h4>
        <p>Looking for work? Your company has ${state.roster.filter(c=>c.alive).length}/${state.maxRosterSize} members.</p>
      </div>
      <div class="recruit-list">
        ${recruits.length === 0
          ? '<p class="empty-msg">No recruits available today.</p>'
          : recruits.map((char, i) => this._renderRecruit(char, i)).join('')
        }
      </div>
    `;

    content.querySelectorAll('.btn-hire').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        this._hireRecruit(idx, content);
      };
    });
  }

  _renderRecruit(char, idx) {
    const bg = BACKGROUNDS[char.background];
    const alive = state.roster.filter(c => c.alive).length < (state.maxRosterSize || 12);
    const canAfford = (state.company.gold || 0) >= char.hireCost;
    const weapon = char.equipment.mainhand ? ITEMS[char.equipment.mainhand] : null;
    const armor = char.equipment.body ? ITEMS[char.equipment.body] : null;
    const a = char.attributes || {};

    return `
      <div class="recruit-card">
        <div class="recruit-icon">${char.name.charAt(0)}</div>
        <div class="recruit-info">
          <div class="recruit-name">${char.name}</div>
          <div class="recruit-bg">${bg ? bg.name : char.background}</div>
          <div class="recruit-attrs">STR:${a.str||0} DEX:${a.dex||0} END:${a.end||0}</div>
          <div class="recruit-gear">${weapon ? weapon.name : 'No weapon'} | ${armor ? armor.name : 'No armor'}</div>
        </div>
        <div class="recruit-cost">
          <div>${char.hireCost}g upfront</div>
          <div>${char.wage}g/day</div>
          <button class="btn-hire" data-index="${idx}" ${(!alive || !canAfford) ? 'disabled' : ''}>
            ${!alive ? 'Full' : !canAfford ? 'Too Expensive' : 'Hire'}
          </button>
        </div>
      </div>
    `;
  }

  _hireRecruit(idx, content) {
    const char = this._recruits[idx];
    if (!char) return;

    const rosterSize = state.roster.filter(c => c.alive).length;
    if (rosterSize >= (state.maxRosterSize || 12)) {
      this._showMsg(content, 'Company is full!', 'error');
      return;
    }
    if ((state.company.gold || 0) < char.hireCost) {
      this._showMsg(content, 'Not enough gold!', 'error');
      return;
    }

    state.company.gold -= char.hireCost;
    state.roster.push(char);
    this._recruits.splice(idx, 1);
    this._showMsg(content, `${char.name} joins the company!`, 'success');
    this._renderTavern(content);
  }

  _renderContracts(content) {
    if (!this.settlement.contracts || this.settlement.contracts.length === 0) {
      this.settlement.contracts = generateContractBoard(3, state.company.renown || 0);
    }
    const contracts = this.settlement.contracts;

    content.innerHTML = `
      <div class="contracts-header">
        <h4>📜 Contract Board</h4>
        <p>Active contracts: <strong>${(state.contracts.active || []).length}</strong></p>
      </div>
      <div class="contracts-list">
        ${contracts.length === 0
          ? '<p class="empty-msg">No contracts available.</p>'
          : contracts.map((c, i) => this._renderContract(c, i)).join('')
        }
      </div>
      <div class="active-contracts">
        <h4>Your Active Contracts</h4>
        ${(state.contracts.active || []).length === 0
          ? '<p class="empty-msg">None.</p>'
          : (state.contracts.active || []).map(c => `
              <div class="contract-card active">
                <div class="contract-title">${c.title}</div>
                <div class="contract-desc">${c.desc}</div>
                <div class="contract-footer">Reward: <strong>${c.reward}g</strong> · Due: Day ${c.expiresDay || '?'}</div>
              </div>
            `).join('')
        }
      </div>
    `;

    content.querySelectorAll('.btn-accept-contract').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        this._acceptContract(idx, content);
      };
    });
  }

  _renderContract(contract, idx) {
    const alreadyActive = (state.contracts.active || []).some(c => c.templateId === contract.templateId);
    const diff = contract.difficulty || 'medium';
    const diffColors = { easy: '#44aa44', medium: '#aaaa44', hard: '#aa4444' };

    return `
      <div class="contract-card">
        <div class="contract-title">${contract.title}</div>
        <span class="contract-diff" style="color:${diffColors[diff]}">${diff}</span>
        <div class="contract-desc">${contract.desc}</div>
        <div class="contract-footer">
          <span>Reward: <strong>${contract.reward}g</strong></span>
          <span>${contract.durationDays} days</span>
          <button class="btn-accept-contract" data-index="${idx}" ${alreadyActive ? 'disabled' : ''}>
            ${alreadyActive ? 'Already Active' : 'Accept'}
          </button>
        </div>
      </div>
    `;
  }

  _acceptContract(idx, content) {
    const contract = this.settlement.contracts[idx];
    if (!contract) return;

    const result = acceptContract(state, contract, this.settlement.id);
    if (result) {
      this._showMsg(content, `Contract accepted: ${contract.title}`, 'success');
      this._renderContracts(content);
    } else {
      this._showMsg(content, 'Could not accept contract.', 'error');
    }
  }

  _renderSmith(content) {
    const smithItems = this._market ? this._market.filter(i => {
      const item = ITEMS[i.itemId];
      return item && (item.type === 'armor' || item.type === 'shield' ||
                     (item.type === 'weapon' && item.slot === 'mainhand'));
    }) : [];

    content.innerHTML = `
      <div class="smith-header">
        <h4>🔨 The Blacksmith</h4>
        <p>Fine weapons and armor. Your gold: <strong>${state.company.gold}g</strong></p>
      </div>
      <div class="smith-list">
        ${smithItems.length === 0
          ? '<p class="empty-msg">Nothing of note in stock.</p>'
          : smithItems.map((item, i) => {
              const def = ITEMS[item.itemId];
              if (!def) return '';
              return `
                <div class="smith-item">
                  <span class="item-name">${def.name}</span>
                  <span class="item-desc">${def.desc || ''}</span>
                  ${def.armor ? `<span>Armor: ${def.armor}</span>` : ''}
                  ${def.damage ? `<span>Damage: ${def.damage[0]}-${def.damage[1]}</span>` : ''}
                  <span class="item-price">${item.price}g</span>
                  <button class="btn-smith-buy" data-itemid="${item.itemId}" data-price="${item.price}" ${item.quantity < 1 ? 'disabled' : ''}>Buy</button>
                </div>
              `;
            }).join('')
        }
      </div>
      <div id="smith-msg"></div>
    `;

    content.querySelectorAll('.btn-smith-buy').forEach(btn => {
      btn.onclick = () => {
        const itemId = btn.dataset.itemid;
        const price = parseInt(btn.dataset.price);
        if ((state.company.gold || 0) < price) {
          const msg = content.querySelector('#smith-msg');
          if (msg) { msg.textContent = 'Not enough gold!'; msg.className = 'market-msg error'; }
          return;
        }
        state.company.gold -= price;
        addItem(state.inventory, { id: itemId, ...ITEMS[itemId] }, 1);
        const marketItem = this._market.find(m => m.itemId === itemId);
        if (marketItem) marketItem.quantity--;
        const msg = content.querySelector('#smith-msg');
        if (msg) { msg.textContent = `Bought ${ITEMS[itemId]?.name || itemId}!`; msg.className = 'market-msg success'; }
        this._renderSmith(content);
      };
    });
  }

  _showMsg(content, text, type = 'info') {
    const msg = content.querySelector('#market-msg') || content.querySelector('.market-msg');
    if (msg) {
      msg.textContent = text;
      msg.className = `market-msg ${type}`;
      setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
    }
  }
}

export default SettlementUI;
