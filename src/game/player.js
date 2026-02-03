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
  { id: 'lifesteal', name: 'Lifesteal', rarity: 'legendary', desc: 'Recupere 20% des degats infliges.' },
  { id: 'firstblood', name: 'FirstBlood', rarity: 'epic', desc: 'Premier coup +35% degats.' },
  { id: 'lucky', name: 'Lucky', rarity: 'ultimate', desc: '+5% CRIT et +5% DODGE.' }
];

const WEAPONS = [
  { id: 'dagger', name: 'Dagger', rarity: 'common', desc: 'Vif et precis.', stats: { atk: 1, spd: 2, crit: 0.03 } },
  { id: 'sword', name: 'Sword', rarity: 'rare', desc: 'Fiable et tranchante.', stats: { atk: 3 } },
  { id: 'axe', name: 'Axe', rarity: 'ultimate', desc: 'Lourde, mais devastatrice.', stats: { atk: 4, spd: -1 } },
  { id: 'shield', name: 'Shield', rarity: 'epic', desc: 'Protection renforcee.', stats: { def: 3, hp: 10, spd: -1 } },
  { id: 'spear', name: 'Spear', rarity: 'legendary', desc: 'Allonge avantageuse.', stats: { atk: 2, spd: 1, crit: 0.02 } },
  { id: 'gloves', name: 'Gloves', rarity: 'uncommon', desc: 'Rapide et souple.', stats: { spd: 2, dodge: 0.03 } }
];

