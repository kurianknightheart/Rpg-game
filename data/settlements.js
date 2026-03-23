// Settlement data and templates
export const SETTLEMENT_TYPES = {
  village: {
    id: 'village', name: 'Village', size: 'small',
    icon: '🏘️', color: '#8B7355',
    services: ['tavern', 'market'],
    contractCount: [1, 2],
    recruitCount: [1, 3],
    marketMultiplier: 1.1, // 10% more expensive
    desc: 'A small farming settlement.'
  },
  town: {
    id: 'town', name: 'Town', size: 'medium',
    icon: '🏰', color: '#6B5B45',
    services: ['tavern', 'market', 'smith', 'contracts'],
    contractCount: [2, 4],
    recruitCount: [2, 5],
    marketMultiplier: 1.0,
    desc: 'A proper town with walls and a market.'
  },
  city: {
    id: 'city', name: 'City', size: 'large',
    icon: '🏯', color: '#5B4B35',
    services: ['tavern', 'market', 'smith', 'contracts', 'temple', 'guild'],
    contractCount: [3, 6],
    recruitCount: [4, 8],
    marketMultiplier: 0.9, // 10% cheaper
    desc: 'A major city with all amenities.'
  },
  fort: {
    id: 'fort', name: 'Fort', size: 'medium',
    icon: '⚔️', color: '#555',
    services: ['tavern', 'smith', 'contracts'],
    contractCount: [2, 4],
    recruitCount: [3, 6],
    marketMultiplier: 1.2,
    desc: 'A military fortification.'
  },
};

// Named settlements for world generation
export const NAMED_SETTLEMENTS = [
  {
    id: 'ironhold', name: 'Ironhold', type: 'city',
    x: 15, y: 15, // Will be adjusted by world gen
    desc: 'The largest city in the region, famed for its iron mines.',
    faction: 'northern_lords'
  },
  {
    id: 'millhaven', name: 'Millhaven', type: 'town',
    x: 8, y: 10,
    desc: 'A prosperous trade town on the river.',
    faction: 'merchants_guild'
  },
  {
    id: 'graywater', name: 'Graywater', type: 'town',
    x: 22, y: 8,
    desc: 'A port town known for its fishermen and smugglers.',
    faction: 'free_city'
  },
  {
    id: 'thornbury', name: 'Thornbury', type: 'village',
    x: 12, y: 20,
    desc: 'A quiet farming village, often troubled by bandits.',
    faction: 'none'
  },
  {
    id: 'kesslar', name: 'Kesslar', type: 'village',
    x: 20, y: 18,
    desc: 'A village at the edge of the dark forest.',
    faction: 'none'
  },
  {
    id: 'westmarch', name: 'Westmarch', type: 'fort',
    x: 5, y: 15,
    desc: 'A frontier fort guarding the western passes.',
    faction: 'northern_lords'
  },
  {
    id: 'duskfall', name: 'Duskfall', type: 'town',
    x: 25, y: 22,
    desc: 'A town in the shadow of the mountains.',
    faction: 'free_city'
  },
];

// Market inventory templates by settlement type
export const MARKET_STOCK = {
  village: {
    weapons: ['rusty_dagger', 'wooden_club', 'hatchet', 'short_bow'],
    armor: ['linen_shirt', 'leather_cap', 'leather_armor', 'wooden_shield'],
    consumables: ['bread', 'dried_meat', 'bandage'],
    stockMultiplier: 0.7
  },
  town: {
    weapons: ['iron_dagger', 'short_sword', 'iron_axe', 'iron_mace', 'spear', 'short_bow', 'hunter_bow'],
    armor: ['leather_cap', 'padded_cap', 'leather_armor', 'padded_armor', 'wooden_shield', 'iron_shield'],
    consumables: ['bread', 'dried_meat', 'bandage', 'healing_potion', 'arrows', 'bolts'],
    stockMultiplier: 1.0
  },
  city: {
    weapons: ['iron_dagger', 'short_sword', 'iron_sword', 'longsword', 'iron_axe', 'battle_axe',
              'iron_mace', 'morning_star', 'spear', 'warspear', 'pike', 'hunter_bow', 'crossbow'],
    armor: ['kettle_hat', 'nasal_helmet', 'closed_helmet', 'mail_hauberk', 'brigandine',
            'padded_armor', 'iron_shield', 'kite_shield'],
    consumables: ['bread', 'dried_meat', 'bandage', 'healing_potion', 'torch', 'arrows', 'bolts'],
    stockMultiplier: 1.5
  },
  fort: {
    weapons: ['short_sword', 'iron_sword', 'spear', 'warspear', 'short_bow', 'crossbow'],
    armor: ['padded_cap', 'kettle_hat', 'padded_armor', 'mail_hauberk', 'wooden_shield', 'iron_shield'],
    consumables: ['bread', 'dried_meat', 'bandage', 'healing_potion', 'arrows', 'bolts'],
    stockMultiplier: 1.1
  }
};

// Tavern name generation
export const TAVERN_NAMES = [
  'The Rusty Sword', 'The Drunken Knight', 'The Broken Shield', 'The Silver Tankard',
  'The Iron Flagon', 'The Wandering Soldier', 'The Crossed Blades', 'The Weary Traveler',
  'The Howling Wolf', 'The Empty Purse', 'The Mended Armor', 'The Fallen Tower',
];

export function generateSettlement(type, name, x, y) {
  const template = SETTLEMENT_TYPES[type];
  if (!template) return null;

  return {
    id: `settlement_${name.toLowerCase().replace(/\s/g, '_')}`,
    name,
    type,
    x, y,
    services: [...template.services],
    marketMultiplier: template.marketMultiplier,
    contractCount: template.contractCount,
    recruitCount: template.recruitCount,
    contracts: [],
    recruits: [],
    lastVisited: -1,
    tavernName: TAVERN_NAMES[Math.floor(Math.random() * TAVERN_NAMES.length)],
    desc: template.desc,
  };
}

export default SETTLEMENT_TYPES;
