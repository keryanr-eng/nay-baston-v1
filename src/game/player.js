import { loadGame, saveGame } from './storage.js';

const BASE_STATS = {
  hp: 100,
  atk: 10,
  def: 5,
  spd: 10,
  crit: 0.05,
  dodge: 0.05,
  precision: 0.02
};

const PER_LEVEL = {
  hp: 12,
  atk: 2,
  def: 1,
  spd: 1,
  crit: 0.004,
  dodge: 0.003,
  precision: 0.002
};

const EMPTY_BONUS_STATS = {
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  crit: 0,
  dodge: 0,
  precision: 0
};

const EMPTY_BONUS_PERCENTS = {
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  crit: 0,
  dodge: 0,
  precision: 0
};

const DEFAULT_SETTINGS = {
  animSpeed: 1,
  sound: true,
  ambient: false
};

const TALENTS = [
  { id: 'berserk', name: 'Berserk', rarity: 'epic', desc: 'Furie sous 35% PV (+25% ATK).' },
  { id: 'tank', name: 'Tank', rarity: 'uncommon', desc: '+20% PV max.' },
  { id: 'thorns', name: 'Thorns', rarity: 'rare', desc: 'Reflechit 20% des degats.' },
  { id: 'precision', name: 'Precision', rarity: 'common', desc: '+8% PREC.' },
  { id: 'focus', name: 'Focus', rarity: 'common', desc: '+8% CRIT.' },
  { id: 'ninja', name: 'Ninja', rarity: 'rare', desc: '+8% DODGE.' },
  { id: 'fast', name: 'Fast', rarity: 'common', desc: '+4 SPD.' },
  { id: 'armor', name: 'Armor', rarity: 'uncommon', desc: '+15% DEF.' },
  { id: 'bloodlust', name: 'Bloodlust', rarity: 'rare', desc: '+12% ATK.' },
  { id: 'bulwark', name: 'Bulwark', rarity: 'uncommon', desc: '+8% DEF et +6% PV.' },
  { id: 'duelist', name: 'Duelist', rarity: 'epic', desc: '+2 SPD et +6% CRIT.' },
  { id: 'lifesteal', name: 'Lifesteal', rarity: 'legendary', desc: 'Recupere 20% des degats infliges.' },
  { id: 'firstblood', name: 'FirstBlood', rarity: 'epic', desc: 'Premier coup +35% degats.' },
  { id: 'lucky', name: 'Lucky', rarity: 'ultimate', desc: '+5% CRIT et +5% DODGE.' },
  { id: 'pierce', name: 'Perce-Armure', rarity: 'rare', desc: 'Ignore une partie de la DEF.' },
  { id: 'execution', name: 'Execution', rarity: 'epic', desc: 'Plus de degats sur cibles faibles.' },
  { id: 'combo', name: 'Combo', rarity: 'rare', desc: 'Degats en chaine sur coups consecutifs.' },
  { id: 'bonecrusher', name: 'Brise-Os', rarity: 'epic', desc: 'Chance de fracturer la DEF adverse.' },
  { id: 'assault', name: 'Assaut', rarity: 'uncommon', desc: 'Bonus aux premiers coups.' },
  { id: 'bleed', name: 'Saignement', rarity: 'rare', desc: 'Chance d infliger un saignement.' },
  { id: 'lethal_precision', name: 'Precision Letale', rarity: 'rare', desc: 'CRIT bonus si PREC > DODGE.' },
  { id: 'carnage', name: 'Carnage', rarity: 'legendary', desc: 'Degats qui montent avec les niveaux.' },
  { id: 'momentum', name: 'Momentum', rarity: 'epic', desc: 'Apres 3 hits, gros coup bonus.' },
  { id: 'sharpened', name: 'Aiguise', rarity: 'uncommon', desc: 'Degats bonus avec une arme rare.' },
  { id: 'opportunist', name: 'Opportuniste', rarity: 'uncommon', desc: 'Bonus si l ennemi rate son coup.' },
  { id: 'surge', name: 'Surge', rarity: 'uncommon', desc: 'Bonus apres une esquive.' },
  { id: 'resilience', name: 'Resilience', rarity: 'rare', desc: 'Reduit les degats a bas PV.' },
  { id: 'parry', name: 'Parade', rarity: 'uncommon', desc: 'Chance de reduire un coup.' },
  { id: 'living_armor', name: 'Armure Vivante', rarity: 'epic', desc: 'DEF qui monte quand tu prends des coups.' },
  { id: 'barrier', name: 'Barriere', rarity: 'rare', desc: 'Protection sur les premiers coups.' },
  { id: 'stoic', name: 'Stoique', rarity: 'rare', desc: 'Les CRITs adverses sont reduits.' },
  { id: 'second_chance', name: 'Seconde Chance', rarity: 'legendary', desc: 'Survit une fois a 1 PV.' },
  { id: 'counter', name: 'Contre-Coup', rarity: 'epic', desc: 'Chance de renvoyer des degats.' },
  { id: 'anchor', name: 'Ancrage', rarity: 'uncommon', desc: 'Moins de degats si plus lent.' },
  { id: 'iron_will', name: 'Volonte', rarity: 'uncommon', desc: 'Moins de degats a haut PV.' },
  { id: 'rhythm', name: 'Rythme', rarity: 'rare', desc: 'SPD augmente toutes les 3 attaques.' },
  { id: 'mastery', name: 'Maitrise', rarity: 'rare', desc: 'PREC bonus si meme arme.' },
  { id: 'instinct', name: 'Instinct', rarity: 'rare', desc: 'DODGE bonus a bas PV.' },
  { id: 'anticipation', name: 'Anticipation', rarity: 'common', desc: 'Init bonus au debut du combat.' },
  { id: 'relentless', name: 'Implacable', rarity: 'uncommon', desc: 'CRIT bonus apres un rate.' },
  { id: 'cold_focus', name: 'Sang-Froid', rarity: 'epic', desc: 'CRIT bonus sans degats recents.' },
  { id: 'arsenal', name: 'Arsenal', rarity: 'rare', desc: 'Degats bonus par arme possedee.' },
  { id: 'siphon', name: 'Sangsue', rarity: 'epic', desc: 'Vol de vie modere.' },
  { id: 'guardian', name: 'Gardien', rarity: 'uncommon', desc: 'Moins de degats si PV plus bas.' }
];

const TALENT_FAMILIES = [
  {
    id: 'assassin',
    name: 'Assassin',
    talents: ['precision', 'focus', 'ninja', 'fast', 'duelist', 'lethal_precision', 'rhythm', 'anticipation', 'instinct'],
    tiers: [
      { count: 3, bonus: { spd: 0.04, precision: 0.04 } },
      { count: 6, bonus: { crit: 0.08, dodge: 0.06 } },
      { count: 9, bonus: { spd: 0.1, precision: 0.1, crit: 0.12, dodge: 0.1 } }
    ]
  },
  {
    id: 'berserker',
    name: 'Berserker',
    talents: ['berserk', 'bloodlust', 'firstblood', 'execution', 'combo', 'momentum', 'assault', 'carnage', 'opportunist'],
    tiers: [
      { count: 3, bonus: { atk: 0.08 } },
      { count: 6, bonus: { atk: 0.16, crit: 0.06 } },
      { count: 9, bonus: { atk: 0.3, crit: 0.12 } }
    ]
  },
  {
    id: 'bastion',
    name: 'Bastion',
    talents: ['tank', 'armor', 'bulwark', 'resilience', 'guardian', 'iron_will', 'anchor'],
    tiers: [
      { count: 2, bonus: { hp: 0.06, def: 0.04 } },
      { count: 5, bonus: { hp: 0.14, def: 0.1 } },
      { count: 7, bonus: { hp: 0.24, def: 0.16 } }
    ]
  },
  {
    id: 'sentinel',
    name: 'Sentinelle',
    talents: ['parry', 'living_armor', 'barrier', 'stoic', 'second_chance'],
    tiers: [
      { count: 1, bonus: { def: 0.03, hp: 0.02 } },
      { count: 3, bonus: { def: 0.1, hp: 0.06 } },
      { count: 5, bonus: { def: 0.18, hp: 0.12 } }
    ]
  },
  {
    id: 'reaper',
    name: 'Faucheur',
    talents: ['bleed', 'lifesteal', 'siphon', 'thorns', 'counter', 'lucky', 'cold_focus', 'relentless'],
    tiers: [
      { count: 3, bonus: { atk: 0.06, hp: 0.04 } },
      { count: 6, bonus: { atk: 0.12, hp: 0.08, crit: 0.04 } },
      { count: 8, bonus: { atk: 0.2, hp: 0.12, crit: 0.08 } }
    ]
  },
  {
    id: 'arsenal',
    name: 'Arsenal',
    talents: ['arsenal', 'sharpened', 'pierce', 'bonecrusher', 'mastery'],
    tiers: [
      { count: 1, bonus: { atk: 0.04, precision: 0.04 } },
      { count: 3, bonus: { atk: 0.1, precision: 0.08, crit: 0.03 } },
      { count: 5, bonus: { atk: 0.2, precision: 0.14, crit: 0.08 } }
    ]
  }
];

const TALENT_FAMILY_MAP = TALENT_FAMILIES.reduce((map, family) => {
  family.talents.forEach(id => {
    map[id] = family.id;
  });
  return map;
}, {});

const WEAPONS = [
  {
    id: 'dagger',
    name: 'Dagger',
    rarity: 'common',
    desc: 'Ultra rapide et precise, mais fragile.',
    baseDamage: 4,
    flat: { atk: 1, spd: 5, def: -2, crit: 0.03, precision: 0.05 },
    pct: { atk: -0.08, spd: 0.22, def: -0.08, crit: 0.22, precision: 0.2 }
  },
  {
    id: 'sword',
    name: 'Sword',
    rarity: 'rare',
    desc: 'Arme stable, polyvalente et fiable.',
    baseDamage: 9,
    flat: { atk: 6, spd: 1, crit: 0.02, precision: 0.02 },
    pct: { atk: 0.16, spd: 0.05, crit: 0.08, precision: 0.08 }
  },
  {
    id: 'axe',
    name: 'Axe',
    rarity: 'ultimate',
    desc: 'Brutale: gros degats, tres lourde.',
    baseDamage: 15,
    flat: { atk: 12, spd: -3, precision: -0.08, crit: 0.03 },
    pct: { atk: 0.3, spd: -0.18, precision: -0.22, crit: 0.16 }
  },
  {
    id: 'shield',
    name: 'Shield',
    rarity: 'epic',
    desc: 'Version tank: survie enorme, impact offensif reduit.',
    baseDamage: 3,
    flat: { hp: 40, def: 12, atk: -4, spd: -3, dodge: -0.02, precision: -0.03 },
    pct: { hp: 0.22, def: 0.3, atk: -0.12, spd: -0.15, dodge: -0.1, precision: -0.08 }
  },
  {
    id: 'spear',
    name: 'Spear',
    rarity: 'legendary',
    desc: 'Portee et controle, tres bon anti-dodge.',
    baseDamage: 10,
    flat: { atk: 7, spd: 2, crit: 0.03, precision: 0.07, dodge: 0.01 },
    pct: { atk: 0.18, spd: 0.1, crit: 0.1, precision: 0.18, dodge: 0.06 }
  },
  {
    id: 'gloves',
    name: 'Gloves',
    rarity: 'uncommon',
    desc: 'Style rafale: vitesse et esquive, degats bruts plus faibles.',
    baseDamage: 5,
    flat: { atk: -3, spd: 6, crit: 0.02, precision: 0.02, dodge: 0.05 },
    pct: { atk: -0.12, spd: 0.28, crit: 0.16, precision: 0.12, dodge: 0.18 }
  }
];

const DEFAULT_WEAPON = {
  id: 'fists',
  name: 'Poings',
  rarity: 'common',
  desc: 'Arme de base.',
  baseDamage: 2,
  flat: { atk: 0 },
  pct: {}
};

const WEAPON_COLLECTION_BONUS = {
  perWeapon: {
    hp: 3,
    atk: 1,
    def: 1,
    spd: 0,
    crit: 0.002,
    dodge: 0,
    precision: 0.002
  },
  sets: [
    { count: 2, stats: { spd: 1 } },
    { count: 3, stats: { hp: 6 } },
    { count: 4, stats: { atk: 2 } },
    { count: 5, stats: { def: 2 } },
    { count: 6, stats: { crit: 0.01, precision: 0.01 } }
  ]
};

const WEAPON_DUPLICATE_BONUS = {
  dagger: { spd: 1, crit: 0.002 },
  sword: { atk: 1 },
  axe: { atk: 2 },
  shield: { def: 2, hp: 5 },
  spear: { atk: 1, spd: 1 },
  gloves: { spd: 1, dodge: 0.003 }
};

const WEAPON_DUPLICATE_RARITY_MULTIPLIERS = {
  common: 1,
  uncommon: 1.3,
  rare: 2,
  epic: 2.8,
  legendary: 3.6,
  ultimate: 4.6
};

