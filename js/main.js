// main.js – Iron Banner: Medieval Mercenary RPG
// Entry point: bootstraps all engine systems, initialises the game loop, wires up UI.

import state from './state/gamestate.js';
import { saveGame, loadGame, getSaveList, autoSave } from './state/save.js';

import { Camera }        from './engine/camera.js';
import { WorldRenderer } from './engine/renderer.js';
import { InputManager }  from './engine/input.js';
import { playSound, playMusic, SOUNDS } from './engine/audio.js';

import { generateWorld, moveParty, updateWorldMovement, revealFog } from './systems/world.js';
import { endCombat, generateLoot } from './systems/combat.js';
import { checkTravelEvent }  from './systems/events.js';
import { processDailyUpkeep } from './systems/economy.js';
import { updateContracts }   from './systems/contracts.js';

import { initMenus }      from './ui/menus.js';
import { CombatUI }       from './ui/combat-ui.js';
import { SettlementUI }   from './ui/settlement.js';
import { MobileControls } from './ui/mobile-controls.js';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas / context setup
// ─────────────────────────────────────────────────────────────────────────────

const worldCanvas   = document.getElementById('worldCanvas');
const combatCanvas  = document.getElementById('combatCanvas');
const minimapCanvas = document.getElementById('minimapCanvas');

function resizeCanvases() {
  worldCanvas.width   = window.innerWidth;
  worldCanvas.height  = window.innerHeight;
  combatCanvas.width  = window.innerWidth;
  combatCanvas.height = window.innerHeight;
}

resizeCanvases();
window.addEventListener('resize', () => { resizeCanvases(); _minimapDirty = true; });

const worldCtx   = worldCanvas.getContext('2d');
const combatCtx  = combatCanvas.getContext('2d');  // eslint-disable-line no-unused-vars
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

// ─────────────────────────────────────────────────────────────────────────────
// Engine objects
// ─────────────────────────────────────────────────────────────────────────────

const worldCamera  = new Camera(worldCanvas);
const combatCamera = new Camera(combatCanvas);  // eslint-disable-line no-unused-vars
const renderer     = new WorldRenderer();

// ─────────────────────────────────────────────────────────────────────────────
// UI instances
// ─────────────────────────────────────────────────────────────────────────────

const settlementUI = new SettlementUI(document.getElementById('settlementPanel'));
const combatUI     = new CombatUI(combatCanvas, document.getElementById('combatHUD'));

// Mobile D-pad – appended to its container div
const mobileControls = new MobileControls(
  document.getElementById('mobileDpadContainer'),
  state,
  moveParty
);

// Zoom events from D-pad
document.getElementById('mobileDpadContainer').addEventListener('dpad:zoom', (e) => {
  const factor = e.detail.dir > 0 ? 1.2 : 1 / 1.2;
  worldCamera.zoom(factor);
});

// ─────────────────────────────────────────────────────────────────────────────
// HUD updater
// ─────────────────────────────────────────────────────────────────────────────

const hud = {
  update() {
    const s = state;
    const h = Math.floor(s.hour || 6);
    const m = Math.floor(((s.hour || 6) - h) * 60);
    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

    const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
    set('hudDay',  `Day ${s.day || 1}`);
    set('hudTime', timeStr);

    const gold = s.company.gold || 0;
    set('hudGold', gold >= 1000 ? `${(gold/1000).toFixed(1)}k` : gold);

    const food = s.company.food || 0;
    set('hudFood', food);
    // Visual food-low warning on the food resource widget
    const foodEl = el('hudFood');
    if (foodEl) {
      const resItem = foodEl.closest('.res-item');
      if (resItem) resItem.classList.toggle('res-warning', food < 5);
    }

    const morale = s.company.morale || 50;
    set('hudMorale', morale);

    const aliveCount = (s.roster || []).filter(c => c.alive).length;
    set('hudPartySize', `${aliveCount}/${s.maxRosterSize || 12}`);

    // Speed indicator
    const speedBtn = el('btnSpeed');
    if (speedBtn) speedBtn.textContent = `×${_moveSpeedMult}`;

    // Active contract widget
    _updateContractWidget(s);

    // Mini roster HP bars
    _updateMiniRoster(s);
  }
};

