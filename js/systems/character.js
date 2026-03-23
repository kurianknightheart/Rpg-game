// Character/stats system
import { randInt, randRange, pick, chance } from '../utils/rng.js';
import { uid } from '../utils/helpers.js';
import BACKGROUNDS, { FIRST_NAMES_MALE, FIRST_NAMES_FEMALE, LAST_NAMES } from '../../data/recruits.js';
import TRAITS from '../../data/traits.js';

export const BASE_SKILLS = ['swords', 'axes', 'maces', 'spears', 'daggers', 'bows', 'shields', 'medicine', 'survival'];
export const BASE_ATTRS = ['strength', 'dexterity', 'endurance', 'perception', 'resolve', 'intelligence', 'initiative'];

export function createCharacter(backgroundId, options = {}) {
  const bg = BACKGROUNDS[backgroundId];
  if (!bg) throw new Error(`Unknown background: ${backgroundId}`);

  // Generate name
  const isFemale = chance(30);
  const names = isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE;
  const firstName = pick(names);
  const lastName = pick(LAST_NAMES);
  const name = options.name || `${firstName} ${lastName}`;

  // Generate attributes
  const attrs = {};
  for (const attr of BASE_ATTRS) {
    const range = bg.startStats[attr] || [4, 8];
    attrs[attr] = randInt(range[0], range[1]);
  }

  // Generate skills
  const skills = {};
  for (const skill of BASE_SKILLS) {
    skills[skill] = 0;
  }
  if (bg.startSkills) {
    for (const [skill, range] of Object.entries(bg.startSkills)) {
      skills[skill] = randInt(range[0], range[1]);
    }
  }

  // Traits
  const traits = [];
  if (bg.possibleTraits && bg.traitChance && chance(bg.traitChance * 100)) {
    const traitId = pick(bg.possibleTraits);
    if (traitId && TRAITS[traitId]) traits.push(traitId);
  }

  // Calculate derived stats
  const char = {
    id: uid('char_'),
    name,
    background: backgroundId,
    level: 1,
    xp: bg.startXP || 0,
    xpToNext: 100,
    attrs,
    skills,
    traits,
    equipment: {
      mainhand: null, offhand: null, head: null, body: null
    },
    inventory: [],

    // Dynamic combat stats (recalculated)
    maxHp: 0, hp: 0,
    maxFatigue: 0, fatigue: 0,
    initiative: 0,
    meleeSkill: 0, rangedSkill: 0, defense: 0,
    armor: 0, armorHead: 0,

    // Status
    alive: true, conscious: true,
    wounds: [],
    statusEffects: [],

    // Company stats
    wage: bg.wage,
    morale: 50,
    daysSinceJoined: 0,

    // Skill use counters (for advancement)
    skillUse: {},

    // Start equipment from background
    startEquipment: bg.startEquipment ? [...bg.startEquipment] : []
  };

  // Initialize skill use counters
  for (const s of BASE_SKILLS) char.skillUse[s] = 0;

  recalcStats(char);
  char.hp = char.maxHp;
  char.fatigue = 0;

  return char;
}

export function recalcStats(char) {
  const a = char.attrs;
  const t = getTraitEffects(char.traits);

  // Max HP: base 30 + endurance * 5 + strength * 2
  char.maxHp = 30 + (a.endurance + (t.endBonus || 0)) * 5 +
               (a.strength + (t.strBonus || 0)) * 2 +
               (t.hpBonus || 0);

  // Max fatigue
  char.maxFatigue = 60 + (a.endurance + (t.endBonus || 0)) * 3 + (a.strength + (t.strBonus || 0)) * 2;

  // Initiative: base from initiative attr + dex
  char.initiative = (a.initiative + (t.initiativeBonus || 0)) + Math.floor(a.dexterity / 2);

  // Melee hit chance: dex * 3 + relevant weapon skill (computed per weapon)
  char.meleeSkill = Math.floor((a.dexterity + (t.dexBonus || 0)) * 3 + (t.meleeBonus || 0));

  // Ranged hit chance
  char.rangedSkill = Math.floor((a.perception + (t.perBonus || 0)) * 3 + (t.rangedBonus || 0));

  // Defense: dex + shield (computed per shield)
  char.defense = Math.floor((a.dexterity + (t.dexBonus || 0)) * 2 + (t.defBonus || 0));

  // Armor from equipment
  char.armor = 0;
  char.armorHead = 0;

  if (char.equipment.body) {
    const item = getEquippedItem(char.equipment.body);
    if (item) {
      char.armor = item.armor || 0;
    }
  }
  if (char.equipment.head) {
    const item = getEquippedItem(char.equipment.head);
    if (item) {
      char.armorHead = item.armor || 0;
    }
  }

  // Block chance from shield
  char.blockChance = 0;
  if (char.equipment.offhand) {
    const item = getEquippedItem(char.equipment.offhand);
    if (item && item.type === 'shield') {
      char.blockChance = item.blockChance + (char.skills.shields || 0) * 0.3 + (t.blockBonus || 0);
    }
  }

  // Apply wound penalties
  for (const wound of (char.wounds || [])) {
    if (wound === 'injured_leg') char.initiative -= 10;
    if (wound === 'injured_arm') { char.meleeSkill -= 5; char.rangedSkill -= 5; }
  }
}

