// Trait definitions - positive and negative
export const TRAITS = {
  // Positive traits
  brave: {
    id: 'brave', name: 'Brave', type: 'positive',
    desc: 'Does not falter in the face of danger.',
    effects: { moraleBonus: 10, resolveBonus: 10 }
  },
  strong: {
    id: 'strong', name: 'Strong', type: 'positive',
    desc: 'Exceptional physical strength.',
    effects: { strBonus: 5, meleeDamageBonus: 3 }
  },
  nimble: {
    id: 'nimble', name: 'Nimble', type: 'positive',
    desc: 'Quick and agile in combat.',
    effects: { dexBonus: 5, initiativeBonus: 5 }
  },
  tough: {
    id: 'tough', name: 'Tough', type: 'positive',
    desc: 'Can take a beating and keep fighting.',
    effects: { endBonus: 5, hpBonus: 15 }
  },
  eagle_eyed: {
    id: 'eagle_eyed', name: 'Eagle-Eyed', type: 'positive',
    desc: 'Sharp eyes make for deadly aim.',
    effects: { perBonus: 5, rangedBonus: 10 }
  },
  determined: {
    id: 'determined', name: 'Determined', type: 'positive',
    desc: 'Sheer willpower drives this warrior.',
    effects: { resolveBonus: 15 }
  },
  quick_learner: {
    id: 'quick_learner', name: 'Quick Learner', type: 'positive',
    desc: 'Gains experience faster than most.',
    effects: { xpMultiplier: 1.25 }
  },
  iron_jaw: {
    id: 'iron_jaw', name: 'Iron Jaw', type: 'positive',
    desc: 'Shrugs off injuries that would fell others.',
    effects: { woundResist: 20 }
  },
  natural_leader: {
    id: 'natural_leader', name: 'Natural Leader', type: 'positive',
    desc: 'Inspires allies around them.',
    effects: { auraBonus: 5, moraleBonus: 15 }
  },
  battle_hardened: {
    id: 'battle_hardened', name: 'Battle Hardened', type: 'positive',
    desc: 'Experience in many battles.',
    effects: { meleeBonus: 5, defBonus: 5 }
  },
  duelist: {
    id: 'duelist', name: 'Duelist', type: 'positive',
    desc: 'Trained in single combat techniques.',
    effects: { hitBonus: 10, riposteChance: 15 }
  },
  shield_expert: {
    id: 'shield_expert', name: 'Shield Expert', type: 'positive',
    desc: 'Master of shield use.',
    effects: { blockBonus: 15 }
  },

  // Negative traits
  cowardly: {
    id: 'cowardly', name: 'Cowardly', type: 'negative',
    desc: 'Prone to panic and retreat.',
    effects: { moraleBonus: -15, resolveBonus: -10 }
  },
  frail: {
    id: 'frail', name: 'Frail', type: 'negative',
    desc: 'Weaker constitution than most.',
    effects: { endBonus: -5, hpBonus: -10 }
  },
  greedy: {
    id: 'greedy', name: 'Greedy', type: 'negative',
    desc: 'Always demands higher pay.',
    effects: { wageMultiplier: 1.5 }
  },
  alcoholic: {
    id: 'alcoholic', name: 'Alcoholic', type: 'negative',
    desc: 'Performs poorly without drink.',
    effects: { hitBonus: -10, initiativeBonus: -5 }
  },
  pessimistic: {
    id: 'pessimistic', name: 'Pessimistic', type: 'negative',
    desc: 'Always expects the worst.',
    effects: { moraleBonus: -10 }
  },
  clumsy: {
    id: 'clumsy', name: 'Clumsy', type: 'negative',
    desc: 'Prone to accidents and fumbles.',
    effects: { dexBonus: -5, initiativeBonus: -5 }
  },
  arrogant: {
    id: 'arrogant', name: 'Arrogant', type: 'negative',
    desc: 'Difficult to work with.',
    effects: { moraleBonus: -5, recruitCost: 1.25 }
  },
  night_blind: {
    id: 'night_blind', name: 'Night Blind', type: 'negative',
    desc: 'Poor vision in low light.',
    effects: { nightPenalty: 15, perBonus: -3 }
  },

  // Injury traits (gained through combat)
  injured_leg: {
    id: 'injured_leg', name: 'Injured Leg', type: 'injury',
    desc: 'A leg wound slows movement.',
    effects: { initiativeBonus: -10, movePenalty: 1 }
  },
  injured_arm: {
    id: 'injured_arm', name: 'Injured Arm', type: 'injury',
    desc: 'An arm injury weakens attacks.',
    effects: { meleeDamageBonus: -5, hitBonus: -5 }
  },
  scarred: {
    id: 'scarred', name: 'Scarred', type: 'neutral',
    desc: 'Bears visible scars from past battles.',
    effects: { resolveBonus: 5 }
  },
};

export const TRAIT_LIST = Object.values(TRAITS);

export function getPositiveTraits() {
  return TRAIT_LIST.filter(t => t.type === 'positive');
}

export function getNegativeTraits() {
  return TRAIT_LIST.filter(t => t.type === 'negative');
}

export function getRandomTrait(type = null) {
  const list = type ? TRAIT_LIST.filter(t => t.type === type) : TRAIT_LIST;
  return list[Math.floor(Math.random() * list.length)];
}

export default TRAITS;
