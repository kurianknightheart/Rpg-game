// Economy/market system
import ITEMS from '../../data/items.js';
import { MARKET_STOCK } from '../../data/settlements.js';
import { addToInventory, removeFromInventory, hasItem } from './inventory.js';
import { randInt } from '../utils/rng.js';

// Price fluctuation system
export function getMarketPrice(itemId, settlementType, priceMultiplier = 1.0) {
  const item = ITEMS[itemId];
  if (!item) return 0;

  const stockData = MARKET_STOCK[settlementType] || MARKET_STOCK.village;
  const basePrice = item.value;

  // Random 10-20% price variation
  const variation = 0.85 + Math.random() * 0.3;
  const finalPrice = Math.max(1, Math.round(basePrice * priceMultiplier * variation));

  return finalPrice;
}

export function getBuyPrice(itemId, settlementType, priceMultiplier = 1.0) {
  const item = ITEMS[itemId];
  if (!item) return 0;
  return Math.ceil(getMarketPrice(itemId, settlementType, priceMultiplier) * 1.1); // 10% markup for buying
}

export function getSellPrice(itemId, settlementType, priceMultiplier = 1.0) {
  const item = ITEMS[itemId];
  if (!item) return 0;
  return Math.floor(getMarketPrice(itemId, settlementType, priceMultiplier) * 0.7); // 30% discount for selling
}

// Generate market inventory for a settlement
export function generateMarketInventory(settlementType) {
  const stockData = MARKET_STOCK[settlementType] || MARKET_STOCK.village;
  const inventory = [];

  const allItems = [
    ...(stockData.weapons || []),
    ...(stockData.armor || []),
    ...(stockData.consumables || []),
  ];

  for (const itemId of allItems) {
    const item = ITEMS[itemId];
    if (!item) continue;

    // Random stock quantity
    let quantity = 1;
    if (item.stackable) {
      quantity = randInt(5, 20);
    } else {
      // Not always available
      if (Math.random() > 0.3) quantity = 1;
      else continue;
    }

    inventory.push({
      itemId,
      quantity,
      price: getBuyPrice(itemId, settlementType),
      sellPrice: getSellPrice(itemId, settlementType),
    });
  }

  return inventory;
}

// Buy item from market
export function buyItem(company, settlement, itemId, count = 1) {
  const marketItem = settlement.market?.find(m => m.itemId === itemId);
  if (!marketItem) return { success: false, reason: 'Item not available' };

  const price = marketItem.price * count;
  if (company.gold < price) return { success: false, reason: 'Not enough gold' };

  if (marketItem.quantity < count) return { success: false, reason: 'Not enough stock' };

  company.gold -= price;
  marketItem.quantity -= count;
  addToInventory(company.stash.items, itemId, count);

  return { success: true, cost: price };
}

// Sell item to market
export function sellItem(company, settlement, stackId, count = 1) {
  const stack = company.stash.items.find(s => s.id === stackId);
  if (!stack) {
    // Check character inventories
    for (const char of company.roster) {
      const cs = char.inventory.find(s => s.id === stackId);
      if (cs) {
        return _doSell(company, settlement, cs, count, char.inventory);
      }
    }
    return { success: false, reason: 'Item not found' };
  }

  return _doSell(company, settlement, stack, count, company.stash.items);
}

function _doSell(company, settlement, stack, count, inventory) {
  const actualCount = Math.min(count, stack.count);
  const sellPrice = getSellPrice(stack.itemId, settlement.type);
  const total = sellPrice * actualCount;

  company.gold += total;

  if (stack.count <= actualCount) {
    const idx = inventory.indexOf(stack);
    if (idx !== -1) inventory.splice(idx, 1);
  } else {
    stack.count -= actualCount;
  }

  return { success: true, earned: total };
}

// Daily upkeep calculation
export function calcDailyUpkeep(company) {
  let wages = 0;
  for (const char of company.roster) {
    if (!char.alive) continue;
    wages += char.wage || 3;
  }

  // Food consumption
  const foodNeeded = company.roster.filter(c => c.alive).length;

  return { wages, foodNeeded };
}

// Pay wages and consume food
export function processDailyUpkeep(company) {
  const { wages, foodNeeded } = calcDailyUpkeep(company);
  const events = [];

  // Pay wages
  if (company.gold >= wages) {
    company.gold -= wages;
  } else {
    // Can't pay wages - morale penalty
    company.morale = Math.max(0, company.morale - 10);
    events.push({ type: 'no_wages', message: 'Could not pay wages! Morale suffers.' });
  }

  // Consume food
  if (company.food >= foodNeeded) {
    company.food -= foodNeeded;
  } else {
    const shortage = foodNeeded - company.food;
    company.food = 0;
    company.morale = Math.max(0, company.morale - 5 * Math.ceil(shortage / 3));
    events.push({ type: 'food_shortage', message: `Food shortage! ${shortage} men go hungry.` });
  }

  // Morale changes
  if (company.morale < 25) {
    events.push({ type: 'low_morale', message: 'Company morale is dangerously low.' });
  }

  return events;
}

// Company morale calculation
export function updateMorale(company, delta) {
  company.morale = Math.max(0, Math.min(100, company.morale + delta));
}

export function getMoraleLabel(morale) {
  if (morale >= 80) return 'Excellent';
  if (morale >= 60) return 'Good';
  if (morale >= 40) return 'Steady';
  if (morale >= 25) return 'Shaken';
  if (morale >= 10) return 'Poor';
  return 'Broken';
}

export function getMoraleColor(morale) {
  if (morale >= 80) return '#44ff44';
  if (morale >= 60) return '#88ff44';
  if (morale >= 40) return '#ffff44';
  if (morale >= 25) return '#ffaa44';
  if (morale >= 10) return '#ff6644';
  return '#ff4444';
}

// Named aliases used by main.js
export function payWages(state) {
  const roster = state.roster || [];
  let totalWage = 0;
  for (const char of roster) {
    if (!char.alive) continue;
    totalWage += char.wage || 3;
  }
  if (totalWage > 0) {
    if ((state.company.gold || 0) >= totalWage) {
      state.company.gold -= totalWage;
    } else {
      state.company.gold = 0;
      state.company.morale = Math.max(0, (state.company.morale || 50) - 15);
    }
  }
}

export function consumeFood(state) {
  const roster = state.roster || [];
  const aliveCount = roster.filter(c => c.alive).length;
  const foodNeeded = aliveCount;

  if ((state.company.food || 0) >= foodNeeded) {
    state.company.food -= foodNeeded;
    state.company.morale = Math.min(100, (state.company.morale || 50) + 1);
  } else {
    state.company.food = 0;
    state.company.morale = Math.max(0, (state.company.morale || 50) - 10);
    const alive = roster.filter(c => c.alive);
    for (let i = 0; i < Math.min(Math.max(1, aliveCount - (state.company.food || 0)), alive.length); i++) {
      const char = alive[Math.floor(Math.random() * alive.length)];
      if (char) char.hp = Math.max(1, char.hp - 5);
    }
  }
}

export default {
  getMarketPrice, getBuyPrice, getSellPrice, generateMarketInventory,
  buyItem, sellItem, calcDailyUpkeep, processDailyUpkeep,
  updateMorale, getMoraleLabel, getMoraleColor, payWages, consumeFood
};