const MAX_RELICS = 2;
const RELICS = [
  { id: 'emberheart', name: 'Coeur de braise', rarity: 'rare', desc: '+2 ATK, +3% CRIT.', stats: { atk: 2, crit: 0.03 } },
  { id: 'ironseal', name: 'Sceau de fer', rarity: 'uncommon', desc: '+3 DEF, +10 PV.', stats: { def: 3, hp: 10 } },
  { id: 'shadowveil', name: 'Voile d ombre', rarity: 'epic', desc: '+2 SPD, +3% DODGE.', stats: { spd: 2, dodge: 0.03 } },
  { id: 'seer_eye', name: 'Oeil du voyant', rarity: 'rare', desc: '+4% PREC, +2% CRIT.', stats: { precision: 0.04, crit: 0.02 } },
  { id: 'bloodchalice', name: 'Calice sanguin', rarity: 'legendary', desc: '+4 ATK, +12 PV.', stats: { atk: 4, hp: 12 } },
  { id: 'starshard', name: 'Eclat astral', rarity: 'ultimate', desc: '+5% CRIT, +5% PREC, +1 SPD.', stats: { crit: 0.05, precision: 0.05, spd: 1 } }
];

const MAX_RUN_MODIFIERS = 1;
const RUN_MODIFIERS = [
  { id: 'wrath', name: 'Serment de colere', rarity: 'epic', desc: '+8% ATK, -6% PV.', mult: { atk: 0.08, hp: -0.06 } },
  { id: 'iron_skin', name: 'Peau de fer', rarity: 'rare', desc: '+10% DEF, -8% SPD.', mult: { def: 0.1, spd: -0.08 } },
  { id: 'keen_eye', name: 'Oeil perçant', rarity: 'legendary', desc: '+8% CRIT & PREC, -6% DEF.', mult: { crit: 0.08, precision: 0.08, def: -0.06 } }
];

const DODGE_CAP = 0.6;
const RARITY_MULTIPLIERS = {
  common: 1,
  uncommon: 1.08,
  rare: 1.18,
  epic: 1.32,
  legendary: 2.1,
  ultimate: 2.8
};

const TALENT_RANKS = {
  1: { label: 'I', rarity: 'common', mult: 1 },
  2: { label: 'II', rarity: 'legendary', mult: RARITY_MULTIPLIERS.legendary },
  3: { label: 'III', rarity: 'ultimate', mult: RARITY_MULTIPLIERS.ultimate }
};

function parseTalentKey(id) {
  if (!id) return { baseId: '', rank: 0 };
  const parts = String(id).split(':');
  const baseId = parts[0];
  const rankRaw = Number(parts[1]) || 1;
  const rank = Math.max(1, Math.min(3, rankRaw));
  return { baseId, rank };
}

function formatTalentKey(baseId, rank = 1) {
  return `${baseId}:${rank}`;
}

function getTalentRankLabel(rank) {
  return TALENT_RANKS[rank]?.label || 'I';
}

function getTalentRankRarity(rank) {
  return TALENT_RANKS[rank]?.rarity || 'common';
}

function getTalentRankMultiplier(rank) {
  return TALENT_RANKS[rank]?.mult || 1;
}

function getTalentFamilyId(baseId) {
  return TALENT_FAMILY_MAP[baseId] || null;
}

export function getTalentFamilyById(talentId) {
  const { baseId } = parseTalentKey(talentId);
  const familyId = getTalentFamilyId(baseId);
  return TALENT_FAMILIES.find(family => family.id === familyId) || null;
}

function computeFamilySynergies(talentIds) {
  const counts = {};
  const seen = new Set();
  (talentIds || []).forEach(id => {
    const { baseId } = parseTalentKey(id);
    if (!baseId || seen.has(baseId)) return;
    seen.add(baseId);
    const familyId = getTalentFamilyId(baseId);
    if (!familyId) return;
    counts[familyId] = (counts[familyId] || 0) + 1;
  });

  const totalBonus = { ...EMPTY_BONUS_PERCENTS };
  const families = TALENT_FAMILIES.map(family => {
    const maxCount = family.maxCount || family.talents.length;
    const count = counts[family.id] || 0;
    const activeTiers = family.tiers.filter(tier => count >= tier.count);
    const nextTier = family.tiers.find(tier => count < tier.count) || null;
    const bonus = { ...EMPTY_BONUS_PERCENTS };
    activeTiers.forEach(tier => {
      Object.keys(tier.bonus).forEach(stat => {
        bonus[stat] = (bonus[stat] || 0) + (tier.bonus[stat] || 0);
        totalBonus[stat] = (totalBonus[stat] || 0) + (tier.bonus[stat] || 0);
      });
    });
    return {
      ...family,
      maxCount,
      count,
      activeTiers,
      nextTier,
      bonus
    };
  });

  return { families, totalBonus };
}

export function getTalentFamilySummary(talentIds = []) {
  return computeFamilySynergies(talentIds);
}

export function applyFamilyPassives(stats, talentIds = []) {
  const summary = computeFamilySynergies(talentIds);
  const merged = { ...stats };
  Object.keys(summary.totalBonus).forEach(key => {
    const value = summary.totalBonus[key];
    if (!value) return;
    merged[key] = (merged[key] || 0) * (1 + value);
  });
  return merged;
}

function getNextTalentRank(currentRank) {
  return Math.max(1, Math.min(3, (currentRank || 0) + 1));
}

function getTalentRankFromRarity(rarity) {
  const normalized = normalizeRarity(rarity);
  if (normalized === 'ultimate') return 3;
  if (normalized === 'legendary') return 2;
  return 1;
}

function upgradeTalentList(list, talentKey) {
  const { baseId, rank } = parseTalentKey(talentKey);
  if (!baseId) return Array.isArray(list) ? [...list] : [];
  const currentMap = getTalentRankMap(list);
  const nextRank = Math.max(currentMap[baseId] || 0, rank);
  const filtered = (list || []).filter(id => parseTalentKey(id).baseId !== baseId);
  filtered.push(formatTalentKey(baseId, nextRank));
  return filtered;
}

function getTalentRankMap(list) {
  const map = {};
  (list || []).forEach(id => {
    const { baseId, rank } = parseTalentKey(id);
    if (!baseId) return;
    map[baseId] = Math.max(map[baseId] || 0, rank);
  });
  return map;
}

function getTalentIdFromList(list, baseId) {
  let best = null;
  let bestRank = 0;
  (list || []).forEach(id => {
    const parsed = parseTalentKey(id);
    if (parsed.baseId === baseId && parsed.rank > bestRank) {
      bestRank = parsed.rank;
      best = id;
    }
  });
  return best;
}

function hasTalent(list, baseId) {
  return !!getTalentIdFromList(list, baseId);
}

function getTalentValueFromList(list, baseId, baseValue) {
  const id = getTalentIdFromList(list, baseId);
  return id ? getTalentScaledValue(id, baseValue) : 0;
}

const WEAPON_RARITY_FLAT_MULTIPLIERS = {
  common: 1,
  uncommon: 1.12,
  rare: 1.26,
  epic: 1.42,
  legendary: 2.1,
  ultimate: 2.8
};

const WEAPON_RARITY_PERCENT_MULTIPLIERS = {
  common: 1,
  uncommon: 1.08,
  rare: 1.16,
  epic: 1.26,
  legendary: 2.1,
  ultimate: 2.8
};

const LEGACY_RARITY_MAP = {
  silver: 'common',
  gold: 'rare',
  purple: 'epic',
  red: 'ultimate'
};

const MIN_LEGENDARY_LEVEL = 10;
const MIN_ULTIMATE_LEVEL = 15;

const STORAGE_VERSION = 3;

let gameState = null;

function createSeed() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRarity(rarity) {
  if (!rarity) return 'common';
  return LEGACY_RARITY_MAP[rarity] || rarity;
}

function normalizeWeaponEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const base = WEAPONS.find(w => w.id === entry);
    return { id: entry, rarity: normalizeRarity(base?.rarity || 'common') };
  }
  if (typeof entry === 'object') {
    const id = entry.id || entry.weaponId;
    if (!id) return null;
    const base = WEAPONS.find(w => w.id === id);
    return {
      id,
      rarity: normalizeRarity(entry.rarity || base?.rarity || 'common')
    };
  }
  return null;
}

function getWeaponEntries(player) {
  const runWeapons = Array.isArray(player.weapons) ? player.weapons : [];
  const permWeapons = Array.isArray(player.permanent?.weapons) ? player.permanent.weapons : [];
  const list = [...runWeapons, ...permWeapons];
  return list.map(normalizeWeaponEntry).filter(Boolean);
}

function computeWeaponDuplicateBonus(weaponId, duplicates = []) {
  const base = WEAPON_DUPLICATE_BONUS[weaponId] || {};
  const total = { ...EMPTY_BONUS_STATS };
  duplicates.forEach(rarity => {
    const normalized = normalizeRarity(rarity);
    const mult = WEAPON_DUPLICATE_RARITY_MULTIPLIERS[normalized] || 1;
    Object.keys(base).forEach(stat => {
      const value = base[stat];
      const scaled = stat === 'crit' || stat === 'dodge' || stat === 'precision'
        ? Number((value * mult).toFixed(3))
        : Math.round(value * mult);
      total[stat] = (total[stat] || 0) + scaled;
    });
  });
  return total;
}

function getWeaponInventory(player) {
  const entries = getWeaponEntries(player);
  const map = {};
  entries.forEach(entry => {
    if (!entry?.id || entry.id === DEFAULT_WEAPON.id) return;
    const normalized = normalizeRarity(entry.rarity);
    if (!map[entry.id]) {
      map[entry.id] = {
        id: entry.id,
        rarities: []
      };
    }
    map[entry.id].rarities.push(normalized);
  });
  Object.values(map).forEach(item => {
    const sorted = item.rarities.slice().sort((a, b) => getRarityRank(b) - getRarityRank(a));
    item.bestRarity = sorted[0] || 'common';
    const duplicates = sorted.slice(1);
    item.duplicateBonus = computeWeaponDuplicateBonus(item.id, duplicates);
    item.duplicateCount = duplicates.length;
    item.totalCount = item.rarities.length;
  });
  return map;
}

function getBestWeaponInstances(player) {
  const inventory = getWeaponInventory(player);
  return Object.values(inventory).map(item => ({
    id: item.id,
    rarity: item.bestRarity,
    bonusStats: item.duplicateBonus,
    duplicateCount: item.duplicateCount,
    totalCount: item.totalCount
  }));
}

function resolveWeaponInstance(player, weaponInput) {
  if (!weaponInput) return { id: DEFAULT_WEAPON.id, rarity: DEFAULT_WEAPON.rarity };
  if (typeof weaponInput === 'object' && weaponInput.id) {
    return {
      id: weaponInput.id,
      rarity: normalizeRarity(weaponInput.rarity || DEFAULT_WEAPON.rarity),
      bonusStats: weaponInput.bonusStats || {}
    };
  }
  const weaponId = weaponInput;
  const inventory = getWeaponInventory(player);
  if (inventory[weaponId]) {
    return {
      id: weaponId,
      rarity: inventory[weaponId].bestRarity,
      bonusStats: inventory[weaponId].duplicateBonus
    };
  }
  const base = WEAPONS.find(w => w.id === weaponId);
  return {
    id: weaponId,
    rarity: normalizeRarity(base?.rarity || DEFAULT_WEAPON.rarity),
    bonusStats: {}
  };
}

function getRarityMultiplier(rarity) {
  const normalized = normalizeRarity(rarity);
  return RARITY_MULTIPLIERS[normalized] ?? 1;
}

function scalePercent(value, multiplier) {
  return Number((value * multiplier).toFixed(3));
}

function getWeaponFlatMultiplier(rarity) {
  const normalized = normalizeRarity(rarity);
  return WEAPON_RARITY_FLAT_MULTIPLIERS[normalized] ?? 1;
}

function getWeaponPercentMultiplier(rarity) {
  const normalized = normalizeRarity(rarity);
  return WEAPON_RARITY_PERCENT_MULTIPLIERS[normalized] ?? 1;
}

function getWeaponFlatStats(weapon) {
  if (!weapon) return {};
  return weapon.flat || weapon.stats || {};
}

function getWeaponPercentStats(weapon) {
  if (!weapon) return {};
  return weapon.pct || {};
}

export function getWeaponBaseDamage(weapon, rarityOverride = null) {
  if (!weapon) return 0;
  const base = weapon.baseDamage || 0;
  if (!base) return 0;
  const mult = getWeaponFlatMultiplier(rarityOverride || weapon.rarity);
  return Math.max(0, Math.round(base * mult));
}

function sanitizeName(name) {
  if (!name || typeof name !== 'string') return 'Heros';
  if (name.includes(`H\u00C3`) || name.includes(`\u00C3`)) return 'Heros';
  return name;
}

function createEmptyPlayer(seed, name = 'Heros') {
  return {
    seed,
    name: sanitizeName(name),
    level: 1,
    xp: 0,
    gold: 0,
    talents: [],
    relics: [],
    runModifiers: [],
    weapon: null,
    weapons: [],
    bonusStats: { ...EMPTY_BONUS_STATS },
    bonusPercents: { ...EMPTY_BONUS_PERCENTS },
    permanent: {
      talents: [],
      weapons: [],
      relics: [],
      bonusStats: { ...EMPTY_BONUS_STATS },
      bonusPercents: { ...EMPTY_BONUS_PERCENTS }
    },
    runRewards: [],
    lastBossLevel: 0,
    history: [],
    needsNamePrompt: false
  };
}

function ensureState() {
  if (gameState) return;
  const saved = loadGame();
  if (saved && saved.player) {
    gameState = normalizeState(saved);
  } else {
    gameState = {
      version: STORAGE_VERSION,
      player: createEmptyPlayer(createSeed()),
      settings: { ...DEFAULT_SETTINGS },
    pendingRewards: [],
    pendingEvent: null,
    nextEnemy: null
    };
    saveGame(gameState);
  }
}

