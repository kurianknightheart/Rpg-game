// Armor definitions
export const ARMOR = {
  // Head armor
  leather_cap: {
    id: 'leather_cap', name: 'Leather Cap', type: 'armor', slot: 'head',
    armor: 5, armorMax: 15, fatigue: 1, value: 30, weight: 1,
    desc: 'Basic leather head protection.',
    icon: '🪖'
  },
  padded_cap: {
    id: 'padded_cap', name: 'Padded Cap', type: 'armor', slot: 'head',
    armor: 8, armorMax: 20, fatigue: 2, value: 60, weight: 2,
    desc: 'A padded cloth cap offering decent protection.',
    icon: '🪖'
  },
  kettle_hat: {
    id: 'kettle_hat', name: 'Kettle Hat', type: 'armor', slot: 'head',
    armor: 20, armorMax: 45, fatigue: 4, value: 150, weight: 3,
    desc: 'A wide-brimmed iron helmet worn by infantry.',
    icon: '🪖'
  },
  nasal_helmet: {
    id: 'nasal_helmet', name: 'Nasal Helmet', type: 'armor', slot: 'head',
    armor: 28, armorMax: 60, fatigue: 5, value: 250, weight: 4,
    desc: 'An iron helmet with a protective nasal guard.',
    icon: '🪖'
  },
  closed_helmet: {
    id: 'closed_helmet', name: 'Closed Helmet', type: 'armor', slot: 'head',
    armor: 40, armorMax: 80, fatigue: 8, value: 500, weight: 6,
    desc: 'A full closed helmet offering excellent protection.',
    icon: '🪖'
  },
  greathelm: {
    id: 'greathelm', name: 'Greathelm', type: 'armor', slot: 'head',
    armor: 55, armorMax: 100, fatigue: 12, value: 900, weight: 8,
    desc: 'A heavy great helm worn only by seasoned warriors.',
    icon: '🪖'
  },

  // Body armor
  linen_shirt: {
    id: 'linen_shirt', name: 'Linen Shirt', type: 'armor', slot: 'body',
    armor: 0, armorMax: 5, fatigue: 0, value: 10, weight: 1,
    desc: 'Just a shirt. At least it\'s clean.',
    icon: '👕'
  },
  leather_armor: {
    id: 'leather_armor', name: 'Leather Armor', type: 'armor', slot: 'body',
    armor: 12, armorMax: 30, fatigue: 3, value: 80, weight: 5,
    desc: 'Hardened leather offering basic protection.',
    icon: '🦺'
  },
  padded_armor: {
    id: 'padded_armor', name: 'Padded Armor', type: 'armor', slot: 'body',
    armor: 15, armorMax: 40, fatigue: 4, value: 120, weight: 6,
    desc: 'Thick padded gambeson worn by militia.',
    icon: '🦺'
  },
  mail_hauberk: {
    id: 'mail_hauberk', name: 'Mail Hauberk', type: 'armor', slot: 'body',
    armor: 35, armorMax: 70, fatigue: 8, value: 400, weight: 12,
    desc: 'A long chainmail shirt of interlocked rings.',
    icon: '🦺'
  },
  brigandine: {
    id: 'brigandine', name: 'Brigandine', type: 'armor', slot: 'body',
    armor: 45, armorMax: 85, fatigue: 10, value: 700, weight: 14,
    desc: 'Riveted iron plates over leather. A mercenary\'s standard.',
    icon: '🦺'
  },
  plate_armor: {
    id: 'plate_armor', name: 'Plate Armor', type: 'armor', slot: 'body',
    armor: 60, armorMax: 110, fatigue: 15, value: 1500, weight: 20,
    desc: 'Full plate armor. Only knights can afford this.',
    icon: '🦺'
  },

  // Shields
  wooden_shield: {
    id: 'wooden_shield', name: 'Wooden Shield', type: 'shield', slot: 'offhand',
    armor: 0, blockChance: 20, fatigue: 3, value: 40, weight: 4,
    desc: 'A simple wooden shield. Can be split by a strong blow.',
    icon: '🛡️'
  },
  iron_shield: {
    id: 'iron_shield', name: 'Iron Shield', type: 'shield', slot: 'offhand',
    armor: 0, blockChance: 30, fatigue: 5, value: 120, weight: 6,
    desc: 'A round iron shield, reliable and durable.',
    icon: '🛡️'
  },
  kite_shield: {
    id: 'kite_shield', name: 'Kite Shield', type: 'shield', slot: 'offhand',
    armor: 0, blockChance: 40, fatigue: 7, value: 280, weight: 8,
    desc: 'A large kite-shaped shield covering most of the body.',
    icon: '🛡️'
  },
};

export const ARMOR_LIST = Object.values(ARMOR);
export default ARMOR;
