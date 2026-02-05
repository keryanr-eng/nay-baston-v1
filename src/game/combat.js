import {
  getPlayerCombatProfile,
  grantXp,
  getTalentById,
  getWeaponById,
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

function describeTalent(id) {
  const talent = getTalentById(id);
  return talent ? `${talent.name}` : id;
}

function createCombatant(profile, weaponPool = null) {
  const fallbackWeapon = getDefaultWeapon();
  return {
    name: profile.name,
    level: profile.level,
    talents: profile.talents || [],
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
    init: 0,
    firstStrikeReady: true
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

function calculateDamage(attacker, defenderDef) {
  let damage = Math.max(1, Math.round(attacker.atk - defenderDef * 0.6));

  if (attacker.talents.includes('berserk')) {
    if (attacker.hp / attacker.maxHp < 0.35) {
      damage = Math.round(damage * (1 + getTalentScaledValue('berserk', 0.25)));
    }
  }

  if (attacker.talents.includes('firstblood') && attacker.firstStrikeReady) {
    damage = Math.round(damage * (1 + getTalentScaledValue('firstblood', 0.35)));
  }

  const isCrit = Math.random() < attacker.crit;
  if (isCrit) {
    damage = Math.round(damage * 1.7);
  }

  return { damage: Math.max(1, damage), isCrit };
}

function applyOnHitEffects(attacker, defender, damage, log) {
  let heal = 0;
  let reflect = 0;
  if (attacker.talents.includes('firstblood')) {
    attacker.firstStrikeReady = false;
  }

  if (attacker.talents.includes('lifesteal')) {
    heal = Math.max(1, Math.round(damage * getTalentScaledValue('lifesteal', 0.2)));
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

  if (defender.talents.includes('thorns') && damage > 0) {
    reflect = Math.max(1, Math.round(damage * getTalentScaledValue('thorns', 0.2)));
    attacker.hp -= reflect;
    log.push(`${defender.name} renvoie ${reflect} degats a ${attacker.name}.`);
  }
  return { heal, reflect };
}

function performAttack(attacker, defender, log, defenderStats = null) {
  const defValue = defenderStats?.def ?? defender.def;
  const dodgeValue = defenderStats?.dodge ?? defender.dodge;
  const effectiveDodge = Math.max(0, (dodgeValue || 0) - (attacker.precision || 0));
  if (Math.random() < effectiveDodge) {
    log.push(`${attacker.name} rate son attaque.`);
    if (attacker.talents.includes('firstblood')) {
      attacker.firstStrikeReady = false;
    }
    return { outcome: 'dodge' };
  }

  const { damage, isCrit } = calculateDamage(attacker, defValue);
  defender.hp -= damage;
  log.push(`${attacker.name} inflige ${damage} degats a ${defender.name}.`);
  const effects = applyOnHitEffects(attacker, defender, damage, log);
  return { outcome: 'hit', damage, isCrit, ...effects };
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