function normalizeState(saved) {
  const player = saved.player || createEmptyPlayer(createSeed());
  const runWeaponsRaw = Array.isArray(player.weapons)
    ? player.weapons
    : (player.weapon ? [player.weapon] : []);
  const runWeapons = runWeaponsRaw.map(normalizeWeaponEntry).filter(Boolean);
  const permanent = player.permanent || {};
  const permanentWeaponsRaw = Array.isArray(permanent.weapons)
    ? permanent.weapons
    : [];
  const permanentWeapons = permanentWeaponsRaw.map(normalizeWeaponEntry).filter(Boolean);
  const permanentTalents = Array.isArray(permanent.talents) ? permanent.talents : [];
  const permanentRelics = Array.isArray(permanent.relics) ? permanent.relics : [];
  const permanentBonusStats = {
    hp: permanent.bonusStats?.hp || 0,
    atk: permanent.bonusStats?.atk || 0,
    def: permanent.bonusStats?.def || 0,
    spd: permanent.bonusStats?.spd || 0,
    crit: permanent.bonusStats?.crit || 0,
    dodge: permanent.bonusStats?.dodge || 0,
    precision: permanent.bonusStats?.precision || 0
  };
  const permanentBonusPercents = {
    hp: permanent.bonusPercents?.hp || 0,
    atk: permanent.bonusPercents?.atk || 0,
    def: permanent.bonusPercents?.def || 0,
    spd: permanent.bonusPercents?.spd || 0,
    crit: permanent.bonusPercents?.crit || 0,
    dodge: permanent.bonusPercents?.dodge || 0,
    precision: permanent.bonusPercents?.precision || 0
  };
  const weaponFallback = (typeof player.weapon === 'string' ? player.weapon : player.weapon?.id)
    || runWeapons[0]?.id
    || permanentWeapons[0]?.id
    || null;
  return {
    version: STORAGE_VERSION,
    player: {
      seed: player.seed || createSeed(),
      name: sanitizeName(player.name) || 'Heros',
      level: Math.max(1, player.level || 1),
      xp: Math.max(0, player.xp || 0),
      gold: Math.max(0, player.gold || 0),
      talents: Array.isArray(player.talents) ? player.talents : [],
      relics: Array.isArray(player.relics) ? player.relics : [],
      runModifiers: Array.isArray(player.runModifiers) ? player.runModifiers : [],
      weapon: weaponFallback,
      weapons: runWeapons,
      bonusStats: {
        hp: player.bonusStats?.hp || 0,
        atk: player.bonusStats?.atk || 0,
        def: player.bonusStats?.def || 0,
        spd: player.bonusStats?.spd || 0,
        crit: player.bonusStats?.crit || 0,
        dodge: player.bonusStats?.dodge || 0,
        precision: player.bonusStats?.precision || 0
      },
      bonusPercents: {
        hp: player.bonusPercents?.hp || 0,
        atk: player.bonusPercents?.atk || 0,
        def: player.bonusPercents?.def || 0,
        spd: player.bonusPercents?.spd || 0,
        crit: player.bonusPercents?.crit || 0,
        dodge: player.bonusPercents?.dodge || 0,
        precision: player.bonusPercents?.precision || 0
      },
      permanent: {
        talents: permanentTalents,
        weapons: permanentWeapons,
        relics: permanentRelics,
        bonusStats: permanentBonusStats,
        bonusPercents: permanentBonusPercents
      },
      runRewards: Array.isArray(player.runRewards) ? player.runRewards : [],
      lastBossLevel: player.lastBossLevel || 0,
      history: Array.isArray(player.history) ? player.history.slice(-20) : [],
      needsNamePrompt: !!player.needsNamePrompt
    },
    pendingRewards: Array.isArray(saved.pendingRewards) ? saved.pendingRewards : [],
    pendingEvent: saved.pendingEvent || null,
    nextEnemy: saved.nextEnemy || null,
    settings: {
      animSpeed: saved.settings?.animSpeed ?? DEFAULT_SETTINGS.animSpeed,
      sound: saved.settings?.sound ?? DEFAULT_SETTINGS.sound,
      ambient: saved.settings?.ambient ?? DEFAULT_SETTINGS.ambient
    }
  };
}

function saveState() {
  saveGame(gameState);
}

export function getTalentsCatalog() {
  return TALENTS.map(t => ({ ...t, desc: getTalentDescription(t.id) }));
}

export function getWeaponsCatalog() {
  return WEAPONS.map(w => ({
    ...w,
    flat: { ...getWeaponFlatStats(w) },
    pct: { ...getWeaponPercentStats(w) },
    stats: { ...getWeaponFlatStats(w) }
  }));
}

export function getRelicsCatalog() {
  return RELICS.map(r => ({ ...r, stats: { ...r.stats } }));
}

export function getRelicById(id) {
  return RELICS.find(r => r.id === id) || null;
}

export function getModifierById(id) {
  return RUN_MODIFIERS.find(mod => mod.id === id) || null;
}

export function getSettings() {
  ensureState();
  return { ...gameState.settings };
}

export function updateSettings(patch) {
  ensureState();
  gameState.settings = { ...gameState.settings, ...patch };
  saveState();
}

export function getPlayerState() {
  ensureState();
  return JSON.parse(JSON.stringify(gameState.player));
}

export function shouldPromptForName() {
  ensureState();
  return !!gameState.player.needsNamePrompt;
}

export function setPlayerName(name) {
  ensureState();
  const cleaned = sanitizeName((name || '').trim());
  gameState.player.name = cleaned || 'Heros';
  gameState.player.needsNamePrompt = false;
  saveState();
  return gameState.player.name;
}

export function resetPlayer(seed, name) {
  ensureState();
  gameState.player = createEmptyPlayer(seed || createSeed(), name || 'Heros');
  gameState.pendingRewards = [];
  gameState.pendingEvent = null;
  gameState.nextEnemy = null;
  saveState();
  return getPlayerState();
}

export function exportSeed() {
  ensureState();
  return gameState.player.seed;
}

export function importSeed(seed) {
  if (!seed || typeof seed !== 'string') return null;
  const cleaned = seed.trim().toUpperCase();
  if (!cleaned) return null;
  return resetPlayer(cleaned);
}

export function xpToNext(level) {
  return 80 + (level - 1) * 12;
}

export function computeBaseStats(level, bonusStats = null) {
  const base = {
    hp: BASE_STATS.hp + (level - 1) * PER_LEVEL.hp,
    atk: BASE_STATS.atk + (level - 1) * PER_LEVEL.atk,
    def: BASE_STATS.def + (level - 1) * PER_LEVEL.def,
    spd: BASE_STATS.spd + (level - 1) * PER_LEVEL.spd,
    crit: BASE_STATS.crit + (level - 1) * PER_LEVEL.crit,
    dodge: BASE_STATS.dodge + (level - 1) * PER_LEVEL.dodge,
    precision: BASE_STATS.precision + (level - 1) * PER_LEVEL.precision
  };
  if (bonusStats) {
    Object.keys(base).forEach(key => {
      base[key] += bonusStats[key] || 0;
    });
  }
  return base;
}

function applyPercentBonuses(stats, bonusPercents) {
  if (!bonusPercents) return { ...stats };
  const merged = { ...stats };
  Object.keys(merged).forEach(key => {
    const pct = bonusPercents[key] || 0;
    if (!pct) return;
    merged[key] = merged[key] * (1 + pct);
  });
  return merged;
}

export function getWeaponEffectiveModifiers(weapon, rarityOverride = null, extraBonus = null) {
  const flatStats = getWeaponFlatStats(weapon);
  const pctStats = getWeaponPercentStats(weapon);
  if (!Object.keys(flatStats).length && !Object.keys(pctStats).length && !extraBonus) {
    return { flat: {}, pct: {} };
  }

  const flatMult = getWeaponFlatMultiplier(rarityOverride || weapon?.rarity);
  const pctMult = getWeaponPercentMultiplier(rarityOverride || weapon?.rarity);
  const flat = {};
  const pct = {};

  Object.keys(flatStats).forEach(key => {
    const value = flatStats[key];
    if (typeof value !== 'number' || !value) return;
    if (value > 0) {
      if (key === 'crit' || key === 'dodge' || key === 'precision') {
        flat[key] = scalePercent(value, flatMult);
      } else {
        flat[key] = value * flatMult;
      }
    } else {
      flat[key] = value;
    }
  });

  Object.keys(pctStats).forEach(key => {
    const value = pctStats[key];
    if (typeof value !== 'number' || !value) return;
    pct[key] = value > 0 ? scalePercent(value, pctMult) : value;
  });

  if (extraBonus) {
    Object.keys(extraBonus).forEach(key => {
      const value = extraBonus[key];
      if (!value) return;
      flat[key] = (flat[key] || 0) + value;
    });
  }

  return { flat, pct };
}

export function getWeaponEffectiveStats(weapon, rarityOverride = null, extraBonus = null) {
  return getWeaponEffectiveModifiers(weapon, rarityOverride, extraBonus).flat;
}

export function applyWeaponStats(stats, weaponInput) {
  if (!weaponInput) return { ...stats };
  const weaponId = typeof weaponInput === 'object' ? weaponInput.id : weaponInput;
  if (!weaponId || weaponId === DEFAULT_WEAPON.id) return { ...stats };
  const weapon = WEAPONS.find(w => w.id === weaponId);
  if (!weapon) return { ...stats };
  const rarity = typeof weaponInput === 'object' ? weaponInput.rarity : null;
  const bonusStats = typeof weaponInput === 'object' ? weaponInput.bonusStats : null;
  const merged = { ...stats };
  const modifiers = getWeaponEffectiveModifiers(weapon, rarity, bonusStats);
  const keys = new Set([...Object.keys(modifiers.flat), ...Object.keys(modifiers.pct)]);
  keys.forEach(key => {
    const baseValue = merged[key] || 0;
    const flatValue = modifiers.flat[key] || 0;
    const pctValue = modifiers.pct[key] || 0;
    merged[key] = (baseValue + flatValue) * (1 + pctValue);
  });
  return merged;
}

export function applyTalentPassives(stats, talentIds) {
  let merged = { ...stats };
  const has = id => hasTalent(talentIds, id);
  const value = (id, base) => getTalentValueFromList(talentIds, id, base);
  if (has('fast')) merged.spd += Math.max(1, Math.round(value('fast', 4)));
  if (has('precision')) merged.precision += value('precision', 0.08);
  if (has('focus')) merged.crit += value('focus', 0.08);
  if (has('ninja')) merged.dodge += value('ninja', 0.08);
  if (has('bloodlust')) merged.atk *= 1 + value('bloodlust', 0.12);
  if (has('bulwark')) {
    merged.def *= 1 + value('bulwark', 0.08);
    merged.hp *= 1 + value('bulwark', 0.06);
  }
  if (has('duelist')) {
    merged.spd += Math.max(1, Math.round(value('duelist', 2)));
    merged.crit += value('duelist', 0.06);
  }
  if (has('lucky')) {
    merged.crit += value('lucky', 0.05);
    merged.dodge += value('lucky', 0.05);
  }
  if (has('armor')) merged.def *= 1 + value('armor', 0.15);
  if (has('tank')) merged.hp *= 1 + value('tank', 0.2);
  return merged;
}

function getRelicEffectiveStats(relic) {
  if (!relic || !relic.stats) return { ...EMPTY_BONUS_STATS };
  const mult = getRarityMultiplier(relic.rarity);
  const scaled = { ...EMPTY_BONUS_STATS };
  Object.keys(relic.stats).forEach(key => {
    const value = relic.stats[key];
    if (!value) return;
    if (key === 'crit' || key === 'dodge' || key === 'precision') {
      scaled[key] = scalePercent(value, mult);
    } else {
      scaled[key] = Math.round(value * mult);
    }
  });
  return scaled;
}

export function applyRelicPassives(stats, relicIds = []) {
  let merged = { ...stats };
  relicIds.forEach(id => {
    const relic = getRelicById(id);
    if (!relic) return;
    const bonus = getRelicEffectiveStats(relic);
    Object.keys(bonus).forEach(key => {
      merged[key] = (merged[key] || 0) + bonus[key];
    });
  });
  return merged;
}

export function applyRunModifiers(stats, modifierIds = []) {
  let merged = { ...stats };
  modifierIds.forEach(id => {
    const mod = getModifierById(id);
    if (!mod || !mod.mult) return;
    Object.keys(mod.mult).forEach(key => {
      const value = mod.mult[key];
      if (value === 0 || value === null || value === undefined) return;
      merged[key] = (merged[key] || 0) * (1 + value);
    });
  });
  return merged;
}

export function applySynergyPassives(stats, talentIds = []) {
  let merged = { ...stats };
  const has = id => hasTalent(talentIds, id);
  if (has('tank') && has('armor')) {
    merged.def *= 1.08;
    merged.hp *= 1.06;
  }
  if (has('ninja') && has('fast')) {
    merged.spd += 1;
    merged.dodge += 0.02;
  }
  if (has('precision') && has('focus')) {
    merged.precision += 0.03;
    merged.crit += 0.03;
  }
  if (has('berserk') && has('lifesteal')) {
    merged.atk *= 1.06;
  }
  if (has('thorns') && has('tank')) {
    merged.def *= 1.04;
  }
  return merged;
}

function getCombinedTalents(player) {
  const runTalents = Array.isArray(player.talents) ? player.talents : [];
  const permTalents = Array.isArray(player.permanent?.talents) ? player.permanent.talents : [];
  const combined = [...permTalents, ...runTalents];
  const rankMap = getTalentRankMap(combined);
  return Object.keys(rankMap).map(baseId => formatTalentKey(baseId, rankMap[baseId]));
}

