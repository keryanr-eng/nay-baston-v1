import {
  getPlayerCombatProfile,
  grantXp,
  getTalentById,
  getWeaponById,
  getWeaponBaseDamage,
  applyWeaponStats,
  getDefaultWeapon,
  getOwnedWeapons,
  getTalentScaledValue,
  applyRewardChoice,
  getPendingRewards,
  getRunRewards,
  maybeCreateEvent,
  applyEventChoice,
  getPendingEvent,
  grantGold,
  getSettings,
  markBossDefeated,
  cashOutRun,
  resetAfterDeath,
  consumeNextEnemy,
  xpToNext
} from './player.js';
import { setHPBar, updateCombatLog, renderFightScreen, renderPostFightButtons, renderLevelUpChoices, renderBossOptions, renderBossChest, renderEventPanel, playCombatFx, showCombatOutcome, triggerScreenShake, triggerCombatZoom, updateFighterWeapon } from './ui.js';

const TICK_SECONDS = 0.1;
const MAX_FIGHT_SECONDS = 60;
const ACTION_DELAY_MS = 700;
const WEAPON_SWITCH_BASE = 0.18;
const WEAPON_SWITCH_STEP = 0.18;
const WEAPON_SWITCH_MAX = 0.85;
const WEAPON_SWAP_DELAY_MS = 320;
const RARITY_RANK = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, ultimate: 6 };

