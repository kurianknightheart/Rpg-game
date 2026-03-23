// General item definitions
import WEAPONS, { WEAPON_LIST } from './weapons.js';
import ARMOR, { ARMOR_LIST } from './armor.js';

export const CONSUMABLES = {
  bread: {
    id: 'bread', name: 'Bread', type: 'consumable', subtype: 'food',
    value: 3, weight: 1, stackable: true,
    effect: { type: 'heal', amount: 5 },
    desc: 'Basic food. Feeds one soldier for one day.',
    icon: '🍞'
  },
  dried_meat: {
    id: 'dried_meat', name: 'Dried Meat', type: 'consumable', subtype: 'food',
    value: 8, weight: 1, stackable: true,
    effect: { type: 'heal', amount: 8 },
    desc: 'Preserved meat. Good trail food.',
    icon: '🥩'
  },
  healing_potion: {
    id: 'healing_potion', name: 'Healing Potion', type: 'consumable', subtype: 'medicine',
    value: 50, weight: 1, stackable: true,
    effect: { type: 'heal', amount: 30 },
    desc: 'A herbal brew that speeds recovery.',
    icon: '🧪'
  },
  bandage: {
    id: 'bandage', name: 'Bandage', type: 'consumable', subtype: 'medicine',
    value: 15, weight: 1, stackable: true,
    effect: { type: 'heal', amount: 15 },
    desc: 'Clean linen bandages for wound dressing.',
    icon: '🩹'
  },
  torch: {
    id: 'torch', name: 'Torch', type: 'consumable', subtype: 'light',
    value: 5, weight: 1, stackable: true,
    effect: { type: 'light', duration: 6 },
    desc: 'Provides light in dark places.',
    icon: '🔦'
  },
  arrows: {
    id: 'arrows', name: 'Arrows', type: 'ammo', subtype: 'arrows',
    value: 2, weight: 0.1, stackable: true,
    desc: 'Fletched arrows for bows.',
    icon: '🏹'
  },
  bolts: {
    id: 'bolts', name: 'Bolts', type: 'ammo', subtype: 'bolts',
    value: 3, weight: 0.1, stackable: true,
    desc: 'Short bolts for crossbows.',
    icon: '🏹'
  },
};

export const MISC_ITEMS = {
  gold_coin: {
    id: 'gold_coin', name: 'Gold Coin', type: 'currency',
    value: 1, weight: 0, stackable: true,
    desc: 'The standard currency of the realm.',
    icon: '🪙'
  },
  contract_seal: {
    id: 'contract_seal', name: 'Contract Seal', type: 'quest',
    value: 0, weight: 0,
    desc: 'An official seal proving contract completion.',
    icon: '📜'
  },
};

// Combined item database
export const ITEMS = {
  ...WEAPONS,
  ...ARMOR,
  ...CONSUMABLES,
  ...MISC_ITEMS,
};

export function getItem(id) {
  return ITEMS[id] || null;
}

export function getItemsByType(type) {
  return Object.values(ITEMS).filter(i => i.type === type);
}

export function getWeapons() { return WEAPON_LIST; }
export function getArmors() { return ARMOR_LIST; }

export default ITEMS;
