// Enemy definitions
export const ENEMIES = {
  // Bandits
  bandit_raider: {
    id: 'bandit_raider', name: 'Bandit Raider', faction: 'bandits',
    threat: 1, xpReward: 15, goldReward: [3, 12],
    hp: [25, 40], armor: [5, 15], initiative: [55, 75],
    skills: { swords: 25, axes: 20 },
    equipment: { mainhand: 'hatchet', body: 'linen_shirt' },
    ai: 'aggressive',
    desc: 'A desperate outlaw turned to brigandry.',
    lootTable: [
      { item: 'hatchet', chance: 0.3 },
      { item: 'bread', chance: 0.5, count: [1, 3] },
    ]
  },
  bandit_thug: {
    id: 'bandit_thug', name: 'Bandit Thug', faction: 'bandits',
    threat: 2, xpReward: 25, goldReward: [5, 18],
    hp: [35, 55], armor: [10, 25], initiative: [50, 70],
    skills: { maces: 35, shields: 25 },
    equipment: { mainhand: 'iron_mace', offhand: 'wooden_shield', body: 'padded_armor' },
    ai: 'aggressive',
    desc: 'A hardened thug with crude armor.',
    lootTable: [
      { item: 'iron_mace', chance: 0.25 },
      { item: 'wooden_shield', chance: 0.2 },
      { item: 'padded_armor', chance: 0.15 },
    ]
  },
  bandit_archer: {
    id: 'bandit_archer', name: 'Bandit Archer', faction: 'bandits',
    threat: 2, xpReward: 20, goldReward: [4, 15],
    hp: [28, 42], armor: [5, 12], initiative: [65, 85],
    skills: { bows: 40, daggers: 20 },
    equipment: { mainhand: 'short_bow', body: 'leather_armor' },
    ai: 'ranged',
    desc: 'Stays back and peppers enemies with arrows.',
    lootTable: [
      { item: 'short_bow', chance: 0.3 },
      { item: 'arrows', chance: 0.7, count: [5, 15] },
      { item: 'leather_armor', chance: 0.2 },
    ]
  },
  bandit_leader: {
    id: 'bandit_leader', name: 'Bandit Leader', faction: 'bandits',
    threat: 4, xpReward: 60, goldReward: [20, 50],
    hp: [60, 85], armor: [25, 45], initiative: [60, 80],
    skills: { swords: 55, shields: 40 },
    equipment: { mainhand: 'longsword', offhand: 'iron_shield', body: 'mail_hauberk', head: 'kettle_hat' },
    ai: 'leader',
    desc: 'A seasoned brigand who commands respect through violence.',
    lootTable: [
      { item: 'longsword', chance: 0.4 },
      { item: 'iron_shield', chance: 0.35 },
      { item: 'mail_hauberk', chance: 0.25 },
    ]
  },

  // Wolves / Animals
  wolf: {
    id: 'wolf', name: 'Wolf', faction: 'animals',
    threat: 1, xpReward: 12, goldReward: [0, 0],
    hp: [20, 35], armor: [0, 5], initiative: [75, 95],
    skills: { bite: 35 },
    equipment: {},
    ai: 'aggressive',
    desc: 'A hungry wolf from the forest.',
    lootTable: [
      { item: 'dried_meat', chance: 0.6, count: [1, 2] },
    ]
  },
  dire_wolf: {
    id: 'dire_wolf', name: 'Dire Wolf', faction: 'animals',
    threat: 3, xpReward: 35, goldReward: [0, 0],
    hp: [55, 75], armor: [5, 10], initiative: [80, 100],
    skills: { bite: 55 },
    equipment: {},
    ai: 'aggressive',
    desc: 'A massive wolf of unnatural size.',
    lootTable: [
      { item: 'dried_meat', chance: 0.8, count: [2, 4] },
    ]
  },

  // Undead
  skeleton: {
    id: 'skeleton', name: 'Skeleton', faction: 'undead',
    threat: 2, xpReward: 20, goldReward: [0, 5],
    hp: [20, 35], armor: [0, 10], initiative: [45, 65],
    skills: { swords: 30 },
    equipment: { mainhand: 'short_sword' },
    ai: 'aggressive',
    desc: 'The animated bones of a fallen warrior.',
    lootTable: [
      { item: 'short_sword', chance: 0.2 },
    ]
  },
  skeleton_archer: {
    id: 'skeleton_archer', name: 'Skeleton Archer', faction: 'undead',
    threat: 2, xpReward: 22, goldReward: [0, 5],
    hp: [18, 30], armor: [0, 5], initiative: [55, 75],
    skills: { bows: 35 },
    equipment: { mainhand: 'short_bow' },
    ai: 'ranged',
    desc: 'A skeletal archer that never tires.',
    lootTable: [
      { item: 'arrows', chance: 0.6, count: [3, 8] },
    ]
  },
  zombie: {
    id: 'zombie', name: 'Zombie', faction: 'undead',
    threat: 2, xpReward: 18, goldReward: [0, 3],
    hp: [45, 65], armor: [0, 5], initiative: [25, 45],
    skills: { maces: 20 },
    equipment: {},
    ai: 'slow',
    desc: 'A shambling corpse. Slow but hard to put down.',
    lootTable: []
  },
  necromancer: {
    id: 'necromancer', name: 'Necromancer', faction: 'undead',
    threat: 5, xpReward: 80, goldReward: [30, 70],
    hp: [40, 60], armor: [5, 15], initiative: [50, 70],
    skills: { daggers: 30 },
    equipment: { mainhand: 'iron_dagger' },
    ai: 'caster',
    desc: 'A dark mage who commands the dead.',
    lootTable: [
      { item: 'healing_potion', chance: 0.5, count: [1, 2] },
    ]
  },

  // Barbarians
  barbarian_warrior: {
    id: 'barbarian_warrior', name: 'Barbarian Warrior', faction: 'barbarians',
    threat: 3, xpReward: 35, goldReward: [5, 20],
    hp: [50, 70], armor: [10, 20], initiative: [65, 85],
    skills: { axes: 50, maces: 30 },
    equipment: { mainhand: 'iron_axe', body: 'leather_armor' },
    ai: 'aggressive',
    desc: 'A fierce northern warrior.',
    lootTable: [
      { item: 'iron_axe', chance: 0.3 },
      { item: 'leather_armor', chance: 0.2 },
    ]
  },
  barbarian_berserker: {
    id: 'barbarian_berserker', name: 'Berserker', faction: 'barbarians',
    threat: 4, xpReward: 55, goldReward: [10, 30],
    hp: [70, 95], armor: [5, 15], initiative: [70, 90],
    skills: { axes: 65 },
    equipment: { mainhand: 'battle_axe', body: 'leather_armor' },
    ai: 'berserker',
    desc: 'A wild warrior who fights in a killing frenzy.',
    lootTable: [
      { item: 'battle_axe', chance: 0.35 },
    ]
  },

  // Orcs/Raiders (generic fantasy)
  goblin: {
    id: 'goblin', name: 'Goblin', faction: 'goblins',
    threat: 1, xpReward: 10, goldReward: [2, 8],
    hp: [15, 25], armor: [0, 8], initiative: [70, 90],
    skills: { daggers: 30, bows: 20 },
    equipment: { mainhand: 'iron_dagger' },
    ai: 'cowardly',
    desc: 'A small but vicious creature.',
    lootTable: [
      { item: 'iron_dagger', chance: 0.25 },
      { item: 'arrows', chance: 0.4, count: [2, 6] },
    ]
  },
  goblin_shaman: {
    id: 'goblin_shaman', name: 'Goblin Shaman', faction: 'goblins',
    threat: 3, xpReward: 40, goldReward: [10, 25],
    hp: [25, 40], armor: [0, 5], initiative: [60, 80],
    skills: { daggers: 20 },
    equipment: { mainhand: 'iron_dagger' },
    ai: 'caster',
    desc: 'A tribal shaman wielding dark magic.',
    lootTable: [
      { item: 'healing_potion', chance: 0.4 },
    ]
  },
  orc_warrior: {
    id: 'orc_warrior', name: 'Orc Warrior', faction: 'orcs',
    threat: 4, xpReward: 50, goldReward: [10, 30],
    hp: [65, 85], armor: [20, 35], initiative: [55, 75],
    skills: { axes: 55, maces: 45 },
    equipment: { mainhand: 'battle_axe', body: 'padded_armor' },
    ai: 'aggressive',
    desc: 'A massive green-skinned warrior.',
    lootTable: [
      { item: 'battle_axe', chance: 0.25 },
      { item: 'padded_armor', chance: 0.2 },
    ]
  },
};