function parseTalentKey(id) {
  if (!id) return { baseId: '', rank: 0 };
  const parts = String(id).split(':');
  const baseId = parts[0];
  const rankRaw = Number(parts[1]) || 1;
  const rank = Math.max(1, Math.min(3, rankRaw));
  return { baseId, rank };
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

function getTalentValue(list, baseId, baseValue) {
  const id = getTalentIdFromList(list, baseId);
  return id ? getTalentScaledValue(id, baseValue) : 0;
}

function clampChance(value, max = 0.8) {
  return Math.max(0, Math.min(max, value));
}

function getWeaponRarityRank(weaponInstance, weaponDef) {
  const rarity = weaponInstance?.rarity || weaponDef?.rarity || 'common';
  return RARITY_RANK[rarity] || 1;
}

function describeTalent(id) {
  const talent = getTalentById(id);
  return talent ? `${talent.name}` : id;
}

function createCombatant(profile, weaponPool = null) {
  const fallbackWeapon = getDefaultWeapon();
  const talents = profile.talents || [];
  const initBonus = hasTalent(talents, 'anticipation')
    ? Math.max(1, Math.round(getTalentValue(talents, 'anticipation', 20)))
    : 0;
  const barrierCharges = hasTalent(talents, 'barrier') ? 2 : 0;
  return {
    name: profile.name,
    level: profile.level,
    talents,
    weapon: profile.weapon || null,
    weaponPool: Array.isArray(weaponPool) ? weaponPool.slice() : null,
    baseStats: { ...profile.stats },
    currentWeapon: profile.weapon || fallbackWeapon,
    weaponStreak: 0,
    weaponSwapped: false,
    maxHp: profile.stats.hp,
    hp: profile.stats.hp,
    atk: profile.stats.atk,
    def: profile.stats.def,
    spd: profile.stats.spd,
    crit: profile.stats.crit,
    dodge: profile.stats.dodge,
    precision: profile.stats.precision || 0,
    init: initBonus,
    firstStrikeReady: true,
    attacksMade: 0,
    hitStreak: 0,
    missStreak: 0,
    comboStacks: 0,
    momentumStacks: 0,
    momentumReady: false,
    surgeReady: false,
    lastMissed: false,
    armorStacks: 0,
    barrierCharges,
    bleedTurns: 0,
    bleedDamage: 0,
    defBreakTurns: 0,
    defBreakValue: 0,
    safeTurns: 0,
    tookDamage: false,
    rhythmStacks: 0,
    secondChanceUsed: false
  };
}

function pickWeaponForAttack(attacker) {
  const pool = Array.isArray(attacker.weaponPool) ? attacker.weaponPool : null;
  if (!pool || !pool.length) {
    attacker.weaponSwapped = false;
    return attacker.currentWeapon || attacker.weapon || getDefaultWeapon();
  }
  const current = attacker.currentWeapon || pool[0] || getDefaultWeapon();
  const currentId = current?.id || getDefaultWeapon().id;

  if (pool.length === 1) {
    const onlyWeapon = pool[0] || getDefaultWeapon();
    const onlyId = onlyWeapon?.id || getDefaultWeapon().id;
    attacker.weaponSwapped = onlyId !== currentId;
    attacker.currentWeapon = onlyWeapon;
    attacker.weaponStreak = attacker.weaponSwapped
      ? 1
      : Math.min(6, (attacker.weaponStreak || 0) + 1);
    return onlyWeapon;
  }

  const streak = attacker.weaponStreak || 0;
  let changeChance = Math.min(WEAPON_SWITCH_MAX, WEAPON_SWITCH_BASE + streak * WEAPON_SWITCH_STEP);
  if (currentId === 'fists') {
    changeChance = Math.min(WEAPON_SWITCH_MAX, changeChance + 0.35);
  }
  if (Math.random() < changeChance) {
    const options = pool.filter(entry => (entry?.id || getDefaultWeapon().id) !== currentId);
    const pick = options.length
      ? options[Math.floor(Math.random() * options.length)]
      : current;
    const nextId = pick?.id || getDefaultWeapon().id;
    attacker.weaponSwapped = nextId !== currentId;
    attacker.currentWeapon = pick;
    attacker.weaponStreak = 1;
    return pick;
  }

  attacker.weaponSwapped = false;
  attacker.currentWeapon = current;
  attacker.weaponStreak = Math.min(6, streak + 1);
  return current;
}

function getAttackStats(attacker, weapon) {
  const base = attacker.baseStats || {
    hp: attacker.maxHp,
    atk: attacker.atk,
    def: attacker.def,
    spd: attacker.spd,
    crit: attacker.crit,
    dodge: attacker.dodge,
    precision: attacker.precision || 0
  };
  return applyWeaponStats(base, weapon);
}

function calculateDamage(attacker, defender, defenderDef, weaponInstance) {
  const weaponId = weaponInstance?.id || getDefaultWeapon().id;
  const weaponDef = weaponId === 'fists' ? getDefaultWeapon() : getWeaponById(weaponId);
  const weaponBase = getWeaponBaseDamage(weaponDef, weaponInstance?.rarity || weaponDef?.rarity);
  let effectiveDef = defenderDef;
  if (hasTalent(attacker.talents, 'pierce')) {
    const piercePct = clampChance(getTalentValue(attacker.talents, 'pierce', 0.15), 0.7);
    effectiveDef = Math.max(0, effectiveDef * (1 - piercePct));
  }
  const effectiveAtk = Math.max(1, attacker.atk);
  const baseHit = Math.max(1, attacker.atk + weaponBase);
  const mitigation = effectiveAtk / Math.max(1, effectiveAtk + effectiveDef);
  let damage = Math.max(1, Math.round(baseHit * mitigation));

  if (hasTalent(attacker.talents, 'assault') && attacker.attacksMade < 2) {
    damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'assault', 0.2)));
  }

  if (hasTalent(attacker.talents, 'execution')) {
    const hpRatio = defender.hp / Math.max(1, defender.maxHp);
    if (hpRatio < 0.3) {
      damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'execution', 0.25)));
    }
  }

  if (hasTalent(attacker.talents, 'combo') && attacker.comboStacks > 0) {
    const comboBonus = getTalentValue(attacker.talents, 'combo', 0.05);
    damage = Math.round(damage * (1 + comboBonus * Math.min(5, attacker.comboStacks)));
  }

  if (hasTalent(attacker.talents, 'momentum') && attacker.momentumReady) {
    damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'momentum', 0.2)));
    attacker.momentumReady = false;
  }

  if (hasTalent(attacker.talents, 'surge') && attacker.surgeReady) {
    damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'surge', 0.15)));
    attacker.surgeReady = false;
  }

  if (hasTalent(attacker.talents, 'opportunist') && defender.lastMissed) {
    damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'opportunist', 0.2)));
    defender.lastMissed = false;
  }

  if (hasTalent(attacker.talents, 'sharpened')) {
    const rank = getWeaponRarityRank(weaponInstance, weaponDef);
    if (rank >= RARITY_RANK.rare) {
      damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'sharpened', 0.1)));
    }
  }

  if (hasTalent(attacker.talents, 'arsenal')) {
    const count = Math.max(1, attacker.weaponPool ? attacker.weaponPool.length : 1);
    const per = getTalentValue(attacker.talents, 'arsenal', 0.02);
    const bonus = Math.min(0.1, per * count);
    if (bonus > 0) {
      damage = Math.round(damage * (1 + bonus));
    }
  }

  if (hasTalent(attacker.talents, 'carnage')) {
    const levelBonus = Math.floor(attacker.level / 10);
    if (levelBonus > 0) {
      damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'carnage', 0.02) * levelBonus));
    }
  }

  if (hasTalent(attacker.talents, 'berserk')) {
    if (attacker.hp / attacker.maxHp < 0.35) {
      damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'berserk', 0.25)));
    }
  }

  if (hasTalent(attacker.talents, 'firstblood') && attacker.firstStrikeReady) {
    damage = Math.round(damage * (1 + getTalentValue(attacker.talents, 'firstblood', 0.35)));
  }

  let critChance = attacker.crit;
  if (hasTalent(attacker.talents, 'lethal_precision')) {
    if ((attacker.precision || 0) > (defender.dodge || 0)) {
      critChance += getTalentValue(attacker.talents, 'lethal_precision', 0.1);
    }
  }
  if (hasTalent(attacker.talents, 'relentless') && attacker.missStreak > 0) {
    critChance += getTalentValue(attacker.talents, 'relentless', 0.08);
  }
  if (hasTalent(attacker.talents, 'cold_focus') && attacker.safeTurns >= 2) {
    critChance += getTalentValue(attacker.talents, 'cold_focus', 0.1);
  }
  critChance = Math.min(0.95, Math.max(0, critChance));
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    damage = Math.round(damage * 1.7);
  }

  return { damage: Math.max(1, damage), isCrit };
}

