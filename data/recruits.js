// Recruit background definitions
export const BACKGROUNDS = {
  farmer: {
    id: 'farmer', name: 'Farmer', wage: 3,
    desc: 'A sturdy peasant seeking a better life.',
    startStats: {
      strength: [6, 10], dexterity: [4, 8], endurance: [7, 11],
      perception: [4, 7], resolve: [4, 8], intelligence: [3, 6], initiative: [3, 6]
    },
    startSkills: { maces: [5, 15], survival: [15, 30], medicine: [5, 15] },
    startEquipment: ['wooden_club', 'linen_shirt'],
    possibleTraits: ['strong', 'tough', 'cowardly', 'pessimistic'],
    traitChance: 0.4,
    startXP: 0
  },
  militia: {
    id: 'militia', name: 'Militia', wage: 4,
    desc: 'Former town guard with basic combat training.',
    startStats: {
      strength: [5, 10], dexterity: [5, 9], endurance: [6, 10],
      perception: [5, 8], resolve: [5, 9], intelligence: [4, 7], initiative: [5, 8]
    },
    startSkills: { swords: [10, 25], shields: [15, 30], survival: [5, 15] },
    startEquipment: ['short_sword', 'wooden_shield', 'padded_armor'],
    possibleTraits: ['brave', 'determined', 'cowardly'],
    traitChance: 0.5,
    startXP: 50
  },
  sellsword: {
    id: 'sellsword', name: 'Sellsword', wage: 6,
    desc: 'A mercenary who has seen their share of fighting.',
    startStats: {
      strength: [7, 12], dexterity: [6, 10], endurance: [7, 11],
      perception: [5, 9], resolve: [6, 10], intelligence: [4, 8], initiative: [6, 10]
    },
    startSkills: { swords: [20, 40], axes: [10, 25], shields: [10, 25] },
    startEquipment: ['iron_sword', 'leather_armor', 'leather_cap'],
    possibleTraits: ['battle_hardened', 'greedy', 'brave', 'scarred'],
    traitChance: 0.6,
    startXP: 150
  },
  hunter: {
    id: 'hunter', name: 'Hunter', wage: 4,
    desc: 'A skilled tracker and bowman from the wilderness.',
    startStats: {
      strength: [5, 9], dexterity: [7, 12], endurance: [6, 10],
      perception: [8, 13], resolve: [5, 9], intelligence: [5, 9], initiative: [7, 11]
    },
    startSkills: { bows: [20, 40], survival: [20, 40], daggers: [5, 15] },
    startEquipment: ['hunter_bow', 'leather_armor', 'iron_dagger'],
    possibleTraits: ['eagle_eyed', 'nimble', 'night_blind'],
    traitChance: 0.5,
    startXP: 80
  },
  thief: {
    id: 'thief', name: 'Thief', wage: 4,
    desc: 'A light-fingered rogue with quick hands.',
    startStats: {
      strength: [4, 8], dexterity: [9, 14], endurance: [4, 8],
      perception: [7, 11], resolve: [4, 8], intelligence: [6, 10], initiative: [8, 13]
    },
    startSkills: { daggers: [25, 45], bows: [5, 15], survival: [10, 25] },
    startEquipment: ['iron_dagger', 'leather_armor'],
    possibleTraits: ['nimble', 'clumsy', 'greedy', 'quick_learner'],
    traitChance: 0.5,
    startXP: 60
  },
  squire: {
    id: 'squire', name: 'Squire', wage: 5,
    desc: 'A young noble\'s attendant trained in chivalric combat.',
    startStats: {
      strength: [6, 11], dexterity: [6, 11], endurance: [6, 10],
      perception: [5, 9], resolve: [6, 11], intelligence: [6, 11], initiative: [6, 10]
    },
    startSkills: { swords: [25, 45], shields: [20, 40], medicine: [5, 20] },
    startEquipment: ['longsword', 'iron_shield', 'mail_hauberk', 'kettle_hat'],
    possibleTraits: ['brave', 'arrogant', 'duelist', 'natural_leader'],
    traitChance: 0.6,
    startXP: 120
  },
  blacksmith: {
    id: 'blacksmith', name: 'Blacksmith', wage: 5,
    desc: 'A smith who knows the value of good iron.',
    startStats: {
      strength: [9, 14], dexterity: [5, 9], endurance: [8, 13],
      perception: [4, 8], resolve: [6, 10], intelligence: [5, 9], initiative: [3, 6]
    },
    startSkills: { axes: [15, 30], maces: [15, 30], shields: [5, 15] },
    startEquipment: ['iron_axe', 'padded_armor'],
    possibleTraits: ['strong', 'tough', 'iron_jaw'],
    traitChance: 0.5,
    startXP: 70
  },
  deserter: {
    id: 'deserter', name: 'Deserter', wage: 3,
    desc: 'A soldier who fled from the army. Experienced but unreliable.',
    startStats: {
      strength: [6, 11], dexterity: [5, 10], endurance: [6, 11],
      perception: [5, 9], resolve: [3, 7], intelligence: [4, 8], initiative: [5, 9]
    },
    startSkills: { spears: [15, 35], maces: [10, 25], survival: [10, 20] },
    startEquipment: ['spear', 'padded_armor', 'kettle_hat'],
    possibleTraits: ['cowardly', 'battle_hardened', 'pessimistic', 'scarred'],
    traitChance: 0.7,
    startXP: 100
  },
  monk: {
    id: 'monk', name: 'Monk', wage: 4,
    desc: 'A wandering holy man skilled in medicine.',
    startStats: {
      strength: [4, 8], dexterity: [4, 8], endurance: [5, 9],
      perception: [6, 10], resolve: [8, 13], intelligence: [8, 13], initiative: [4, 7]
    },
    startSkills: { medicine: [30, 55], maces: [5, 15], survival: [10, 20] },
    startEquipment: ['iron_mace', 'padded_armor'],
    possibleTraits: ['determined', 'brave', 'quick_learner'],
    traitChance: 0.6,
    startXP: 80
  },
  pit_fighter: {
    id: 'pit_fighter', name: 'Pit Fighter', wage: 7,
    desc: 'A veteran of the fighting pits. Brutal and efficient.',
    startStats: {
      strength: [9, 14], dexterity: [7, 12], endurance: [9, 14],
      perception: [5, 9], resolve: [7, 12], intelligence: [3, 6], initiative: [8, 12]
    },
    startSkills: { axes: [30, 50], swords: [20, 40], shields: [15, 30] },
    startEquipment: ['battle_axe', 'mail_hauberk', 'kettle_hat'],
    possibleTraits: ['battle_hardened', 'iron_jaw', 'scarred', 'duelist'],
    traitChance: 0.8,
    startXP: 200
  },
};

