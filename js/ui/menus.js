// Menu and panel interaction system
import state from '../state/gamestate.js';
import { BACKGROUNDS, BACKGROUND_LIST } from '../../data/recruits.js';
import { createCharacter, calculateDerivedStats } from '../systems/character.js';
import { equipStartingGear } from '../systems/inventory.js';
import { formatGold } from '../utils/helpers.js';

// ─────────────────────────────────────────────────────────────
// Helper: get element by id (safe)
// ─────────────────────────────────────────────────────────────
function el(id) {
  return document.getElementById(id);
}

// Show a notification toast
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

// Show / hide panel helpers
function showPanel(id) {
  const panel = el(id);
  if (panel) panel.style.display = 'flex';
}

function hidePanel(id) {
  const panel = el(id);
  if (panel) panel.style.display = 'none';
}

function togglePanel(id) {
  const panel = el(id);
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'flex';
  } else {
    panel.style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────────
// Public: initMenus
// ─────────────────────────────────────────────────────────────
export function initMenus(gameState, systems) {
  const { saveGame, loadGame, getSaveList, generateWorld, character } = systems || {};

  // ── Main Menu ──────────────────────────────────────────────
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
      if (loadGame) {
        const ok = loadGame(0);
        if (ok) {
          hidePanel('mainMenu');
          showOverworldHUD(gameState);
          gameState.setScreen('overworld');
          // Trigger HUD update if possible
          import('./hud.js').then(({ updateHUD }) => updateHUD(gameState)).catch(() => {});
        } else {
          notify('No save found!');
        }
      }
    });
  }

  const btnLoadGame = el('btnLoadGame');
  if (btnLoadGame) {
    btnLoadGame.addEventListener('click', () => {
      if (getSaveList) populateSaveSlots(getSaveList());
      showPanel('loadGameModal');
    });
  }

  // ── Company Creation ───────────────────────────────────────
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

  // ── Close buttons (data-close attribute) ──────────────────
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-close]');
    if (!target) return;
    const panelId = target.dataset.close;
    hidePanel(panelId);
    // If closing settlement panel, return to overworld
    if (panelId === 'settlementPanel') {
      import('./settlement.js').then(({ closeSettlement }) => closeSettlement(gameState)).catch(() => {});
    }
  });

  // ── Overworld HUD buttons ──────────────────────────────────
  const btnRoster = el('btnRoster');
  if (btnRoster) {
    btnRoster.addEventListener('click', () => {
      import('./roster.js').then(({ renderRoster }) => {
        renderRoster(gameState);
        togglePanel('rosterPanel');
      }).catch(() => togglePanel('rosterPanel'));
    });
  }

  const btnInventory = el('btnInventory');
  if (btnInventory) {
    btnInventory.addEventListener('click', () => {
      import('./inventory-ui.js').then(({ renderInventory }) => {
        renderInventory(gameState);
        togglePanel('inventoryPanel');
      }).catch(() => togglePanel('inventoryPanel'));
    });
  }

  const btnCamp = el('btnCamp');
  if (btnCamp) {
    btnCamp.addEventListener('click', () => {
      // Update food cost display
      const roster = gameState.roster || [];
      const aliveCount = roster.filter(c => c.alive).length;
      const campCost = el('campFoodCost');
      if (campCost) campCost.textContent = aliveCount;
      togglePanel('campPanel');
    });
  }

  const btnWorldMap = el('btnWorldMap');
  if (btnWorldMap) {
    btnWorldMap.addEventListener('click', () => {
      notify('Map: Click any tile to move your company there.');
    });
  }

  const btnPause = el('btnPause');
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      gameState.paused = true;
      showPanel('pauseMenu');
    });
  }

  // ── Camp panel actions ─────────────────────────────────────
  const btnRest = el('btnRest');
  if (btnRest) {
    btnRest.addEventListener('click', () => {
      const roster = gameState.roster || [];
      const aliveCount = roster.filter(c => c.alive).length;
      const foodNeeded = aliveCount;

      if ((gameState.company.food || 0) < foodNeeded) {
        notify('Not enough food to rest!');
        return;
      }

      // Consume food
      gameState.company.food = Math.max(0, (gameState.company.food || 0) - foodNeeded);

      // Restore HP
      for (const char of roster) {
        if (!char.alive) continue;
        char.hp = Math.min(char.maxHp, char.hp + Math.floor(char.maxHp * 0.4));
        // Clear minor wounds chance
        if (char.wounds && char.wounds.length > 0 && Math.random() < 0.3) {
          char.wounds.pop();
        }
      }

      // Advance time 8 hours
      gameState.hour = (gameState.hour || 6) + 8;
      while (gameState.hour >= 24) {
        gameState.hour -= 24;
        gameState.day = (gameState.day || 1) + 1;
      }

      // Morale boost from rest
      gameState.company.morale = Math.min(100, (gameState.company.morale || 50) + 5);

      hidePanel('campPanel');
      notify('Your company rests until dawn. HP restored.');
      import('./hud.js').then(({ updateHUD, addTravelLog }) => {
        updateHUD(gameState);
        addTravelLog(gameState, 'Company rested for 8 hours.', 'camp');
      }).catch(() => {});
    });
  }

  const btnTrain = el('btnTrain');
  if (btnTrain) {
    btnTrain.addEventListener('click', () => {
      gameState.company.morale = Math.min(100, (gameState.company.morale || 50) + 5);

      // Advance time 8 hours
      gameState.hour = (gameState.hour || 6) + 8;
      while (gameState.hour >= 24) {
        gameState.hour -= 24;
        gameState.day = (gameState.day || 1) + 1;
      }

      hidePanel('campPanel');
      notify('Training complete. Morale +5!');
      import('./hud.js').then(({ updateHUD, addTravelLog }) => {
        updateHUD(gameState);
        addTravelLog(gameState, 'Company trains. Morale improved.', 'camp');
      }).catch(() => {});
    });
  }

  const btnForage = el('btnForage');
  if (btnForage) {
    btnForage.addEventListener('click', () => {
      const roster = gameState.roster || [];
      // Find best survival skill
      let survivalSkill = 0;
      for (const char of roster) {
        if (char.alive && char.skills) {
          survivalSkill = Math.max(survivalSkill, char.skills.survival || 0);
        }
      }
      const foodFound = 2 + Math.floor(survivalSkill / 20) + Math.floor(Math.random() * 5);
      gameState.company.food = (gameState.company.food || 0) + foodFound;

      // Advance time 4 hours
      gameState.hour = (gameState.hour || 6) + 4;
      while (gameState.hour >= 24) {
        gameState.hour -= 24;
        gameState.day = (gameState.day || 1) + 1;
      }

      hidePanel('campPanel');
      notify(`Foraging complete. Found ${foodFound} food!`);
      import('./hud.js').then(({ updateHUD, addTravelLog }) => {
        updateHUD(gameState);
        addTravelLog(gameState, `Foraging: found ${foodFound} food.`, 'camp');
      }).catch(() => {});
    });
  }

  // ── Pause Menu ─────────────────────────────────────────────
  const btnResume = el('btnResume');
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      hidePanel('pauseMenu');
      gameState.paused = false;
    });
  }

  const btnSaveGame = el('btnSaveGame');
  if (btnSaveGame) {
    btnSaveGame.addEventListener('click', () => {
      if (saveGame) {
        saveGame(0);
        notify('Game saved!');
      }
    });
  }

  const btnLoadSlot = el('btnLoadSlot');
  if (btnLoadSlot) {
    btnLoadSlot.addEventListener('click', () => {
      if (getSaveList) populateSaveSlots(getSaveList());
      showPanel('loadGameModal');
    });
  }

  const btnQuitMain = el('btnQuitMain');
  if (btnQuitMain) {
    btnQuitMain.addEventListener('click', () => {
      hidePanel('pauseMenu');
      showMainMenu(gameState);
    });
  }

  // ── Load Game Modal ────────────────────────────────────────
  const btnCloseLoad = el('btnCloseLoad');
  if (btnCloseLoad) {
    btnCloseLoad.addEventListener('click', () => hidePanel('loadGameModal'));
  }

  // ── Combat Result ──────────────────────────────────────────
  const btnCombatContinue = el('btnCombatContinue');
  if (btnCombatContinue) {
    // This is set dynamically in main.js so don't override here
  }

  // ── Loot Modal ─────────────────────────────────────────────
  const btnTakeLoot = el('btnTakeLoot');
  if (btnTakeLoot) {
    btnTakeLoot.addEventListener('click', () => {
      // Loot is already added in showCombatResult; just close
      hidePanel('lootModal');
      hidePanel('combatResult');
    });
  }

  // ── Settlement tab buttons ─────────────────────────────────
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab-btn');
    if (!tab) return;
    const tabName = tab.dataset.tab;
    if (!tabName) return;

    // Toggle active class
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Render appropriate tab content
    const settlement = gameState._currentSettlement;
    if (!settlement) return;

    import('./settlement.js').then(({ renderMarket, renderTavern, renderContracts, renderSmith }) => {
      if (tabName === 'market') renderMarket(settlement, gameState);
      else if (tabName === 'tavern') renderTavern(settlement, gameState);
      else if (tabName === 'contracts') renderContracts(settlement, gameState);
      else if (tabName === 'smith') renderSmith(settlement, gameState);
    }).catch(() => {});
  });
}