function applyOnHitEffects(attacker, defender, damage, log) {
  let heal = 0;
  let reflect = 0;
  if (hasTalent(attacker.talents, 'firstblood')) {
    attacker.firstStrikeReady = false;
  }

  if (hasTalent(attacker.talents, 'lifesteal')) {
    heal = Math.max(1, Math.round(damage * getTalentValue(attacker.talents, 'lifesteal', 0.2)));
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    const applied = attacker.hp - before;
    if (applied > 0) {
      log.push(`${attacker.name} recupere ${applied} PV.`);
    }
    heal = applied;
  } else {
    heal = 0;
  }

  if (hasTalent(attacker.talents, 'siphon')) {
    const extra = Math.max(1, Math.round(damage * getTalentValue(attacker.talents, 'siphon', 0.08)));
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + extra);
    const applied = attacker.hp - before;
    if (applied > 0) {
      log.push(`${attacker.name} siphonne ${applied} PV.`);
    }
    heal += applied;
  }

  if (hasTalent(defender.talents, 'thorns') && damage > 0) {
    reflect = Math.max(1, Math.round(damage * getTalentValue(defender.talents, 'thorns', 0.2)));
    attacker.hp -= reflect;
    attacker.tookDamage = true;
    log.push(`${defender.name} renvoie ${reflect} degats a ${attacker.name}.`);
  }

  if (hasTalent(defender.talents, 'counter') && damage > 0) {
    const chance = clampChance(getTalentValue(defender.talents, 'counter', 0.1), 0.6);
    if (Math.random() < chance) {
      const reflected = Math.max(1, Math.round(damage * getTalentValue(defender.talents, 'counter', 0.3)));
      attacker.hp -= reflected;
      attacker.tookDamage = true;
      reflect += reflected;
      log.push(`${defender.name} contre-attaque (${reflected}).`);
    }
  }
  return { heal, reflect };
}