export const ENEMY_LIST = Object.values(ENEMIES);

// Enemy encounter groups
export const ENCOUNTER_GROUPS = {
  bandit_patrol: {
    id: 'bandit_patrol', name: 'Bandit Patrol',
    enemies: [
      { type: 'bandit_raider', count: [2, 4] },
      { type: 'bandit_thug', count: [1, 2] },
    ],
    minThreat: 2
  },
  bandit_camp: {
    id: 'bandit_camp', name: 'Bandit Camp',
    enemies: [
      { type: 'bandit_raider', count: [3, 5] },
      { type: 'bandit_thug', count: [2, 3] },
      { type: 'bandit_archer', count: [1, 2] },
      { type: 'bandit_leader', count: [1, 1] },
    ],
    minThreat: 5
  },
  wolf_pack: {
    id: 'wolf_pack', name: 'Wolf Pack',
    enemies: [
      { type: 'wolf', count: [3, 6] },
      { type: 'dire_wolf', count: [0, 1] },
    ],
    minThreat: 2
  },
  undead_horde: {
    id: 'undead_horde', name: 'Undead Horde',
    enemies: [
      { type: 'skeleton', count: [3, 5] },
      { type: 'zombie', count: [2, 4] },
      { type: 'skeleton_archer', count: [1, 2] },
    ],
    minThreat: 4
  },
  goblin_raid: {
    id: 'goblin_raid', name: 'Goblin Raid',
    enemies: [
      { type: 'goblin', count: [4, 8] },
      { type: 'goblin_shaman', count: [0, 1] },
    ],
    minThreat: 3
  },
  barbarian_warband: {
    id: 'barbarian_warband', name: 'Barbarian Warband',
    enemies: [
      { type: 'barbarian_warrior', count: [2, 4] },
      { type: 'barbarian_berserker', count: [1, 2] },
    ],
    minThreat: 4
  },
};

export default ENEMIES;