const DEFAULT_WEAPON = {
  id: 'fists',
  name: 'Poings',
  rarity: 'common',
  desc: 'Arme de base.',
  stats: { atk: 0 }
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

const DODGE_CAP = 0.6;
const RARITY_MULTIPLIERS = {
  common: 1,
  uncommon: 1.08,
  rare: 1.18,
  epic: 1.32,
  legendary: 1.5,
  ultimate: 1.75
};

const LEGACY_RARITY_MAP = {
  silver: 'common',
  gold: 'rare',
  purple: 'epic',
  red: 'ultimate'
};

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
    weapon: null,
    weapons: [],
    bonusStats: { ...EMPTY_BONUS_STATS },
    permanent: {
      talents: [],
      weapons: [],
      bonusStats: { ...EMPTY_BONUS_STATS }
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
  const permanentBonusStats = {
    hp: permanent.bonusStats?.hp || 0,
    atk: permanent.bonusStats?.atk || 0,
    def: permanent.bonusStats?.def || 0,
    spd: permanent.bonusStats?.spd || 0,
    crit: permanent.bonusStats?.crit || 0,
    dodge: permanent.bonusStats?.dodge || 0,
    precision: permanent.bonusStats?.precision || 0
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
      permanent: {
        talents: permanentTalents,
        weapons: permanentWeapons,
        bonusStats: permanentBonusStats
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
  return WEAPONS.map(w => ({ ...w, stats: { ...w.stats } }));
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

export function getWeaponEffectiveStats(weapon, rarityOverride = null, extraBonus = null) {
  if (!weapon || !weapon.stats) return {};
  const multiplier = getRarityMultiplier(rarityOverride || weapon.rarity);
  const scaled = {};
  Object.keys(weapon.stats).forEach(key => {
    const value = weapon.stats[key];
    if (typeof value !== 'number') return;
    if (value > 0) {
      if (key === 'crit' || key === 'dodge' || key === 'precision') {
        scaled[key] = scalePercent(value, multiplier);
      } else {
        scaled[key] = value * multiplier;
      }
    } else {
      scaled[key] = value;
    }
  });
  if (extraBonus) {
    Object.keys(extraBonus).forEach(key => {
      const value = extraBonus[key];
      if (!value) return;
      scaled[key] = (scaled[key] || 0) + value;
    });
  }
  return scaled;
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
  const weaponStats = getWeaponEffectiveStats(weapon, rarity, bonusStats);
  Object.keys(weaponStats).forEach(key => {
    merged[key] = (merged[key] || 0) + weaponStats[key];
  });
  return merged;
}

export function applyTalentPassives(stats, talentIds) {
  let merged = { ...stats };
  if (talentIds.includes('fast')) merged.spd += Math.max(1, Math.round(getTalentScaledValue('fast', 4)));
  if (talentIds.includes('precision')) merged.precision += getTalentScaledValue('precision', 0.08);
  if (talentIds.includes('focus')) merged.crit += getTalentScaledValue('focus', 0.08);
  if (talentIds.includes('ninja')) merged.dodge += getTalentScaledValue('ninja', 0.08);
  if (talentIds.includes('lucky')) {
    merged.crit += getTalentScaledValue('lucky', 0.05);
    merged.dodge += getTalentScaledValue('lucky', 0.05);
  }
  if (talentIds.includes('armor')) merged.def *= 1 + getTalentScaledValue('armor', 0.15);
  if (talentIds.includes('tank')) merged.hp *= 1 + getTalentScaledValue('tank', 0.2);
  return merged;
}

function getCombinedTalents(player) {
  const runTalents = Array.isArray(player.talents) ? player.talents : [];
  const permTalents = Array.isArray(player.permanent?.talents) ? player.permanent.talents : [];
  return Array.from(new Set([...permTalents, ...runTalents]));
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
  const collection = computeWeaponCollectionBonus(player).stats;
  Object.keys(combined).forEach(key => {
    combined[key] += collection[key] || 0;
  });
  return combined;
}

function computeMaxPotentialDodge(player) {
  const combinedBonus = getCombinedBonusStats(player);
  const baseStats = computeBaseStats(player.level, combinedBonus);
  const talents = getCombinedTalents(player);
  const withTalents = applyTalentPassives(baseStats, talents);
  const weaponList = getCombinedWeapons(player);
  const list = weaponList.length ? weaponList : [{ id: DEFAULT_WEAPON.id, rarity: DEFAULT_WEAPON.rarity }];
  return Math.max(...list.map(weapon => applyWeaponStats(withTalents, weapon).dodge));
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
  const base = computeBaseStats(player.level, bonusStats);
  const withWeapon = applyWeaponStats(base, weaponInstance);
  const withTalents = applyTalentPassives(withWeapon, getCombinedTalents(player));
  return {
    name: player.name,
    level: player.level,
    seed: player.seed,
    talents: getCombinedTalents(player),
    weapon: weaponInstance?.id || null,
    stats: {
      hp: Math.round(withTalents.hp),
      atk: Math.round(withTalents.atk),
      def: Math.round(withTalents.def),
      spd: Math.round(withTalents.spd),
      crit: Math.min(0.95, withTalents.crit),
      dodge: Math.min(DODGE_CAP, withTalents.dodge),
      precision: Math.min(0.95, withTalents.precision)
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

export function getOwnedTalents() {
  ensureState();
  return getCombinedTalents(gameState.player);
}

export function getOwnedBonusStats() {
  ensureState();
  return getCombinedBonusStats(gameState.player);
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
  const pool = WEAPONS.slice();
  const picks = [];
  while (picks.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const weapon = pool.splice(idx, 1)[0];
    const rarity = pickWeighted(getRarityWeights(level)).id;
    picks.push({ id: weapon.id, rarity });
  }
  return picks;
}

function createEnemyProfile(level, isBoss) {
  const base = computeBaseStats(level);
  const normalScale = 0.78 + (level - 1) * 0.022;
  const bossScale = isBoss ? (level < 10 ? 1.1 : 1.22) : 1;
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
    'lucky'
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

function buildEventOutcomeSummary(statChanges, talentId, weaponId, cost) {
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
  const tier = Math.floor((level - 1) / 5);
  const shift = Math.min(0.18, tier * 0.03);
  const weights = {
    common: 0.42 - shift * 1.1,
    uncommon: 0.25 - shift * 0.5,
    rare: 0.18 + shift * 0.4,
    epic: 0.1 + shift * 0.5,
    legendary: 0.04 + shift * 0.4,
    ultimate: 0.01 + shift * 0.3
  };
  const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
  return Object.keys(weights).map(id => ({ id, weight: weights[id] / total }));
}

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
  const rawValue = tiers[rarity][stat];
  const value = stat === 'crit' || stat === 'dodge' || stat === 'precision'
    ? Number((rawValue * scale).toFixed(3))
    : Math.max(1, Math.round(rawValue * scale));
  const statLabel = stat === 'precision' ? 'PREC' : stat.toUpperCase();
  const label = stat === 'crit' || stat === 'dodge' || stat === 'precision'
    ? `+${(value * 100).toFixed(1)}% ${statLabel}`
    : `+${value} ${stat.toUpperCase()}`;
  const desc = `Bonus ${stat.toUpperCase()}.`;
  return {
    id: `stat-${stat}-${rarity}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'stat',
    stat,
    value,
    rarity,
    label,
    desc
  };
}

function buildTalentReward(level, owned, excludedIds = new Set()) {
  const available = TALENTS.filter(t => !owned.includes(t.id) && !excludedIds.has(t.id));
  if (!available.length) return null;
  const rarityPool = getRarityWeights(level).filter(entry => available.some(t => normalizeRarity(t.rarity) === entry.id));
  const pickRarity = pickWeighted(rarityPool).id;
  const candidates = available.filter(t => normalizeRarity(t.rarity) === pickRarity);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    id: `talent-${pick.id}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'talent',
    talentId: pick.id,
    rarity: pick.rarity,
    label: pick.name,
    desc: getTalentDescription(pick.id)
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
  const talentAvailable = TALENTS.some(t => !ownedTalents.includes(t.id));
  const weaponAvailable = WEAPONS.length > 0;

  const tier = Math.floor((level - 1) / 5);
  const bonusChance = Math.min(0.2, tier * 0.04);
  const rollTalent = level % 2 === 0 && Math.random() < (0.6 + bonusChance) && talentAvailable;
  const rollWeapon = level % 3 === 0 && Math.random() < (0.55 + bonusChance) && weaponAvailable;

  let choice = 'stat';
  if (rollTalent && rollWeapon) {
    choice = Math.random() < 0.6 ? 'weapon' : 'talent';
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
      usedTalents.add(reward.talentId);
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
  if (reward.type === 'stat') return `stat:${reward.stat}:${reward.value}`;
  if (reward.type === 'talent') return `talent:${reward.talentId}`;
  if (reward.type === 'weapon') return `weapon:${reward.weaponId}`;
  return `${reward.type || 'reward'}`;
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
      reward: change.reward ?? change.value > 0
    };
  });
}

function buildEventDesc(statChanges, extraParts = []) {
  const parts = [];
  extraParts.forEach(part => {
    if (part) parts.push(part);
  });
  statChanges.forEach(change => {
    parts.push(formatStatChange(change.stat, change.value));
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
  const statChanges = rewards.map(reward => ({ stat: reward.stat, value: reward.value, reward: true }));
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
  const available = TALENTS.filter(t => !owned.includes(t.id));
  return pickByRarity(available, level);
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
    const talentDesc = getTalentDescription(talent.id);
    talentOption = {
      id: 'scroll-talent',
      label: 'Lire le parchemin',
      rarity: normalizeRarity(talent.rarity) || 'rare',
      talentId: talent.id,
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
      talentId: talent.id,
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
  const atkGain = scaleEventValue('atk', 4, level, 1.3);
  const critGain = scaleEventValue('crit', 0.012, level, 1.3);
  const hpLoss = scaleEventValue('hp', 18, level, 1);
  const defLoss = scaleEventValue('def', 2, level, 1);
  const curseBlood = normalizeStatChanges([
    { stat: 'atk', value: atkGain },
    { stat: 'crit', value: critGain },
    { stat: 'hp', value: -hpLoss, reward: false },
    { stat: 'def', value: -defLoss, reward: false }
  ], dodgeCapReached);

  const spdGain = scaleEventValue('spd', 3, level, 1.2);
  const dodgeGain = scaleEventValue('dodge', 0.01, level, 1.2);
  const atkLoss = scaleEventValue('atk', 2, level, 1);
  const curseShade = normalizeStatChanges([
    { stat: 'spd', value: spdGain },
    { stat: 'dodge', value: dodgeGain },
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

function buildRandomEvent(level, player) {
  const pool = [
    buildBloodAltarEvent,
    buildForgeEvent,
    buildScrollEvent,
    buildTrainingEvent,
    buildShopEvent,
    buildCurseEvent,
    buildMerchantEvent,
    buildRiskEvent
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick(level, player);
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
    player.bonusStats[stat] = (player.bonusStats[stat] || 0) + change.value;
    appliedChanges.push({ stat, value: change.value });
    if (change.reward && change.value > 0) {
      const rewardRarity = normalizeRarity(change.rarity || resolved.rarity || choice.rarity || 'common');
      player.runRewards.push(createRunReward({
        type: 'stat',
        stat,
        value: change.value,
        label: formatStatLabel(stat, change.value),
        rarity: rewardRarity
      }));
    }
  });

  const talentId = resolved.talentId || choice.talentId;
  if (talentId) {
    if (!player.talents.includes(talentId)) {
      player.talents.push(talentId);
    }
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

  const summary = buildEventOutcomeSummary(appliedChanges, talentId, weaponId, cost);
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
    gameState.player.bonusStats[choice.stat] += choice.value;
    gameState.player.runRewards.push(createRunReward({
      type: 'stat',
      stat: choice.stat,
      value: choice.value,
      label: choice.label,
      rarity: rewardRarity
    }));
    addRewardHistory({
      source: `Niveau ${gameState.player.level}`,
      rewardType: 'stat',
      label: choice.label,
      desc: choice.desc || '',
      rarity: rewardRarity
    });
  } else if (choice.type === 'talent') {
    if (!gameState.player.talents.includes(choice.talentId)) {
      gameState.player.talents.push(choice.talentId);
    }
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
  player.weapons = [];
  player.weapon = null;
  player.bonusStats = { ...EMPTY_BONUS_STATS };
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
    player.permanent.bonusStats[pick.stat] += pick.value;
  } else if (pick.type === 'talent') {
    if (!player.permanent.talents.includes(pick.talentId)) {
      player.permanent.talents.push(pick.talentId);
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
    bonusStats: { ...EMPTY_BONUS_STATS }
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
  return TALENTS.find(t => t.id === id) || null;
}

export function getTalentMultiplier(id) {
  const talent = getTalentById(id);
  return getRarityMultiplier(talent?.rarity);
}

export function getTalentScaledValue(id, baseValue) {
  return scalePercent(baseValue, getTalentMultiplier(id));
}

export function getTalentDescription(id) {
  const talent = getTalentById(id);
  if (!talent) return '';
  const mult = getRarityMultiplier(talent.rarity);
  const pct = value => `${(value * 100).toFixed(1)}%`;
  switch (id) {
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
    case 'lifesteal':
      return `Recupere ${pct(0.2 * mult)} des degats infliges.`;
    case 'firstblood':
      return `Premier coup +${pct(0.35 * mult)} degats.`;
    case 'lucky':
      return `+${pct(0.05 * mult)} CRIT et +${pct(0.05 * mult)} DODGE.`;
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