function getCombinedRelics(player) {
  const runRelics = Array.isArray(player.relics) ? player.relics : [];
  const permRelics = Array.isArray(player.permanent?.relics) ? player.permanent.relics : [];
  return Array.from(new Set([...permRelics, ...runRelics]));
}

function getRunModifiersList(player) {
  return Array.isArray(player.runModifiers) ? player.runModifiers : [];
}

function getCombinedWeapons(player) {
  return getBestWeaponInstances(player);
}

function getCombinedBonusStats(player) {
  const combined = { ...EMPTY_BONUS_STATS };
  const run = player.bonusStats || {};
  const perm = player.permanent?.bonusStats || {};
  Object.keys(combined).forEach(key => {
    combined[key] = (run[key] || 0) + (perm[key] || 0);
  });
  return combined;
}

function getCombinedBonusPercents(player) {
  const combined = { ...EMPTY_BONUS_PERCENTS };
  const run = player.bonusPercents || {};
  const perm = player.permanent?.bonusPercents || {};
  Object.keys(combined).forEach(key => {
    combined[key] = (run[key] || 0) + (perm[key] || 0);
  });
  return combined;
}

function computeMaxPotentialDodge(player) {
  const combinedBonus = getCombinedBonusStats(player);
  const combinedPercents = getCombinedBonusPercents(player);
  const baseStats = computeBaseStats(player.level, combinedBonus);
  const relics = getCombinedRelics(player);
  const modifiers = getRunModifiersList(player);
  const talents = getCombinedTalents(player);
  let withTalents = applyTalentPassives(baseStats, talents);
  withTalents = applySynergyPassives(withTalents, talents);
  withTalents = applyFamilyPassives(withTalents, talents);
  withTalents = applyRelicPassives(withTalents, relics);
  const weaponList = getCombinedWeapons(player);
  const list = weaponList.length ? weaponList : [{ id: DEFAULT_WEAPON.id, rarity: DEFAULT_WEAPON.rarity }];
  return Math.max(...list.map(weapon => {
    let merged = applyWeaponStats(withTalents, weapon);
    merged = applyRunModifiers(merged, modifiers);
    merged = applyPercentBonuses(merged, combinedPercents);
    return merged.dodge;
  }));
}

function computeWeaponCollectionBonus(player) {
  const weapons = getCombinedWeapons(player);
  const count = weapons.length;
  const total = { ...EMPTY_BONUS_STATS };
  const perWeapon = WEAPON_COLLECTION_BONUS.perWeapon;
  Object.keys(total).forEach(key => {
    total[key] += (perWeapon[key] || 0) * count;
  });
  const sets = WEAPON_COLLECTION_BONUS.sets.map(set => {
    const active = count >= set.count;
    if (active) {
      Object.keys(set.stats).forEach(key => {
        total[key] += set.stats[key] || 0;
      });
    }
    return { ...set, active };
  });
  return {
    count,
    stats: total,
    perWeapon: { ...perWeapon },
    sets
  };
}

export function getPlayerCombatProfile(weaponOverride = null) {
  ensureState();
  const player = gameState.player;
  const weaponInstance = resolveWeaponInstance(player, weaponOverride ?? player.weapon);
  const bonusStats = getCombinedBonusStats(player);
  const bonusPercents = getCombinedBonusPercents(player);
  const base = computeBaseStats(player.level, bonusStats);
  const talents = getCombinedTalents(player);
  const relics = getCombinedRelics(player);
  const modifiers = getRunModifiersList(player);
  let merged = applyWeaponStats(base, weaponInstance);
  merged = applyRelicPassives(merged, relics);
  merged = applyTalentPassives(merged, talents);
  merged = applySynergyPassives(merged, talents);
  merged = applyFamilyPassives(merged, talents);
  merged = applyRunModifiers(merged, modifiers);
  merged = applyPercentBonuses(merged, bonusPercents);
  return {
    name: player.name,
    level: player.level,
    seed: player.seed,
    talents,
    relics,
    modifiers,
    weapon: weaponInstance?.id || null,
    stats: {
      hp: Math.round(merged.hp),
      atk: Math.round(merged.atk),
      def: Math.round(merged.def),
      spd: Math.round(merged.spd),
      crit: Math.min(0.95, merged.crit),
      dodge: Math.min(DODGE_CAP, merged.dodge),
      precision: Math.min(0.95, merged.precision)
    }
  };
}

export function getRandomOwnedWeaponId() {
  ensureState();
  const list = getCombinedWeapons(gameState.player);
  if (!list.length) return DEFAULT_WEAPON.id;
  const pick = list[Math.floor(Math.random() * list.length)];
  return pick?.id || DEFAULT_WEAPON.id;
}

export function getOwnedWeapons() {
  ensureState();
  return getCombinedWeapons(gameState.player);
}

export function getOwnedRelics() {
  ensureState();
  return getCombinedRelics(gameState.player);
}

export function getRunModifiers() {
  ensureState();
  return getRunModifiersList(gameState.player);
}

export function getOwnedTalents() {
  ensureState();
  return getCombinedTalents(gameState.player);
}

export function getOwnedBonusStats() {
  ensureState();
  return getCombinedBonusStats(gameState.player);
}

export function getOwnedBonusPercents() {
  ensureState();
  return getCombinedBonusPercents(gameState.player);
}

export function getWeaponCollectionBonus() {
  ensureState();
  return computeWeaponCollectionBonus(gameState.player);
}

export function getRunState() {
  ensureState();
  const player = gameState.player;
  return {
    level: player.level,
    xp: player.xp,
    gold: player.gold || 0,
    lastBossLevel: player.lastBossLevel || 0,
    runRewards: Array.isArray(player.runRewards) ? player.runRewards.slice() : []
  };
}

function shouldSpawnBoss(level, lastBossLevel) {
  const last = lastBossLevel || 0;
  const nextBossLevel = Math.floor(last / 5) * 5 + 5;
  return level >= nextBossLevel;
}

function pickEnemyWeapons(level, isBoss) {
  let count = level < 3 ? 0 : level < 6 ? 1 : level < 10 ? 2 : 3;
  if (isBoss) count += 1;
  count = Math.min(WEAPONS.length, Math.max(0, count));
  if (!count) return [];
  if (level < 5 && !isBoss) {
    return [];
  }
  let forceCommon = false;
  if (isBoss && level <= 5) {
    const player = gameState?.player;
    const hasPlayerWeapon = Array.isArray(player?.weapons) && player.weapons.length > 0;
    if (!hasPlayerWeapon) {
      count = 1;
      forceCommon = true;
    }
  }
  const pool = WEAPONS.slice();
  const picks = [];
  while (picks.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const weapon = pool.splice(idx, 1)[0];
    const rarity = (level < 5 && !isBoss) || forceCommon
      ? 'common'
      : pickWeighted(getRarityWeights(level)).id;
    picks.push({ id: weapon.id, rarity });
  }
  return picks;
}

function createEnemyProfile(level, isBoss) {
  const base = computeBaseStats(level);
  const earlyScale = 0.82 + (level - 1) * 0.026;
  const lateBoost = Math.max(0, level - 8) * 0.01;
  const normalScale = earlyScale + lateBoost;
  const bossScale = isBoss ? (level < 10 ? 1.22 : 1.38) : 1;
  const scale = normalScale * bossScale;
  const baseStats = {
    hp: base.hp * scale,
    atk: base.atk * scale,
    def: base.def * scale,
    spd: base.spd * scale,
    crit: base.crit,
    dodge: base.dodge,
    precision: base.precision
  };

  const profiles = [
    { id: 'tank', name: 'Tank', mods: { hp: 1.25, def: 1.15, spd: 0.9, atk: 0.95 } },
    { id: 'speed', name: 'Speed', mods: { spd: 1.25, dodge: 1.15, hp: 0.9 } },
    { id: 'glass', name: 'Glass', mods: { atk: 1.25, crit: 1.2, hp: 0.85, def: 0.9 } },
    { id: 'balanced', name: 'Balanced', mods: {} }
  ];

  const profile = profiles[Math.floor(Math.random() * profiles.length)];
  if (isBoss && level <= 5 && profile.id === 'tank') {
    profile.mods = { hp: 1.15, def: 1.08, spd: 0.95, atk: 0.98 };
  }
  const stats = { ...baseStats };
  Object.keys(profile.mods).forEach(key => {
    stats[key] = stats[key] * profile.mods[key];
  });

  const baseTalentCount = level <= 3 ? 0 : level <= 6 ? 1 : 2;
  const extraTalent = isBoss && level >= 15 ? 1 : 0;
  const talentCount = isBoss ? Math.min(3, baseTalentCount + extraTalent) : baseTalentCount;
  const allTalents = [
    'berserk',
    'tank',
    'thorns',
    'precision',
    'focus',
    'ninja',
    'fast',
    'armor',
    'lifesteal',
    'firstblood',
    'lucky',
    'pierce',
    'execution',
    'combo',
    'bonecrusher',
    'assault',
    'bleed',
    'lethal_precision',
    'carnage',
    'momentum',
    'sharpened',
    'opportunist',
    'surge',
    'resilience',
    'parry',
    'living_armor',
    'barrier',
    'stoic',
    'second_chance',
    'counter',
    'anchor',
    'iron_will',
    'rhythm',
    'mastery',
    'instinct',
    'anticipation',
    'relentless',
    'cold_focus',
    'arsenal',
    'siphon',
    'guardian'
  ];
  const talents = [];
  while (talents.length < talentCount && allTalents.length) {
    const idx = Math.floor(Math.random() * allTalents.length);
    talents.push(allTalents.splice(idx, 1)[0]);
  }

  const weapons = pickEnemyWeapons(level, isBoss);

  const withTalents = applyTalentPassives(stats, talents);
  return {
    name: isBoss ? `Boss ${profile.name}` : `Ennemi ${profile.name}`,
    level,
    isBoss,
    profile: profile.id,
    weapons,
    stats: {
      hp: Math.round(withTalents.hp),
      atk: Math.round(withTalents.atk),
      def: Math.round(withTalents.def),
      spd: Math.round(withTalents.spd),
      crit: clamp(withTalents.crit, 0.05, 0.95),
      dodge: clamp(withTalents.dodge, 0.05, DODGE_CAP),
      precision: clamp(withTalents.precision || 0, 0, 0.95)
    },
    talents
  };
}

export function getNextEnemyPreview() {
  ensureState();
  const player = gameState.player;
  const isBoss = shouldSpawnBoss(player.level, player.lastBossLevel);
  const cached = gameState.nextEnemy;
  if (!cached || cached.level !== player.level || cached.isBoss !== isBoss || !Array.isArray(cached.weapons)) {
    gameState.nextEnemy = createEnemyProfile(player.level, isBoss);
    saveState();
  }
  return JSON.parse(JSON.stringify(gameState.nextEnemy));
}

export function consumeNextEnemy() {
  ensureState();
  const player = gameState.player;
  const isBoss = shouldSpawnBoss(player.level, player.lastBossLevel);
  if (!gameState.nextEnemy || gameState.nextEnemy.level !== player.level || gameState.nextEnemy.isBoss !== isBoss || !Array.isArray(gameState.nextEnemy.weapons)) {
    gameState.nextEnemy = createEnemyProfile(player.level, isBoss);
  }
  const enemy = JSON.parse(JSON.stringify(gameState.nextEnemy));
  gameState.nextEnemy = null;
  saveState();
  return enemy;
}

function addHistoryEntry(entry) {
  gameState.player.history.unshift(entry);
  gameState.player.history = gameState.player.history.slice(0, 20);
}

function addRewardHistory(entry) {
  addHistoryEntry({
    type: 'reward',
    date: new Date().toISOString(),
    ...entry
  });
}

function addEventHistory(entry) {
  addHistoryEntry({
    type: 'event',
    date: new Date().toISOString(),
    ...entry
  });
}

function buildEventOutcomeSummary(statChanges, talentId, weaponId, relicId, modifierId, cost) {
  const parts = [];
  if (Array.isArray(statChanges) && statChanges.length) {
    parts.push(buildEventDesc(statChanges));
  }
  if (talentId) {
    const talent = getTalentById(talentId);
    parts.push(`Talent: ${talent ? talent.name : talentId}`);
  }
  if (weaponId) {
    const weapon = getWeaponById(weaponId);
    parts.push(`Arme: ${weapon ? weapon.name : weaponId}`);
  }
  if (relicId) {
    const relic = getRelicById(relicId);
    parts.push(`Relique: ${relic ? relic.name : relicId}`);
  }
  if (modifierId) {
    const modifier = getModifierById(modifierId);
    parts.push(`Serment: ${modifier ? modifier.name : modifierId}`);
  }
  if (cost) {
    parts.push(`Or -${cost}`);
  }
  return parts.length ? parts.join(' | ') : 'Aucun effet.';
}

function pickWeighted(list) {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of list) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return list[list.length - 1];
}