function applyDefenderMitigation(attacker, defender, damage, isCrit, log) {
  let final = damage;
  const hpRatio = defender.hp / Math.max(1, defender.maxHp);

  if (hasTalent(defender.talents, 'resilience') && hpRatio < 0.4) {
    final *= 1 - getTalentValue(defender.talents, 'resilience', 0.15);
  }
  if (hasTalent(defender.talents, 'anchor') && defender.spd < attacker.spd) {
    final *= 1 - getTalentValue(defender.talents, 'anchor', 0.1);
  }
  if (hasTalent(defender.talents, 'iron_will') && hpRatio > 0.8) {
    final *= 1 - getTalentValue(defender.talents, 'iron_will', 0.1);
  }
  if (hasTalent(defender.talents, 'guardian') && defender.hp < attacker.hp) {
    final *= 1 - getTalentValue(defender.talents, 'guardian', 0.1);
  }
  if (defender.barrierCharges > 0) {
    final *= 1 - getTalentValue(defender.talents, 'barrier', 0.25);
    defender.barrierCharges = Math.max(0, defender.barrierCharges - 1);
  }
  if (hasTalent(defender.talents, 'parry')) {
    const chance = clampChance(getTalentValue(defender.talents, 'parry', 0.1), 0.6);
    if (Math.random() < chance) {
      final *= 0.5;
      log.push(`${defender.name} pare le coup.`);
    }
  }
  if (hasTalent(defender.talents, 'stoic') && isCrit) {
    final *= 1 - getTalentValue(defender.talents, 'stoic', 0.3);
  }

  final = Math.max(1, Math.round(final));

  if (hasTalent(defender.talents, 'second_chance') && !defender.secondChanceUsed && final >= defender.hp) {
    defender.secondChanceUsed = true;
    final = Math.max(0, defender.hp - 1);
    log.push(`${defender.name} refuse de tomber.`);
  }

  return final;
}