function _updateMiniRoster(s) {
  const container = el('miniRoster');
  if (!container) return;
  const alive = (s.roster || []).filter(c => c.alive);
  container.innerHTML = alive.slice(0, 6).map(c => {
    const pct   = Math.round(Math.max(0, Math.min(100, (c.hp / (c.maxHP || 1)) * 100)));
    const color = pct > 60 ? '#44cc66' : pct > 30 ? '#ddaa22' : '#cc3322';
    return `<div class="mini-member" title="${c.name}: ${c.hp}/${c.maxHP} HP">
      <span class="mini-name">${c.name.split(' ')[0].substring(0,6)}</span>
      <div class="mini-bar-bg"><div class="mini-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

function _updateContractWidget(s) {
  const widget = el('activeContractWidget');
  if (!widget) return;
  const active = (s.contracts && s.contracts.active)
    ? s.contracts.active.filter(c => !c.completed && !c.failed)
    : [];
  if (active.length === 0) {
    widget.style.display = 'none';
    return;
  }
  const c = active[0];
  const daysLeft = (c.deadline != null) ? Math.max(0, c.deadline - (s.day || 1)) : null;
  const urgent   = daysLeft !== null && daysLeft < 3;
  widget.style.display = 'flex';
  widget.innerHTML = `
    <span class="contract-icon">📜</span>
    <span class="contract-name">${c.name || 'Contract'}</span>
    ${daysLeft !== null ? `<span class="contract-days${urgent ? ' urgent' : ''}">${daysLeft}d</span>` : ''}
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Speed control  (Space bar or ×N button cycles 1 → 2 → 4 → 1)
// ─────────────────────────────────────────────────────────────────────────────

let _moveSpeedMult = 1;
const SPEED_CYCLE  = [1, 2, 4];

function cycleSpeed() {
  const idx = SPEED_CYCLE.indexOf(_moveSpeedMult);
  _moveSpeedMult = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
  const btn = el('btnSpeed');
  if (btn) btn.textContent = `×${_moveSpeedMult}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function showPanel(id) { const p = el(id); if (p) p.style.display = 'flex'; }
function hidePanel(id) { const p = el(id); if (p) p.style.display = 'none'; }

function notify(msg, duration = 3000) {
  const n = el('notification');
  if (!n) return;
  n.textContent = msg;
  n.style.display = 'block';
  n.classList.add('show');
  clearTimeout(n._timer);
  n._timer = setTimeout(() => {
    n.style.display = 'none';
    n.classList.remove('show');
  }, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera helpers
// ─────────────────────────────────────────────────────────────────────────────

const TILE_W = 64;
const TILE_H = 32;

// Immediately snap camera so the party tile is centred on screen
function _snapCameraToParty() {
  if (!state.world.partyPos) return;
  const { col, row } = state.world.partyPos;
  worldCamera.offsetX = (col - row) * (TILE_W / 2);
  worldCamera.offsetY = (col + row) * (TILE_H / 2) + TILE_H * 2 - worldCanvas.height / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game-state transitions
// ─────────────────────────────────────────────────────────────────────────────

function enterOverworld() {
  worldCanvas.style.display  = 'block';
  combatCanvas.style.display = 'none';
  hidePanel('settlementPanel');
  hidePanel('combatHUD');
  showPanel('overworldHUD');
  state.setScreen('overworld');
  state.paused = false;
  playMusic(SOUNDS.music_world);
  mobileControls.show(true);   // Force-show D-pad in overworld on all device types
  _snapCameraToParty();
  hud.update();
  _minimapDirty = true;
}

function enterSettlement(settlement) {
  if (!settlement) return;
  state.setScreen('settlement');
  state.paused = true;
  mobileControls.hide();
  hidePanel('overworldHUD');
  playSound(SOUNDS.world_enter_settlement);
  playMusic(SOUNDS.music_settlement);
  settlementUI.open(settlement);
  showPanel('settlementPanel');
}

function exitSettlement() {
  settlementUI.close();
  hidePanel('settlementPanel');
  state.paused = false;
  enterOverworld();
}

function enterCombat(enemyParty) {
  state.setScreen('combat');
  state.paused = true;
  mobileControls.hide();
  hidePanel('overworldHUD');
  worldCanvas.style.display  = 'none';
  combatCanvas.style.display = 'block';
  playMusic(SOUNDS.music_combat);

  const tile = state.world.tiles[state.world.partyPos.row]
    && state.world.tiles[state.world.partyPos.row][state.world.partyPos.col];
  const terrainType = tile ? tile.type : 0;

  state.combat.enemyPartyData = enemyParty;
  showPanel('combatHUD');

  const playerParty = state.roster.filter(c => c.alive && c.hp > 0);
  combatUI.start(playerParty, enemyParty, terrainType);

  combatCanvas.addEventListener('combatEnd', onCombatEnd, { once: true });
}

function onCombatEnd(evt) {
  const result = evt.detail || state.combat.result;
  state.paused = false;
  hidePanel('combatHUD');

  if (result === 'player_win') {
    playMusic(SOUNDS.music_victory);
    const loot = generateLoot(state, state.combat.enemyPartyData);
    if (state.combat.enemyPartyRef) state.combat.enemyPartyRef.alive = false;
    endCombat(state);
    _showLootModal(loot);

  } else if (result === 'retreat') {
    endCombat(state);
    notify('Your company retreats from battle.');
    enterOverworld();

  } else {
    // enemy_win
    playMusic(SOUNDS.music_defeat);
    endCombat(state);
    notify('Your company was defeated…');
    const alive = state.roster.filter(c => c.alive && c.hp > 0);
    if (alive.length === 0) {
      setTimeout(() => {
        hidePanel('overworldHUD');
        showPanel('mainMenu');
        state.setScreen('menu');
        playMusic(SOUNDS.music_menu);
        notify('All men are dead. Your legend ends here.');
      }, 2000);
      return;
    }
    enterOverworld();
  }
}

function _showLootModal(loot) {
  const modal   = el('lootModal');
  const content = el('lootContent');
  if (!modal || !content) { enterOverworld(); return; }

  content.innerHTML = '';
  if (loot && loot.length > 0) {
    loot.forEach(item => {
      const div = document.createElement('div');
      div.className = 'loot-item';
      div.textContent = item.qty > 1 ? `${item.name} ×${item.qty}` : item.name;
      content.appendChild(div);
    });
  } else {
    content.innerHTML = '<p class="text-dim">Nothing of value found.</p>';
  }
  showPanel('lootModal');

  // Clone the button to remove any stale listener attached by menus.js or a prior combat
  const oldBtn = el('btnTakeLoot');
  if (oldBtn) {
    const btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);
    btn.addEventListener('click', () => {
      if (loot) {
        import('./systems/inventory.js').then(({ addItem }) => {
          loot.forEach(item => addItem(state.inventory, { id: item.id }, item.qty || 1));
        }).catch(() => {});
      }
      hidePanel('lootModal');
      enterOverworld();
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Move-result handler (called after each tile step)
// ─────────────────────────────────────────────────────────────────────────────

function handleMoveResult(result) {
  if (!result) return;
  if (result.type === 'settlement') { enterSettlement(result.settlement); return; }
  if (result.type === 'encounter')  { enterCombat(result.party);          return; }
}

// ─────────────────────────────────────────────────────────────────────────────
// World-canvas tile click → move party
// ─────────────────────────────────────────────────────────────────────────────

function onWorldTileClick(col, row) {
  if (state.screen !== 'overworld' || state.paused) return;
  moveParty(state, col, row);
}

// ─────────────────────────────────────────────────────────────────────────────
// Input manager (mouse / touch on world canvas)
// ─────────────────────────────────────────────────────────────────────────────

const inputManager = new InputManager(  // eslint-disable-line no-unused-vars
  worldCanvas,
  worldCamera,
  (col, row) => onWorldTileClick(col, row),
  (col, row) => onWorldTileClick(col, row)
);

// ─────────────────────────────────────────────────────────────────────────────
// Game loop
// ─────────────────────────────────────────────────────────────────────────────

let _lastTime  = 0;
const MOVE_STEP_INTERVAL = 0.3;  // seconds between party steps at ×1 speed
let _moveAccum = 0;
let _lastDay   = 1;
let _minimapDirty = true;
let _lastFoodWarnDay = -1;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  const now     = timestamp / 1000;
  const elapsed = Math.min(now - _lastTime, 0.1);   // cap at 100 ms to handle tab-blur spikes
  _lastTime = now;

  if (state.screen === 'overworld' && !state.paused) {
    _moveAccum += elapsed;

    // Speed multiplier shrinks the effective interval (2× speed = half the wait)
    const effectiveInterval = MOVE_STEP_INTERVAL / _moveSpeedMult;

    if (_moveAccum >= effectiveInterval) {
      _moveAccum -= effectiveInterval;

      const result = updateWorldMovement(state, effectiveInterval);
      handleMoveResult(result);
      hud.update();
      _minimapDirty = true;

      // ── Daily upkeep ──────────────────────────────────────────────────────
      if (state.day !== _lastDay) {
        _lastDay = state.day;
        processDailyUpkeep(state);
        updateContracts(state);
        autoSave();
        hud.update();

        // Morale warning
        if (state.company.morale < 20) {
          notify('Morale is dangerously low! Men may desert.');
        }

        // Food shortage warning (once per day per event)
        const food = state.company.food || 0;
        if (_lastFoodWarnDay !== state.day) {
          if (food === 0) {
            _lastFoodWarnDay = state.day;
            notify('⚠ No food! Men are starving. Morale suffers.');
          } else if (food < 5) {
            _lastFoodWarnDay = state.day;
            notify(`⚠ Food is low (${food} rations). Forage or visit a settlement.`);
          }
        }

        // Random travel event
        const tilePos = state.world.partyPos;
        const tile    = tilePos && state.world.tiles[tilePos.row]
          && state.world.tiles[tilePos.row][tilePos.col];
        const terrain = tile ? _terrainName(tile.type) : 'plains';
        const event   = checkTravelEvent(state, terrain);
        if (event) _showEventModal(event);
      }
    }

    // ── Smooth camera follow while party is moving ─────────────────────────
    if (state.world.movePath && state.world.movePath.length > 0 && state.world.partyPos) {
      const { col, row } = state.world.partyPos;
      const targetX = (col - row) * (TILE_W / 2);
      const targetY = (col + row) * (TILE_H / 2) + TILE_H * 2 - worldCanvas.height / 2;
      worldCamera.offsetX += (targetX - worldCamera.offsetX) * 0.12;
      worldCamera.offsetY += (targetY - worldCamera.offsetY) * 0.12;
    }

    // ── Render world ──────────────────────────────────────────────────────
    worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
    renderer.drawWorld(
      worldCtx,
      state.world.tiles,
      state.world.width,
      state.world.height,
      state.world.settlements,
      state.world.enemyParties,
      state.world.partyPos,
      worldCamera,
      state
    );

    // ── Minimap (re-render only when world state changed) ─────────────────
    if (minimapCtx && _minimapDirty) {
      renderer.drawMinimap(minimapCtx, state);
      _minimapDirty = false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Terrain name lookup
// ─────────────────────────────────────────────────────────────────────────────

function _terrainName(type) {
  const names = ['plains','forest','hills','mountains','swamp','snow','road','water','settlement'];
  return names[type] || 'plains';
}

// ─────────────────────────────────────────────────────────────────────────────
// Event modal
// ─────────────────────────────────────────────────────────────────────────────

function _showEventModal(eventDef) {
  if (!eventDef) return;
  state.paused = true;
  state.activeEvent = eventDef;

  const modal   = el('eventModal');
  const title   = el('eventTitle');
  const text    = el('eventText');
  const choices = el('eventChoices');
  if (!modal) return;

  playSound(SOUNDS.world_event);
  if (title)   title.textContent = eventDef.title || 'Event';
  if (text)    text.textContent  = eventDef.text  || '';
  if (choices) {
    choices.innerHTML = '';
    const opts = eventDef.choices || [{ label: 'Continue', effect: null }];
    opts.forEach(choice => {
      const btn = document.createElement('button');
      btn.className   = 'menu-btn';
      btn.textContent = choice.label || 'OK';
      btn.addEventListener('click', () => {
        _applyEventChoice(eventDef, choice);
        hidePanel('eventModal');
        state.paused       = false;
        state.activeEvent  = null;
      });
      choices.appendChild(btn);
    });
  }
  showPanel('eventModal');
}

function _applyEventChoice(eventDef, choice) {  // eslint-disable-line no-unused-vars
  if (!choice || !choice.effect) return;
  const e = choice.effect;
  if (e.gold)   state.company.gold   = Math.max(0, (state.company.gold   || 0) + e.gold);
  if (e.food)   state.company.food   = Math.max(0, (state.company.food   || 0) + e.food);
  if (e.morale) state.company.morale = Math.max(0, Math.min(100, (state.company.morale || 50) + e.morale));
  if (e.renown) state.company.renown = Math.max(0, (state.company.renown || 0) + e.renown);
  if (e.item) {
    import('./systems/inventory.js').then(({ addItem }) => {
      addItem(state.inventory, { id: e.item }, 1);
    }).catch(() => {});
  }
  hud.update();
}

// ─────────────────────────────────────────────────────────────────────────────
// World generation → enter overworld
// ─────────────────────────────────────────────────────────────────────────────

function _worldgenAndEnter() {
  const { tiles, settlements, enemyParties, partyStart } =
    generateWorld(state.world.width, state.world.height);

  state.world.tiles        = tiles;
  state.world.settlements  = settlements;
  state.world.enemyParties = enemyParties;
  state.world.partyPos     = partyStart || { col: 5, row: 5 };
  state.world.movePath     = [];
  state.world.moveTarget   = null;

  revealFog(state, state.world.partyPos.col, state.world.partyPos.row, 4);

  _lastDay      = state.day = 1;
  state.hour    = 6;
  state.minute  = 0;
  state.tick    = 0;
  _minimapDirty = true;

  enterOverworld();
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu system – pass enterOverworld so menus.js can call it after Continue/Load
// ─────────────────────────────────────────────────────────────────────────────

initMenus(state, {
  saveGame,
  loadGame,
  getSaveList,
  generateWorld:  _worldgenAndEnter,
  enterOverworld,
});

// ─────────────────────────────────────────────────────────────────────────────
// HUD button wiring  (menus.js handles creation-screen + close buttons;
//  overworld-HUD and pause-menu buttons are wired here exclusively)
// ─────────────────────────────────────────────────────────────────────────────

// Roster panel
const btnRoster = el('btnRoster');
if (btnRoster) {
  btnRoster.addEventListener('click', () => {
    import('./ui/roster.js').then(({ renderRoster }) => {
      renderRoster(state);
      const panel = el('rosterPanel');
      if (panel) panel.style.display =
        (panel.style.display === 'none' || !panel.style.display) ? 'flex' : 'none';
    }).catch(() => {});
  });
}

// Inventory panel
const btnInventory = el('btnInventory');
if (btnInventory) {
  btnInventory.addEventListener('click', () => {
    import('./ui/inventory-ui.js').then(({ renderInventory }) => {
      renderInventory(state);
      const panel = el('inventoryPanel');
      if (panel) panel.style.display =
        (panel.style.display === 'none' || !panel.style.display) ? 'flex' : 'none';
    }).catch(() => {});
  });
}

// Camp panel
const btnCamp = el('btnCamp');
if (btnCamp) {
  btnCamp.addEventListener('click', () => {
    const cost   = state.roster.filter(c => c.alive).length;
    const costEl = el('campFoodCost');
    if (costEl) costEl.textContent = cost;
    const camp = el('campPanel');
    if (camp) camp.style.display =
      (camp.style.display === 'none' || !camp.style.display) ? 'flex' : 'none';
  });
}

// D-pad toggle
const btnDpad = el('btnDpad');
if (btnDpad) {
  btnDpad.addEventListener('click', () => {
    mobileControls.toggle();
    playSound(SOUNDS.ui_click);
  });
}

// Pause / menu
const btnPause = el('btnPause');
if (btnPause) {
  btnPause.addEventListener('click', () => {
    state.paused = true;
    showPanel('pauseMenu');
    playSound(SOUNDS.ui_click);
  });
}

// Speed toggle button (×1 / ×2 / ×4)
const btnSpeed = el('btnSpeed');
if (btnSpeed) {
  btnSpeed.addEventListener('click', () => {
    cycleSpeed();
    playSound(SOUNDS.ui_click);
  });
}

// ─── Camp actions ─────────────────────────────────────────────────────────────

const btnRest = el('btnRest');
if (btnRest) {
  btnRest.addEventListener('click', () => {
    const cost = state.roster.filter(c => c.alive).length;
    if (state.company.food < cost) { notify('Not enough food to rest!'); return; }
    state.company.food = Math.max(0, state.company.food - cost);
    state.roster.forEach(c => {
      if (c.alive && c.hp < c.maxHP) c.hp = Math.min(c.maxHP, c.hp + Math.ceil(c.maxHP * 0.3));
    });
    state.hour += 8;
    while (state.hour >= 24) { state.hour -= 24; state.day++; }
    state.company.morale = Math.min(100, state.company.morale + 5);
    hidePanel('campPanel');
    hud.update();
    notify('Your company rests. Wounds are tended.');
    playSound(SOUNDS.ui_confirm);
  });
}

const btnTrain = el('btnTrain');
if (btnTrain) {
  btnTrain.addEventListener('click', () => {
    state.day++;
    state.company.morale = Math.min(100, state.company.morale + 5);
    hidePanel('campPanel');
    hud.update();
    notify('Training complete. Morale improved.');
    playSound(SOUNDS.ui_confirm);
  });
}

const btnForage = el('btnForage');
if (btnForage) {
  btnForage.addEventListener('click', () => {
    const tilePos  = state.world.partyPos;
    const tile     = tilePos && state.world.tiles[tilePos.row] && state.world.tiles[tilePos.row][tilePos.col];
    const tileType = tile ? tile.type : 0;
    const good     = [0, 1, 2, 4].includes(tileType);
    const found    = good ? 5 + Math.floor(Math.random() * 10) : 1 + Math.floor(Math.random() * 4);
    state.company.food = (state.company.food || 0) + found;
    state.hour += 4;
    while (state.hour >= 24) { state.hour -= 24; state.day++; }
    hidePanel('campPanel');
    hud.update();
    notify(`Foraging party returns with ${found} food.`);
    playSound(SOUNDS.ui_confirm);
  });
}

// ─── Pause menu ───────────────────────────────────────────────────────────────

const btnResume = el('btnResume');
if (btnResume) {
  btnResume.addEventListener('click', () => {
    hidePanel('pauseMenu');
    state.paused = false;
  });
}

const btnSaveGame = el('btnSaveGame');
if (btnSaveGame) {
  btnSaveGame.addEventListener('click', () => {
    const ok = saveGame(0);
    notify(ok ? 'Game saved.' : 'Save failed!');
    playSound(SOUNDS.ui_confirm);
  });
}

const btnQuitMain = el('btnQuitMain');
if (btnQuitMain) {
  btnQuitMain.addEventListener('click', () => {
    autoSave();
    hidePanel('pauseMenu');
    hidePanel('overworldHUD');
    worldCanvas.style.display  = 'none';
    combatCanvas.style.display = 'none';
    state.setScreen('menu');
    showPanel('mainMenu');
    playMusic(SOUNDS.music_menu);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Settlement close event (fired by settlement.js Leave button)
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('settlement:close', () => exitSettlement());

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcuts
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (state.screen !== 'overworld') return;

  switch (e.key) {
    case 'Escape':
      if (state.paused) {
        hidePanel('pauseMenu');
        state.paused = false;
      } else {
        state.paused = true;
        showPanel('pauseMenu');
      }
      break;

    case 'r': case 'R':
      import('./ui/roster.js').then(({ renderRoster }) => {
        renderRoster(state);
        const panel = el('rosterPanel');
        if (panel) panel.style.display =
          (panel.style.display === 'none' || !panel.style.display) ? 'flex' : 'none';
      }).catch(() => {});
      break;

    case 'i': case 'I':
      import('./ui/inventory-ui.js').then(({ renderInventory }) => {
        renderInventory(state);
        const panel = el('inventoryPanel');
        if (panel) panel.style.display =
          (panel.style.display === 'none' || !panel.style.display) ? 'flex' : 'none';
      }).catch(() => {});
      break;

    case 'c': case 'C': {
      const camp = el('campPanel');
      if (camp) {
        const cost   = state.roster.filter(c => c.alive).length;
        const costEl = el('campFoodCost');
        if (costEl) costEl.textContent = cost;
        camp.style.display =
          (camp.style.display === 'none' || !camp.style.display) ? 'flex' : 'none';
      }
      break;
    }

    case ' ':
      e.preventDefault();
      cycleSpeed();
      break;

    // Isometric movement (WASD + arrow keys)
    case 'ArrowUp':    case 'w': case 'W':
      e.preventDefault();
      mobileControls._onDir(-1, -1); break;
    case 'ArrowDown':  case 's': case 'S':
      e.preventDefault();
      mobileControls._onDir(1,  1);  break;
    case 'ArrowLeft':  case 'a': case 'A':
      e.preventDefault();
      mobileControls._onDir(-1, 1);  break;
    case 'ArrowRight': case 'd': case 'D':
      e.preventDefault();
      mobileControls._onDir(1, -1);  break;

    // Zoom
    case '+': case '=':
      worldCamera.zoom(1.15); break;
    case '-':
      worldCamera.zoom(1 / 1.15); break;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

(function boot() {
  ['overworldHUD', 'companyCreation', 'settlementPanel', 'combatHUD',
   'rosterPanel', 'characterSheet', 'inventoryPanel', 'campPanel',
   'pauseMenu', 'loadGameModal', 'eventModal', 'lootModal', 'combatResult',
  ].forEach(id => hidePanel(id));

  worldCanvas.style.display  = 'none';
  combatCanvas.style.display = 'none';

  showPanel('mainMenu');
  state.setScreen('menu');
  playMusic(SOUNDS.music_menu);

  requestAnimationFrame(gameLoop);

  console.log('%cIron Banner loaded.', 'color:#d4af37;font-weight:bold;font-size:14px');
})();