function getEquippedItem(itemId) {
  if (!itemId) return null;
  // Import lazily to avoid circular
  try {
    // Access global item registry
    return window._ITEMS ? window._ITEMS[itemId] : null;
  } catch { return null; }
}

export function getTraitEffects(traitIds) {
  const effects = {};
  for (const tid of (traitIds || [])) {
    const trait = TRAITS[tid];
    if (!trait || !trait.effects) continue;
    for (const [key, val] of Object.entries(trait.effects)) {
      effects[key] = (effects[key] || 0) + val;
    }
  }
  return effects;
}

export function getWeaponSkill(char, weapon) {
  if (!weapon) return char.meleeSkill;
  const skillName = weapon.attackSkill;
  return char.meleeSkill + (char.skills[skillName] || 0);
}

export function gainXP(char, amount) {
  const t = getTraitEffects(char.traits);
  const multiplier = t.xpMultiplier || 1;
  char.xp += Math.floor(amount * multiplier);

  const events = [];
  while (char.xp >= char.xpToNext) {
    char.xp -= char.xpToNext;
    levelUp(char);
    events.push({ type: 'levelup', char });
    char.xpToNext = Math.floor(char.xpToNext * 1.3);
  }
  return events;
}

export function levelUp(char) {
  char.level++;

  // Increase random attributes
  const attrCount = 2 + Math.floor(char.attrs.intelligence / 10);
  const attrs = [...BASE_ATTRS];
  for (let i = 0; i < attrCount; i++) {
    const attr = pick(attrs);
    char.attrs[attr] = Math.min(20, char.attrs[attr] + 1);
  }

  // Increase a skill based on usage
  const topSkills = BASE_SKILLS
    .map(s => ({ s, use: char.skillUse[s] || 0 }))
    .sort((a, b) => b.use - a.use)
    .slice(0, 3);
  if (topSkills.length > 0) {
    const skill = pick(topSkills).s;
    char.skills[skill] = Math.min(100, char.skills[skill] + randInt(3, 8));
    char.skillUse[skill] = 0;
  }

  // Chance to gain a trait
  if (char.traits.length < 4 && chance(15)) {
    const traitPool = Object.keys(TRAITS).filter(t =>
      TRAITS[t].type !== 'injury' && !char.traits.includes(t)
    );
    const newTrait = pick(traitPool);
    if (newTrait) char.traits.push(newTrait);
  }

  recalcStats(char);
  char.hp = Math.min(char.hp + 10, char.maxHp);
}

export function useSkill(char, skillName, amount = 1) {
  if (char.skillUse[skillName] !== undefined) {
    char.skillUse[skillName] += amount;
  }
}

export function addWound(char, woundType) {
  if (!char.wounds) char.wounds = [];
  if (!char.wounds.includes(woundType)) {
    char.wounds.push(woundType);
    if (!char.traits.includes(woundType)) char.traits.push(woundType);
    recalcStats(char);
  }
}

export function healWounds(char) {
  if (!char.wounds) return;
  char.wounds = [];
  char.traits = char.traits.filter(t =>
    !TRAITS[t] || TRAITS[t].type !== 'injury'
  );
  recalcStats(char);
}

export function isAlive(char) {
  return char.alive && char.hp > 0;
}

export function getCharSummary(char) {
  return {
    name: char.name,
    level: char.level,
    background: char.background,
    hp: char.hp,
    maxHp: char.maxHp,
    alive: char.alive
  };
}

// Combat stats
export function getMeleeHitChance(attacker, defender, weapon) {
  const atkSkill = getWeaponSkill(attacker, weapon) + (weapon ? (attacker.skills[weapon.attackSkill] || 0) : 0);
  const defSkill = defender.defense;
  const chance = 50 + atkSkill - defSkill;
  return Math.max(5, Math.min(95, chance));
}

export function getRangedHitChance(attacker, defender, weapon, rangePenalty = 0) {
  const atkSkill = attacker.rangedSkill + (weapon ? (attacker.skills[weapon.attackSkill] || 0) : 0);
  const defSkill = defender.defense / 2;
  const chance = 50 + atkSkill - defSkill - rangePenalty;
  return Math.max(5, Math.min(95, chance));
}

export function calcDamage(attacker, weapon) {
  const t = getTraitEffects(attacker.traits);
  const strBonus = Math.floor(attacker.attrs.strength / 3);
  const dmgBonus = (t.meleeDamageBonus || 0);

  if (!weapon) {
    // Unarmed
    return Math.max(1, randInt(1, 5) + strBonus);
  }

  const [minDmg, maxDmg] = weapon.damage;
  return Math.max(1, randInt(minDmg, maxDmg) + strBonus + dmgBonus);
}

export function calcArmorReduction(damage, armorValue, armorPen = 0) {
  const effectiveArmor = Math.max(0, armorValue - armorPen);
  const reduction = Math.min(damage * 0.85, effectiveArmor * 0.6);
  return Math.max(1, Math.floor(damage - reduction));
}

export default {
  createCharacter, recalcStats, gainXP, levelUp,
  useSkill, addWound, healWounds, isAlive,
  getMeleeHitChance, getRangedHitChance, calcDamage, calcArmorReduction,
  getWeaponSkill, getTraitEffects, getCharSummary
};
