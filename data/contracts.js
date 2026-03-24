// data/contracts.js
// Contract template definitions for the contract board system.
// Each template: id, title, type, desc, baseReward, rewardRange, durationDays,
//                difficulty, requiredReputation, enemyType, faction

export const CONTRACT_TEMPLATES = [
  // ── 1. ESCORT CONTRACT ───────────────────────────────────────────────────
  {
    id: 'escort_caravan',
    title: 'Caravan Escort',
    type: 'escort',
    desc: 'A merchant guild requires armed protection for a valuable cargo travelling between settlements. Threats of bandit raids have made the road too dangerous for an unguarded convoy.',
    baseReward: 120,
    rewardRange: [80, 200],
    durationDays: 5,
    difficulty: 'easy',
    requiredReputation: 0,
    enemyType: 'bandits',
    faction: 'Merchants\' Guild'
  },

  // ── 2. BOUNTY – BANDIT LEADER ────────────────────────────────────────────
  {
    id: 'bounty_bandit_lord',
    title: 'Wanted: The Scarred Wolf',
    type: 'bounty',
    desc: 'The notorious brigand known as the Scarred Wolf has terrorised the King\'s Road for months. A bounty has been placed on his head – alive preferred, dead accepted. His camp is believed to be in the northern foothills.',
    baseReward: 200,
    rewardRange: [150, 300],
    durationDays: 8,
    difficulty: 'medium',
    requiredReputation: 5,
    enemyType: 'bandit_lord',
    faction: 'Crown Reeve'
  },

  // ── 3. PATROL CONTRACT ───────────────────────────────────────────────────
  {
    id: 'patrol_road',
    title: 'Road Patrol Duty',
    type: 'patrol',
    desc: 'The local garrison is undermanned and requires a mercenary company to patrol the merchant road for a set number of days. Engage any bandits encountered and report sightings to the gate captain.',
    baseReward: 60,
    rewardRange: [40, 100],
    durationDays: 7,
    difficulty: 'easy',
    requiredReputation: 0,
    enemyType: 'bandits',
    faction: 'City Guard'
  },

  // ── 4. HUNT – MONSTER ────────────────────────────────────────────────────
  {
    id: 'hunt_dire_wolf',
    title: 'Hunt: Dire Wolf Pack',
    type: 'hunt',
    desc: 'A pack of abnormally large wolves has been preying on livestock and has killed two shepherds. The village council of Millhaven offers a substantial reward for proof of the pack\'s destruction. Bring back the alpha\'s pelt.',
    baseReward: 150,
    rewardRange: [100, 220],
    durationDays: 6,
    difficulty: 'medium',
    requiredReputation: 0,
    enemyType: 'wolves',
    faction: 'Village Council'
  },

  // ── 5. RETRIEVE ITEM ─────────────────────────────────────────────────────
  {
    id: 'retrieve_heirloom',
    title: 'Recover the Aldric Seal',
    type: 'retrieve',
    desc: 'The merchant house of Aldric had their company seal – a solid silver signet used on all trading documents – stolen by raiders. Without it, their contracts are invalid. Recover it from the raider camp east of Graywater.',
    baseReward: 180,
    rewardRange: [130, 250],
    durationDays: 6,
    difficulty: 'medium',
    requiredReputation: 10,
    enemyType: 'raiders',
    faction: "Aldric Trading Co."
  },

  // ── 6. PROTECT SETTLEMENT ────────────────────────────────────────────────
  {
    id: 'protect_village',
    title: 'Defend Thornbury',
    type: 'protect',
    desc: 'Scouts report a warband gathering to the south, believed to be planning a raid on the village of Thornbury. The village has no militia of its own. Station your company and repel the assault when it comes.',
    baseReward: 250,
    rewardRange: [180, 380],
    durationDays: 4,
    difficulty: 'hard',
    requiredReputation: 15,
    enemyType: 'warband',
    faction: 'Village Elder'
  },

  // ── 7. BOUNTY – DESERTER ─────────────────────────────────────────────────
  {
    id: 'bounty_deserter',
    title: 'Wanted: Sergeant Varn',
    type: 'bounty',
    desc: 'Former army sergeant Varn deserted with a dozen men and now runs a toll extortion operation on the eastern ford. He is considered armed and dangerous. The garrison wants him brought in alive to face military justice.',
    baseReward: 160,
    rewardRange: [120, 220],
    durationDays: 7,
    difficulty: 'medium',
    requiredReputation: 10,
    enemyType: 'deserters',
    faction: 'Crown Army'
  },

  // ── 8. ESCORT – NOBLE ────────────────────────────────────────────────────
  {
    id: 'escort_noble',
    title: 'Noble Escort to Kesslar',
    type: 'escort',
    desc: 'Lord Harwick requires a trustworthy company to escort him and his retinue through territory known to harbour agents of a rival noble house. Discretion is as important as swords. Route runs through three days of open country.',
    baseReward: 300,
    rewardRange: [220, 420],
    durationDays: 4,
    difficulty: 'hard',
    requiredReputation: 20,
    enemyType: 'assassins',
    faction: 'House Harwick'
  },

  // ── 9. PATROL – BORDER WATCH ─────────────────────────────────────────────
  {
    id: 'patrol_border',
    title: 'Northern Border Watch',
    type: 'patrol',
    desc: 'The border between two rival territories has become a flashpoint. Neither lord wants to commit their own troops and risk escalation. Hire a neutral mercenary company to patrol and report troop movements – no engagement unless fired upon.',
    baseReward: 90,
    rewardRange: [70, 140],
    durationDays: 10,
    difficulty: 'medium',
    requiredReputation: 8,
    enemyType: null,
    faction: 'Border Council'
  },

  // ── 10. HUNT – WYVERN ────────────────────────────────────────────────────
  {
    id: 'hunt_wyvern',
    title: 'Slay the Iron Cliffs Wyvern',
    type: 'hunt',
    desc: 'A wyvern has nested in the Iron Cliffs and has begun raiding the trade road. Several wagons have been destroyed. The Westmarch Merchant Assembly is offering a princely sum for its destruction. This is no ordinary beast.',
    baseReward: 500,
    rewardRange: [380, 650],
    durationDays: 10,
    difficulty: 'hard',
    requiredReputation: 25,
    enemyType: 'wyvern',
    faction: 'Merchant Assembly'
  },

  // ── 11. RETRIEVE – PRISONER ──────────────────────────────────────────────
  {
    id: 'retrieve_prisoner',
    title: 'Rescue Captain Renna',
    type: 'retrieve',
    desc: 'Captain Renna of the city watch was captured during a bandit ambush. She is being held for ransom at a fortified hilltop camp. Her family cannot pay the ransom. Infiltrate or assault the camp and bring her back alive.',
    baseReward: 220,
    rewardRange: [160, 300],
    durationDays: 5,
    difficulty: 'hard',
    requiredReputation: 12,
    enemyType: 'brigands',
    faction: 'City Watch'
  },

  // ── 12. PROTECT – MINE ───────────────────────────────────────────────────
  {
    id: 'protect_mine',
    title: 'Guard the Ironvein Mine',
    type: 'protect',
    desc: 'The Ironvein iron mine has been subject to repeated attacks from a group of displaced miners turned criminals. Guard the mine entrance for five days during the critical ore shipment window. Pay is daily.',
    baseReward: 175,
    rewardRange: [120, 250],
    durationDays: 5,
    difficulty: 'medium',
    requiredReputation: 5,
    enemyType: 'miners',
    faction: 'Iron Guild'
  },

  // ── 13. BOUNTY – CULT ────────────────────────────────────────────────────
  {
    id: 'bounty_cultists',
    title: 'Root Out the Pale Hand',
    type: 'bounty',
    desc: 'A secret cult called the Pale Hand has been abducting travellers from the Pilgrim\'s Way. The church has authorised a bounty on their leader, Brother Ashan, and a reward for destroying their hidden shrine.',
    baseReward: 280,
    rewardRange: [200, 380],
    durationDays: 8,
    difficulty: 'hard',
    requiredReputation: 18,
    enemyType: 'cultists',
    faction: 'The Church'
  },

  // ── 14. HUNT – BEAST PACK ────────────────────────────────────────────────
  {
    id: 'hunt_boars',
    title: 'Clear the Razorback Warren',
    type: 'hunt',
    desc: 'Giant boars have driven farmers off their land around the Millwood Hills. The animals are larger than normal and unusually aggressive. The local lord offers a bounty per head as well as a completion bonus.',
    baseReward: 130,
    rewardRange: [90, 190],
    durationDays: 4,
    difficulty: 'easy',
    requiredReputation: 0,
    enemyType: 'boars',
    faction: "Lord Millwood's Estate"
  },

  // ── 15. RETRIEVE – DOCUMENTS ─────────────────────────────────────────────
  {
    id: 'retrieve_documents',
    title: 'Recover the Trade Ledgers',
    type: 'retrieve',
    desc: 'Trade ledgers containing sensitive financial information were stolen from the tax collector\'s office. Believed taken by agents of a rival city. The documents must be recovered before they can be copied and used against local merchants.',
    baseReward: 200,
    rewardRange: [150, 280],
    durationDays: 6,
    difficulty: 'medium',
    requiredReputation: 15,
    enemyType: 'spies',
    faction: 'Tax Collector'
  }
];