function getRarityWeights(level) {
  const brackets = [
    { min: 1, common: 40, uncommon: 25, rare: 20, epic: 15, legendary: 0, ultimate: 0 },
    { min: 10, common: 35, uncommon: 23, rare: 21, epic: 20, legendary: 1, ultimate: 0 },
    { min: 20, common: 30, uncommon: 20, rare: 22, epic: 23, legendary: 4, ultimate: 1 },
    { min: 30, common: 24, uncommon: 18, rare: 23, epic: 24, legendary: 8, ultimate: 3 },
    { min: 40, common: 20, uncommon: 16, rare: 23, epic: 23, legendary: 12, ultimate: 6 },
    { min: 50, common: 14, uncommon: 12, rare: 22, epic: 22, legendary: 19, ultimate: 11 },
    { min: 60, common: 8, uncommon: 10, rare: 20, epic: 22, legendary: 25, ultimate: 15 }
  ];

  const bracket = brackets.reduce((picked, entry) => (level >= entry.min ? entry : picked), brackets[0]);
  const weights = {
    common: bracket.common / 100,
    uncommon: bracket.uncommon / 100,
    rare: bracket.rare / 100,
    epic: bracket.epic / 100,
    legendary: bracket.legendary / 100,
    ultimate: bracket.ultimate / 100
  };
  if (level < MIN_LEGENDARY_LEVEL) weights.legendary = 0;
  if (level < MIN_ULTIMATE_LEVEL) weights.ultimate = 0;
  const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
  return Object.keys(weights).map(id => ({ id, weight: total ? weights[id] / total : 0 }));
}

const STAT_REWARD_PERCENT_CHANCE = {
  common: 0,
  uncommon: 0,
  rare: 0.15,
  epic: 0.35,
  legendary: 0.6,
  ultimate: 0.85
};

const STAT_REWARD_PERCENT_TIERS = {
  rare: { hp: 0.02, atk: 0.02, def: 0.02, spd: 0.015, crit: 0.004, dodge: 0.004, precision: 0.004 },
  epic: { hp: 0.03, atk: 0.03, def: 0.03, spd: 0.02, crit: 0.006, dodge: 0.006, precision: 0.006 },
  legendary: { hp: 0.045, atk: 0.045, def: 0.045, spd: 0.03, crit: 0.008, dodge: 0.008, precision: 0.008 },
  ultimate: { hp: 0.06, atk: 0.06, def: 0.06, spd: 0.04, crit: 0.012, dodge: 0.012, precision: 0.012 }
};

function buildStatReward(level, excludedStats = []) {
  const rarity = pickWeighted(getRarityWeights(level)).id;

  const tiers = {
    common: { hp: 5, atk: 1, def: 1, spd: 1, crit: 0.0025, dodge: 0.0025, precision: 0.0025 },
    uncommon: { hp: 7, atk: 1, def: 1, spd: 1, crit: 0.0035, dodge: 0.0035, precision: 0.0035 },
    rare: { hp: 10, atk: 2, def: 2, spd: 2, crit: 0.005, dodge: 0.005, precision: 0.005 },
    epic: { hp: 14, atk: 3, def: 3, spd: 3, crit: 0.008, dodge: 0.008, precision: 0.008 },
    legendary: { hp: 19, atk: 4, def: 4, spd: 4, crit: 0.012, dodge: 0.012, precision: 0.012 },
    ultimate: { hp: 25, atk: 5, def: 5, spd: 5, crit: 0.017, dodge: 0.017, precision: 0.017 }
  };

  const stats = Object.keys(tiers[rarity]);
  const pool = stats.filter(stat => !excludedStats.includes(stat));
  const list = pool.length ? pool : stats;
  const stat = list[Math.floor(Math.random() * list.length)];
  const tier = Math.floor((level - 1) / 5);
  const scale = 1 + tier * 0.12;
  const isPercent = Math.random() < (STAT_REWARD_PERCENT_CHANCE[rarity] || 0);
  let value;
  let label;
  let desc;
  if (isPercent) {
    const percentTier = STAT_REWARD_PERCENT_TIERS[rarity] || STAT_REWARD_PERCENT_TIERS.rare;
    const rawValue = percentTier[stat] || 0.02;
    value = Number((rawValue * scale).toFixed(3));
    const statLabel = stat === 'precision' ? 'PREC' : stat.toUpperCase();
    label = `+${(value * 100).toFixed(1)}% ${statLabel}`;
    desc = `Bonus % ${stat.toUpperCase()}.`;
  } else {
    const rawValue = tiers[rarity][stat];
    value = stat === 'crit' || stat === 'dodge' || stat === 'precision'
      ? Number((rawValue * scale).toFixed(3))
      : Math.max(1, Math.round(rawValue * scale));
    const statLabel = stat === 'precision' ? 'PREC' : stat.toUpperCase();
    label = stat === 'crit' || stat === 'dodge' || stat === 'precision'
      ? `+${(value * 100).toFixed(1)}% ${statLabel}`
      : `+${value} ${stat.toUpperCase()}`;
    desc = `Bonus ${stat.toUpperCase()}.`;
  }
  return {
    id: `stat-${stat}-${rarity}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'stat',
    stat,
    value,
    isPercent,
    rarity,
    label,
    desc
  };
}

function buildTalentUpgrade(level, owned, excludedIds = new Set()) {
  const rankMap = getTalentRankMap(owned);
  const available = TALENTS.filter(t => !excludedIds.has(t.id) && (rankMap[t.id] || 0) < 3);
  if (!available.length) return null;
  const desiredRank = getTalentRankFromRarity(pickWeighted(getRarityWeights(level)).id);
  const filtered = available.filter(t => getNextTalentRank(rankMap[t.id] || 0) === desiredRank);
  const pool = filtered.length ? filtered : available;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const nextRank = getNextTalentRank(rankMap[pick.id] || 0);
  const talentId = formatTalentKey(pick.id, nextRank);
  const rankedTalent = getTalentById(talentId);
  return {
    base: pick,
    talentId,
    rank: nextRank,
    rarity: rankedTalent?.rarity || getTalentRankRarity(nextRank),
    label: rankedTalent?.name || `${pick.name} ${getTalentRankLabel(nextRank)}`
  };
}

function buildTalentReward(level, owned, excludedIds = new Set()) {
  const upgrade = buildTalentUpgrade(level, owned, excludedIds);
  if (!upgrade) return null;
  return {
    id: `talent-${upgrade.base.id}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'talent',
    talentId: upgrade.talentId,
    rarity: upgrade.rarity,
    label: upgrade.label,
    desc: getTalentDescription(upgrade.talentId)
  };
}