function performAttack(attacker, defender, log, defenderStats = null) {
  let defValue = defenderStats?.def ?? defender.def;
  const armorStackValue = hasTalent(defender.talents, 'living_armor')
    ? Math.max(1, Math.round(getTalentValue(defender.talents, 'living_armor', 2)))
    : 0;
  if (armorStackValue && defender.armorStacks > 0) {
    defValue += defender.armorStacks * armorStackValue;
  }
  if (defender.defBreakTurns > 0) {
    defValue *= 1 - defender.defBreakValue;
    defender.defBreakTurns = Math.max(0, defender.defBreakTurns - 1);
  }

  let dodgeValue = defenderStats?.dodge ?? defender.dodge;
  if (hasTalent(defender.talents, 'instinct') && defender.hp / Math.max(1, defender.maxHp) < 0.3) {
    dodgeValue += getTalentValue(defender.talents, 'instinct', 0.1);
  }
  let precision = attacker.precision || 0;
  if (hasTalent(attacker.talents, 'mastery') && attacker.weaponStreak >= 2) {
    precision += getTalentValue(attacker.talents, 'mastery', 0.08);
  }
  const effectiveDodge = Math.max(0, (dodgeValue || 0) - precision);
  if (Math.random() < effectiveDodge) {
    log.push(`${attacker.name} rate son attaque.`);
    if (hasTalent(attacker.talents, 'firstblood')) {
      attacker.firstStrikeReady = false;
    }
    attacker.lastMissed = true;
    attacker.missStreak += 1;
    attacker.hitStreak = 0;
    attacker.comboStacks = 0;
    attacker.momentumStacks = 0;
    if (hasTalent(defender.talents, 'surge')) {
      defender.surgeReady = true;
    }
    return { outcome: 'dodge' };
  }

  const { damage, isCrit } = calculateDamage(attacker, defender, defValue, attacker.currentWeapon || attacker.weapon);
  const finalDamage = applyDefenderMitigation(attacker, defender, damage, isCrit, log);
  defender.hp -= finalDamage;
  defender.tookDamage = true;
  log.push(`${attacker.name} inflige ${finalDamage} degats a ${defender.name}.`);

  attacker.attacksMade += 1;
  attacker.lastMissed = false;
  attacker.missStreak = 0;
  attacker.hitStreak += 1;
  attacker.comboStacks = Math.min(5, attacker.hitStreak);

  if (hasTalent(attacker.talents, 'momentum')) {
    attacker.momentumStacks += 1;
    if (attacker.momentumStacks >= 3) {
      attacker.momentumReady = true;
      attacker.momentumStacks = 0;
    }
  }
  if (hasTalent(attacker.talents, 'rhythm') && attacker.attacksMade % 3 === 0 && attacker.rhythmStacks < 3) {
    attacker.rhythmStacks += 1;
    attacker.spd += Math.max(1, Math.round(getTalentValue(attacker.talents, 'rhythm', 3)));
    log.push(`${attacker.name} accelere.`);
  }

  if (hasTalent(attacker.talents, 'bleed')) {
    const chance = clampChance(getTalentValue(attacker.talents, 'bleed', 0.15), 0.7);
    if (Math.random() < chance) {
      defender.bleedTurns = 2;
      defender.bleedDamage = Math.max(1, Math.round(defender.maxHp * getTalentValue(attacker.talents, 'bleed', 0.04)));
      log.push(`${defender.name} saigne.`);
    }
  }

  if (hasTalent(attacker.talents, 'bonecrusher')) {
    const chance = clampChance(getTalentValue(attacker.talents, 'bonecrusher', 0.2), 0.7);
    if (Math.random() < chance) {
      defender.defBreakTurns = 1;
      defender.defBreakValue = clampChance(getTalentValue(attacker.talents, 'bonecrusher', 0.2), 0.6);
      log.push(`${defender.name} est fracture.`);
    }
  }

  if (hasTalent(defender.talents, 'living_armor') && finalDamage > 0) {
    defender.armorStacks = Math.min(10, defender.armorStacks + 1);
  }

  const effects = applyOnHitEffects(attacker, defender, finalDamage, log);
  return { outcome: 'hit', damage: finalDamage, isCrit, ...effects };
}

function selectActor(a, b) {
  if (a.init >= 100 && b.init >= 100) {
    if (a.init === b.init) {
      return Math.random() < 0.5 ? a : b;
    }
    return a.init > b.init ? a : b;
  }
  if (a.init >= 100) return a;
  if (b.init >= 100) return b;
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function playBossIntro(soundEnabled) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch (error) {
    // ignore audio errors
  }
}

function playFxSound(kind, soundEnabled) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (kind === 'dodge') {
      osc.type = 'sine';
    } else {
      osc.type = kind === 'crit' ? 'sawtooth' : 'triangle';
    }
    const now = ctx.currentTime;
    if (kind === 'dodge') {
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.07);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (kind === 'crit') {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.32, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    } else {
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const duration = kind === 'crit' ? 0.24 : kind === 'dodge' ? 0.1 : 0.12;
    osc.stop(now + duration);
    osc.onended = () => ctx.close();
  } catch (error) {
    // ignore audio errors
  }
}

