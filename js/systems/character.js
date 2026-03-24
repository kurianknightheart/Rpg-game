// Character creation, derived stats, leveling, wounds, and skill gain.

import { BACKGROUNDS, FIRST_NAMES_MALE, FIRST_NAMES_FEMALE, LAST_NAMES } from '../../data/recruits.js';
import { TRAITS } from '../../data/traits.js';

let _charIdCounter = 0;

function _uid() {
  _charIdCounter++;
  return `char_${Date.now()}_${_charIdCounter}`;
}

function rollRange(range, fn) {
  const r = fn || Math.random;
  return Math.floor(r() * (range[1] - range[0] + 1)) + range[0];
}

/**
 * Create a full character object from a background template.
 * @param {string} backgroundId
 * @param {number} level
 * @param {function} rng - 0..1 random function (or null for Math.random)
 */
export function createCharacter(backgroundId, level = 1, rng = null) {
  const fn = rng || Math.random;
  const bg = BACKGROUNDS[backgroundId];
  if (!bg) throw new Error(`Unknown background: ${backgroundId}`);

  // Generate name
  const useFemale = fn() < 0.2;
  const firstPool = useFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE;
  const firstName = firstPool[Math.floor(fn() * firstPool.length)];
  const lastName = LAST_NAMES[Math.floor(fn() * LAST_NAMES.length)];
  const name = `${firstName} ${lastName}`;

  // Roll attributes
  const ss = bg.startStats;
  const attributes = {
    str: rollRange(ss.strength, fn),
    dex: rollRange(ss.dexterity, fn),
    end: rollRange(ss.endurance, fn),
    per: rollRange(ss.perception, fn),
    res: rollRange(ss.resolve, fn),
    ini: rollRange(ss.initiative, fn),
  };

  // Roll skills
  const skills = {
    swords: 0, axes: 0, maces: 0, spears: 0,
    bows: 0, crossbows: 0, daggers: 0, throwing: 0,
    shields: 0, medicine: 0, survival: 0,
  };
  for (const [skillName, range] of Object.entries(bg.startSkills || {})) {
    if (skillName in skills) {
      skills[skillName] = rollRange(range, fn);
    }
  }

  // Roll traits
  const traits = [];
  if (bg.possibleTraits && bg.possibleTraits.length > 0 && fn() < bg.traitChance) {
    const traitId = bg.possibleTraits[Math.floor(fn() * bg.possibleTraits.length)];
    if (TRAITS[traitId]) traits.push(traitId);
  }

  const char = {
    id: _uid(),
    name,
    background: backgroundId,
    level: 1,
    xp: bg.startXP || 0,
    attributes,
    skills,
    maxHP: 0,
    hp: 0,
    maxStamina: 0,
    stamina: 0,
    morale: 50,
    traits,
    wounds: [],
    equipment: { head: null, body: null, mainhand: null, offhand: null },
    wage: bg.wage || 3,
    alive: true,
    _skillXP: Object.fromEntries(Object.keys(skills).map(k => [k, 0])),
  };

  // Auto-equip starting gear
  if (bg.startEquipment) {
    for (const itemId of bg.startEquipment) {
      _autoEquip(char, itemId);
    }
  }

  calculateDerivedStats(char);

  for (let l = 1; l < level; l++) levelUp(char);

  char.hp = char.maxHP;
  char.stamina = char.maxStamina;
  return char;
}

const HEAD_ITEMS = ['leather_cap', 'padded_cap', 'kettle_hat', 'nasal_helmet', 'closed_helmet', 'greathelm'];
const BODY_ITEMS = ['linen_shirt', 'leather_armor', 'padded_armor', 'mail_hauberk', 'brigandine', 'plate_armor'];
const OFFHAND_ITEMS = ['wooden_shield', 'iron_shield', 'kite_shield'];

function _autoEquip(char, itemId) {
  if (HEAD_ITEMS.includes(itemId)) {
    char.equipment.head = itemId;
  } else if (BODY_ITEMS.includes(itemId)) {
    char.equipment.body = itemId;
  } else if (OFFHAND_ITEMS.includes(itemId)) {
    char.equipment.offhand = itemId;
  } else {
    char.equipment.mainhand = itemId;
  }
}

/**
 * Compute maxHP, maxStamina, initiative, etc. from attributes and traits.
 * Updates char in place.
 */