function buildWeaponReward(level, currentWeapon, excludedIds = new Set()) {
  const available = WEAPONS.filter(w => !excludedIds.has(w.id));
  if (!available.length) return null;
  const pick = available[Math.floor(Math.random() * available.length)];
  const rarity = pickWeighted(getRarityWeights(level)).id;
  return {
    id: `weapon-${pick.id}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'weapon',
    weaponId: pick.id,
    rarity,
    label: pick.name,
    desc: pick.desc
  };
}

function buildLevelUpOptions(level) {
  const player = gameState.player;
  const options = [];

  const ownedTalents = getCombinedTalents(player);
  const ownedRanks = getTalentRankMap(ownedTalents);
  const talentAvailable = TALENTS.some(t => (ownedRanks[t.id] || 0) < 3);
  const weaponAvailable = WEAPONS.length > 0;

  const tier = Math.floor((level - 1) / 5);
  const bonusChance = Math.min(0.12, tier * 0.02);
  const rollTalent = level % 2 === 0 && Math.random() < (0.38 + bonusChance) && talentAvailable;
  const earlyWeaponBoost = level < 5 ? 0.25 : 0;
  const rollWeapon = level % 3 === 0 && Math.random() < (0.28 + bonusChance + earlyWeaponBoost) && weaponAvailable;

  let choice = 'stat';
  if (level === 3) {
    choice = 'weapon';
  }
  if (rollTalent && rollWeapon) {
    choice = Math.random() < 0.5 ? 'weapon' : 'talent';
  } else if (rollTalent) {
    choice = 'talent';
  } else if (rollWeapon) {
    choice = 'weapon';
  }

  if (choice === 'talent') {
    const usedTalents = new Set();
    for (let i = 0; i < 3; i++) {
      const reward = buildTalentReward(level, ownedTalents, usedTalents);
      if (!reward) break;
      options.push(reward);
      const { baseId } = parseTalentKey(reward.talentId);
      if (baseId) usedTalents.add(baseId);
    }
    if (options.length) return options;
  }

  if (choice === 'weapon') {
    const usedWeapons = new Set();
    for (let i = 0; i < 3; i++) {
      const reward = buildWeaponReward(level, player.weapon, usedWeapons);
      if (!reward) break;
      options.push(reward);
      usedWeapons.add(reward.weaponId);
    }
    if (options.length) return options;
  }

  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;

  const usedStats = new Set();
  if (dodgeCapReached) usedStats.add('dodge');
  while (options.length < 3) {
    const reward = buildStatReward(level, Array.from(usedStats));
    options.push(reward);
    usedStats.add(reward.stat);
  }

  return options;
}

function formatStatLabel(stat, value) {
  const label = stat === 'precision' ? 'PREC' : stat.toUpperCase();
  if (stat === 'crit' || stat === 'dodge' || stat === 'precision') {
    return `+${(value * 100).toFixed(1)}% ${label}`;
  }
  return `+${Math.round(value)} ${label}`;
}

function formatStatLabelPercent(stat, value) {
  const label = stat === 'precision' ? 'PREC' : stat.toUpperCase();
  return `+${(value * 100).toFixed(1)}% ${label}`;
}

function formatStatChange(stat, value) {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  const label = stat === 'precision' ? 'PREC' : stat.toUpperCase();
  if (stat === 'crit' || stat === 'dodge' || stat === 'precision') {
    return `${sign}${(abs * 100).toFixed(1)}% ${label}`;
  }
  return `${sign}${Math.round(abs)} ${label}`;
}

function buildRewardKey(reward) {
  if (!reward) return '';
  const rarity = normalizeRarity(reward.rarity || 'common');
  if (reward.type === 'stat') {
    const percentFlag = reward.isPercent ? 'pct' : 'flat';
    return `stat:${reward.stat}:${reward.value}:${percentFlag}:${rarity}`;
  }
  if (reward.type === 'talent') return `talent:${reward.talentId}:${rarity}`;
  if (reward.type === 'weapon') return `weapon:${reward.weaponId}:${rarity}`;
  if (reward.type === 'relic') return `relic:${reward.relicId}:${rarity}`;
  return `${reward.type || 'reward'}:${rarity}`;
}

function createRunReward(data) {
  const reward = { ...data };
  reward.key = reward.key || buildRewardKey(reward);
  return reward;
}

function scaleEventValue(stat, base, level, multiplier = 1) {
  const tier = Math.floor((level - 1) / 5);
  const scale = 1 + tier * 0.15;
  const raw = base * scale * multiplier;
  if (stat === 'crit' || stat === 'dodge' || stat === 'precision') {
    return Number(raw.toFixed(3));
  }
  return Math.max(1, Math.round(raw));
}

function normalizeStatChanges(statChanges, dodgeCapReached) {
  return statChanges.map(change => {
    let stat = change.stat;
    if (stat === 'dodge' && change.value > 0 && dodgeCapReached) {
      stat = 'precision';
    }
    return {
      stat,
      value: change.value,
      reward: change.reward ?? change.value > 0,
      isPercent: !!change.isPercent
    };
  });
}

function buildEventDesc(statChanges, extraParts = []) {
  const parts = [];
  extraParts.forEach(part => {
    if (part) parts.push(part);
  });
  statChanges.forEach(change => {
    if (change.isPercent) {
      parts.push(formatStatLabelPercent(change.stat, change.value));
    } else {
      parts.push(formatStatChange(change.stat, change.value));
    }
  });
  if (!parts.length) return 'Aucun effet.';
  return parts.join(', ');
}

function buildRiskDesc(outcomes) {
  if (!Array.isArray(outcomes) || !outcomes.length) return 'Aucun effet.';
  return outcomes.map(outcome => {
    const chance = outcome.chance != null ? Math.round(outcome.chance * 100) : 0;
    const desc = buildEventDesc(outcome.statChanges || [], outcome.extraParts || []);
    return `${chance}%: ${desc}`;
  }).join(' | ');
}

function getRarityRank(rarity) {
  const normalized = normalizeRarity(rarity);
  if (normalized === 'ultimate') return 6;
  if (normalized === 'legendary') return 5;
  if (normalized === 'epic') return 4;
  if (normalized === 'rare') return 3;
  if (normalized === 'uncommon') return 2;
  return 1;
}

function pickHighestRarity(list) {
  if (!Array.isArray(list) || !list.length) return 'common';
  const pick = list.reduce((best, current) => {
    if (!best) return current;
    return getRarityRank(current) > getRarityRank(best) ? current : best;
  }, null);
  return normalizeRarity(pick) || 'common';
}

function getShopCost(rarity, level) {
  const base = {
    common: 20,
    uncommon: 32,
    rare: 48,
    epic: 70,
    legendary: 100,
    ultimate: 135
  };
  const tier = Math.floor((level - 1) / 5);
  const scale = 1 + tier * 0.18;
  const normalized = normalizeRarity(rarity);
  const value = Math.round((base[normalized] || base.common) * scale);
  return Math.max(10, value);
}

function buildShopStatOffer(level, player, count = 2) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const usedStats = new Set();
  if (dodgeCapReached) usedStats.add('dodge');
  const rewards = [];
  while (rewards.length < count) {
    const reward = buildStatReward(level, Array.from(usedStats));
    rewards.push(reward);
    usedStats.add(reward.stat);
  }
  const rarity = pickHighestRarity(rewards.map(reward => reward.rarity));
  const statChanges = rewards.map(reward => ({
    stat: reward.stat,
    value: reward.value,
    reward: true,
    isPercent: reward.isPercent
  }));
  return {
    id: `shop-stat-${Math.random().toString(36).slice(2, 6)}`,
    type: 'stat',
    label: 'Pack de stats',
    rarity,
    statChanges,
    desc: rewards.map(reward => reward.label).join(' | ')
  };
}

function pickByRarity(list, level) {
  if (!list.length) return null;
  const weights = getRarityWeights(level);
  const filtered = weights.filter(entry => list.some(item => normalizeRarity(item.rarity) === entry.id));
  const pickRarity = pickWeighted(filtered.length ? filtered : weights).id;
  const candidates = list.filter(item => normalizeRarity(item.rarity) === pickRarity);
  const pool = candidates.length ? candidates : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickEventWeapon(player, level) {
  const available = WEAPONS.slice();
  if (!available.length) return null;
  const pick = available[Math.floor(Math.random() * available.length)];
  const rarity = pickWeighted(getRarityWeights(level)).id;
  return { ...pick, rarity };
}

function pickEventTalent(player, level) {
  const owned = getCombinedTalents(player);
  const upgrade = buildTalentUpgrade(level, owned, new Set());
  if (!upgrade) return null;
  return {
    id: upgrade.base.id,
    talentId: upgrade.talentId,
    name: upgrade.label,
    rarity: upgrade.rarity
  };
}

function pickOutcome(outcomes) {
  const list = Array.isArray(outcomes) ? outcomes : [];
  if (!list.length) return null;
  const total = list.reduce((sum, item) => sum + (item.chance ?? 0), 0);
  const max = total > 0 ? total : list.length;
  let roll = Math.random() * max;
  for (const item of list) {
    const weight = total > 0 ? (item.chance ?? 0) : 1;
    if (roll < weight) return item;
    roll -= weight;
  }
  return list[list.length - 1];
}

function buildBloodAltarEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const atkGain = scaleEventValue('atk', 2, level, 1.2);
  const critGain = scaleEventValue('crit', 0.006, level, 1.2);
  const hpCost = scaleEventValue('hp', 10, level, 1);
  const offerStats = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'crit', value: critGain },
    { stat: 'hp', value: -hpCost, reward: false }
  ], dodgeCapReached);

  const hpGain = scaleEventValue('hp', 12, level, 1.1);
  const defGain = scaleEventValue('def', 2, level, 1);
  const spdCost = scaleEventValue('spd', 1, level, 1);
  const guardStats = normalizeStatChanges([
    { stat: 'hp', value: hpGain },
    { stat: 'def', value: defGain },
    { stat: 'spd', value: -spdCost, reward: false }
  ], dodgeCapReached);

  return {
    id: 'event-blood-altar',
    kind: 'altar',
    title: 'Autel de sang',
    text: 'Une lame ancienne reclame un prix. Le sang contre la puissance.',
    options: [
      {
        id: 'blood-offer',
        label: 'Offrir du sang',
        rarity: 'epic',
        statChanges: offerStats,
        desc: buildEventDesc(offerStats)
      },
      {
        id: 'blood-guard',
        label: 'Graver un serment',
        rarity: 'rare',
        statChanges: guardStats,
        desc: buildEventDesc(guardStats)
      },
      {
        id: 'blood-leave',
        label: 'Partir',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildForgeEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const weapon = pickEventWeapon(player, level);
  let weaponOption;
  if (weapon) {
    const defCost = scaleEventValue('def', 2, level, 1);
    const statChanges = normalizeStatChanges([
      { stat: 'def', value: -defCost, reward: false }
    ], dodgeCapReached);
    weaponOption = {
      id: 'forge-weapon',
      label: 'Marchander une arme',
      rarity: normalizeRarity(weapon.rarity) || 'rare',
      weaponId: weapon.id,
      statChanges,
      desc: buildEventDesc(statChanges, [`Arme: ${weapon.name}`])
    };
  } else {
    const atkGain = scaleEventValue('atk', 2, level, 1.1);
    const spdGain = scaleEventValue('spd', 2, level, 1);
    const statChanges = normalizeStatChanges([
      { stat: 'atk', value: atkGain },
      { stat: 'spd', value: spdGain }
    ], dodgeCapReached);
    weaponOption = {
      id: 'forge-training',
      label: 'Travail du metal',
      rarity: 'rare',
      statChanges,
      desc: buildEventDesc(statChanges)
    };
  }

  const hpGain = scaleEventValue('hp', 10, level, 1);
  const defGain = scaleEventValue('def', 2, level, 1.1);
  const spdCost = scaleEventValue('spd', 1, level, 1);
  const reinforceStats = normalizeStatChanges([
    { stat: 'hp', value: hpGain },
    { stat: 'def', value: defGain },
    { stat: 'spd', value: -spdCost, reward: false }
  ], dodgeCapReached);

  return {
    id: 'event-forge',
    kind: 'forge',
    title: 'Forgeron errant',
    text: 'Un artisan propose ses services, mais rien n est gratuit.',
    options: [
      weaponOption,
      {
        id: 'forge-armor',
        label: 'Renforcer l armure',
        rarity: 'rare',
        statChanges: reinforceStats,
        desc: buildEventDesc(reinforceStats)
      },
      {
        id: 'forge-leave',
        label: 'Refuser',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildScrollEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const talent = pickEventTalent(player, level);
  let talentOption;
  if (talent) {
    const critCost = scaleEventValue('crit', 0.004, level, 1);
    const statChanges = normalizeStatChanges([
      { stat: 'crit', value: -critCost, reward: false }
    ], dodgeCapReached);
    const talentDesc = getTalentDescription(talent.talentId);
    talentOption = {
      id: 'scroll-talent',
      label: 'Lire le parchemin',
      rarity: normalizeRarity(talent.rarity) || 'rare',
      talentId: talent.talentId,
      statChanges,
      desc: buildEventDesc(statChanges, [`Talent: ${talent.name} (${talentDesc})`])
    };
  } else {
    const critGain = scaleEventValue('crit', 0.006, level, 1.2);
    const precisionGain = scaleEventValue('precision', 0.006, level, 1.1);
    const statChanges = normalizeStatChanges([
      { stat: 'crit', value: critGain },
      { stat: 'precision', value: precisionGain }
    ], dodgeCapReached);
    talentOption = {
      id: 'scroll-focus',
      label: 'Meditation',
      rarity: 'rare',
      statChanges,
      desc: buildEventDesc(statChanges)
    };
  }

  const hpCost = scaleEventValue('hp', 8, level, 1);
  const spdGain = scaleEventValue('spd', 2, level, 1.1);
  const precisionGain = scaleEventValue('precision', 0.006, level, 1.1);
  const insightStats = normalizeStatChanges([
    { stat: 'spd', value: spdGain },
    { stat: 'precision', value: precisionGain },
    { stat: 'hp', value: -hpCost, reward: false }
  ], dodgeCapReached);

  return {
    id: 'event-scroll',
    kind: 'scroll',
    title: 'Parchemin maudit',
    text: 'Une page vibre d energie. Le savoir a toujours un cout.',
    options: [
      talentOption,
      {
        id: 'scroll-insight',
        label: 'Canaliser',
        rarity: 'epic',
        statChanges: insightStats,
        desc: buildEventDesc(insightStats)
      },
      {
        id: 'scroll-leave',
        label: 'Ignorer',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildTrainingEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const spdGain = scaleEventValue('spd', 2, level, 1.1);
  const precisionGain = scaleEventValue('precision', 0.007, level, 1.1);
  const hpCost = scaleEventValue('hp', 8, level, 1);
  const speedStats = normalizeStatChanges([
    { stat: 'spd', value: spdGain },
    { stat: 'precision', value: precisionGain },
    { stat: 'hp', value: -hpCost, reward: false }
  ], dodgeCapReached);

  const atkGain = scaleEventValue('atk', 2, level, 1.1);
  const defGain = scaleEventValue('def', 2, level, 1.1);
  const dodgeCost = scaleEventValue('dodge', 0.004, level, 1);
  const powerStats = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'def', value: defGain },
    { stat: 'dodge', value: -dodgeCost, reward: false }
  ], dodgeCapReached);

  return {
    id: 'event-training',
    kind: 'training',
    title: 'Salle d entrainement',
    text: 'Des mannequins et des armes attendent. Prendre le temps, c est survivre.',
    options: [
      {
        id: 'training-speed',
        label: 'Reflexes',
        rarity: 'rare',
        statChanges: speedStats,
        desc: buildEventDesc(speedStats)
      },
      {
        id: 'training-power',
        label: 'Force brute',
        rarity: 'rare',
        statChanges: powerStats,
        desc: buildEventDesc(powerStats)
      },
      {
        id: 'training-leave',
        label: 'Partir',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildMerchantEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const weapon = pickEventWeapon(player, level);
  const talent = pickEventTalent(player, level);

  const hpCost = scaleEventValue('hp', 12, level, 1.1);
  const defCost = scaleEventValue('def', 2, level, 1);
  const weaponCost = normalizeStatChanges([
    { stat: 'hp', value: -hpCost, reward: false },
    { stat: 'def', value: -defCost, reward: false }
  ], dodgeCapReached);

  const spdCost = scaleEventValue('spd', 1, level, 1);
  const critCost = scaleEventValue('crit', 0.003, level, 1);
  const talentCost = normalizeStatChanges([
    { stat: 'spd', value: -spdCost, reward: false },
    { stat: 'crit', value: -critCost, reward: false }
  ], dodgeCapReached);

  const atkGain = scaleEventValue('atk', 2, level, 1.1);
  const defGain = scaleEventValue('def', 2, level, 1);
  const bargainStats = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'def', value: defGain }
  ], dodgeCapReached);

  const options = [];
  if (weapon) {
    options.push({
      id: 'merchant-weapon',
      label: 'Acheter une arme',
      rarity: normalizeRarity(weapon.rarity) || 'rare',
      weaponId: weapon.id,
      statChanges: weaponCost,
      desc: buildEventDesc(weaponCost, [`Arme: ${weapon.name}`])
    });
  } else {
    options.push({
      id: 'merchant-weapon',
      label: 'Acheter une arme',
      rarity: 'rare',
      statChanges: bargainStats,
      desc: buildEventDesc(bargainStats)
    });
  }

  if (talent) {
    options.push({
      id: 'merchant-talent',
      label: 'Signer un contrat',
      rarity: normalizeRarity(talent.rarity) || 'rare',
      talentId: talent.talentId,
      statChanges: talentCost,
      desc: buildEventDesc(talentCost, [`Talent: ${talent.name}`])
    });
  } else {
    options.push({
      id: 'merchant-talent',
      label: 'Signer un contrat',
      rarity: 'rare',
      statChanges: bargainStats,
      desc: buildEventDesc(bargainStats)
    });
  }

  options.push({
    id: 'merchant-bargain',
    label: 'Marchander',
    rarity: 'uncommon',
    statChanges: bargainStats,
    desc: buildEventDesc(bargainStats)
  });

  return {
    id: 'event-merchant',
    kind: 'merchant',
    title: 'Marchand nomade',
    text: 'Il propose des affaires douteuses. Le prix est souvent cache.',
    options
  };
}

function buildRiskEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const atkGain = scaleEventValue('atk', 3, level, 1.2);
  const critGain = scaleEventValue('crit', 0.008, level, 1.2);
  const hpLoss = scaleEventValue('hp', 16, level, 1);
  const winStats = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'crit', value: critGain }
  ], dodgeCapReached);
  const loseStats = normalizeStatChanges([
    { stat: 'hp', value: -hpLoss, reward: false }
  ], dodgeCapReached);

  const spdGain = scaleEventValue('spd', 2, level, 1.1);
  const precisionGain = scaleEventValue('precision', 0.008, level, 1.1);
  const defLoss = scaleEventValue('def', 2, level, 1);
  const winStatsAlt = normalizeStatChanges([
    { stat: 'spd', value: spdGain },
    { stat: 'precision', value: precisionGain }
  ], dodgeCapReached);
  const loseStatsAlt = normalizeStatChanges([
    { stat: 'def', value: -defLoss, reward: false }
  ], dodgeCapReached);

  const gambleOutcomes = [
    { chance: 0.6, statChanges: winStats },
    { chance: 0.4, statChanges: loseStats }
  ];
  const coinOutcomes = [
    { chance: 0.5, statChanges: winStatsAlt },
    { chance: 0.5, statChanges: loseStatsAlt }
  ];

  return {
    id: 'event-gamble',
    kind: 'risk',
    title: 'Jeu des os',
    text: 'Un joueur propose un pari. Gagner peut tout changer, perdre aussi.',
    options: [
      {
        id: 'gamble-roll',
        label: 'Lancer les des',
        rarity: 'epic',
        outcomes: gambleOutcomes,
        desc: buildRiskDesc(gambleOutcomes)
      },
      {
        id: 'gamble-coin',
        label: 'Pile ou face',
        rarity: 'rare',
        outcomes: coinOutcomes,
        desc: buildRiskDesc(coinOutcomes)
      },
      {
        id: 'gamble-leave',
        label: 'Refuser',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildRelicEvent(level, player) {
  const owned = getCombinedRelics(player);
  if (owned.length >= MAX_RELICS) return null;
  const available = RELICS.filter(r => !owned.includes(r.id));
  if (!available.length) return null;
  const picks = [];
  const pool = available.slice();
  while (picks.length < Math.min(3, pool.length)) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return {
    id: 'event-relic',
    kind: 'relic',
    title: 'Reliquaire scelle',
    text: 'Des reliques oubliées attendent un nouveau porteur.',
    options: [
      ...picks.map(relic => ({
        id: `relic-${relic.id}`,
        label: relic.name,
        rarity: relic.rarity,
        relicId: relic.id,
        desc: relic.desc
      })),
      {
        id: 'relic-leave',
        label: 'Refuser',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildOmenEvent(level, player) {
  const current = Array.isArray(player.runModifiers) ? player.runModifiers : [];
  if (current.length >= MAX_RUN_MODIFIERS) return null;
  return {
    id: 'event-omen',
    kind: 'omen',
    title: 'Serment du voile',
    text: 'Une voix propose un pacte : puissance contre sacrifice.',
    options: [
      ...RUN_MODIFIERS.map(mod => ({
        id: `omen-${mod.id}`,
        label: mod.name,
        rarity: mod.rarity,
        modifierId: mod.id,
        desc: mod.desc
      })),
      {
        id: 'omen-leave',
        label: 'Refuser',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildRiftEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const atkGain = scaleEventValue('atk', 4, level, 1.2);
  const critGain = scaleEventValue('crit', 0.012, level, 1.2);
  const defLoss = scaleEventValue('def', 2, level, 1);
  const hpGain = scaleEventValue('hp', 14, level, 1.1);
  const spdLoss = scaleEventValue('spd', 2, level, 1);
  const pactPower = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'crit', value: critGain },
    { stat: 'def', value: -defLoss, reward: false }
  ], dodgeCapReached);
  const pactGuard = normalizeStatChanges([
    { stat: 'hp', value: hpGain },
    { stat: 'def', value: defLoss },
    { stat: 'spd', value: -spdLoss, reward: false }
  ], dodgeCapReached);
  return {
    id: 'event-rift',
    kind: 'rift',
    title: 'Fissure ardente',
    text: 'Un portail rougeoyant s ouvre devant toi.',
    options: [
      {
        id: 'rift-power',
        label: 'Absorber la faille',
        rarity: 'epic',
        statChanges: pactPower,
        desc: buildEventDesc(pactPower)
      },
      {
        id: 'rift-guard',
        label: 'Sceller la faille',
        rarity: 'rare',
        statChanges: pactGuard,
        desc: buildEventDesc(pactGuard)
      },
      {
        id: 'rift-leave',
        label: 'Ignorer',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function buildShopEvent(level, player) {
  const ownedTalents = getCombinedTalents(player);
  const options = [];

  const usedWeapons = new Set();
  const weaponReward = buildWeaponReward(level, player.weapon, usedWeapons);
  if (weaponReward) {
    options.push({
      id: `shop-${weaponReward.id}`,
      label: weaponReward.label,
      rarity: weaponReward.rarity,
      weaponId: weaponReward.weaponId,
      statChanges: [],
      desc: weaponReward.desc,
      cost: getShopCost(weaponReward.rarity, level)
    });
  }

  const usedTalents = new Set();
  const talentReward = buildTalentReward(level, ownedTalents, usedTalents);
  if (talentReward) {
    options.push({
      id: `shop-${talentReward.id}`,
      label: talentReward.label,
      rarity: talentReward.rarity,
      talentId: talentReward.talentId,
      statChanges: [],
      desc: talentReward.desc,
      cost: getShopCost(talentReward.rarity, level)
    });
  }

  while (options.length < 3) {
    const statOffer = buildShopStatOffer(level, player, options.length === 0 ? 3 : 2);
    options.push({
      id: `shop-${statOffer.id}`,
      label: statOffer.label,
      rarity: statOffer.rarity,
      statChanges: statOffer.statChanges,
      desc: statOffer.desc,
      cost: getShopCost(statOffer.rarity, level)
    });
  }

  options.push({
    id: 'shop-leave',
    label: 'Quitter la boutique',
    rarity: 'common',
    statChanges: [],
    desc: 'Aucun effet.',
    exit: true
  });

  return {
    id: 'event-shop',
    kind: 'shop',
    title: 'Boutique itinerante',
    text: 'Plusieurs artefacts sont exposes. Tu peux acheter tant que tu as de l or.',
    options
  };
}

function buildCurseEvent(level, player) {
  const dodgeCapReached = computeMaxPotentialDodge(player) >= DODGE_CAP;
  const atkGain = scaleEventValue('atk', 6, level, 1.35);
  const critGain = scaleEventValue('crit', 0.016, level, 1.35);
  const atkPctGain = scaleEventValue('atk', 0.05, level, 1.1);
  const hpLoss = scaleEventValue('hp', 10, level, 0.9);
  const defLoss = scaleEventValue('def', 1, level, 0.9);
  const curseBlood = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'crit', value: critGain },
    { stat: 'atk', value: atkPctGain, isPercent: true },
    { stat: 'hp', value: -hpLoss, reward: false },
    { stat: 'def', value: -defLoss, reward: false }
  ], dodgeCapReached);

  const spdGain = scaleEventValue('spd', 4, level, 1.25);
  const dodgeGain = scaleEventValue('dodge', 0.013, level, 1.25);
  const spdPctGain = scaleEventValue('spd', 0.04, level, 1.1);
  const atkLoss = scaleEventValue('atk', 1, level, 0.9);
  const curseShade = normalizeStatChanges([
    { stat: 'spd', value: spdGain },
    { stat: 'dodge', value: dodgeGain },
    { stat: 'spd', value: spdPctGain, isPercent: true },
    { stat: 'atk', value: -atkLoss, reward: false }
  ], dodgeCapReached);

  return {
    id: 'event-curse',
    kind: 'curse',
    title: 'Malediction antique',
    text: 'Un pacte offre une force enorme, mais la dette est lourde.',
    options: [
      {
        id: 'curse-blood',
        label: 'Marque du sang',
        rarity: 'ultimate',
        statChanges: curseBlood,
        desc: buildEventDesc(curseBlood)
      },
      {
        id: 'curse-shade',
        label: 'Ombre vive',
        rarity: 'epic',
        statChanges: curseShade,
        desc: buildEventDesc(curseShade)
      },
      {
        id: 'curse-leave',
        label: 'Refuser',
        rarity: 'common',
        statChanges: [],
        desc: 'Aucun effet.'
      }
    ]
  };
}

function normalizeEventRarities(event, level) {
  if (!event || !Array.isArray(event.options)) return event;
  const rollRarity = () => pickWeighted(getRarityWeights(level)).id;
  const isNoRewardOption = option => {
    const hasDirectReward = !!(option.weaponId || option.talentId || option.relicId || option.modifierId);
    const changes = Array.isArray(option.statChanges) ? option.statChanges : [];
    const hasPositiveReward = changes.some(change => change && change.reward && change.value > 0);
    const outcomes = Array.isArray(option.outcomes) ? option.outcomes : [];
    const hasOutcomeReward = outcomes.some(outcome => outcome && (outcome.weaponId || outcome.talentId || outcome.relicId || outcome.modifierId || (Array.isArray(outcome.statChanges) && outcome.statChanges.some(change => change && change.reward && change.value > 0))));
    return !(hasDirectReward || hasPositiveReward || hasOutcomeReward);
  };
  event.options.forEach(option => {
    if (!option || typeof option !== 'object') return;
    if (isNoRewardOption(option)) {
      option.rarity = 'common';
      return;
    }
    if (option.rarity) {
      option.rarity = rollRarity();
    }
    if (Array.isArray(option.outcomes)) {
      option.outcomes.forEach(outcome => {
        if (outcome && outcome.rarity) {
          outcome.rarity = rollRarity();
        }
      });
    }
  });
  return event;
}

function buildRandomEvent(level, player) {
  const pool = [
    buildRelicEvent,
    buildOmenEvent,
    buildBloodAltarEvent,
    buildForgeEvent,
    buildScrollEvent,
    buildTrainingEvent,
    buildShopEvent,
    buildCurseEvent,
    buildMerchantEvent,
    buildRiskEvent,
    buildRiftEvent
  ];
  for (let i = 0; i < 6; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const event = pick(level, player);
    if (event) return normalizeEventRarities(event, level);
  }
  return normalizeEventRarities(buildTrainingEvent(level, player), level);
}

function shouldTriggerEvent(level) {
  const tier = Math.floor((level - 1) / 5);
  const chance = Math.min(0.6, 0.35 + tier * 0.05);
  return Math.random() < chance;
}

export function getPendingEvent() {
  ensureState();
  return gameState.pendingEvent ? JSON.parse(JSON.stringify(gameState.pendingEvent)) : null;
}

export function maybeCreateEvent(level, isBoss = false) {
  ensureState();
  if (gameState.pendingEvent) {
    return getPendingEvent();
  }
  if (isBoss) return null;
  const currentLevel = typeof level === 'number' && level > 0 ? level : gameState.player.level;
  if (currentLevel === 1 && !(gameState.player.runModifiers || []).length) {
    const omen = normalizeEventRarities(buildOmenEvent(currentLevel, gameState.player), currentLevel);
    if (omen) {
      gameState.pendingEvent = omen;
      saveState();
      return JSON.parse(JSON.stringify(omen));
    }
  }
  if (!shouldTriggerEvent(currentLevel)) return null;
  const event = buildRandomEvent(currentLevel, gameState.player);
  gameState.pendingEvent = event;
  saveState();
  return JSON.parse(JSON.stringify(event));
}

export function applyEventChoice(choiceId) {
  ensureState();
  const event = gameState.pendingEvent;
  if (!event) return null;
  const choice = event.options.find(option => option.id === choiceId);
  if (!choice) return null;
  const resolved = Array.isArray(choice.outcomes) && choice.outcomes.length
    ? pickOutcome(choice.outcomes) || choice
    : choice;
  const player = gameState.player;
  const eventTitle = event.title || 'Evenement';
  const cost = resolved.cost ?? choice.cost;
  if (cost) {
    if ((player.gold || 0) < cost) return null;
    player.gold = Math.max(0, (player.gold || 0) - cost);
  }
  const statChanges = Array.isArray(resolved.statChanges) ? resolved.statChanges : [];
  const appliedChanges = [];
  statChanges.forEach(change => {
    let stat = change.stat;
    if (stat === 'dodge' && change.value > 0 && computeMaxPotentialDodge(player) >= DODGE_CAP) {
      stat = 'precision';
    }
    if (change.isPercent) {
      player.bonusPercents[stat] = (player.bonusPercents[stat] || 0) + change.value;
    } else {
      player.bonusStats[stat] = (player.bonusStats[stat] || 0) + change.value;
    }
    appliedChanges.push({ stat, value: change.value });
    if (change.reward && change.value > 0) {
      const rewardRarity = normalizeRarity(change.rarity || resolved.rarity || choice.rarity || 'common');
      player.runRewards.push(createRunReward({
        type: 'stat',
        stat,
        value: change.value,
        label: change.isPercent ? formatStatLabelPercent(stat, change.value) : formatStatLabel(stat, change.value),
        rarity: rewardRarity,
        isPercent: !!change.isPercent
      }));
    }
  });

  const talentId = resolved.talentId || choice.talentId;
  if (talentId) {
    player.talents = upgradeTalentList(player.talents, talentId);
    const talent = getTalentById(talentId);
    player.runRewards.push(createRunReward({
      type: 'talent',
      talentId,
      label: talent ? talent.name : talentId,
      rarity: normalizeRarity(talent?.rarity || resolved.rarity || choice.rarity || 'common')
    }));
  }

  const weaponId = resolved.weaponId || choice.weaponId;
  if (weaponId) {
    const weaponRarity = normalizeRarity(resolved.rarity || choice.rarity || 'common');
    player.weapons.push({ id: weaponId, rarity: weaponRarity });
    player.weapon = weaponId;
    const weapon = getWeaponById(weaponId);
    player.runRewards.push(createRunReward({
      type: 'weapon',
      weaponId,
      label: weapon ? weapon.name : weaponId,
      rarity: normalizeRarity(weapon?.rarity || resolved.rarity || choice.rarity || weaponRarity)
    }));
  }

  const relicId = resolved.relicId || choice.relicId;
  if (relicId) {
    if (!player.relics.includes(relicId) && player.relics.length < MAX_RELICS) {
      player.relics.push(relicId);
    }
    const relic = getRelicById(relicId);
    player.runRewards.push(createRunReward({
      type: 'relic',
      relicId,
      label: relic ? relic.name : relicId,
      rarity: normalizeRarity(relic?.rarity || resolved.rarity || choice.rarity || 'common')
    }));
  }

  const modifierId = resolved.modifierId || choice.modifierId;
  if (modifierId) {
    if (!player.runModifiers.includes(modifierId)) {
      player.runModifiers = [modifierId];
    }
  }

  const summary = buildEventOutcomeSummary(appliedChanges, talentId, weaponId, relicId, modifierId, cost);
  addEventHistory({
    title: eventTitle,
    choice: choice.label || '',
    summary,
    rarity: normalizeRarity(resolved.rarity || choice.rarity || 'common')
  });

  if (event.kind === 'shop') {
    if (choice.exit) {
      gameState.pendingEvent = null;
    } else {
      event.options = (event.options || []).filter(option => option.id !== choice.id);
      const hasBuyable = (event.options || []).some(option => !option.exit);
      if (!hasBuyable) {
        gameState.pendingEvent = null;
      }
    }
    saveState();
    return {
      choice,
      resolved,
      title: eventTitle,
      choiceLabel: choice.label || '',
      summary
    };
  }

  gameState.pendingEvent = null;
  saveState();
  return {
    choice,
    resolved,
    title: eventTitle,
    choiceLabel: choice.label || '',
    summary
  };
}

export function getPendingRewards() {
  ensureState();
  return JSON.parse(JSON.stringify(gameState.pendingRewards));
}

export function getRunRewards() {
  ensureState();
  return JSON.parse(JSON.stringify(gameState.player.runRewards || []));
}

export function applyRewardChoice(choiceId) {
  ensureState();
  if (!gameState.pendingRewards.length) return null;

  const current = gameState.pendingRewards[0];
  const choice = current.options.find(option => option.id === choiceId);
  if (!choice) return null;

  if (choice.type === 'stat') {
    const rewardRarity = normalizeRarity(choice.rarity || 'common');
    if (choice.isPercent) {
      gameState.player.bonusPercents[choice.stat] += choice.value;
    } else {
      gameState.player.bonusStats[choice.stat] += choice.value;
    }
    gameState.player.runRewards.push(createRunReward({
      type: 'stat',
      stat: choice.stat,
      value: choice.value,
      label: choice.isPercent
        ? formatStatLabelPercent(choice.stat, choice.value)
        : choice.label,
      isPercent: !!choice.isPercent,
      rarity: rewardRarity
    }));
    addRewardHistory({
      source: `Niveau ${gameState.player.level}`,
      rewardType: 'stat',
      label: choice.isPercent
        ? formatStatLabelPercent(choice.stat, choice.value)
        : choice.label,
      desc: choice.desc || '',
      rarity: rewardRarity
    });
  } else if (choice.type === 'talent') {
    gameState.player.talents = upgradeTalentList(gameState.player.talents, choice.talentId);
    const talent = getTalentById(choice.talentId);
    const rewardRarity = normalizeRarity(talent?.rarity || choice.rarity || 'common');
    gameState.player.runRewards.push(createRunReward({
      type: 'talent',
      talentId: choice.talentId,
      label: choice.label,
      rarity: rewardRarity
    }));
    addRewardHistory({
      source: `Niveau ${gameState.player.level}`,
      rewardType: 'talent',
      label: talent ? talent.name : choice.label,
      desc: getTalentDescription(choice.talentId) || '',
      rarity: rewardRarity
    });
  } else if (choice.type === 'weapon') {
    const weaponRarity = normalizeRarity(choice.rarity || 'common');
    gameState.player.weapons.push({ id: choice.weaponId, rarity: weaponRarity });
    gameState.player.weapon = choice.weaponId;
    const weapon = getWeaponById(choice.weaponId);
    const rewardRarity = normalizeRarity(weapon?.rarity || choice.rarity || weaponRarity);
    gameState.player.runRewards.push(createRunReward({
      type: 'weapon',
      weaponId: choice.weaponId,
      label: choice.label,
      rarity: rewardRarity
    }));
    addRewardHistory({
      source: `Niveau ${gameState.player.level}`,
      rewardType: 'weapon',
      label: weapon ? weapon.name : choice.label,
      desc: weapon?.desc || '',
      rarity: rewardRarity
    });
  } else if (choice.type === 'relic') {
    if (!gameState.player.relics.includes(choice.relicId) && gameState.player.relics.length < MAX_RELICS) {
      gameState.player.relics.push(choice.relicId);
    }
    const relic = getRelicById(choice.relicId);
    const rewardRarity = normalizeRarity(relic?.rarity || choice.rarity || 'common');
    gameState.player.runRewards.push(createRunReward({
      type: 'relic',
      relicId: choice.relicId,
      label: relic ? relic.name : choice.label,
      rarity: rewardRarity
    }));
    addRewardHistory({
      source: `Niveau ${gameState.player.level}`,
      rewardType: 'relic',
      label: relic ? relic.name : choice.label,
      desc: relic?.desc || '',
      rarity: rewardRarity
    });
  }

  gameState.pendingRewards.shift();
  saveState();
  return choice;
}

export function grantGold(amount) {
  ensureState();
  const player = gameState.player;
  if (!amount || Number.isNaN(amount)) return player.gold || 0;
  const next = Math.max(0, Math.round((player.gold || 0) + amount));
  player.gold = next;
  saveState();
  return next;
}

function resetRunState(player, options = {}) {
  const { promptName = false } = options;
  player.level = 1;
  player.xp = 0;
  player.gold = 0;
  player.talents = [];
  player.relics = [];
  player.runModifiers = [];
  player.weapons = [];
  player.weapon = null;
  player.bonusStats = { ...EMPTY_BONUS_STATS };
  player.bonusPercents = { ...EMPTY_BONUS_PERCENTS };
  player.runRewards = [];
  player.lastBossLevel = 0;
  player.history = [];
  player.seed = createSeed();
  player.needsNamePrompt = promptName;
  gameState.nextEnemy = null;
  gameState.pendingEvent = null;
}

export function markBossDefeated(level) {
  ensureState();
  const player = gameState.player;
  player.lastBossLevel = Math.max(player.lastBossLevel || 0, level);
  saveState();
}

export function cashOutRun(pickKey = null) {
  ensureState();
  const player = gameState.player;
  const rewards = Array.isArray(player.runRewards) ? player.runRewards : [];
  if (!rewards.length) {
    resetRunState(player, { promptName: false });
    gameState.pendingRewards = [];
    gameState.pendingEvent = null;
    saveState();
    return null;
  }

  const normalized = rewards.map(reward => (reward.key ? reward : { ...reward, key: buildRewardKey(reward) }));
  let pick = null;
  if (pickKey !== null && pickKey !== undefined) {
    if (typeof pickKey === 'number') {
      pick = normalized[pickKey];
    } else {
      pick = normalized.find(reward => reward.key === pickKey);
    }
  }
  if (!pick) {
    pick = normalized[Math.floor(Math.random() * normalized.length)];
  }
  if (pick.type === 'stat') {
    if (pick.isPercent) {
      player.permanent.bonusPercents[pick.stat] += pick.value;
    } else {
      player.permanent.bonusStats[pick.stat] += pick.value;
    }
  } else if (pick.type === 'talent') {
    player.permanent.talents = upgradeTalentList(player.permanent.talents, pick.talentId);
  } else if (pick.type === 'relic') {
    if (!player.permanent.relics.includes(pick.relicId)) {
      player.permanent.relics.push(pick.relicId);
    }
  } else if (pick.type === 'weapon') {
    const rarity = normalizeRarity(pick.rarity || 'common');
    player.permanent.weapons.push({ id: pick.weaponId, rarity });
  }

  resetRunState(player, { promptName: false });
  gameState.pendingRewards = [];
  gameState.pendingEvent = null;
  saveState();
  return pick;
}

export function resetAfterDeath(options = {}) {
  ensureState();
  const { skipNamePrompt = false } = options;
  const player = gameState.player;
  player.permanent = {
    talents: [],
    weapons: [],
    relics: [],
    bonusStats: { ...EMPTY_BONUS_STATS },
    bonusPercents: { ...EMPTY_BONUS_PERCENTS }
  };
  resetRunState(player, { promptName: !skipNamePrompt });
  gameState.pendingRewards = [];
  gameState.pendingEvent = null;
  saveState();
}

export function grantXp(amount, summary = null) {
  ensureState();
  const player = gameState.player;
  const levelUps = [];
  player.xp += amount;
  const needed = xpToNext(player.level);
  if (player.xp >= needed) {
    player.xp -= needed;
    player.level += 1;
    const options = buildLevelUpOptions(player.level);
    const entry = { level: player.level, options };
    gameState.pendingRewards.push(entry);
    levelUps.push(entry);
  }

  if (summary) {
    addHistoryEntry(summary);
  }

  saveState();
  return levelUps;
}

export function addHistory(result) {
  ensureState();
  addHistoryEntry(result);
  saveState();
}

export function getTalentById(id) {
  if (!id) return null;
  const { baseId, rank } = parseTalentKey(id);
  const talent = TALENTS.find(t => t.id === baseId);
  if (!talent) return null;
  return {
    ...talent,
    baseId,
    rank,
    rarity: getTalentRankRarity(rank),
    name: `${talent.name} ${getTalentRankLabel(rank)}`
  };
}

export function getTalentMultiplier(id) {
  const { rank } = parseTalentKey(id);
  return getTalentRankMultiplier(rank);
}

export function getTalentScaledValue(id, baseValue) {
  return scalePercent(baseValue, getTalentMultiplier(id));
}

export function getTalentDescription(id) {
  const talent = getTalentById(id);
  if (!talent) return '';
  const mult = getTalentRankMultiplier(talent.rank);
  const pct = value => `${(value * 100).toFixed(1)}%`;
  switch (talent.baseId) {
    case 'berserk':
      return `Furie sous 35% PV (+${pct(0.25 * mult)} ATK).`;
    case 'tank':
      return `+${pct(0.2 * mult)} PV max.`;
    case 'thorns':
      return `Reflechit ${pct(0.2 * mult)} des degats.`;
    case 'precision':
      return `+${pct(0.08 * mult)} PREC.`;
    case 'focus':
      return `+${pct(0.08 * mult)} CRIT.`;
    case 'ninja':
      return `+${pct(0.08 * mult)} DODGE.`;
    case 'fast':
      return `+${Math.max(1, Math.round(4 * mult))} SPD.`;
    case 'armor':
      return `+${pct(0.15 * mult)} DEF.`;
    case 'bloodlust':
      return `+${pct(0.12 * mult)} ATK.`;
    case 'bulwark':
      return `+${pct(0.08 * mult)} DEF et +${pct(0.06 * mult)} PV.`;
    case 'duelist':
      return `+${Math.max(1, Math.round(2 * mult))} SPD et +${pct(0.06 * mult)} CRIT.`;
    case 'lifesteal':
      return `Recupere ${pct(0.2 * mult)} des degats infliges.`;
    case 'firstblood':
      return `Premier coup +${pct(0.35 * mult)} degats.`;
    case 'lucky':
      return `+${pct(0.05 * mult)} CRIT et +${pct(0.05 * mult)} DODGE.`;
    case 'pierce':
      return `Ignore ${pct(0.15 * mult)} DEF.`;
    case 'execution':
      return `+${pct(0.25 * mult)} degats si cible <30% PV.`;
    case 'combo':
      return `+${pct(0.05 * mult)} degats par hit consecutif (max 5).`;
    case 'bonecrusher':
      return `${pct(0.2 * mult)} chance de fracture: -${pct(0.2 * mult)} DEF (1 coup).`;
    case 'assault':
      return `+${pct(0.2 * mult)} degats sur les 2 premiers coups.`;
    case 'bleed':
      return `${pct(0.15 * mult)} chance de saignement (${pct(0.04 * mult)} PV max sur 2 tours).`;
    case 'lethal_precision':
      return `+${pct(0.1 * mult)} CRIT si PREC > DODGE adverse.`;
    case 'carnage':
      return `+${pct(0.02 * mult)} degats par 10 niveaux.`;
    case 'momentum':
      return `Tous les 3 hits: prochain coup +${pct(0.2 * mult)} degats.`;
    case 'sharpened':
      return `+${pct(0.1 * mult)} degats si arme rare+.`;
    case 'opportunist':
      return `+${pct(0.2 * mult)} degats si l ennemi rate son dernier coup.`;
    case 'surge':
      return `Apres une esquive: prochain coup +${pct(0.15 * mult)} degats.`;
    case 'resilience':
      return `-${pct(0.15 * mult)} degats recus sous 40% PV.`;
    case 'parry':
      return `${pct(0.1 * mult)} chance de reduire un coup de 50%.`;
    case 'living_armor':
      return `+${Math.max(1, Math.round(2 * mult))} DEF par coup recu (max 10).`;
    case 'barrier':
      return `-${pct(0.25 * mult)} degats sur 2 premiers coups.`;
    case 'stoic':
      return `CRIT adverses -${pct(0.3 * mult)} degats.`;
    case 'second_chance':
      return `Une fois par combat, survit a 1 PV.`;
    case 'counter':
      return `${pct(0.1 * mult)} chance de renvoyer ${pct(0.3 * mult)} degats.`;
    case 'anchor':
      return `-${pct(0.1 * mult)} degats recus si plus lent.`;
    case 'iron_will':
      return `-${pct(0.1 * mult)} degats recus au-dessus de 80% PV.`;
    case 'rhythm':
      return `Tous les 3 coups: +${Math.max(1, Math.round(3 * mult))} SPD (max 3).`;
    case 'mastery':
      return `Si meme arme 2 tours: +${pct(0.08 * mult)} PREC.`;
    case 'instinct':
      return `Sous 30% PV: +${pct(0.1 * mult)} DODGE.`;
    case 'anticipation':
      return `Commence avec +${Math.max(1, Math.round(20 * mult))} init.`;
    case 'relentless':
      return `Apres un rate: +${pct(0.08 * mult)} CRIT sur le prochain coup.`;
    case 'cold_focus':
      return `Si aucun degat recu pendant 2 tours: +${pct(0.1 * mult)} CRIT.`;
    case 'arsenal':
      return `+${pct(0.02 * mult)} degats par arme possedee (max 10%).`;
    case 'siphon':
      return `Recupere ${pct(0.08 * mult)} des degats infliges.`;
    case 'guardian':
      return `-${pct(0.1 * mult)} degats recus si PV < adversaire.`;
    default:
      return talent.desc || '';
  }
}

export function getWeaponById(id) {
  if (id === DEFAULT_WEAPON.id) return { ...DEFAULT_WEAPON };
  return WEAPONS.find(w => w.id === id) || null;
}

export function getDefaultWeapon() {
  return { ...DEFAULT_WEAPON };
}