// ── Data pools for procedural contract text generation ────────────────────
export const CONTRACT_DATA = {
  merchants: ['Aldric Trading Co.', 'Hoffmann Merchants', 'The Silver Cart', 'Eastern Spice Guild', 'Iron Road Company', 'Kesslar Traders'],
  settlements: ['Ironhold', 'Millhaven', 'Graywater', 'Thornbury', 'Kesslar', 'Westmarch', 'Duskfall', 'Ashford', 'Coldwater'],
  creatures: ['dire wolf', 'giant spider', 'cave troll', 'manticore', 'wyvern', 'giant boar', 'swamp hag', 'barrow wraith'],
  factions: ['the Iron Brotherhood', 'Wolf Clan raiders', 'the Crimson Company', 'northern barbarians', 'the Pale Hand cultists'],
  roads: ["King's Highway", 'Merchant Road', 'North Road', "Pilgrim's Way", 'Eastern Track'],
  distances: ['two', 'three', 'four', 'five'],
  items: ["a merchant's strongbox", "a noble's heirloom sword", 'trade documents', 'a sacred relic', 'a signet ring', 'a chest of coin'],
  victimDescriptions: ['three farmers', 'a patrol', 'two travelers', 'a hunting party', 'a shepherd family'],
  names: ['Hans', 'Gregor', 'Marta', 'Rudolf', 'Elspeth', 'Tomas', 'Aldwin', 'Brunhild']
};

