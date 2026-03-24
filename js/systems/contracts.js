// Contracts system: generation, acceptance, completion, failure, and updates.

import { generateContractBoard as genBoard, CONTRACT_TEMPLATES, CONTRACT_DATA } from '../../data/contracts.js';

// -------------------------------------------------------------------------
// Generation
// -------------------------------------------------------------------------

/**
 * Generate 3-5 contracts for a settlement and cache them on the settlement object.
 * @param {object} settlement
 * @param {object} state
 * @param {function} rng - random function (or null)
 * @returns {Array} generated contract objects
 */
export function generateContracts(settlement, state, rng) {
  const fn = rng || Math.random;
  const templates = Object.keys(CONTRACT_TEMPLATES);

  // Settlement type affects contract count
  const sType = settlement.type || 'village';
  const counts = { village: [1, 2], town: [2, 4], city: [3, 5], fort: [2, 4] };
  const range = counts[sType] || [1, 3];
  const count = range[0] + Math.floor(fn() * (range[1] - range[0] + 1));

  const contracts = [];
  for (let i = 0; i < count; i++) {
    const tmplKey = templates[Math.floor(fn() * templates.length)];
    const tmpl = CONTRACT_TEMPLATES[tmplKey];
    if (!tmpl) continue;

    // Difficulty scales with settlement prestige
    const diffMin = tmpl.difficulty[0];
    const diffMax = tmpl.difficulty[1];
    const difficulty = diffMin + Math.floor(fn() * (diffMax - diffMin + 1));

    const rewardBase = tmpl.baseReward[0] + Math.floor(fn() * (tmpl.baseReward[1] - tmpl.baseReward[0]));
    const reward = Math.floor(rewardBase * (0.8 + difficulty * 0.15));
    const duration = tmpl.duration[0] + Math.floor(fn() * (tmpl.duration[1] - tmpl.duration[0] + 1));

    const data = _generateContractData(fn);

    contracts.push({
      id: `contract_${Date.now()}_${Math.floor(fn() * 99999)}`,
      templateId: tmplKey,
      name: tmpl.name,
      type: tmpl.type,
      desc: tmpl.generateText(data),
      difficulty,
      reward,
      duration,
      reputation: tmpl.reputation || 3,
      requirements: tmpl.requirements || {},
      status: 'available',
      settlementId: settlement.id,
      data,
    });
  }

  settlement.contracts = contracts;
  return contracts;
}

function _generateContractData(fn) {
  const pick = (arr) => arr[Math.floor(fn() * arr.length)];
  return {
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
    employer: 'Merchant ' + pick(['Hans', 'Gregor', 'Marta', 'Rudolf']),
    count: 10 + Math.floor(fn() * 15),
    days: 5 + Math.floor(fn() * 6),
    dailyPay: 5 + Math.floor(fn() * 10),
    distance: pick(CONTRACT_DATA.distances),
    victims: pick(['three farmers', 'a patrol', 'two travelers', 'a hunting party']),
  };
}

// -------------------------------------------------------------------------
// State management
// -------------------------------------------------------------------------

/**
 * Accept a contract, moving it from settlement board to active state.
 * @param {object} state
 * @param {object} contract
 */
export function acceptContract(state, contract) {
  // Find and remove from settlement
  for (const s of (state.world.settlements || [])) {
    if (s.contracts) {
      const idx = s.contracts.findIndex(c => c.id === contract.id);
      if (idx !== -1) {
        s.contracts.splice(idx, 1);
        break;
      }
    }
  }

  contract.status = 'active';
  contract.acceptedDay = state.day;
  contract.expiresDay = state.day + (contract.duration || 7);
  state.contracts.active = state.contracts.active || [];
  state.contracts.active.push(contract);
}

/**
 * Complete a contract: award reward and reputation, move to completed list.
 */
export function completeContract(state, contract) {
  const idx = (state.contracts.active || []).findIndex(c => c.id === contract.id);
  if (idx === -1) return false;

  state.contracts.active.splice(idx, 1);

  contract.status = 'completed';
  contract.completedDay = state.day;

  state.company.gold = (state.company.gold || 0) + (contract.reward || 0);
  state.company.renown = (state.company.renown || 0) + (contract.reputation || 0);
  state.company.morale = Math.min(100, (state.company.morale || 50) + 5);

  // Faction rep bonus
  if (contract.factionId && state.factions) {
    const current = state.factions[contract.factionId] || 0;
    state.factions[contract.factionId] = Math.min(100, current + (contract.reputation || 3));
  }

  state.contracts.completed = state.contracts.completed || [];
  state.contracts.completed.push(contract);
  return true;
}

/**
 * Fail a contract: apply penalties.
 */
export function failContract(state, contract) {
  const idx = (state.contracts.active || []).findIndex(c => c.id === contract.id);
  if (idx !== -1) state.contracts.active.splice(idx, 1);

  contract.status = 'failed';
  contract.failedDay = state.day;

  // Morale and renown penalty
  state.company.morale = Math.max(0, (state.company.morale || 50) - 8);
  state.company.renown = Math.max(0, (state.company.renown || 0) - Math.ceil((contract.reputation || 3) / 2));

  state.contracts.failed = state.contracts.failed || [];
  state.contracts.failed.push(contract);
}

/**
 * Check all active contracts for expiry; auto-fail expired ones.
 */
export function updateContracts(state) {
  const now = state.day || 1;
  const toFail = (state.contracts.active || []).filter(c => c.expiresDay && now > c.expiresDay);
  for (const c of toFail) {
    failContract(state, c);
  }
}

/**
 * Check if a contract's completion condition is satisfied.
 * Uses type-based heuristics.
 */
export function isContractComplete(state, contract) {
  if (!contract || contract.status !== 'active') return false;

  switch (contract.type) {
    case 'exterminate': {
      // Check if target enemy party no longer exists
      const targetFaction = contract.data && contract.data.faction;
      if (!targetFaction) return false;
      return (state.world.enemyParties || []).every(ep => !ep.alive || ep.faction !== targetFaction);
    }
    case 'patrol': {
      // Time-based: complete when duration elapses
      return contract.acceptedDay && (state.day - contract.acceptedDay) >= (contract.duration || 5);
    }
    case 'escort':
    case 'retrieval':
    case 'defense':
    case 'hunt':
    default:
      // These require explicit completion via UI / game event
      return false;
  }
}
