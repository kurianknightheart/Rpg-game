// GameState singleton - central game state container
// All game systems read and write through this object.

const state = {
  // Game meta
  phase: 'menu', // 'menu' | 'creation' | 'world' | 'combat' | 'settlement'
  screen: 'menu', // alias used by UI: 'menu'|'creation'|'overworld'|'settlement'|'combat'
  paused: false,
  day: 1,
  hour: 6,       // 0-23
  minute: 0,
  tick: 0,       // frames elapsed
  timeSpeed: 1,  // game time speed multiplier

  // Player company
  company: {
    name: 'Iron Banner',
    background: null,
    gold: 500,
    food: 30,
    morale: 50,   // 0-100
    renown: 0,
    difficulty: 'normal',
  },

  // Roster of characters
  roster: [],       // Character objects
  maxRosterSize: 12,

  // Company inventory
  inventory: [],    // { itemId, qty, ...itemData }

  // World state
  world: {
    tiles: [],          // [row][col] tile objects
    width: 40,
    height: 40,
    settlements: [],
    enemyParties: [],
    partyPos: { col: 5, row: 5 },
    party: null,        // alias - set to same object as partyPos on init
    moveTarget: null,   // { col, row }
    movePath: [],       // array of { col, row }
    moveProgress: 0,    // 0-1 progress on current path step
    explored: new Set(), // 'col,row' strings
    fog: null,          // 2D array of booleans - null means use tile.explored
  },

  // Combat state
  combat: {
    active: false,
    tiles: [],        // flat array of combat tile objects
    width: 10,
    height: 8,
    units: [],        // all CombatUnit objects
    playerUnits: [],  // player CombatUnit objects
    enemyUnits: [],   // enemy CombatUnit objects
    turnOrder: [],    // sorted by initiative
    currentTurnIndex: 0,
    round: 1,
    selectedUnit: null,
    highlightedTiles: [],  // { col, row, type: 'move'|'attack' }
    log: [],               // combat log strings
    enemyPartyRef: null,
    enemyPartyData: null,
    result: null,     // null | 'player_win' | 'enemy_win' | 'retreat'
    selectedAction: 'move', // 'move'|'attack'
  },

  // Active and completed contracts
  contracts: {
    active: [],
    completed: [],
    failed: [],
  },

  // Faction reputations
  factions: {
    northern_lords: 0,
    merchants_guild: 0,
    free_city: 0,
    church: 0,
    bandits: -20,
    barbarians: -10,
  },

  // Active event (modal)
  activeEvent: null,

  // Settings
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.5,
  },

  // Set the current screen and sync phase
  setScreen(screen) {
    this.screen = screen;
    const phaseMap = {
      menu: 'menu',
      creation: 'creation',
      overworld: 'world',
      settlement: 'settlement',
      combat: 'combat',
    };
    this.phase = phaseMap[screen] || screen;
  },
};

// Keep world.party and world.partyPos in sync
const _worldPartyHandler = {
  get(target, prop) {
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value;
    if (prop === 'partyPos') target.party = value;
    if (prop === 'party') target.partyPos = value;
    return true;
  }
};

// Initialize party reference
state.world.partyPos = { col: 5, row: 5 };
state.world.party = state.world.partyPos;

export default state;
