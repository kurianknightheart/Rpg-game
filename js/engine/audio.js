// Audio system stub
// All functions are no-ops that log to console.
// Replace with real Web Audio API implementation when needed.

export const SOUNDS = {
  // UI sounds
  ui_click: 'ui_click',
  ui_open: 'ui_open',
  ui_close: 'ui_close',
  ui_confirm: 'ui_confirm',
  ui_cancel: 'ui_cancel',

  // World sounds
  world_step: 'world_step',
  world_enter_settlement: 'world_enter_settlement',
  world_event: 'world_event',

  // Combat sounds
  combat_start: 'combat_start',
  combat_end: 'combat_end',
  combat_swing_sword: 'combat_swing_sword',
  combat_swing_axe: 'combat_swing_axe',
  combat_swing_mace: 'combat_swing_mace',
  combat_arrow_fire: 'combat_arrow_fire',
  combat_hit: 'combat_hit',
  combat_miss: 'combat_miss',
  combat_block: 'combat_block',
  combat_death: 'combat_death',
  combat_morale_break: 'combat_morale_break',

  // Economy sounds
  economy_buy: 'economy_buy',
  economy_sell: 'economy_sell',
  economy_no_gold: 'economy_no_gold',

  // Events
  event_positive: 'event_positive',
  event_negative: 'event_negative',
  event_neutral: 'event_neutral',

  // Music tracks
  music_menu: 'music_menu',
  music_world: 'music_world',
  music_combat: 'music_combat',
  music_settlement: 'music_settlement',
  music_victory: 'music_victory',
  music_defeat: 'music_defeat',
};

let _currentMusic = null;

/**
 * Play a one-shot sound effect by name.
 * @param {string} name - key from SOUNDS
 */
export function playSound(name) {
  console.log(`[Audio] playSound: ${name}`);
}

/**
 * Start playing a music track.
 * @param {string} name - key from SOUNDS (music_* entries)
 */
export function playMusic(name) {
  if (_currentMusic === name) return;
  _currentMusic = name;
  console.log(`[Audio] playMusic: ${name}`);
}

/**
 * Stop the currently playing music track.
 */
export function stopMusic() {
  console.log(`[Audio] stopMusic (was: ${_currentMusic})`);
  _currentMusic = null;
}

export default { playSound, playMusic, stopMusic, SOUNDS };
