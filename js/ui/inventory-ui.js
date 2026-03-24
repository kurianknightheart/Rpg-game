// inventory-ui.js – Renders the inventory panel content
import state from '../state/gamestate.js';
import ITEMS from '../../data/items.js';
import { equipItem, removeItem } from '../systems/inventory.js';

/**
 * Render the inventory panel into #inventoryContent.
 * Called by dynamic import in menus.js.
 * @param {object} gameState
 */
export function renderInventory(gameState) {
  const s = gameState || state;
  const container = document.getElementById('inventoryContent');
  if (!container) return;

  const inv = s.inventory || [];
  const gold = s.company?.gold || 0;

  if (inv.length === 0) {
    container.innerHTML = `
      <div class="inv-empty">
        <p>Your pack is empty.</p>
        <p class="inv-gold">💰 Gold on hand: <strong>${gold}g</strong></p>
      </div>`;
    return;
  }

  // Group by type for display
  const grouped = {};
  for (const slot of inv) {
    const def = ITEMS[slot.itemId] || { name: slot.itemId, type: 'misc' };
    const type = def.type || 'misc';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ slot, def });
  }

  const typeLabels = {
    weapon: '⚔️ Weapons', armor: '🛡 Armor', shield: '🛡 Shields',
    consumable: '🧪 Consumables', misc: '📦 Miscellaneous', currency: '💰 Currency',
    head: '⛑ Head', body: '👕 Body', accessory: '💍 Accessories',
  };

  let html = `<div class="inv-gold-bar">💰 Gold: <strong>${gold}g</strong></div>`;

  for (const [type, items] of Object.entries(grouped)) {
    html += `<div class="inv-section">
      <h4 class="inv-section-title">${typeLabels[type] || type}</h4>
      <div class="inv-grid">
        ${items.map(({ slot, def }) => {
          const qty = slot.qty || slot.quantity || 1;
          const rarity = def.rarity || 'common';
          return `
            <div class="item-card rarity-${rarity}" title="${def.desc || def.name}">
              <div class="item-icon">${_itemIcon(def)}</div>
              <div class="item-name">${def.name}</div>
              ${qty > 1 ? `<div class="item-qty">×${qty}</div>` : ''}
              ${def.damage ? `<div class="item-stat">${def.damage[0]}–${def.damage[1]} dmg</div>` : ''}
              ${def.armor  ? `<div class="item-stat">${def.armor} armor</div>` : ''}
              ${def.value  ? `<div class="item-price">${Math.ceil(def.value * 0.6)}g</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  container.innerHTML = html;
}

function _itemIcon(def) {
  const icons = {
    weapon: '⚔️', sword: '⚔️', axe: '🪓', mace: '🔨', spear: '🗡',
    bow: '🏹', crossbow: '🏹', dagger: '🗡',
    armor: '🛡', shield: '🛡', head: '⛑', body: '👕',
    consumable: '🧪', food: '🍖', potion: '🧪',
    misc: '📦', currency: '💰',
  };
  return icons[def.type] || icons[def.subtype] || '📦';
}
