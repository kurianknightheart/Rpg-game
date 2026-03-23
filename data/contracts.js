// Contract template definitions
export const CONTRACT_TEMPLATES = {
  caravan_escort: {
    id: 'caravan_escort',
    name: 'Caravan Escort',
    type: 'escort',
    desc: 'Escort a merchant caravan safely to its destination.',
    difficulty: [1, 3],
    baseReward: [80, 200],
    duration: [3, 7],
    reputation: 5,
    requirements: { minPartySize: 4 },
    generateText: (data) => `Escort the ${data.merchant} caravan from ${data.origin} to ${data.destination}. ` +
      `Protect against bandit attacks. Payment on arrival.`,
  },

  clear_bandits: {
    id: 'clear_bandits',
    name: 'Clear Bandit Camp',
    type: 'exterminate',
    desc: 'Eliminate a bandit camp threatening the local area.',
    difficulty: [2, 4],
    baseReward: [120, 280],
    duration: [4, 8],
    reputation: 8,
    requirements: { minPartySize: 5 },
    generateText: (data) => `A band of ${data.count} brigands has been raiding local farms near ${data.location}. ` +
      `Kill or drive them off. Bring their leader's head as proof.`,
  },

  recover_item: {
    id: 'recover_item',
    name: 'Recover Stolen Goods',
    type: 'retrieval',
    desc: 'Retrieve stolen property from bandits.',
    difficulty: [1, 3],
    baseReward: [60, 150],
    duration: [3, 6],
    reputation: 4,
    requirements: { minPartySize: 3 },
    generateText: (data) => `Brigands stole ${data.item} from ${data.employer}. ` +
      `It is believed to be held at their camp ${data.distance} leagues away. ` +
      `Return it intact for full payment.`,
  },

  defend_village: {
    id: 'defend_village',
    name: 'Defend Village',
    type: 'defense',
    desc: 'Protect a village from an imminent attack.',
    difficulty: [3, 5],
    baseReward: [150, 350],
    duration: [2, 5],
    reputation: 10,
    requirements: { minPartySize: 6 },
    generateText: (data) => `The village of ${data.village} has received threats from ${data.faction}. ` +
      `Station your company there and repel any attack. Villagers will provide food and lodging.`,
  },

  hunt_creature: {
    id: 'hunt_creature',
    name: 'Hunt Dangerous Creature',
    type: 'hunt',
    desc: 'Kill a monster that has been terrorizing the region.',
    difficulty: [2, 5],
    baseReward: [100, 300],
    duration: [3, 8],
    reputation: 7,
    requirements: { minPartySize: 4 },
    generateText: (data) => `A ${data.creature} has taken up residence near ${data.location} and killed ${data.victims}. ` +
      `Proof of the kill (its head) is required for payment.`,
  },

  patrol_road: {
    id: 'patrol_road',
    name: 'Road Patrol',
    type: 'patrol',
    desc: 'Patrol a road to deter bandit activity.',
    difficulty: [1, 2],
    baseReward: [40, 100],
    duration: [5, 10],
    reputation: 3,
    requirements: { minPartySize: 3 },
    generateText: (data) => `Patrol the ${data.road} road between ${data.from} and ${data.to} for ${data.days} days. ` +
      `Engage any bandits encountered. Daily rate of ${data.dailyPay} gold.`,
  },
};

// Data tables for contract generation
export const CONTRACT_DATA = {
  merchants: ['Aldric Trading Co.', 'Hoffmann Merchants', 'The Silver Cart', 'Eastern Spice Guild', 'Iron Road Company'],
  settlements: ['Ironhold', 'Millhaven', 'Graywater', 'Thornbury', 'Kesslar', 'Westmarch', 'Duskfall'],
  creatures: ['dire wolf', 'giant spider', 'cave troll', 'manticore', 'wyvern', 'giant boar'],
  factions: ['the Iron Brotherhood', 'Wolf Clan raiders', 'the Crimson Company', 'northern barbarians'],
  roads: ['King\'s Highway', 'Merchant Road', 'North Road', 'Pilgrim\'s Way'],
  distances: ['two', 'three', 'four', 'five'],
  items: ['a merchant\'s strongbox', 'a noble\'s heirloom sword', 'trade documents', 'a sacred relic'],
};

export function generateContract(template, difficultyOverride = null) {
  const tmpl = CONTRACT_TEMPLATES[template];
  if (!tmpl) return null;

  const difficulty = difficultyOverride ||
    tmpl.difficulty[0] + Math.floor(Math.random() * (tmpl.difficulty[1] - tmpl.difficulty[0] + 1));

  const rewardRange = tmpl.baseReward;
  const baseReward = rewardRange[0] + Math.floor(Math.random() * (rewardRange[1] - rewardRange[0]));
  const reward = Math.floor(baseReward * (0.8 + difficulty * 0.1));

  const duration = tmpl.duration[0] + Math.floor(Math.random() * (tmpl.duration[1] - tmpl.duration[0] + 1));

  const data = {
    merchant: CONTRACT_DATA.merchants[Math.floor(Math.random() * CONTRACT_DATA.merchants.length)],
    origin: CONTRACT_DATA.settlements[Math.floor(Math.random() * CONTRACT_DATA.settlements.length)],
    destination: CONTRACT_DATA.settlements[Math.floor(Math.random() * CONTRACT_DATA.settlements.length)],
    location: CONTRACT_DATA.settlements[Math.floor(Math.random() * CONTRACT_DATA.settlements.length)],
    village: CONTRACT_DATA.settlements[Math.floor(Math.random() * CONTRACT_DATA.settlements.length)],
    faction: CONTRACT_DATA.factions[Math.floor(Math.random() * CONTRACT_DATA.factions.length)],
    creature: CONTRACT_DATA.creatures[Math.floor(Math.random() * CONTRACT_DATA.creatures.length)],
    road: CONTRACT_DATA.roads[Math.floor(Math.random() * CONTRACT_DATA.roads.length)],
    from: CONTRACT_DATA.settlements[Math.floor(Math.random() * CONTRACT_DATA.settlements.length)],
    to: CONTRACT_DATA.settlements[Math.floor(Math.random() * CONTRACT_DATA.settlements.length)],
    item: CONTRACT_DATA.items[Math.floor(Math.random() * CONTRACT_DATA.items.length)],
    employer: 'Merchant ' + ['Hans', 'Gregor', 'Marta', 'Rudolf'][Math.floor(Math.random() * 4)],
    count: 10 + difficulty * 5,
    days: duration,
    dailyPay: 5 + difficulty * 3,
    distance: CONTRACT_DATA.distances[Math.floor(Math.random() * CONTRACT_DATA.distances.length)],
    victims: ['three farmers', 'a patrol', 'two travelers', 'a hunting party'][Math.floor(Math.random() * 4)],
  };

  return {
    id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    templateId: template,
    name: tmpl.name,
    type: tmpl.type,
    desc: tmpl.generateText(data),
    difficulty,
    reward,
    duration,
    reputation: tmpl.reputation,
    requirements: tmpl.requirements,
    status: 'available',
    data,
  };
}

export function generateContractBoard(count = 3) {
  const templates = Object.keys(CONTRACT_TEMPLATES);
  const contracts = [];
  for (let i = 0; i < count; i++) {
    const tmpl = templates[Math.floor(Math.random() * templates.length)];
    contracts.push(generateContract(tmpl));
  }
  return contracts;
}

export default CONTRACT_TEMPLATES;