export function calculateDerivedStats(char) {
  const a = char.attributes;

  let hpBonus = 0;
  let endBonus = 0;
  let iniBonus = 0;

  for (const traitId of char.traits || []) {
    const trait = TRAITS[traitId];
    if (!trait) continue;
    hpBonus += trait.effects.hpBonus || 0;
    endBonus += trait.effects.endBonus || 0;
    iniBonus += trait.effects.initiativeBonus || 0;
  }

  const effectiveEnd = a.end + endBonus;
  char.maxHP = Math.max(20, 80 + effectiveEnd * 2 + hpBonus);
  char.maxStamina = Math.max(10, 50 + effectiveEnd);

  if (char.hp > char.maxHP) char.hp = char.maxHP;
  if (char.stamina > char.maxStamina) char.stamina = char.maxStamina;

  char.initiative = a.ini * 3 + Math.floor(a.dex / 2) + iniBonus;

  // Wage with trait modifiers
  let wageMult = 1.0;
  for (const traitId of char.traits || []) {
    const trait = TRAITS[traitId];
    if (trait) wageMult *= (trait.effects.wageMultiplier || 1.0);
  }
  const bg = BACKGROUNDS[char.background];
  char.wage = Math.ceil((bg ? bg.wage : 3) * wageMult);
}

/**
 * Add XP to a skill with diminishing returns.
 * actual gain = amount * (1 - currentSkill/150), caps at 100.
 */
export function gainSkillXP(char, skill, amount) {
  if (!(skill in char.skills)) return;
  const current = char.skills[skill];
  if (current >= 100) return;

  const effective = amount * (1 - current / 150);
  char._skillXP = char._skillXP || {};
  char._skillXP[skill] = (char._skillXP[skill] || 0) + effective;

  while (char._skillXP[skill] >= 1) {
    char._skillXP[skill] -= 1;
    char.skills[skill] = Math.min(100, char.skills[skill] + 1);
  }
}

/**
 * Add character XP, check level-up threshold: 100 * level^1.5
 */
export function gainXP(char, amount) {
  let mult = 1.0;
  for (const traitId of char.traits || []) {
    const trait = TRAITS[traitId];
    if (trait && trait.effects.xpMultiplier) mult *= trait.effects.xpMultiplier;
  }
  char.xp += Math.round(amount * mult);

  const threshold = Math.round(100 * Math.pow(char.level, 1.5));
  if (char.xp >= threshold) {
    char.xp -= threshold;
    levelUp(char);
    return true; // leveled up
  }
  return false;
}

/**
 * Level up: +1 level, +1 to two random attributes, recalculate derived stats.
 */
export function levelUp(char) {
  char.level++;
  const attrs = ['str', 'dex', 'end', 'per', 'res', 'ini'];
  const idx1 = Math.floor(Math.random() * attrs.length);
  let idx2 = Math.floor(Math.random() * attrs.length);
  if (idx2 === idx1) idx2 = (idx2 + 1) % attrs.length;
  char.attributes[attrs[idx1]]++;
  char.attributes[attrs[idx2]]++;
  calculateDerivedStats(char);
  char.hp = Math.min(char.maxHP, char.hp + 10);
}

/**
 * Get effective skill modified by traits and wounds.
 */
export function getEffectiveSkill(char, skill) {
  let value = char.skills[skill] || 0;

  for (const traitId of char.traits || []) {
    const trait = TRAITS[traitId];
    if (!trait) continue;
    const meleeSkills = ['swords', 'axes', 'maces', 'spears', 'daggers', 'throwing'];
    const rangedSkills = ['bows', 'crossbows'];
    if (meleeSkills.includes(skill)) value += (trait.effects.meleeBonus || 0);
    if (rangedSkills.includes(skill)) value += (trait.effects.rangedBonus || 0);
    if (skill !== 'shields' && skill !== 'medicine' && skill !== 'survival') {
      value += (trait.effects.hitBonus || 0);
    }
  }

  for (const woundId of char.wounds || []) {
    if (woundId === 'injured_arm') value -= 10;
  }

  return Math.max(0, value);
}

/**
 * Return the relevant skill key for a weapon data object.
 */
export function getWeaponSkill(char, weapon) {
  if (!weapon) return 'swords';
  const typeMap = {
    sword: 'swords', axe: 'axes', mace: 'maces',
    spear: 'spears', bow: 'bows', crossbow: 'crossbows',
    dagger: 'daggers', throwing: 'throwing',
  };
  return typeMap[weapon.type] || 'swords';
}

/** Add wound by ID (no duplicates). */
export function applyWound(char, woundId) {
  if (!char.wounds.includes(woundId)) {
    char.wounds.push(woundId);
    if (woundId === 'injured_leg') char.initiative = Math.max(0, char.initiative - 10);
    if (woundId === 'injured_arm') {} // handled in getEffectiveSkill
  }
}

/** Remove wound by ID. */
export function healWound(char, woundId) {
  char.wounds = char.wounds.filter(w => w !== woundId);
  calculateDerivedStats(char);
}

/** Returns true if the character is alive and has HP. */
export function isAlive(char) {
  return char.alive && char.hp > 0;
}

/** Return the daily wage for a background. */
export function getWageForBackground(backgroundId) {
  const bg = BACKGROUNDS[backgroundId];
  return bg ? bg.wage : 3;
}
