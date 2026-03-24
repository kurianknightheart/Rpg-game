// Travel events system
import { EVENTS, EVENT_LIST, getEventsByTerrain } from '../../data/events.js';
import { addToInventory } from './inventory.js';
import { createCharacter } from './character.js';
import { randInt, pick } from '../utils/rng.js';

export function checkTravelEvent(state, terrain = 'plains') {
  // 5% chance per tile of an event
  if (Math.random() > 0.05) return null;

  const possibleEvents = getEventsByTerrain(terrain);
  if (!possibleEvents || possibleEvents.length === 0) return null;

  const eventDef = pick(possibleEvents);
  if (!eventDef) return null;

  // Check any special conditions
  if (eventDef.minMoralePenalty && (state.company.morale || 50) > 30) {
    // Only fire desertion events when morale is low
    return null;
  }

  return adaptEventForModal(eventDef);
}

export function adaptEventForModal(eventDef) {
  return {
    id: eventDef.id,
    title: eventDef.name,
    text: eventDef.text || eventDef.desc || '',
    choices: (eventDef.options || []).map(opt => ({
      text: opt.text,
      outcome: opt.outcome,
      desc: opt.desc || '',
    })),
  };
}

export function resolveEventChoice(state, event, choiceIndex) {
  const choice = event.choices[choiceIndex];
  if (!choice || !choice.outcome) return;

  const outcome = choice.outcome;

  switch (outcome.type) {
    case 'reward':
      if (outcome.gold) {
        const gold = Array.isArray(outcome.gold)
          ? randInt(outcome.gold[0], outcome.gold[1])
          : outcome.gold;
        state.company.gold = (state.company.gold || 0) + gold;
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      if (outcome.items) {
        state.inventory = state.inventory || [];
        for (const itemEntry of outcome.items) {
          const count = Array.isArray(itemEntry.count)
            ? randInt(itemEntry.count[0], itemEntry.count[1])
            : (itemEntry.count || 1);
          addToInventory(state.inventory, itemEntry.item, count);
        }
      }
      break;

    case 'heal':
      if (outcome.amount) {
        for (const char of (state.roster || [])) {
          if (char.alive) {
            char.hp = Math.min(char.maxHp || char.hp, char.hp + outcome.amount);
          }
        }
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'damage':
      if (outcome.amount) {
        const dmg = Array.isArray(outcome.amount)
          ? randInt(outcome.amount[0], outcome.amount[1])
          : outcome.amount;
        const alive = (state.roster || []).filter(c => c.alive);
        for (const char of alive) {
          char.hp = Math.max(1, char.hp - Math.floor(dmg / Math.max(1, alive.length)));
        }
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'morale_loss':
    case 'morale':
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      if (outcome.food) {
        state.company.food = Math.max(0, (state.company.food || 0) + outcome.food);
      }
      break;

    case 'cost_item':
      if (outcome.item && outcome.count) {
        state.inventory = state.inventory || [];
        const existing = state.inventory.find(s => s.itemId === outcome.item);
        if (existing) {
          existing.count = Math.max(0, existing.count - outcome.count);
          if (existing.count === 0) {
            state.inventory = state.inventory.filter(s => s.itemId !== outcome.item);
          }
        }
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'pay':
      if (outcome.gold) {
        state.company.gold = Math.max(0, (state.company.gold || 0) + outcome.gold);
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'desertion':
      if (outcome.count) {
        const count = Array.isArray(outcome.count)
          ? randInt(outcome.count[0], outcome.count[1])
          : outcome.count;
        const alive = (state.roster || []).filter(c => c.alive);
        for (let i = 0; i < Math.min(count, alive.length - 1); i++) {
          const idx = Math.floor(Math.random() * alive.length);
          alive[idx].alive = false;
        }
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'recruit_free':
      if (outcome.background && (state.roster || []).length < 12) {
        try {
          const newChar = createCharacter(outcome.background);
          newChar.wage = 0; // Grateful recruit
          state.roster = state.roster || [];
          state.roster.push(newChar);
        } catch (e) {
          console.warn('Failed to create recruit from event:', e);
        }
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'random_item':
      // Give a random item from the specified category
      {
        state.inventory = state.inventory || [];
        const fallback = outcome.category === 'weapon' ? 'hatchet' : 'leather_armor';
        addToInventory(state.inventory, fallback, 1);
        if (outcome.morale) {
          state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
        }
      }
      break;

    case 'random_reward':
      if (outcome.options && outcome.options.length > 0) {
        const totalWeight = outcome.options.reduce((sum, o) => sum + (o.weight || 1), 0);
        let rand = Math.random() * totalWeight;
        for (const opt of outcome.options) {
          rand -= opt.weight || 1;
          if (rand <= 0) {
            if (opt.type === 'trap') {
              const dmg = opt.damage ? randInt(opt.damage[0], opt.damage[1]) : 10;
              const alive = (state.roster || []).filter(c => c.alive);
              if (alive.length > 0) {
                const victim = alive[Math.floor(Math.random() * alive.length)];
                victim.hp = Math.max(0, victim.hp - dmg);
              }
            } else {
              if (opt.gold) {
                const gold = Array.isArray(opt.gold) ? randInt(opt.gold[0], opt.gold[1]) : opt.gold;
                state.company.gold = (state.company.gold || 0) + gold;
              }
              if (opt.item) {
                state.inventory = state.inventory || [];
                addToInventory(state.inventory, opt.item, 1);
              }
            }
            break;
          }
        }
      }
      break;

    case 'delay':
      // Advance time
      if (outcome.food) {
        state.company.food = Math.max(0, (state.company.food || 0) + outcome.food);
      }
      if (outcome.morale) {
        state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + outcome.morale));
      }
      break;

    case 'nothing':
    default:
      // Do nothing
      break;
  }
}

export function getRandomEvent(terrain = 'plains') {
  const possibleEvents = getEventsByTerrain(terrain);
  if (!possibleEvents || possibleEvents.length === 0) return null;
  return pick(possibleEvents);
}