// ─────────────────────────────────────────────────────────────
// Private: start new game flow
// ─────────────────────────────────────────────────────────────
function _startNewGame(gameState, systems) {
  const { generateWorld, character } = systems || {};

  // Read company name
  const nameInput = el('companyNameInput');
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

  // Set starting resources
  const resources = {
    easy:   { gold: 800,  food: 40, morale: 60 },
    normal: { gold: 500,  food: 30, morale: 50 },
    hard:   { gold: 300,  food: 20, morale: 40 },
  };
  const res = resources[diff] || resources.normal;
  gameState.company.gold  = res.gold;
  gameState.company.food  = res.food;
  gameState.company.morale = res.morale;

  // Reset roster and inventory
  gameState.roster    = [];
  gameState.inventory = [];

  // Create leader from selected background
  try {
    const leader = createCharacter(bgId, { name: `${companyName} Leader` });
    equipStartingGear(leader);
    leader.isLeader = true;
    gameState.roster.push(leader);
  } catch (err) {
    console.error('Failed to create leader:', err);
  }

  // Add 2 more random recruits
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

  // Hide creation panel
  hidePanel('companyCreation');

  // Generate world (calls game.newGame())
  if (generateWorld) {
    generateWorld();
  }
}

// ─────────────────────────────────────────────────────────────
// Public exports
// ─────────────────────────────────────────────────────────────
export function showMainMenu(gameState) {
  // Hide all panels
  const panels = [
    'overworldHUD', 'combatHUD', 'rosterPanel', 'characterSheet',
    'inventoryPanel', 'settlementPanel', 'campPanel', 'pauseMenu',
    'loadGameModal', 'eventModal', 'lootModal', 'combatResult',
    'companyCreation',
  ];
  panels.forEach(id => hidePanel(id));

  const mainMenu = el('mainMenu');
  if (mainMenu) mainMenu.style.display = 'flex';

  if (gameState) {
    gameState.setScreen('menu');
    gameState.paused = false;
  }
}