function playWeaponSound(weaponId, soundEnabled, isCrit = false) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const id = weaponId || 'fists';
    const config = {
      fists: { type: 'triangle', f1: 240, f2: 160, gain: 0.11, dur: 0.1 },
      dagger: { type: 'square', f1: 680, f2: 360, gain: 0.08, dur: 0.08 },
      sword: { type: 'sawtooth', f1: 520, f2: 220, gain: 0.1, dur: 0.12 },
      axe: { type: 'sawtooth', f1: 170, f2: 70, gain: 0.17, dur: 0.16 },
      spear: { type: 'triangle', f1: 620, f2: 280, gain: 0.09, dur: 0.1 },
      shield: { type: 'square', f1: 180, f2: 110, gain: 0.12, dur: 0.12 },
      gloves: { type: 'triangle', f1: 320, f2: 200, gain: 0.08, dur: 0.08 }
    };
    const cfg = config[id] || config.fists;
    const level = isCrit ? 0.6 : 1;
    osc.type = cfg.type;
    osc.frequency.setValueAtTime(cfg.f1, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(cfg.f2, ctx.currentTime + cfg.dur * 0.6);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(cfg.gain * level, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + cfg.dur + 0.02);
    osc.onended = () => ctx.close();
  } catch (error) {
    // ignore audio errors
  }
}

function getCritShakeLevel(damage, maxHp) {
  const ratio = damage / Math.max(1, maxHp);
  if (ratio >= 0.32 || damage >= 60) return 'lg';
  if (ratio >= 0.2 || damage >= 35) return 'md';
  if (ratio >= 0.12 || damage >= 20) return 'sm';
  return null;
}

function applyStartOfTurnEffects(actor, log) {
  let took = actor.tookDamage;
  if (actor.bleedTurns > 0) {
    const bleed = Math.max(1, Math.round(actor.bleedDamage));
    actor.hp -= bleed;
    actor.bleedTurns = Math.max(0, actor.bleedTurns - 1);
    if (bleed > 0) {
      log.push(`${actor.name} subit ${bleed} degats de saignement.`);
      took = true;
    }
  }
  actor.safeTurns = took ? 0 : actor.safeTurns + 1;
  actor.tookDamage = false;
}

