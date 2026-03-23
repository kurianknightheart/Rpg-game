// Random travel event definitions
export const EVENTS = {
  // Positive events
  abandoned_wagon: {
    id: 'abandoned_wagon',
    name: 'Abandoned Wagon',
    type: 'positive',
    terrain: ['plains', 'road'],
    desc: 'Your company spots an abandoned merchant wagon on the road.',
    text: 'The wagon appears undamaged, its former owners long gone. A quick search reveals useful supplies.',
    options: [
      {
        id: 'loot',
        text: 'Search the wagon',
        outcome: {
          type: 'reward',
          gold: [10, 30],
          items: [{ item: 'bread', count: [3, 8] }]
        },
        desc: 'You find some gold and provisions.'
      },
      {
        id: 'leave',
        text: 'Leave it alone',
        outcome: { type: 'nothing' },
        desc: 'You march on.'
      }
    ]
  },

  helpful_hermit: {
    id: 'helpful_hermit',
    name: 'Helpful Hermit',
    type: 'positive',
    terrain: ['forest', 'hills'],
    desc: 'A hermit emerges from the woods.',
    text: 'An old hermit offers to share knowledge of the local terrain and tends to any wounds.',
    options: [
      {
        id: 'accept',
        text: 'Accept his help',
        outcome: {
          type: 'heal',
          amount: 15,
          morale: 5
        },
        desc: 'Your company is patched up and morale improves.'
      },
      {
        id: 'decline',
        text: 'Decline politely',
        outcome: { type: 'nothing' },
        desc: 'You thank the old man and move on.'
      }
    ]
  },

  lucky_find: {
    id: 'lucky_find',
    name: 'Lucky Find',
    type: 'positive',
    terrain: ['plains', 'forest', 'hills'],
    desc: 'One of your men finds something in the grass.',
    text: 'A soldier calls out - he\'s found a cache buried under a flat rock. Someone\'s savings, abandoned in haste.',
    options: [
      {
        id: 'take',
        text: 'Take the coin',
        outcome: {
          type: 'reward',
          gold: [20, 60],
        },
        desc: 'A windfall of coin.'
      }
    ]
  },

  merchant_convoy: {
    id: 'merchant_convoy',
    name: 'Merchant Convoy',
    type: 'neutral',
    terrain: ['road', 'plains'],
    desc: 'A merchant convoy requests escort.',
    text: 'A small convoy of merchants asks if you\'ll escort them to the next settlement. They\'ll pay well.',
    options: [
      {
        id: 'escort',
        text: 'Agree to escort (5 gold)',
        outcome: {
          type: 'reward',
          gold: [15, 25],
          morale: 5
        },
        desc: 'Easy money and good cheer.'
      },
      {
        id: 'rob',
        text: 'Rob them',
        outcome: {
          type: 'combat_reward',
          gold: [30, 60],
          morale: -15,
          reputation: -10
        },
        desc: 'Quick coin but your reputation suffers.'
      },
      {
        id: 'refuse',
        text: 'Decline',
        outcome: { type: 'nothing' },
        desc: 'You go your separate ways.'
      }
    ]
  },

  // Negative events
  ambush: {
    id: 'ambush',
    name: 'Ambush!',
    type: 'negative',
    terrain: ['forest', 'hills', 'road'],
    desc: 'Bandits spring from the undergrowth!',
    text: 'The forest erupts with the sound of steel. Bandits have set a trap and your company marches right into it!',
    options: [
      {
        id: 'fight',
        text: 'Fight them off',
        outcome: {
          type: 'combat',
          group: 'bandit_patrol',
          surprise: true
        },
        desc: 'Steel against steel.'
      },
      {
        id: 'flee',
        text: 'Attempt to flee',
        outcome: {
          type: 'flee',
          successChance: 50,
          failDamage: [5, 20],
          morale: -10
        },
        desc: 'Run for your lives.'
      }
    ]
  },

  disease: {
    id: 'disease',
    name: 'Sickness Spreads',
    type: 'negative',
    terrain: ['swamp', 'plains', 'forest'],
    desc: 'A sickness moves through your company.',
    text: 'Several men wake with fever and chills. The camp physician looks worried.',
    options: [
      {
        id: 'treat',
        text: 'Treat with medicine (costs 2 bandages)',
        outcome: {
          type: 'cost_item',
          item: 'bandage',
          count: 2,
          damage: 5,
          morale: -5
        },
        desc: 'Contained at a cost.'
      },
      {
        id: 'ignore',
        text: 'March through it',
        outcome: {
          type: 'damage',
          amount: [10, 25],
          morale: -15
        },
        desc: 'The men suffer but march on.'
      }
    ]
  },

  desertions: {
    id: 'desertions',
    name: 'Desertions',
    type: 'negative',
    terrain: ['plains', 'road'],
    minMoralePenalty: true,
    desc: 'Low morale takes its toll.',
    text: 'Wake to find two men gone in the night. Morale was too low and they decided to try their luck alone.',
    options: [
      {
        id: 'accept',
        text: 'Accept the loss',
        outcome: {
          type: 'desertion',
          count: [1, 2],
          morale: -10
        },
        desc: 'The company grows smaller.'
      },
      {
        id: 'bonus',
        text: 'Promise a gold bonus (costs 20 gold)',
        outcome: {
          type: 'pay',
          gold: -20,
          morale: 15
        },
        desc: 'Money soothes worried minds.'
      }
    ]
  },

  bad_weather: {
    id: 'bad_weather',
    name: 'Terrible Weather',
    type: 'negative',
    terrain: ['plains', 'hills', 'snow', 'mountains'],
    desc: 'Storm slows the march.',
    text: 'A ferocious storm rolls in, soaking men to the bone and turning the road to mud. Progress slows.',
    options: [
      {
        id: 'push',
        text: 'Push through',
        outcome: {
          type: 'morale_loss',
          morale: -10,
          food: -2
        },
        desc: 'Cold and miserable, the company presses on.'
      },
      {
        id: 'camp',
        text: 'Make camp and wait it out',
        outcome: {
          type: 'delay',
          turns: 1,
          food: -3,
          morale: 5
        },
        desc: 'A day\'s delay but men arrive rested.'
      }
    ]
  },

  // Special events
  wounded_soldier: {
    id: 'wounded_soldier',
    name: 'Wounded Soldier',
    type: 'neutral',
    terrain: ['road', 'plains'],
    desc: 'A wounded soldier lies by the road.',
    text: 'A badly wounded soldier in foreign colors lies by the roadside, barely alive. He might be useful if healed.',
    options: [
      {
        id: 'heal',
        text: 'Treat his wounds (costs 1 bandage)',
        outcome: {
          type: 'recruit_free',
          background: 'militia',
          morale: 5
        },
        desc: 'Grateful for his life, he joins your company.'
      },
      {
        id: 'rob',
        text: 'Take his valuables',
        outcome: {
          type: 'reward',
          gold: [5, 15],
          morale: -10
        },
        desc: 'Quick profit, ugly business.'
      },
      {
        id: 'ignore',
        text: 'Leave him',
        outcome: { type: 'nothing' },
        desc: 'Not your problem.'
      }
    ]
  },

  old_battlefield: {
    id: 'old_battlefield',
    name: 'Old Battlefield',
    type: 'neutral',
    terrain: ['plains', 'hills'],
    desc: 'The company crosses an old battlefield.',
    text: 'Bleached bones and rusted weapons litter the field. Some equipment might still be usable.',
    options: [
      {
        id: 'salvage',
        text: 'Scavenge for equipment',
        outcome: {
          type: 'random_item',
          category: 'weapon',
          quality: 'poor',
          morale: -5
        },
        desc: 'You find something amidst the carnage.'
      },
      {
        id: 'respect',
        text: 'Pay respects and move on',
        outcome: {
          type: 'morale',
          morale: 5
        },
        desc: 'The men march in quiet reflection.'
      }
    ]
  },

  mysterious_chest: {
    id: 'mysterious_chest',
    name: 'Mysterious Chest',
    type: 'neutral',
    terrain: ['dungeon', 'ruins', 'forest'],
    desc: 'A locked chest sits in the ruins.',
    text: 'A heavy iron chest, locked tight. Could be treasure. Could be trouble.',
    options: [
      {
        id: 'open',
        text: 'Force it open',
        outcome: {
          type: 'random_reward',
          options: [
            { weight: 60, gold: [20, 80] },
            { weight: 30, gold: [50, 150], item: 'iron_sword' },
            { weight: 10, type: 'trap', damage: [15, 30] }
          ]
        },
        desc: 'Your locksmith gets to work.'
      },
      {
        id: 'leave',
        text: 'Leave it alone',
        outcome: { type: 'nothing' },
        desc: 'Wise caution.'
      }
    ]
  }
};

export const EVENT_LIST = Object.values(EVENTS);

export function getEventsByTerrain(terrain) {
  return EVENT_LIST.filter(e =>
    !e.terrain || e.terrain.includes(terrain)
  );
}

export default EVENTS;