export function showOverworldHUD(gameState) {
  // Hide non-overworld panels
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

  const bgArray = backgrounds ? (Array.isArray(backgrounds) ? backgrounds : Object.values(backgrounds)) : [];

  bgArray.forEach((bg) => {
    const item = document.createElement('div');
    item.className = 'background-item';
    item.dataset.bgId = bg.id;
    item.innerHTML = `
      <div class="bg-name">${bg.name}</div>
      <div class="bg-wage">Wage: ${bg.wage}g/day</div>
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

  // Select first by default
  const first = list.querySelector('.background-item');
  if (first) first.click();
}

export function populateSaveSlots(saves) {
  const list = el('saveSlotList');
  if (!list) return;
  list.innerHTML = '';

  if (!saves || saves.length === 0) {
    list.innerHTML = '<p class="no-saves">No saves found.</p>';
    return;
  }

  saves.forEach((save) => {
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
      import('../state/save.js').then(({ loadGame }) => {
        const ok = loadGame(save.slot);
        if (ok) {
          hidePanel('loadGameModal');
          showOverworldHUD(state);
          state.setScreen('overworld');
          import('./hud.js').then(({ updateHUD }) => updateHUD(state)).catch(() => {});
          notify('Game loaded!');
        } else {
          notify('Failed to load save.');
        }
      });
    });

    list.appendChild(item);
  });
}
