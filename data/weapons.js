// Weapon definitions
export const WEAPONS = {
  // Daggers
  rusty_dagger: {
    id: 'rusty_dagger', name: 'Rusty Dagger', type: 'dagger', slot: 'mainhand',
    damage: [1, 10], armorPen: 5, range: 1, attackSkill: 'daggers',
    twoHanded: false, value: 20, weight: 1,
    desc: 'A rusted short blade. Better than nothing.',
    icon: '🗡️'
  },
  iron_dagger: {
    id: 'iron_dagger', name: 'Iron Dagger', type: 'dagger', slot: 'mainhand',
    damage: [3, 12], armorPen: 10, range: 1, attackSkill: 'daggers',
    twoHanded: false, value: 60, weight: 1,
    desc: 'A reliable iron blade for close work.',
    icon: '🗡️'
  },

  // Swords
  short_sword: {
    id: 'short_sword', name: 'Short Sword', type: 'sword', slot: 'mainhand',
    damage: [5, 18], armorPen: 5, range: 1, attackSkill: 'swords',
    twoHanded: false, value: 120, weight: 3,
    desc: 'A common short blade favored by militia.',
    icon: '⚔️'
  },
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', type: 'sword', slot: 'mainhand',
    damage: [8, 22], armorPen: 8, range: 1, attackSkill: 'swords',
    twoHanded: false, value: 200, weight: 4,
    desc: 'A solid iron sword with good balance.',
    icon: '⚔️'
  },
  longsword: {
    id: 'longsword', name: 'Longsword', type: 'sword', slot: 'mainhand',
    damage: [10, 28], armorPen: 12, range: 1, attackSkill: 'swords',
    twoHanded: false, value: 380, weight: 5,
    desc: 'A well-crafted longsword. Preferred by knights.',
    icon: '⚔️'
  },
  noble_sword: {
    id: 'noble_sword', name: 'Noble\'s Sword', type: 'sword', slot: 'mainhand',
    damage: [12, 32], armorPen: 15, range: 1, attackSkill: 'swords',
    twoHanded: false, value: 700, weight: 4,
    desc: 'An ornate blade of exceptional quality.',
    icon: '⚔️'
  },

  // Axes
  hatchet: {
    id: 'hatchet', name: 'Hatchet', type: 'axe', slot: 'mainhand',
    damage: [6, 20], armorPen: 15, range: 1, attackSkill: 'axes',
    twoHanded: false, value: 80, weight: 3,
    desc: 'A small axe that can split skulls as well as wood.',
    icon: '🪓'
  },
  iron_axe: {
    id: 'iron_axe', name: 'Iron Axe', type: 'axe', slot: 'mainhand',
    damage: [10, 26], armorPen: 20, range: 1, attackSkill: 'axes',
    twoHanded: false, value: 180, weight: 5,
    desc: 'A sturdy iron axe. Excellent at breaking armor.',
    icon: '🪓'
  },
  battle_axe: {
    id: 'battle_axe', name: 'Battle Axe', type: 'axe', slot: 'mainhand',
    damage: [15, 35], armorPen: 25, range: 1, attackSkill: 'axes',
    twoHanded: true, value: 350, weight: 8,
    desc: 'A fearsome two-handed battle axe.',
    icon: '🪓'
  },

  // Maces
  wooden_club: {
    id: 'wooden_club', name: 'Wooden Club', type: 'mace', slot: 'mainhand',
    damage: [4, 14], armorPen: 5, range: 1, attackSkill: 'maces',
    twoHanded: false, value: 15, weight: 3,
    desc: 'A crude but effective bludgeon.',
    icon: '🔨'
  },
  iron_mace: {
    id: 'iron_mace', name: 'Iron Mace', type: 'mace', slot: 'mainhand',
    damage: [9, 24], armorPen: 22, range: 1, attackSkill: 'maces',
    twoHanded: false, value: 160, weight: 5,
    desc: 'A flanged mace. Devastates armored foes.',
    icon: '🔨'
  },
  morning_star: {
    id: 'morning_star', name: 'Morning Star', type: 'mace', slot: 'mainhand',
    damage: [12, 30], armorPen: 28, range: 1, attackSkill: 'maces',
    twoHanded: false, value: 300, weight: 6,
    desc: 'A spiked mace of terrifying effectiveness.',
    icon: '🔨'
  },

  // Spears
  spear: {
    id: 'spear', name: 'Spear', type: 'spear', slot: 'mainhand',
    damage: [7, 20], armorPen: 10, range: 2, attackSkill: 'spears',
    twoHanded: true, value: 100, weight: 4,
    desc: 'A long wooden spear with an iron tip.',
    icon: '🏹'
  },
  warspear: {
    id: 'warspear', name: 'War Spear', type: 'spear', slot: 'mainhand',
    damage: [10, 26], armorPen: 15, range: 2, attackSkill: 'spears',
    twoHanded: true, value: 220, weight: 5,
    desc: 'A heavy spear built for warfare.',
    icon: '🏹'
  },
  pike: {
    id: 'pike', name: 'Pike', type: 'spear', slot: 'mainhand',
    damage: [8, 22], armorPen: 12, range: 3, attackSkill: 'spears',
    twoHanded: true, value: 180, weight: 6,
    desc: 'An extra-long pike for keeping enemies at distance.',
    icon: '🏹'
  },

  // Bows
  short_bow: {
    id: 'short_bow', name: 'Short Bow', type: 'bow', slot: 'mainhand',
    damage: [5, 16], armorPen: 5, range: 4, attackSkill: 'bows',
    twoHanded: true, value: 90, weight: 2, ammo: 'arrows',
    desc: 'A compact bow good for hunting.',
    icon: '🏹'
  },
  hunter_bow: {
    id: 'hunter_bow', name: 'Hunter\'s Bow', type: 'bow', slot: 'mainhand',
    damage: [7, 20], armorPen: 8, range: 5, attackSkill: 'bows',
    twoHanded: true, value: 180, weight: 2, ammo: 'arrows',
    desc: 'A well-crafted bow favored by foresters.',
    icon: '🏹'
  },
  crossbow: {
    id: 'crossbow', name: 'Crossbow', type: 'crossbow', slot: 'mainhand',
    damage: [12, 30], armorPen: 20, range: 4, attackSkill: 'bows',
    twoHanded: true, value: 350, weight: 5, ammo: 'bolts',
    desc: 'A mechanical bow with devastating power.',
    icon: '🏹'
  },
};

export const WEAPON_LIST = Object.values(WEAPONS);
export default WEAPONS;