export async function startCombat() {
  const defaultWeaponId = getDefaultWeapon().id;
  const ownedWeapons = getOwnedWeapons();
  const weaponPool = ownedWeapons.length ? ownedWeapons : [getDefaultWeapon()];
  const playerProfile = getPlayerCombatProfile(defaultWeaponId);
  const enemyProfile = consumeNextEnemy();
  const enemyWeaponPool = Array.isArray(enemyProfile.weapons) && enemyProfile.weapons.length
    ? enemyProfile.weapons
    : [getDefaultWeapon()];
  const isBoss = !!enemyProfile?.isBoss;
  const settings = getSettings();

  renderFightScreen(playerProfile, enemyProfile);
  if (isBoss) {
    playBossIntro(settings.sound);
  }

  const player = createCombatant(playerProfile, weaponPool);
  const enemy = createCombatant(enemyProfile, enemyWeaponPool);
  updateFighterWeapon('A', player.currentWeapon);
  updateFighterWeapon('B', enemy.currentWeapon);

  const log = [];
  const header = [
    `${isBoss ? 'BOSS' : 'Baston'} contre ${enemyProfile.name}`,
    `Arme : Aleatoire`,
    `Talents : ${playerProfile.talents.length ? playerProfile.talents.map(describeTalent).join(', ') : 'Aucun'}`
  ];

  const actionDelay = Math.max(200, ACTION_DELAY_MS / (settings.animSpeed || 1));
  const totalTicks = Math.floor(MAX_FIGHT_SECONDS / TICK_SECONDS);
  for (let tick = 0; tick < totalTicks; tick++) {
    if (player.hp <= 0 || enemy.hp <= 0) break;
    player.init += player.spd;
    enemy.init += enemy.spd;

    let actor = selectActor(player, enemy);
    while (actor && player.hp > 0 && enemy.hp > 0) {
      if (actor === player) {
        applyStartOfTurnEffects(player, log);
        if (player.hp <= 0) break;
        player.init -= 100;
        playCombatFx('A', 'acting');
        const weapon = pickWeaponForAttack(player);
        const weaponId = weapon?.id || getDefaultWeapon().id;
        player.currentWeapon = weapon;
        updateFighterWeapon('A', weapon);
        const attackStats = getAttackStats(player, weapon);
        const defenderStats = getAttackStats(enemy, enemy.currentWeapon || getDefaultWeapon());
        const snapshot = {
          atk: player.atk,
          crit: player.crit,
          precision: player.precision || 0
        };
        player.atk = attackStats.atk;
        player.crit = attackStats.crit;
        player.precision = attackStats.precision || 0;
        const result = performAttack(player, enemy, log, defenderStats);
        player.atk = snapshot.atk;
        player.crit = snapshot.crit;
        player.precision = snapshot.precision;
        if (result?.outcome === 'dodge') {
          playCombatFx('B', 'dodge');
          playFxSound('dodge', settings.sound);
        } else if (result?.outcome === 'hit') {
          playCombatFx('B', result.isCrit ? 'crit' : 'hit', result.damage);
          if (result.isCrit) {
            playWeaponSound(weaponId, settings.sound, true);
            playCombatFx('A', 'critTrail');
            playFxSound('crit', settings.sound);
            const level = getCritShakeLevel(result.damage, enemy.maxHp);
            if (level) triggerScreenShake(level);
            triggerCombatZoom();
          }
          if (result.heal) playCombatFx('A', 'heal', result.heal);
          if (result.reflect) playCombatFx('A', 'thorns', result.reflect);
        }
      } else {
        applyStartOfTurnEffects(enemy, log);
        if (enemy.hp <= 0) break;
        enemy.init -= 100;
        playCombatFx('B', 'acting');
        const enemyWeapon = pickWeaponForAttack(enemy);
        const enemyWeaponId = enemyWeapon?.id || getDefaultWeapon().id;
        enemy.currentWeapon = enemyWeapon;
        updateFighterWeapon('B', enemyWeapon);
        const attackerStats = getAttackStats(enemy, enemyWeapon);
        const defenderStats = getAttackStats(player, player.currentWeapon || getDefaultWeapon());
        const snapshot = {
          atk: enemy.atk,
          crit: enemy.crit,
          precision: enemy.precision || 0
        };
        enemy.atk = attackerStats.atk;
        enemy.crit = attackerStats.crit;
        enemy.precision = attackerStats.precision || 0;
        const result = performAttack(enemy, player, log, defenderStats);
        enemy.atk = snapshot.atk;
        enemy.crit = snapshot.crit;
        enemy.precision = snapshot.precision;
        if (result?.outcome === 'dodge') {
          playCombatFx('A', 'dodge');
          playFxSound('dodge', settings.sound);
        } else if (result?.outcome === 'hit') {
          playCombatFx('A', result.isCrit ? 'crit' : 'hit', result.damage);
          if (result.isCrit) {
            playWeaponSound(enemyWeaponId, settings.sound, true);
            playCombatFx('B', 'critTrail');
            playFxSound('crit', settings.sound);
            const level = getCritShakeLevel(result.damage, player.maxHp);
            if (level) triggerScreenShake(level);
            triggerCombatZoom();
          }
          if (result.heal) playCombatFx('B', 'heal', result.heal);
          if (result.reflect) playCombatFx('B', 'thorns', result.reflect);
        }
      }
      const acted = actor;
      actor = selectActor(player, enemy);

      const cappedPlayerHp = Math.max(0, Math.round(player.hp));
      const cappedEnemyHp = Math.max(0, Math.round(enemy.hp));
      setHPBar('A', cappedPlayerHp, player.maxHp);
      setHPBar('B', cappedEnemyHp, enemy.maxHp);
      updateCombatLog([...header, '---', ...log.slice(-10)]);
      const swapDelay = acted?.weaponSwapped ? WEAPON_SWAP_DELAY_MS : 0;
      await sleep(actionDelay + swapDelay);
    }
  }

  const cappedPlayerHp = Math.max(0, Math.round(player.hp));
  const cappedEnemyHp = Math.max(0, Math.round(enemy.hp));

  setHPBar('A', cappedPlayerHp, player.maxHp);
  setHPBar('B', cappedEnemyHp, enemy.maxHp);

  let result = 'tie';
  if (cappedPlayerHp <= 0 && cappedEnemyHp <= 0) {
    result = 'tie';
  } else if (cappedPlayerHp <= 0) {
    result = 'lose';
  } else if (cappedEnemyHp <= 0) {
    result = 'win';
  } else if (cappedPlayerHp !== cappedEnemyHp) {
    result = cappedPlayerHp > cappedEnemyHp ? 'win' : 'lose';
  }

  showCombatOutcome(result);

  const didWin = result === 'win';
  const xpGain = didWin ? xpToNext(playerProfile.level) : 0;
  const goldBase = 8 + playerProfile.level * 1.2;
  const goldGain = didWin ? Math.round(goldBase * (isBoss ? 1.4 : 1)) : 0;
  const rewards = didWin
    ? grantXp(xpGain, {
        date: new Date().toISOString(),
        result,
        enemy: enemyProfile.name,
        level: playerProfile.level,
        hpLeft: cappedPlayerHp
      })
    : [];

  if (goldGain > 0) {
    grantGold(goldGain);
  }

  if (didWin && isBoss) {
    markBossDefeated(playerProfile.level);
  }

  if (!didWin) {
    resetAfterDeath();
  }

  const outcomeLine = didWin
    ? `Victoire ! +${xpGain} XP, +${goldGain} OR`
    : result === 'lose'
      ? `Defaite. Run terminee.`
      : `Match nul. Run terminee.`;

  const rewardLines = [];
  rewards.forEach(reward => {
    rewardLines.push(`Niveau ${reward.level} : choisis une recompense.`);
  });

  updateCombatLog([...header, '---', ...log, '---', outcomeLine, ...rewardLines]);

  const handlePendingRewards = done => {
    const pending = getPendingRewards();
    if (!pending.length) {
      done();
      return;
    }
    const handleChoice = choiceId => {
      applyRewardChoice(choiceId);
      const next = getPendingRewards();
      if (next.length) {
        renderLevelUpChoices(next[0], handleChoice);
      } else {
        done();
      }
    };
    renderLevelUpChoices(pending[0], handleChoice);
  };

  handlePendingRewards(() => {
    if (!didWin) {
      renderPostFightButtons({ allowAgain: false });
      return;
    }
    const pendingEvent = maybeCreateEvent(null, isBoss);
    if (pendingEvent) {
      const target = document.getElementById('combat-log-actions') || document.getElementById('combat-log');
      const handleEventChoice = choiceId => {
        const result = applyEventChoice(choiceId);
        return {
          title: result?.title || pendingEvent.title || 'Evenement',
          choiceLabel: result?.choiceLabel || '',
          summary: result?.summary || 'Aucun effet.',
          autoContinue: !isBoss,
          onContinue: () => {
            const nextEvent = getPendingEvent();
            if (nextEvent) {
              renderEventPanel(nextEvent, handleEventChoice, target, false);
              return;
            }
            if (isBoss) {
              renderBossOptions({
                onContinue: () => window.dispatchEvent(new Event('return-main')),
                onCashout: () => {
                  renderBossChest({
                    rewards: getRunRewards(),
                    onPick: rewardKey => cashOutRun(rewardKey),
                    onContinue: () => window.dispatchEvent(new Event('return-main'))
                  });
                }
              });
            } else {
              renderPostFightButtons();
            }
          }
        };
      };
      renderEventPanel(pendingEvent, handleEventChoice, target, true);
      return;
    }
    if (isBoss) {
      renderBossOptions({
        onContinue: () => window.dispatchEvent(new Event('return-main')),
        onCashout: () => {
          renderBossChest({
            rewards: getRunRewards(),
            onPick: rewardKey => cashOutRun(rewardKey),
            onContinue: () => window.dispatchEvent(new Event('return-main'))
          });
        }
      });
    } else {
      renderPostFightButtons();
    }
  });
}