/**
 * Get a contract template by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getTemplate(id) {
  return CONTRACT_TEMPLATES.find(t => t.id === id);
}

/**
 * Generate a live contract instance from a template id, with optional difficulty override.
 * @param {string} templateId
 * @param {string|null} difficultyOverride - 'easy'|'medium'|'hard' or null
 * @returns {object|null}
 */
export function generateContract(templateId, difficultyOverride = null) {
  const tmpl = getTemplate(templateId);
  if (!tmpl) return null;

  const difficulty = difficultyOverride || tmpl.difficulty;
  const diffMult = { easy: 1.0, medium: 1.3, hard: 1.7 }[difficulty] || 1.0;

  const [min, max] = tmpl.rewardRange;
  const baseReward = min + Math.floor(Math.random() * (max - min + 1));
  const reward = Math.floor(baseReward * diffMult);

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const data = {
    merchant: pick(CONTRACT_DATA.merchants),
    origin: pick(CONTRACT_DATA.settlements),
    destination: pick(CONTRACT_DATA.settlements),
    location: pick(CONTRACT_DATA.settlements),
    village: pick(CONTRACT_DATA.settlements),
    faction: pick(CONTRACT_DATA.factions),
    creature: pick(CONTRACT_DATA.creatures),
    road: pick(CONTRACT_DATA.roads),
    from: pick(CONTRACT_DATA.settlements),
    to: pick(CONTRACT_DATA.settlements),
    item: pick(CONTRACT_DATA.items),
    employer: 'Merchant ' + pick(CONTRACT_DATA.names),
    distance: pick(CONTRACT_DATA.distances),
    victims: pick(CONTRACT_DATA.victimDescriptions)
  };

  return {
    id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    templateId: tmpl.id,
    title: tmpl.title,
    type: tmpl.type,
    desc: tmpl.desc,
    difficulty,
    reward,
    durationDays: tmpl.durationDays,
    requiredReputation: tmpl.requiredReputation,
    enemyType: tmpl.enemyType,
    faction: tmpl.faction,
    status: 'available',
    daysRemaining: tmpl.durationDays,
    acceptedOnDay: null,
    data
  };
}

/**
 * Generate a random contract board of `count` contracts, optionally scaled by player renown.
 * @param {number} count
 * @param {number} renown - player renown for difficulty gating
 * @returns {object[]}
 */
export function generateContractBoard(count = 3, renown = 0) {
  const available = CONTRACT_TEMPLATES.filter(t => t.requiredReputation <= renown);
  const pool = available.length > 0 ? available : CONTRACT_TEMPLATES.filter(t => t.difficulty === 'easy');
  const contracts = [];
  const used = new Set();

  for (let i = 0; i < count && pool.length > 0; i++) {
    let tmpl;
    let attempts = 0;
    do {
      tmpl = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    } while (used.has(tmpl.id) && attempts < 20);
    used.add(tmpl.id);
    contracts.push(generateContract(tmpl.id));
  }
  return contracts;
}

export default CONTRACT_TEMPLATES;
