// menus.js – Menu and panel interaction system
// Handles: main menu, company creation, load game modal, and close-button delegation.
// Camp, pause, and overworld-HUD buttons are wired exclusively in main.js to avoid
// duplicate event listeners.

import state from '../state/gamestate.js';
import { BACKGROUNDS, BACKGROUND_LIST } from '../../data/recruits.js';
import { createCharacter, calculateDerivedStats } from '../systems/character.js';
import { equipStartingGear } from '../systems/inventory.js';
import { formatGold } from '../utils/helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

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

function showPanel(id) {
  const panel = el(id);
  if (panel) panel.style.display = 'flex';
}

function hidePanel(id) {
  const panel = el(id);
  if (panel) panel.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: initMenus
// systems = { saveGame, loadGame, getSaveList, generateWorld, enterOverworld }
// ─────────────────────────────────────────────────────────────────────────────

export function initMenus(gameState, systems) {
  const { saveGame, loadGame, getSaveList, generateWorld, enterOverworld } = systems || {};

  // ── Main Menu ─────────────────────────────────────────────────────────────

  const btnNewGame = el('btnNewGame');
  if (btnNewGame) {
    btnNewGame.addEventListener('click', () => {
      hidePanel('mainMenu');
      showPanel('companyCreation');
      populateBackgrounds(BACKGROUNDS);
    });
  }

  const btnContinue = el('btnContinue');
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      if (!loadGame) return;
      const ok = loadGame(0);
      if (ok) {
        hidePanel('mainMenu');
        // Use the callback passed from main.js so canvas + camera are also set up
        if (enterOverworld) {
          enterOverworld();
        } else {
          // Fallback (should not happen in practice)
          const wc = document.getElementById('worldCanvas');
          if (wc) wc.style.display = 'block';
          const hud = el('overworldHUD');
          if (hud) hud.style.display = 'flex';
          gameState.setScreen('overworld');
          gameState.paused = false;
        }
      } else {
        notify('No save found!');
      }
    });
  }

  const btnLoadGame = el('btnLoadGame');
  if (btnLoadGame) {
    btnLoadGame.addEventListener('click', () => {
      if (getSaveList) populateSaveSlots(getSaveList(), loadGame, enterOverworld);
      showPanel('loadGameModal');
    });
  }

  // ── Company Creation ──────────────────────────────────────────────────────

  const btnStartGame = el('btnStartGame');
  if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
      _startNewGame(gameState, systems);
    });
  }

  const btnBackToMenu = el('btnBackToMenu');
  if (btnBackToMenu) {
    btnBackToMenu.addEventListener('click', () => {
      hidePanel('companyCreation');
      showPanel('mainMenu');
    });
  }

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.company.difficulty = btn.dataset.diff || 'normal';
    });
  });

  // ── Global close-button delegation (data-close attribute) ─────────────────
  // Handles ✕ buttons on roster, inventory, character sheet, camp, etc.

  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-close]');
    if (!target) return;
    const panelId = target.dataset.close;
    hidePanel(panelId);
    // Notify main.js when the settlement panel is explicitly closed via data-close
    if (panelId === 'settlementPanel') {
      document.dispatchEvent(new CustomEvent('settlement:close'));
    }
  });

  // ── Pause menu – load game slot ───────────────────────────────────────────
  // (Resume, Save, and Quit are wired in main.js)

  const btnLoadSlot = el('btnLoadSlot');
  if (btnLoadSlot) {
    btnLoadSlot.addEventListener('click', () => {
      if (getSaveList) populateSaveSlots(getSaveList(), loadGame, enterOverworld);
      showPanel('loadGameModal');
    });
  }

  // Close load modal cancel button
  const btnCloseLoad = el('btnCloseLoad');
  if (btnCloseLoad) {
    btnCloseLoad.addEventListener('click', () => hidePanel('loadGameModal'));
  }

  // ── HUD overworld buttons ─────────────────────────────────────────────────
  // btnRoster and btnInventory toggles are wired in main.js.
  // btnWorldMap shows a hint.

  const btnWorldMap = el('btnWorldMap');
  if (btnWorldMap) {
    btnWorldMap.addEventListener('click', () => {
      notify('Map: Click any tile to move your company there.');
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private: start new game flow
// ─────────────────────────────────────────────────────────────────────────────

function _startNewGame(gameState, systems) {
  const { generateWorld } = systems || {};

  // Read company name
  const nameInput  = el('companyNameInput');
  const companyName = (nameInput && nameInput.value.trim()) || 'Iron Banner';
  gameState.company.name = companyName;

  // Read selected background
  const selectedBg = document.querySelector('.background-item.selected');
  const bgId = (selectedBg && selectedBg.dataset.bgId) || 'militia';
  gameState.company.background = bgId;

  // Read difficulty
  const activeDiff = document.querySelector('.diff-btn.active');
  const diff = (activeDiff && activeDiff.dataset.diff) || 'normal';
  gameState.company.difficulty = diff;

  // Starting resources
  const resources = {
    easy:   { gold: 800,  food: 40, morale: 60 },
    normal: { gold: 500,  food: 30, morale: 50 },
    hard:   { gold: 300,  food: 20, morale: 40 },
  };
  const res = resources[diff] || resources.normal;
  gameState.company.gold   = res.gold;
  gameState.company.food   = res.food;
  gameState.company.morale = res.morale;

  // Reset roster and inventory
  gameState.roster    = [];
  gameState.inventory = [];

  // Create leader
  try {
    const leader = createCharacter(bgId);
    leader.name = `${companyName} Leader`;
    equipStartingGear(leader);
    leader.isLeader = true;
    gameState.roster.push(leader);
  } catch (err) {
    console.error('Failed to create leader:', err);
  }

  // Add 2 random recruits
  const bgKeys = Object.keys(BACKGROUNDS);
  for (let i = 0; i < 2; i++) {
    const randomBg = bgKeys[Math.floor(Math.random() * bgKeys.length)];
    try {
      const recruit = createCharacter(randomBg);
      equipStartingGear(recruit);
      gameState.roster.push(recruit);
    } catch (err) {
      console.error('Failed to create recruit:', err);
    }
  }

  hidePanel('companyCreation');

  if (generateWorld) generateWorld();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public exports (used by other modules / dynamic imports)
// ─────────────────────────────────────────────────────────────────────────────

export function showMainMenu(gameState) {
  [
    'overworldHUD', 'combatHUD', 'rosterPanel', 'characterSheet',
    'inventoryPanel', 'settlementPanel', 'campPanel', 'pauseMenu',
    'loadGameModal', 'eventModal', 'lootModal', 'combatResult', 'companyCreation',
  ].forEach(id => hidePanel(id));

  const mainMenu = el('mainMenu');
  if (mainMenu) mainMenu.style.display = 'flex';

  if (gameState) {
    gameState.setScreen('menu');
    gameState.paused = false;
  }
}

export function showOverworldHUD(gameState) {
  hidePanel('mainMenu');
  hidePanel('companyCreation');
  hidePanel('combatHUD');
  const hud = el('overworldHUD');
  if (hud) hud.style.display = 'flex';
}

export function populateBackgrounds(backgrounds) {
  const list = el('backgroundList');
  if (!list) return;
  list.innerHTML = '';

  const bgArray = backgrounds
    ? (Array.isArray(backgrounds) ? backgrounds : Object.values(backgrounds))
    : [];

  bgArray.forEach(bg => {
    const item = document.createElement('div');
    item.className    = 'background-item';
    item.dataset.bgId = bg.id;
    item.innerHTML = `
      <div class="bg-name">${bg.name}</div>
      <div class="bg-wage">Wage: ${formatGold ? formatGold(bg.wage) : bg.wage + 'g'}/day</div>
    `;

    item.addEventListener('click', () => {
      document.querySelectorAll('.background-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      const descEl = el('backgroundDesc');
      if (descEl) {
        descEl.innerHTML = `
          <strong>${bg.name}</strong><br>
          ${bg.desc || ''}<br>
          <small>Starting skills: ${Object.keys(bg.startSkills || {}).join(', ')}</small>
        `;
      }
    });

    list.appendChild(item);
  });

  // Auto-select first
  const first = list.querySelector('.background-item');
  if (first) first.click();
}

export function populateSaveSlots(saves, loadGameFn, enterOverworldFn) {
  const list = el('saveSlotList');
  if (!list) return;
  list.innerHTML = '';

  if (!saves || saves.length === 0) {
    list.innerHTML = '<p class="no-saves text-dim">No saves found.</p>';
    return;
  }

  saves.forEach(save => {
    const item = document.createElement('div');
    item.className = 'save-slot';
    item.innerHTML = `
      <div class="save-info">
        <span class="save-company">${save.companyName || 'Iron Banner'}</span>
        <span class="save-day">Day ${save.day || 1}</span>
      </div>
      <div class="save-date">${save.date || 'Unknown'}</div>
      <button class="menu-btn small">Load</button>
    `;

    const loadBtn = item.querySelector('button');
    loadBtn.addEventListener('click', () => {
      const fn = loadGameFn || ((...a) => import('../state/save.js').then(m => m.loadGame(...a)));
      Promise.resolve(typeof fn === 'function' ? fn(save.slot) : false).then(ok => {
        if (ok) {
          hidePanel('loadGameModal');
          if (enterOverworldFn) {
            enterOverworldFn();
          } else {
            state.setScreen('overworld');
          }
          notify('Game loaded!');
        } else {
          notify('Failed to load save.');
        }
      });
    });

    list.appendChild(item);
  });
}