export const BACKGROUND_LIST = Object.values(BACKGROUNDS);

// Name lists for procedural character generation
export const FIRST_NAMES_MALE = [
  'Aldric', 'Bram', 'Conrad', 'Dolf', 'Erik', 'Finn', 'Geralt', 'Hugo',
  'Ivo', 'Johan', 'Karl', 'Lars', 'Mikkel', 'Nils', 'Otto', 'Pieter',
  'Rolf', 'Sigurd', 'Torsten', 'Ulrich', 'Veit', 'Werner', 'Xaver', 'Yael', 'Zoltan',
  'Bastian', 'Caspar', 'Dietrich', 'Ernst', 'Friedrich', 'Gottfried', 'Helmut',
  'Ingmar', 'Jens', 'Klaus', 'Lothar', 'Magnus', 'Norbert', 'Oskar', 'Rudolf'
];

export const FIRST_NAMES_FEMALE = [
  'Ada', 'Britta', 'Clara', 'Dagmar', 'Elsa', 'Freya', 'Greta', 'Hilda',
  'Ingrid', 'Jana', 'Katrin', 'Lena', 'Marta', 'Nora', 'Olga', 'Petra',
  'Ragna', 'Sigrid', 'Thyra', 'Ursula', 'Vera', 'Wanda', 'Xenia', 'Ylva'
];

export const LAST_NAMES = [
  'the Bold', 'the Swift', 'Ironhand', 'Stoneback', 'the Scarred',
  'Blackblade', 'Grimfist', 'the Lame', 'Halfear', 'the Young',
  'the Old', 'Crookback', 'the Reckless', 'Coldeyes', 'Strongarm',
  'the Grim', 'Twoswords', 'the Drunk', 'the Honest', 'the Wicked'
];

export default BACKGROUNDS;
