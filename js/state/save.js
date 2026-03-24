// Save/Load system using localStorage
import state from './gamestate.js';

const SAVE_PREFIX = 'iron_banner_save_';
const MAX_SLOTS = 5;

export function saveGame(slot = 0) {
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      state: serializeState(state),
    };
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadGame(slot = 0) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return false;
    const saveData = JSON.parse(raw);
    if (!saveData || !saveData.state) return false;
    deserializeState(state, saveData.state);
    return true;
  } catch (e) {
    console.error('Load failed:', e);
    return false;
  }
}

export function getSaveList() {
  const saves = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + i);
      if (raw) {
        const saveData = JSON.parse(raw);
        saves.push({
          slot: i,
          date: saveData.date || 'Unknown',
          timestamp: saveData.timestamp || 0,
          companyName: saveData.state?.company?.name || 'Unknown',
          day: saveData.state?.day || 1,
        });
      }
    } catch (e) {
      // Skip corrupt saves
    }
  }
  return saves;
}

export function deleteSave(slot) {
  localStorage.removeItem(SAVE_PREFIX + slot);
}

export function autoSave() {
  saveGame(0);
}

function serializeState(s) {
  // Deep copy the relevant parts of state
  return {
    day: s.day,
    hour: s.hour,
    minute: s.minute,
    company: JSON.parse(JSON.stringify(s.company)),
    roster: JSON.parse(JSON.stringify(s.roster)),
    inventory: JSON.parse(JSON.stringify(s.inventory)),
    world: {
      tiles: s.world.tiles,
      width: s.world.width,
      height: s.world.height,
      settlements: JSON.parse(JSON.stringify(s.world.settlements)),
      enemyParties: JSON.parse(JSON.stringify(s.world.enemyParties)),
      party: { ...s.world.party },
      explored: [...(s.world.explored || new Set())],
      fog: s.world.fog ? s.world.fog.map(row => [...row]) : null,
    },
    contracts: JSON.parse(JSON.stringify(s.contracts)),
    factions: JSON.parse(JSON.stringify(s.factions)),
    timeSpeed: s.timeSpeed || 1,
  };
}

function deserializeState(s, data) {
  s.day = data.day || 1;
  s.hour = data.hour || 6;
  s.minute = data.minute || 0;

  if (data.company) Object.assign(s.company, data.company);

  s.roster = data.roster || [];
  s.inventory = data.inventory || [];

  if (data.world) {
    s.world.tiles = data.world.tiles || [];
    s.world.width = data.world.width || 40;
    s.world.height = data.world.height || 40;
    s.world.settlements = data.world.settlements || [];
    s.world.enemyParties = data.world.enemyParties || [];
    s.world.party = data.world.party || { col: 5, row: 5 };
    s.world.explored = new Set(data.world.explored || []);
    s.world.fog = data.world.fog || null;
    s.world.movePath = [];
    s.world.moveProgress = 0;
  }

  if (data.contracts) Object.assign(s.contracts, data.contracts);
  if (data.factions) Object.assign(s.factions, data.factions);
  s.timeSpeed = data.timeSpeed || 1;
}
