// Inventory management: items, equipping, stacking, transfer.

import ITEMS from '../../data/items.js';
import { calculateDerivedStats } from './character.js';

// -------------------------------------------------------------------------
// Core inventory operations
// -------------------------------------------------------------------------

/**
 * Add an item to an inventory array. Stacks if stackable.
 * @param {Array}  inventory  - array of { itemId, qty, ...data }
 * @param {object} itemData   - item definition object (or just { id, ... })
 * @param {number} qty
 */
export function addItem(inventory, itemData, qty = 1) {
  const id = itemData.id || itemData.itemId;
  if (!id) return;

  const def = ITEMS[id] || itemData;

  if (def.stackable) {
    const existing = inventory.find(slot => slot.itemId === id);
    if (existing) {
      existing.qty += qty;
      return;
    }
  }

  // Add as new slot
  inventory.push({
    itemId: id,
    qty,
    ...def,
  });
}

/**
 * Remove qty of an item from inventory.
 * Returns true if successful.
 */
export function removeItem(inventory, itemId, qty = 1) {
  const idx = inventory.findIndex(slot => slot.itemId === itemId);
  if (idx === -1) return false;

  const slot = inventory[idx];
  if (slot.qty < qty) return false;

  slot.qty -= qty;
  if (slot.qty <= 0) {
    inventory.splice(idx, 1);
  }
  return true;
}

/**
 * Find an item slot in inventory by itemId.
 * Returns the slot object or null.
 */
export function getItem(inventory, itemId) {
  return inventory.find(slot => slot.itemId === itemId) || null;
}

// -------------------------------------------------------------------------
// Equipment
// -------------------------------------------------------------------------

/**
 * Equip an item from inventory to the character's equipment slots.
 * Returns true on success.
 */
export function equipItem(char, item) {
  const def = ITEMS[item.id || item.itemId] || item;
  if (!def) return false;
  if (!canEquip(char, def)) return false;

  const slot = def.slot; // 'head' | 'body' | 'mainhand' | 'offhand'

  // Unequip current item in that slot first
  if (char.equipment[slot]) {
    unequipItem(char, slot);
  }

  // Two-handed weapons also remove offhand
  if (def.twoHanded && slot === 'mainhand' && char.equipment.offhand) {
    unequipItem(char, 'offhand');
  }
  if (slot === 'offhand') {
    const mh = char.equipment.mainhand ? ITEMS[char.equipment.mainhand] : null;
    if (mh && mh.twoHanded) {
      unequipItem(char, 'mainhand');
    }
  }

  char.equipment[slot] = def.id;

  // Remove from inventory
  if (char.inventory) removeItem(char.inventory, def.id, 1);

  calculateDerivedStats(char);
  return true;
}

/**
 * Unequip item from slot, return item ID to inventory if char has one.
 * Returns the item ID that was unequipped, or null.
 */
export function unequipItem(char, slot) {
  const itemId = char.equipment[slot];
  if (!itemId) return null;

  char.equipment[slot] = null;

  if (char.inventory) {
    const def = ITEMS[itemId];
    if (def) addItem(char.inventory, def, 1);
  }

  calculateDerivedStats(char);
  return itemId;
}

/**
 * Check if a character can equip an item.
 * Basic checks: not null, valid slot, weight limits (simplified).
 */
export function canEquip(char, item) {
  const def = ITEMS[item.id || item.itemId] || item;
  if (!def) return false;

  const validSlots = ['head', 'body', 'mainhand', 'offhand'];
  if (!validSlots.includes(def.slot)) return false;

  // Strength check for heavy armor (simplified)
  const weight = def.weight || 0;
  if (weight > 15 && char.attributes && char.attributes.str < 8) return false;

  return true;
}

// -------------------------------------------------------------------------
// Encumbrance and armor values
// -------------------------------------------------------------------------

/**
 * Calculate total carried weight (equipped + inventory).
 */
export function getEncumbrance(char) {
  let total = 0;

  for (const itemId of Object.values(char.equipment)) {
    if (!itemId) continue;
    const def = ITEMS[itemId];
    if (def) total += def.weight || 0;
  }

  if (char.inventory) {
    for (const slot of char.inventory) {
      const def = ITEMS[slot.itemId];
      if (def) total += (def.weight || 0) * slot.qty;
    }
  }

  return total;
}

/**
 * Sum armor value from equipped head and body pieces.
 */
export function getArmorValue(char) {
  let armor = 0;
  const head = char.equipment.head ? ITEMS[char.equipment.head] : null;
  const body = char.equipment.body ? ITEMS[char.equipment.body] : null;
  if (head) armor += head.armor || 0;
  if (body) armor += body.armor || 0;
  return armor;
}

// -------------------------------------------------------------------------
// Transfer and global item access
// -------------------------------------------------------------------------

/**
 * Transfer qty of itemId from one inventory array to another.
 * Returns true on success.
 */
export function transferItem(fromInv, toInv, itemId, qty = 1) {
  const slot = fromInv.find(s => s.itemId === itemId);
  if (!slot || slot.qty < qty) return false;

  removeItem(fromInv, itemId, qty);
  const def = ITEMS[itemId] || { id: itemId };
  addItem(toInv, def, qty);
  return true;
}

/**
 * Return all item definitions from the combined ITEMS database.
 */
export function getAllItems() {
  return Object.values(ITEMS);
}

/**
 * Convenience: get the main-hand weapon data for a character.
 */
export function getMainWeapon(char) {
  const id = char.equipment && char.equipment.mainhand;
  return id ? ITEMS[id] : null;
}

/**
 * Convenience: get equipped item data for any slot.
 */
export function getEquippedItem(char, slot) {
  const id = char.equipment && char.equipment[slot];
  return id ? ITEMS[id] : null;
}

// -------------------------------------------------------------------------
// Aliases used by economy.js and menus.js
// -------------------------------------------------------------------------

/** Add item by ID string to an inventory array. */
export function addToInventory(inventory, itemId, qty = 1) {
  const def = ITEMS[itemId] || { id: itemId, itemId };
  addItem(inventory, def, qty);
}

/** Remove item by ID from inventory array. */
export function removeFromInventory(inventory, itemId, qty = 1) {
  return removeItem(inventory, itemId, qty);
}

/** Check whether inventory contains at least qty of itemId. */
export function hasItem(inventory, itemId, qty = 1) {
  const slot = inventory.find(s => s.itemId === itemId);
  return slot ? (slot.qty || 1) >= qty : false;
}

/**
 * Equip starting gear for a character based on their background's startEquipment list.
 * Items with an equipment slot are auto-equipped; others go to inventory.
 */
export function equipStartingGear(char) {
  if (!char) return;
  // startEquipment may be set directly on the character by createCharacter
  const items = char.startEquipment || [];
  for (const itemId of items) {
    const def = ITEMS[itemId];
    if (!def) continue;
    if (def.slot && char.equipment && char.equipment[def.slot] == null) {
      char.equipment[def.slot] = itemId;
    } else {
      if (!char.inventory) char.inventory = [];
      addItem(char.inventory, def, 1);
    }
  }
  calculateDerivedStats(char);
}
