// data/events.js
// Travel events triggered during overworld movement.
// Each event has: id, title, text, conditions (optional), choices array.
// Choice effects: { gold, food, morale, xp, addTrait, wound, removeItem, addItem }

export const EVENTS = [
  // ── 1. BANDIT AMBUSH ─────────────────────────────────────────────────────
  {
    id: 'bandit_ambush',
    title: 'Bandits on the Road',
    text: 'A ragged band of brigands steps out from the tree-line, weapons drawn. Their leader eyes your banner with open greed. "Leave your coin purse and walk away. No need for bloodshed today."',
    choices: [
      {
        text: 'Stand and fight',
        effects: { xp: 30, morale: 10 }
      },
      {
        text: 'Pay their toll (20 gold)',
        condition: { minGold: 20 },
        effects: { gold: -20, morale: -5 }
      },
      {
        text: 'Intimidate them into fleeing',
        condition: { hasSkill: 'intimidation' },
        effects: { xp: 15, morale: 8 }
      },
      {
        text: 'Flee into the woods',
        effects: { food: -3, morale: -10, xp: 5 }
      }
    ]
  },

  // ── 2. SUDDEN STORM ──────────────────────────────────────────────────────
  {
    id: 'storm',
    title: 'Dark Skies',
    text: 'Black clouds roll in with alarming speed. Within minutes the sky opens up, drenching your company and turning the road to mud. Lightning splits a nearby oak with a deafening crack.',
    choices: [
      {
        text: 'Push on through the storm',
        effects: { morale: -15, food: -2, xp: 10 }
      },
      {
        text: 'Make camp and wait it out',
        effects: { morale: -5, food: -5 }
      },
      {
        text: 'Seek shelter in the ruins ahead',
        effects: { morale: 5, food: -1 }
      }
    ]
  },

  // ── 3. TRAVELING MERCHANT ────────────────────────────────────────────────
  {
    id: 'merchant',
    title: 'Wandering Peddler',
    text: 'A cheerful merchant with a heavily laden mule hails you from down the road. He has an assortment of goods spread across a worn blanket and offers fair prices to fellow travellers.',
    choices: [
      {
        text: 'Browse his wares (50 gold)',
        condition: { minGold: 50 },
        effects: { gold: -50, addItem: 'supply_bundle' }
      },
      {
        text: 'Buy food supplies (30 gold)',
        condition: { minGold: 30 },
        effects: { gold: -30, food: 20 }
      },
      {
        text: 'Trade information for a discount',
        condition: { hasSkill: 'persuasion' },
        effects: { gold: -20, food: 15, xp: 10 }
      },
      {
        text: 'Wish him well and move on',
        effects: {}
      }
    ]
  },

  // ── 4. ANCIENT RUINS ─────────────────────────────────────────────────────
  {
    id: 'ruins',
    title: 'Crumbling Ruins',
    text: 'Off the road, half-swallowed by forest, stand the weathered stones of an old watchtower. Something glints in the shadows of the collapsed interior. The place feels strangely silent.',
    choices: [
      {
        text: 'Explore the ruins carefully',
        effects: { xp: 25, addItem: 'ancient_coin' }
      },
      {
        text: 'Search aggressively for loot',
        effects: { gold: 35, xp: 10, wound: 'minor_cut' }
      },
      {
        text: 'Study the inscriptions',
        condition: { hasSkill: 'lore' },
        effects: { xp: 40, addTrait: 'ruin_scholar' }
      },
      {
        text: 'Leave it – bad omens',
        effects: {}
      }
    ]
  },

  // ── 5. ABANDONED CAMP ────────────────────────────────────────────────────
  {
    id: 'abandoned_camp',
    title: 'Abandoned Camp',
    text: 'You come across a camp vacated in haste. Overturned pots, a smouldering fire, scattered belongings. Whatever spooked these people did so recently – the coals are still warm.',
    choices: [
      {
        text: 'Scavenge what you can',
        effects: { food: 8, gold: 12, xp: 5 }
      },
      {
        text: 'Track whatever caused the flight',
        condition: { hasSkill: 'survival' },
        effects: { xp: 30, morale: 10 }
      },
      {
        text: 'Make camp here for the night',
        effects: { morale: 10, food: -5 }
      },
      {
        text: 'Move on quickly',
        effects: { morale: -5 }
      }
    ]
  },

  // ── 6. WOLF PACK ─────────────────────────────────────────────────────────
  {
    id: 'wolves',
    title: 'Hungry Wolves',
    text: 'A pack of gaunt wolves has been shadowing your column for an hour. Their eyes reflect your torchlight. The largest – a scarred grey alpha – trots forward and bares its teeth.',
    choices: [
      {
        text: 'Stand firm and drive them off',
        effects: { morale: 10, xp: 20 }
      },
      {
        text: 'Throw them some food',
        effects: { food: -8, morale: 5 }
      },
      {
        text: 'Hunt them for pelts',
        effects: { xp: 35, gold: 20, wound: 'wolf_bite' }
      },
      {
        text: 'Light extra torches and form a ring',
        condition: { hasItem: 'torch' },
        effects: { removeItem: 'torch', morale: 15, xp: 10 }
      }
    ]
  },

  // ── 7. DESERTER SOLDIERS ─────────────────────────────────────────────────
  {
    id: 'deserters',
    title: 'Deserters',
    text: 'Three men in tattered armour bearing a noble\'s colours block the road. They look frightened and dangerous in equal measure. "We\'re done fighting rich men\'s wars. Give us your food and we\'ll let you pass."',
    choices: [
      {
        text: 'Recruit them into the company',
        condition: { minGold: 30, minMorale: 40 },
        effects: { gold: -30, morale: 10, xp: 20 }
      },
      {
        text: 'Arrest them for bounty',
        condition: { hasSkill: 'intimidation' },
        effects: { gold: 50, morale: -5, xp: 25 }
      },
      {
        text: 'Give them food and send them on',
        effects: { food: -10, morale: 5 }
      },
      {
        text: 'Fight – they are weak and outnumbered',
        effects: { xp: 20, morale: -10, gold: 15 }
      }
    ]
  },

  // ── 8. SICK TRAVELER ─────────────────────────────────────────────────────
  {
    id: 'sick_traveler',
    title: 'Sick Traveler',
    text: 'A woman lies at the side of the road, shivering despite the warm afternoon. She is burning with fever, her lips cracked. She begs for water and any medicine you might carry.',
    choices: [
      {
        text: 'Tend to her with your medicine',
        condition: { hasItem: 'medicine' },
        effects: { removeItem: 'medicine', morale: 20, xp: 25, addTrait: 'merciful' }
      },
      {
        text: 'Give her water and spare food',
        effects: { food: -5, morale: 10, xp: 10 }
      },
      {
        text: 'Carry her to the nearest village',
        effects: { morale: 15, food: -3, xp: 20 }
      },
      {
        text: 'Leave her – cannot risk sickness spreading',
        effects: { morale: -20 }
      }
    ]
  },

  // ── 9. MYSTERIOUS SHRINE ─────────────────────────────────────────────────
  {
    id: 'shrine',
    title: 'Ancient Shrine',
    text: 'A moss-covered stone idol stands at a crossroads, draped in faded ribbons and surrounded by small offerings. The locals clearly still venerate it. A hollow at its base holds an ornate iron box.',
    choices: [
      {
        text: 'Leave an offering and pray',
        effects: { gold: -10, morale: 20, xp: 15 }
      },
      {
        text: 'Take the iron box',
        effects: { gold: 40, morale: -15, addTrait: 'cursed_luck' }
      },
      {
        text: 'Study the inscriptions',
        condition: { hasSkill: 'lore' },
        effects: { xp: 50, addTrait: 'blessed' }
      },
      {
        text: 'Smash the pagan idol',
        effects: { morale: -30, gold: 5 }
      }
    ]
  },

  // ── 10. BRIDGE TOLL ──────────────────────────────────────────────────────
  {
    id: 'bridge_toll',
    title: 'Bridge Toll',
    text: 'The only bridge across the swollen river is guarded by two armoured men in a local lord\'s livery. They demand a toll of 15 gold. The water runs fast and deep – no easy ford in sight.',
    choices: [
      {
        text: 'Pay the toll (15 gold)',
        condition: { minGold: 15 },
        effects: { gold: -15 }
      },
      {
        text: 'Negotiate them down',
        condition: { hasSkill: 'persuasion' },
        effects: { gold: -8, xp: 15 }
      },
      {
        text: 'Force your way across',
        effects: { xp: 20, morale: -5, wound: 'minor_cut' }
      },
      {
        text: 'Find a ford upstream (costs time and food)',
        effects: { food: -8, morale: -10 }
      }
    ]
  },

  // ── 11. MASS GRAVE ───────────────────────────────────────────────────────
  {
    id: 'mass_grave',
    title: 'A Grim Discovery',
    text: 'The smell hits you before you see it. Dozens of bodies lie in a hastily dug pit at the edge of a burned village. Some wear militia colours; others are plainly dressed civilians. The killing was recent.',
    choices: [
      {
        text: 'Bury them properly',
        effects: { morale: 15, xp: 10, food: -3 }
      },
      {
        text: 'Search the bodies for salvage',
        effects: { gold: 25, morale: -25, addItem: 'old_sword' }
      },
      {
        text: 'Investigate who is responsible',
        condition: { hasSkill: 'survival' },
        effects: { xp: 30, morale: -10 }
      },
      {
        text: 'Say a quick prayer and move on',
        effects: { morale: -10 }
      }
    ]
  },

  // ── 12. HUNTING OPPORTUNITY ──────────────────────────────────────────────
  {
    id: 'hunting',
    title: 'Rich Hunting Ground',
    text: 'The forest here teems with game. Deer tracks cross the path everywhere, and your scouts spot a fat boar rooting in a nearby clearing. Your foragers\' eyes light up at the prospect.',
    choices: [
      {
        text: 'Spend time hunting (half-day)',
        effects: { food: 20, morale: 10, xp: 15 }
      },
      {
        text: 'Set quick snares and push on',
        condition: { hasSkill: 'survival' },
        effects: { food: 12, xp: 10 }
      },
      {
        text: 'Hunt the boar – dangerous but rewarding',
        effects: { food: 30, morale: 15, wound: 'boar_tusk', xp: 25 }
      },
      {
        text: 'Press on – no time to spare',
        effects: {}
      }
    ]
  },

  // ── 13. REFUGEE COLUMN ───────────────────────────────────────────────────
  {
    id: 'refugees',
    title: 'Fleeing Refugees',
    text: 'A long column of gaunt-faced men, women and children trudges towards you. They carry everything they own on their backs. Their village was burned three days ago by soldiers bearing no colours. They beg for food and protection.',
    choices: [
      {
        text: 'Share your food generously',
        effects: { food: -15, morale: 20, xp: 15, addTrait: 'protector' }
      },
      {
        text: 'Give a little and move on',
        effects: { food: -5, morale: 5 }
      },
      {
        text: 'Offer paid escort to the next town',
        condition: { minMorale: 50 },
        effects: { gold: 40, food: -10, xp: 30, morale: 15 }
      },
      {
        text: 'Turn them away – you barely have enough',
        effects: { morale: -15 }
      }
    ]
  },

  // ── 14. NIGHT AMBUSH ─────────────────────────────────────────────────────
  {
    id: 'night_ambush',
    title: 'Night Assault',
    text: 'Your night watch sounds the alarm. Shapes move in the darkness surrounding the camp. A hail of arrows thuds into the ground around your fires. Someone – or something – is attacking under cover of dark.',
    conditions: { minDay: 3 },
    choices: [
      {
        text: 'Mount an immediate counter-attack',
        effects: { xp: 40, morale: 15, wound: 'arrow_graze' }
      },
      {
        text: 'Extinguish fires and hold position',
        condition: { hasSkill: 'tactics' },
        effects: { xp: 35, morale: 10 }
      },
      {
        text: 'Break camp and flee in the dark',
        effects: { food: -5, morale: -20, xp: 5 }
      },
      {
        text: 'Send scouts to flank them',
        condition: { hasSkill: 'scouting' },
        effects: { xp: 50, morale: 20, gold: 30 }
      }
    ]
  },

  // ── 15. TRAVELING KNIGHT ─────────────────────────────────────────────────
  {
    id: 'knight',
    title: 'Wandering Knight',
    text: 'A lone knight in battered but quality armour rides towards you on a weary destrier. He regards your banner with interest. "I seek employment," he says curtly. "My last lord is dead. My sword arm still is not."',
    conditions: { minDay: 2 },
    choices: [
      {
        text: 'Hire him (60 gold up-front)',
        condition: { minGold: 60 },
        effects: { gold: -60, morale: 15, xp: 20 }
      },
      {
        text: 'Challenge him to prove his worth',
        condition: { hasSkill: 'tactics' },
        effects: { xp: 35, morale: 10 }
      },
      {
        text: 'Share a meal and swap stories',
        effects: { food: -5, morale: 15, xp: 10 }
      },
      {
        text: 'Politely decline',
        effects: {}
      }
    ]
  },

  // ── 16. PLAGUE VILLAGE ───────────────────────────────────────────────────
  {
    id: 'plague_village',
    title: 'Village of the Sick',
    text: 'The next village on your route has been quarantined with red crosses daubed on every door. The local reeve shouts from behind a barricade that the sweating sickness has taken hold. He begs for medicines. The main road runs right through the village square.',
    conditions: { minDay: 5 },
    choices: [
      {
        text: 'Donate medicines and help the sick',
        condition: { hasItem: 'medicine' },
        effects: { removeItem: 'medicine', morale: 25, xp: 40, addTrait: 'healer' }
      },
      {
        text: 'Skirt around through the fields',
        effects: { food: -5, morale: -5 }
      },
      {
        text: 'Enter and trade at risk',
        effects: { gold: 30, wound: 'fever' }
      },
      {
        text: 'Demand payment for any aid you give',
        effects: { gold: 25, morale: -20 }
      }
    ]
  },

  // ── 17. FALLEN TREE TRAP ─────────────────────────────────────────────────
  {
    id: 'fallen_tree',
    title: 'Blocked Road',
    text: 'A massive oak has fallen across the road with suspiciously fresh saw-marks at the stump. As your company halts to assess, you hear movement in the undergrowth on both sides of the track.',
    choices: [
      {
        text: 'Immediately form a defensive ring',
        condition: { hasSkill: 'tactics' },
        effects: { xp: 30, morale: 10 }
      },
      {
        text: 'Charge the nearest movement',
        effects: { xp: 25, morale: -5, wound: 'minor_cut' }
      },
      {
        text: 'Shout a warning and show of force',
        condition: { hasSkill: 'intimidation' },
        effects: { xp: 20, morale: 5, gold: 10 }
      },
      {
        text: 'Backtrack and find another route',
        effects: { food: -4, morale: -10 }
      }
    ]
  },

  // ── 18. HIDDEN CACHE ─────────────────────────────────────────────────────
  {
    id: 'hidden_cache',
    title: 'A Hidden Cache',
    text: 'One of your veterans spots something unusual – a section of bark on a roadside elm has been carved with a small "X". Digging at its roots reveals an oilskin-wrapped bundle. Old smuggler\'s cache, most likely.',
    choices: [
      {
        text: 'Take it all – finders keepers',
        effects: { gold: 80, morale: 20 }
      },
      {
        text: 'Take only what you need',
        effects: { gold: 40, food: 10, morale: 10, xp: 10 }
      },
      {
        text: 'Leave it and report it for a reward',
        condition: { hasSkill: 'persuasion' },
        effects: { xp: 25, morale: 5, gold: 30, addTrait: 'honest' }
      }
    ]
  },

  // ── 19. RIVAL COMPANY ────────────────────────────────────────────────────
  {
    id: 'rival_company',
    title: 'Rival Mercenaries',
    text: 'You come face to face with another mercenary company marching the opposite way. Their banner is the Black Serpent – a rough outfit with a grim reputation. Their captain smirks at your banner. "Iron Banner? Never heard of you." His men laugh.',
    conditions: { minDay: 4 },
    choices: [
      {
        text: 'Challenge their captain to a duel',
        condition: { hasSkill: 'melee' },
        effects: { xp: 50, morale: 25, addTrait: 'duellist' }
      },
      {
        text: 'Swap intelligence about the region',
        effects: { xp: 15, morale: 5 }
      },
      {
        text: 'Ignore them and march past',
        effects: { morale: -5 }
      },
      {
        text: 'Provoke a fight',
        effects: { xp: 40, morale: -15, wound: 'minor_cut', gold: 60 }
      }
    ]
  },

  // ── 20. WILL-O-THE-WISPS ─────────────────────────────────────────────────
  {
    id: 'strange_lights',
    title: "Will-o'-the-Wisps",
    text: 'As dusk falls, pale blue-green lights begin to dance in the marshland beside the road. Some of your men mutter prayers. Others are drawn forward by morbid curiosity. The lights seem to beckon deeper into the bog.',
    choices: [
      {
        text: 'Follow the lights',
        effects: { xp: 30, addItem: 'marsh_herb', wound: 'bog_chill' }
      },
      {
        text: 'Warn men off and press on quickly',
        effects: { morale: -5, xp: 10 }
      },
      {
        text: 'Explain the natural phenomenon to calm the men',
        condition: { hasSkill: 'lore' },
        effects: { morale: 15, xp: 20 }
      },
      {
        text: 'Make camp far from the marsh',
        effects: { food: -2, morale: 5 }
      }
    ]
  }
];

export const EVENT_LIST = EVENTS;

/**
 * Get events filtered by an optional condition check against current game state.
 * @param {object} stateSnap - snapshot with { day, company }
 * @returns {EVENTS[]}
 */
export function getAvailableEvents(stateSnap) {
  return EVENTS.filter(ev => {
    if (!ev.conditions) return true;
    const c = ev.conditions;
    if (c.minDay && stateSnap.day < c.minDay) return false;
    if (c.maxDay && stateSnap.day > c.maxDay) return false;
    if (c.hasSkill && !stateSnap.company.roster.some(m => m.skills && m.skills[c.hasSkill] > 0)) return false;
    if (c.hasTrait && !stateSnap.company.roster.some(m => m.traits && m.traits.includes(c.hasTrait))) return false;
    return true;
  });
}

export default EVENTS;
