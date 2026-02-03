import { getPlayerState, getPlayerCombatProfile, getSettings, updateSettings, getTalentById, getTalentDescription, getWeaponById, getWeaponEffectiveStats, xpToNext, getPendingRewards, getPendingEvent, getOwnedWeapons, getOwnedTalents, getOwnedRelics, getRunModifiers, getRelicById, getModifierById, getNextEnemyPreview, getDefaultWeapon, computeBaseStats, applyWeaponStats, applyTalentPassives, applyRelicPassives, applyRunModifiers, applySynergyPassives, getOwnedBonusStats, getWeaponCollectionBonus, applyEventChoice } from './player.js';

const FX_TIMERS = {
  A: {},
  B: {}
};
let shakeTimer = null;
let zoomTimer = null;
let ambientCtx = null;
let ambientNodes = null;

const EVENT_ICON_TEXT = {
  altar: 'ALT',
  forge: 'FOR',
  scroll: 'SCR',
  training: 'TRN',
  merchant: 'SHOP',
  shop: 'SHOP',
  curse: 'CUR',
  risk: 'RISK',
  relic: 'REL',
  omen: 'OMN',
  rift: 'RIFT'
};

const LEGACY_RARITY_MAP = {
  silver: 'common',
  gold: 'rare',
  purple: 'epic',
  red: 'ultimate'
};

function normalizeRarity(rarity) {
  if (!rarity) return 'common';
  return LEGACY_RARITY_MAP[rarity] || rarity;
}

function getFighterEl(side) {
  return document.getElementById(side === 'A' ? 'fighterA' : 'fighterB');
}

function pulseHpBar(side) {
  const fighter = getFighterEl(side);
  if (!fighter) return;
  const bar = fighter.querySelector('.hp-fill');
  if (!bar) return;
  bar.classList.remove('hp-hit');
  void bar.offsetWidth;
  bar.classList.add('hp-hit');
  setTimeout(() => bar.classList.remove('hp-hit'), 320);
}

function addFxClass(side, className, duration) {
  const fighter = getFighterEl(side);
  if (!fighter) return;
  const timers = FX_TIMERS[side];
  fighter.classList.add(className);
  if (timers[className]) clearTimeout(timers[className]);
  timers[className] = setTimeout(() => {
    fighter.classList.remove(className);
  }, duration);
}

function spawnDust(side) {
  const fighter = getFighterEl(side);
  if (!fighter) return;
  const dust = document.createElement('div');
  dust.className = `fx-dust ${side === 'A' ? 'left' : 'right'}`;
  fighter.appendChild(dust);
  setTimeout(() => dust.remove(), 420);
}

function triggerShakeClass(className, duration) {
  const app = document.getElementById('app');
  if (!app) return;
  app.classList.remove('screen-shake-sm', 'screen-shake-md', 'screen-shake-lg');
  void app.offsetWidth;
  app.classList.add(className);
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => {
    app.classList.remove(className);
  }, duration);
}

function spawnImpact(side, isCrit) {
  const fighter = getFighterEl(side);
  if (!fighter) return;
  const impact = document.createElement('div');
  impact.className = `fx-impact ${isCrit ? 'crit' : ''}`.trim();
  impact.innerHTML = '<span class="fx-swipe"></span><span class="fx-ring"></span><span class="fx-spark"></span>';
  fighter.appendChild(impact);
  setTimeout(() => impact.remove(), 520);
}

function spawnFxText(side, text, kind) {
  const fighter = getFighterEl(side);
  if (!fighter) return;
  const pop = document.createElement('div');
  pop.className = `fx-pop ${kind || ''}`.trim();
  pop.textContent = text;
  fighter.appendChild(pop);
  setTimeout(() => pop.remove(), 900);
}

function weaponStatsText(weaponInstance) {
  if (!weaponInstance) return 'Arme de base.';
  const weaponId = weaponInstance.id || weaponInstance.weaponId || weaponInstance?.id;
  if (weaponId === 'fists') return 'Arme de base.';
  const weaponDef = weaponInstance.stats ? weaponInstance : getWeaponById(weaponId);
  if (!weaponDef || !weaponDef.stats || !Object.keys(weaponDef.stats).length) return 'Arme de base.';
  const rarity = weaponInstance.rarity || weaponDef.rarity || 'common';
  const stats = getWeaponEffectiveStats(weaponDef, rarity, weaponInstance.bonusStats);
  const parts = [];
  const format = (key, value) => {
    const sign = value > 0 ? '+' : '';
    if (key === 'crit' || key === 'dodge' || key === 'precision') {
      const label = key === 'precision' ? 'PREC' : key.toUpperCase();
      return `${label} ${sign}${(value * 100).toFixed(1)}%`;
    }
    return `${key.toUpperCase()} ${sign}${Math.round(value)}`;
  };
  Object.keys(stats).forEach(key => {
    parts.push(format(key, stats[key]));
  });
  return parts.join(' | ');
}

function shouldShowRewardTip(tip, label, desc) {
  if (!tip) return false;
  const text = `${label || ''} ${desc || ''}`.trim();
  if (!text) return true;
  return !(/[+\\d%]/.test(text));
}

function formatBonusStats(stats) {
  if (!stats) return '';
  const order = ['hp', 'atk', 'def', 'spd', 'crit', 'dodge', 'precision'];
  const parts = [];
  order.forEach(key => {
    const value = stats[key];
    if (!value) return;
    const label = key === 'precision' ? 'PREC' : key.toUpperCase();
    if (key === 'crit' || key === 'dodge' || key === 'precision') {
      parts.push(`${label} +${(value * 100).toFixed(1)}%`);
    } else {
      parts.push(`${label} +${Math.round(value)}`);
    }
  });
  return parts.join(' | ');
}

function rewardKeyFrom(reward) {
  if (!reward) return '';
  if (reward.type === 'stat') return `stat:${reward.stat}:${reward.value}`;
  if (reward.type === 'talent') return `talent:${reward.talentId}`;
  if (reward.type === 'weapon') return `weapon:${reward.weaponId}`;
  if (reward.type === 'relic') return `relic:${reward.relicId}`;
  return `${reward.type || 'reward'}`;
}

function playChestSound(soundEnabled) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = () => ctx.close();
  } catch (error) {
    // ignore audio errors
  }
}

function playEventSound(soundEnabled) {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.2);
    osc.onended = () => ctx.close();
  } catch (error) {
    // ignore audio errors
  }
}

function startAmbientSound() {
  if (ambientCtx) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.032;

    const low = ctx.createOscillator();
    low.type = 'sine';
    low.frequency.setValueAtTime(48, ctx.currentTime);
    low.detune.value = -6;
    const lowGain = ctx.createGain();
    lowGain.gain.value = 0.5;

    const mid = ctx.createOscillator();
    mid.type = 'triangle';
    mid.frequency.setValueAtTime(72, ctx.currentTime);
    mid.detune.value = 5;
    const midGain = ctx.createGain();
    midGain.gain.value = 0.16;

    const high = ctx.createOscillator();
    high.type = 'sine';
    high.frequency.setValueAtTime(57, ctx.currentTime);
    high.detune.value = -3;
    const highGain = ctx.createGain();
    highGain.gain.value = 0.12;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, ctx.currentTime);
    filter.Q.value = 1.1;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.03, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 55;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.setValueAtTime(0.05, ctx.currentTime);
    const ampLfoGain = ctx.createGain();
    ampLfoGain.gain.value = 0.01;
    ampLfo.connect(ampLfoGain);
    ampLfoGain.connect(master.gain);

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(240, ctx.currentTime);
    noiseFilter.Q.value = 0.9;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.011;

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.04;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.2;

    low.connect(lowGain);
    mid.connect(midGain);
    high.connect(highGain);
    lowGain.connect(filter);
    midGain.connect(filter);
    highGain.connect(filter);
    filter.connect(delay);
    filter.connect(master);

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    master.connect(ctx.destination);

    low.start();
    mid.start();
    high.start();
    noise.start();
    lfo.start();
    ampLfo.start();

    ambientCtx = ctx;
    ambientNodes = { low, mid, high, filter, master, noise, noiseFilter, lfo, lfoGain, ampLfo, ampLfoGain, lowGain, midGain, highGain, noiseGain, delay, feedback };
  } catch (error) {
    // ignore audio errors
  }
}

function stopAmbientSound() {
  if (!ambientCtx || !ambientNodes) return;
  try {
    ambientNodes.low.stop();
    ambientNodes.mid.stop();
    ambientNodes.high?.stop?.();
    ambientNodes.noise?.stop?.();
    ambientNodes.lfo?.stop?.();
    ambientNodes.ampLfo?.stop?.();
    ambientCtx.close();
  } catch (error) {
    // ignore audio errors
  } finally {
    ambientCtx = null;
    ambientNodes = null;
  }
}

function syncAmbientSound(settings) {
  const enabled = !!(settings?.sound && settings?.ambient);
  if (enabled) {
    startAmbientSound();
  } else {
    stopAmbientSound();
  }
}

function computePowerScore(stats, talents) {
  const baseScore = Math.round(
    (stats.hp || 0) * 0.2 +
    (stats.atk || 0) * 3 +
    (stats.def || 0) * 2 +
    (stats.spd || 0) * 1.5 +
    (stats.crit || 0) * 100 +
    (stats.dodge || 0) * 100 +
    (stats.precision || 0) * 100
  );
  const nonStatBonus = (talents || []).reduce((sum, id) => {
    if (id === 'berserk') return sum + 25;
    if (id === 'thorns') return sum + 22;
    if (id === 'lifesteal') return sum + 28;
    if (id === 'firstblood') return sum + 20;
    return sum;
  }, 0);
  return baseScore + nonStatBonus;
}

export function renderMainScreen() {
  const player = getPlayerState();
  const combatProfile = getPlayerCombatProfile();
  const settings = getSettings();
  syncAmbientSound(settings);
  const xpMax = xpToNext(player.level);
  const pendingRewards = getPendingRewards();
  const pendingEvent = getPendingEvent();
  const hasPendingRewards = pendingRewards.length > 0;
  const hasPendingEvent = !!pendingEvent;

  const ownedWeapons = getOwnedWeapons();
  const weaponPool = ownedWeapons.length ? ownedWeapons : [getDefaultWeapon()];
  const weaponList = weaponPool.map(entry => {
    const def = getWeaponById(entry.id) || getDefaultWeapon();
    return { ...def, ...entry };
  });
  const ownedTalents = getOwnedTalents();
  const combinedTalents = ownedTalents;
  const ownedRelics = getOwnedRelics();
  const runModifiers = getRunModifiers();
  const combinedBonus = getOwnedBonusStats();
  const weaponCollection = getWeaponCollectionBonus();
  const baseStats = computeBaseStats(player.level, combinedBonus);
  const powerSamples = weaponPool.map(weaponEntry => {
    let merged = applyWeaponStats(baseStats, weaponEntry);
    merged = applyRelicPassives(merged, ownedRelics);
    merged = applyTalentPassives(merged, combinedTalents);
    merged = applySynergyPassives(merged, combinedTalents);
    merged = applyRunModifiers(merged, runModifiers);
    return computePowerScore(merged, combinedTalents);
  });
  const playerPower = Math.round(powerSamples.reduce((sum, value) => sum + value, 0) / powerSamples.length);
  const talents = ownedTalents.length
    ? ownedTalents.map(id => {
        const t = getTalentById(id);
        const desc = getTalentDescription(id);
        return `<li><strong>${t ? t.name : id}</strong> <span class="muted">${desc}</span></li>`;
      }).join('')
    : '<li class="muted">Aucun pour le moment.</li>';

  const relics = ownedRelics.length
    ? ownedRelics.map(id => {
        const r = getRelicById(id);
        const rarity = r?.rarity ? `rarity-text-${normalizeRarity(r.rarity)}` : '';
        return `<li><strong class="${rarity}">${r ? r.name : id}</strong> <span class="muted">${r?.desc || ''}</span></li>`;
      }).join('')
    : '<li class="muted">Aucune relique.</li>';

  const modifiers = runModifiers.length
    ? runModifiers.map(id => {
        const mod = getModifierById(id);
        const rarity = mod?.rarity ? `rarity-text-${normalizeRarity(mod.rarity)}` : '';
        return `<li><strong class="${rarity}">${mod ? mod.name : id}</strong> <span class="muted">${mod?.desc || ''}</span></li>`;
      }).join('')
    : '<li class="muted">Aucun serment.</li>';

  const collectionTotalLine = formatBonusStats(weaponCollection.stats);
  const collectionPerWeaponLine = formatBonusStats(weaponCollection.perWeapon);
  const collectionSetsLine = weaponCollection.sets.length
    ? weaponCollection.sets.map(set => {
        const text = formatBonusStats(set.stats);
        const cls = set.active ? 'collection-set active' : 'collection-set';
        return `<span class="${cls}">${set.count} armes: ${text || 'Aucun bonus'}</span>`;
      }).join('')
    : '';

  const historyItems = player.history.length
    ? player.history.map(item => {
        if (item.type === 'reward') {
          const label = item.label || 'Bonus';
          const source = item.source ? `${item.source} - ` : '';
          const typeLabel = item.rewardType === 'weapon'
            ? 'arme'
            : item.rewardType === 'talent'
              ? 'talent'
              : item.rewardType === 'relic'
                ? 'relique'
                : 'bonus';
          const icon = item.rewardType === 'weapon'
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3l7 7-2.5 2.5-7-7L14 3z"/><path d="M9.5 8.5l-5 5"/><path d="M4.5 13.5L3 18l4.5-1.5"/></svg>'
            : item.rewardType === 'talent'
              ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 7-7 11-7-11 7-7z"/><path d="M12 7l3 3-3 5-3-5 3-3z"/></svg>'
              : item.rewardType === 'relic'
                ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l5 4 1 6-6 8-6-8 1-6 5-4z"/><path d="M12 7l2 2-2 4-2-4 2-2z"/></svg>'
                : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c2 3 4 4.5 4 7.5 0 3-2 5.5-4 7.5-2-2-4-4.5-4-7.5 0-3 2-4.5 4-7.5z"/><path d="M12 9c1 1.2 1.5 2.1 1.5 3.4 0 1.4-.7 2.5-1.5 3.4-.8-.9-1.5-2-1.5-3.4 0-1.3.5-2.2 1.5-3.4z"/></svg>';
          const rarityClass = item.rarity ? `rarity-text-${normalizeRarity(item.rarity)}` : '';
          const desc = item.desc ? ` <span class="muted">${item.desc}</span>` : '';
          return `<li><span class="badge reward">${typeLabel}</span><span class="history-icon icon-${item.rewardType}">${icon}</span> ${source}<span class="history-label ${rarityClass}">${label}</span>${desc}</li>`;
        }
        if (item.type === 'event') {
          const title = item.title || 'Evenement';
          const summary = item.summary || '';
          const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a3 3 0 0 1 3 3v10H7a3 3 0 0 1-3-3V4h3z"/><path d="M7 4v10a2 2 0 0 0 2 2h11"/><path d="M9 7h6"/><path d="M9 10h6"/></svg>';
          return `<li><span class="badge event">event</span><span class="history-icon icon-event">${icon}</span> ${title} - ${summary}</li>`;
        }
        return '';
      }).filter(Boolean)
    : [];
  const history = historyItems.length
    ? historyItems.join('')
    : '<li class="muted">Aucun bonus ou evenement enregistre.</li>';

  const app = document.getElementById('app');
  const gameUI = document.getElementById('game-ui');
  if (app) app.classList.remove('combat-mode');
  const combatLog = document.getElementById('combat-log');
  if (combatLog) combatLog.innerHTML = '';
  const nextEnemy = getNextEnemyPreview();
  const nextEnemyTitle = nextEnemy.isBoss ? `Boss niveau ${nextEnemy.level}` : `Ennemi niveau ${nextEnemy.level}`;
  const nextEnemyProfile = nextEnemy.profile ? nextEnemy.profile : 'balanced';
  const nextEnemyTalents = Array.isArray(nextEnemy.talents) ? nextEnemy.talents.length : 0;
  const enemyStats = nextEnemy.stats || {};
  const enemyStatsLine = `HP ${enemyStats.hp ?? '-'} | ATK ${enemyStats.atk ?? '-'} | DEF ${enemyStats.def ?? '-'} | SPD ${enemyStats.spd ?? '-'} | CRIT ${enemyStats.crit ? (enemyStats.crit * 100).toFixed(1) : '0.0'}% | DODGE ${enemyStats.dodge ? (enemyStats.dodge * 100).toFixed(1) : '0.0'}% | PREC ${enemyStats.precision ? (enemyStats.precision * 100).toFixed(1) : '0.0'}%`;
  const powerScore = computePowerScore(enemyStats, nextEnemy.talents || []);

  gameUI.innerHTML = `
    <div class="main-grid">
      <div class="main-col">
        <section class="card">
          <div class="title-row">
            <div class="title-left">
              <h2>${player.name}</h2>
              <span class="gold-pill">Or ${player.gold || 0}</span>
            </div>
            <span class="seed">Seed ${player.seed}</span>
          </div>
          <div class="level-row">
            <div class="level-pill">Niveau ${player.level}</div>
            <div class="xp-track">
              <div class="xp-fill" style="width:${Math.round((player.xp / xpMax) * 100)}%"></div>
            </div>
            <div class="muted small">XP ${player.xp} / ${xpMax}</div>
          </div>
          <div class="stats-grid">
            <div><span>HP</span><strong>${combatProfile.stats.hp}</strong></div>
            <div><span>ATK</span><strong>${combatProfile.stats.atk}</strong></div>
            <div><span>DEF</span><strong>${combatProfile.stats.def}</strong></div>
            <div><span>SPD</span><strong>${combatProfile.stats.spd}</strong></div>
            <div><span>CRIT</span><strong>${(combatProfile.stats.crit * 100).toFixed(1)}%</strong></div>
            <div><span>DODGE</span><strong>${(combatProfile.stats.dodge * 100).toFixed(1)}%</strong></div>
            <div><span>PREC</span><strong>${(combatProfile.stats.precision * 100).toFixed(1)}%</strong></div>
          </div>
          <div class="weapon-line">
            <span>Armes possedees</span>
            <strong class="weapon-pills">
              ${weaponList.map(w => `<span class="weapon-pill rarity-${normalizeRarity(w.rarity)}" data-tip="${weaponStatsText(w)}">${w.name}</span>`).join(' ')}
            </strong>
            <span class="muted">${ownedWeapons.length ? 'Utilise une arme au hasard en combat.' : 'Aucune arme, utilise les poings.'}</span>
          </div>
          <div class="collection-line">
            <span>Bonus collection (${weaponCollection.count} armes)</span>
            <strong>${collectionTotalLine || 'Aucun bonus pour le moment.'}</strong>
            <span class="muted small">Par arme: ${collectionPerWeaponLine || 'Aucun'}</span>
            <div class="collection-sets">
              ${collectionSetsLine}
            </div>
          </div>
          <div class="power-line">Puissance totale: ${playerPower}</div>
        </section>

        <section class="card">
          <h3>Talents</h3>
          <ul class="list">${talents}</ul>
        </section>
        <section class="card">
          <h3>Reliques</h3>
          <ul class="list">${relics}</ul>
        </section>
        <section class="card">
          <h3>Serments</h3>
          <ul class="list">${modifiers}</ul>
        </section>
        <section class="card danger-card">
          <h3>Run</h3>
          <p class="muted">Repartir niveau 1 et effacer tous les bonus.</p>
          <button id="sacrifice-btn">Sacrifier le personnage</button>
        </section>

        <section class="card">
          <h3>Reglages</h3>
          <label class="setting-row">
            <span>Vitesse d'animation</span>
            <input id="speed-input" type="range" min="0.5" max="2" step="0.1" value="${settings.animSpeed}" />
            <span class="muted">${settings.animSpeed.toFixed(1)}x</span>
          </label>
          <label class="setting-row">
            <span>Son</span>
            <input id="sound-input" type="checkbox" ${settings.sound ? 'checked' : ''} />
          </label>
          <label class="setting-row">
            <span>Ambiance</span>
            <input id="ambient-input" type="checkbox" ${settings.ambient ? 'checked' : ''} />
          </label>
        </section>

        <section class="card">
          <h3>Partage</h3>
          <p class="muted">Partage ton seed pour recreer le personnage.</p>
          <div class="share-row">
            <input id="seed-input" type="text" value="${player.seed}" />
            <button id="copy-seed-btn">Copier</button>
          </div>
          <div class="share-row">
            <input id="import-input" type="text" placeholder="Importer un seed..." />
            <button id="import-seed-btn">Importer</button>
          </div>
        </section>
      </div>

      <div class="main-col">
        ${hasPendingEvent && !hasPendingRewards ? '<section class="card" id="main-event-panel"></section>' : ''}
        <section class="card">
          <h3>Prochain combat</h3>
          <div class="next-enemy">
            <div class="next-title">
              ${nextEnemyTitle}
              ${nextEnemy.isBoss ? '<span class="boss-icon">BOSS</span>' : ''}
            </div>
            <div class="muted">Profil: ${nextEnemyProfile}</div>
            <div class="muted">Talents: ${nextEnemyTalents}</div>
            <div class="muted">${nextEnemy.isBoss ? 'Combat de boss' : 'Combat standard'}</div>
            <div class="next-stats">${enemyStatsLine}</div>
            <div class="next-power">Puissance totale: ${powerScore}</div>
          </div>
          ${hasPendingRewards
            ? '<p class="muted small">Choisis une recompense avant de lancer un combat.</p>'
            : hasPendingEvent
              ? '<p class="muted small">Choisis un evenement avant de repartir.</p>'
              : '<button id="start-btn" class="primary">Lancer une baston</button>'}
        </section>
        <section class="card">
          <h3>Bonus conserves</h3>
          <div class="bonus-group">
            <div class="muted small">Stats</div>
            <ul class="list">
              ${Object.entries(player.permanent?.bonusStats || {}).filter(([, value]) => value)
                .map(([key, value]) => {
                  const isPercent = key === 'crit' || key === 'dodge' || key === 'precision';
                  const label = key === 'precision' ? 'PREC' : key.toUpperCase();
                  return `<li>${label} +${isPercent ? (value * 100).toFixed(1) + '%' : value}</li>`;
                }).join('') || '<li class="muted">Aucun bonus</li>'}
            </ul>
          </div>
          <div class="bonus-group">
            <div class="muted small">Talents</div>
            <ul class="list">
              ${(player.permanent?.talents || []).length
                ? player.permanent.talents.map(id => {
                    const t = getTalentById(id);
                    return `<li>${t ? t.name : id}</li>`;
                  }).join('')
                : '<li class="muted">Aucun talent</li>'}
            </ul>
          </div>
          <div class="bonus-group">
            <div class="muted small">Reliques</div>
            <ul class="list">
              ${(player.permanent?.relics || []).length
                ? player.permanent.relics.map(id => {
                    const r = getRelicById(id);
                    const rarity = normalizeRarity(r?.rarity || 'common');
                    return `<li class="rarity-${rarity}">${r ? r.name : id}</li>`;
                  }).join('')
                : '<li class="muted">Aucune relique</li>'}
            </ul>
          </div>
          <div class="bonus-group">
            <div class="muted small">Armes</div>
            <ul class="list">
              ${(player.permanent?.weapons || []).length
                ? player.permanent.weapons.map(entry => {
                    const id = typeof entry === 'object' ? entry.id : entry;
                    const rarity = normalizeRarity(typeof entry === 'object' ? entry.rarity : null);
                    const w = getWeaponById(id);
                    return `<li class="rarity-${rarity}">${w ? w.name : id}</li>`;
                  }).join('')
                : '<li class="muted">Aucune arme</li>'}
            </ul>
          </div>
        </section>
        <section class="card">
          <h3>Historique</h3>
          <ul class="list">${history}</ul>
        </section>
      </div>
    </div>
  `;

  if (pendingEvent && !hasPendingRewards) {
    const target = document.getElementById('main-event-panel');
    const handleEventChoice = choiceId => {
      const result = applyEventChoice(choiceId);
      return {
        title: result?.title || pendingEvent.title || 'Evenement',
        choiceLabel: result?.choiceLabel || '',
        summary: result?.summary || 'Aucun effet.',
        onContinue: () => window.dispatchEvent(new Event('return-main'))
      };
    };
    renderEventPanel(pendingEvent, handleEventChoice, target);
  }

  document.getElementById('copy-seed-btn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(player.seed);
  });

  document.getElementById('import-seed-btn')?.addEventListener('click', () => {
    const value = document.getElementById('import-input').value;
    const event = new CustomEvent('import-seed', { detail: value });
    window.dispatchEvent(event);
  });

  document.getElementById('speed-input')?.addEventListener('input', event => {
    const value = Number(event.target.value);
    updateSettings({ animSpeed: value });
    renderMainScreen();
  });

  document.getElementById('sound-input')?.addEventListener('change', event => {
    updateSettings({ sound: event.target.checked });
    syncAmbientSound(getSettings());
  });

  document.getElementById('ambient-input')?.addEventListener('change', event => {
    updateSettings({ ambient: event.target.checked });
    syncAmbientSound(getSettings());
  });

  document.getElementById('sacrifice-btn')?.addEventListener('click', () => {
    const ok = window.confirm('Tout sera efface. Confirmer le sacrifice ?');
    if (!ok) return;
    window.dispatchEvent(new Event('sacrifice-run'));
  });
}

export function renderFightScreen(player, enemy) {
  const app = document.getElementById('app');
  if (app) app.classList.add('combat-mode');
  const gameUI = document.getElementById('game-ui');
  const settings = getSettings();
  syncAmbientSound(settings);
  const playerProfile = 'hero';
  const enemyProfile = enemy.profile || 'balanced';
  const playerWeapon = getDefaultWeapon();
  const enemyWeapon = getDefaultWeapon();
  const playerWeaponRarity = 'none';
  const enemyWeaponRarity = enemyWeapon?.id === 'fists' ? 'none' : (enemyWeapon?.rarity || 'none');
  gameUI.innerHTML = `
    <section class="card fight-card ${enemy.isBoss ? 'boss-entry' : ''}">
      <div class="combat-outcome" id="combat-outcome"></div>
      ${enemy.isBoss ? '<div class="boss-badge">BOSS</div>' : ''}
      <div class="arena">
        <div class="fighter left" id="fighterA" data-weapon="${playerWeaponRarity}">
          <div class="portrait-card">
            <div class="portrait-head" data-profile="${playerProfile}"></div>
            <div class="portrait-info">
              <div class="portrait-name">${player.name}</div>
              <div class="portrait-sub">Niv ${player.level} - Arme: <span class="portrait-weapon rarity-common">Poings</span></div>
            </div>
          </div>
          <div class="fighter-sprite-wrap">
            <div class="fighter-sprite" data-profile="${playerProfile}">
              <span class="sprite-shadow"></span>
              <span class="sprite-body"></span>
              <span class="sprite-weapon" data-weapon="${playerWeaponRarity}" data-weapon-id="${playerWeapon?.id || 'fists'}"></span>
              <span class="sprite-arc" data-weapon-id="${playerWeapon?.id || 'fists'}"></span>
            </div>
          </div>
          <div class="hp-bar">
            <div class="hp-fill" id="hpA"></div>
            <span class="hp-text" id="hpTextA"></span>
          </div>
        </div>
        <div class="fighter right ${enemy.isBoss ? 'boss-fighter' : ''}" id="fighterB" data-weapon="${enemyWeaponRarity}">
          <div class="portrait-card">
            <div class="portrait-head" data-profile="${enemyProfile}"></div>
            <div class="portrait-info">
              <div class="portrait-name">${enemy.name}</div>
              <div class="portrait-sub">Niv ${enemy.level} - ${enemy.isBoss ? 'BOSS' : enemyProfile} - Arme: <span class="portrait-weapon rarity-common">Poings</span></div>
            </div>
          </div>
          <div class="fighter-sprite-wrap">
            <div class="fighter-sprite" data-profile="${enemyProfile}">
              <span class="sprite-shadow"></span>
              <span class="sprite-body"></span>
              <span class="sprite-weapon" data-weapon="${enemyWeaponRarity}" data-weapon-id="${enemyWeapon?.id || 'fists'}"></span>
              <span class="sprite-arc" data-weapon-id="${enemyWeapon?.id || 'fists'}"></span>
            </div>
          </div>
          <div class="hp-bar">
            <div class="hp-fill" id="hpB"></div>
            <span class="hp-text" id="hpTextB"></span>
          </div>
        </div>
      </div>
    </section>
  `;
  setHPBar('A', player.stats.hp, player.stats.hp);
  setHPBar('B', enemy.stats.hp, enemy.stats.hp);
  const combatLog = document.getElementById('combat-log');
  if (combatLog) {
    combatLog.innerHTML = `
      <div class="combat-log-entries" id="combat-log-entries"></div>
      <div class="combat-log-actions" id="combat-log-actions"></div>
    `;
  }
  updateCombatLog(['Pret a bastonner!']);
}

export function playCombatFx(side, kind, amount = null) {
  if (!side) return;
  if (kind === 'acting') {
    addFxClass(side, 'fx-acting', 300);
    spawnDust(side);
    return;
  }

  if (kind === 'critTrail') {
    addFxClass(side, 'fx-crit-trail', 520);
    return;
  }

  if (kind === 'hit') {
    addFxClass(side, 'fx-hit', 360);
    pulseHpBar(side);
    spawnImpact(side, false);
    if (typeof amount === 'number') {
      spawnFxText(side, `-${amount}`, 'damage');
    }
    return;
  }

  if (kind === 'crit') {
    addFxClass(side, 'fx-crit', 420);
    pulseHpBar(side);
    spawnImpact(side, true);
    if (typeof amount === 'number') {
      spawnFxText(side, `CRIT -${amount}`, 'crit');
    }
    return;
  }

  if (kind === 'dodge') {
    addFxClass(side, 'fx-dodge', 360);
    spawnFxText(side, 'DODGE', 'dodge');
    return;
  }

  if (kind === 'heal') {
    addFxClass(side, 'fx-heal', 360);
    if (typeof amount === 'number') {
      spawnFxText(side, `+${amount}`, 'heal');
    }
    return;
  }

  if (kind === 'thorns') {
    addFxClass(side, 'fx-thorns', 360);
    if (typeof amount === 'number') {
      spawnFxText(side, `-${amount}`, 'thorns');
    }
  }
}

export function showCombatOutcome(result) {
  const outcome = document.getElementById('combat-outcome');
  if (!outcome) return;
  outcome.className = 'combat-outcome';
  if (result === 'win') {
    outcome.textContent = 'VICTOIRE';
    outcome.classList.add('show', 'outcome-win');
  } else if (result === 'lose') {
    outcome.textContent = 'DEFAITE';
    outcome.classList.add('show', 'outcome-lose');
  } else {
    outcome.textContent = 'MATCH NUL';
    outcome.classList.add('show', 'outcome-tie');
  }
}

export function triggerScreenShake(level = 'md') {
  if (level === 'lg') {
    triggerShakeClass('screen-shake-lg', 420);
    return;
  }
  if (level === 'sm') {
    triggerShakeClass('screen-shake-sm', 320);
    return;
  }
  triggerShakeClass('screen-shake-md', 360);
}

export function triggerCombatZoom() {
  const card = document.querySelector('.fight-card');
  if (!card) return;
  card.classList.remove('combat-zoom');
  void card.offsetWidth;
  card.classList.add('combat-zoom');
  if (zoomTimer) clearTimeout(zoomTimer);
  zoomTimer = setTimeout(() => {
    card.classList.remove('combat-zoom');
  }, 300);
}

export function updateFighterWeapon(side, weapon) {
  const fighter = getFighterEl(side);
  if (!fighter) return;
  const weaponId = weapon?.id || 'fists';
  const rawRarity = weaponId === 'fists' ? 'none' : (weapon?.rarity || 'common');
  const rarity = rawRarity === 'none' ? 'none' : normalizeRarity(rawRarity);
  fighter.setAttribute('data-weapon', rarity);
  const spriteWeapon = fighter.querySelector('.sprite-weapon');
  if (spriteWeapon) {
    spriteWeapon.setAttribute('data-weapon', rarity);
    spriteWeapon.setAttribute('data-weapon-id', weaponId);
  }
  const spriteArc = fighter.querySelector('.sprite-arc');
  if (spriteArc) {
    spriteArc.setAttribute('data-weapon-id', weaponId);
  }
  const weaponLabel = fighter.querySelector('.portrait-weapon');
  if (weaponLabel) {
    const weaponDef = weaponId === 'fists' ? getDefaultWeapon() : getWeaponById(weaponId);
    const displayName = weaponDef?.name || 'Poings';
    const labelRarity = rarity === 'none' ? 'common' : rarity;
    weaponLabel.textContent = displayName;
    weaponLabel.className = `portrait-weapon rarity-${labelRarity}`;
  }
}

export function renderPostFightButtons() {
  const combatLog = document.getElementById('combat-log');
  const existing = document.getElementById('post-combat-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'post-combat-menu';
  menu.innerHTML = `
    <button id="again-btn" class="primary">Relancer une baston</button>
    <button id="back-btn">Retour au menu</button>
  `;
  const actions = document.getElementById('combat-log-actions');
  if (actions) {
    actions.appendChild(menu);
  } else if (combatLog) {
    combatLog.appendChild(menu);
  }

  document.getElementById('again-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new Event('combat-again'));
  });
  document.getElementById('back-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new Event('return-main'));
  });
}

export function renderBossOptions({ onContinue, onCashout }) {
  const combatLog = document.getElementById('combat-log');
  const actions = document.getElementById('combat-log-actions');
  const target = actions || combatLog;
  if (!target) return;

  target.innerHTML = `
    <div class="boss-panel">
      <div class="boss-title">Boss vaincu</div>
      <div class="boss-text">Tu peux continuer ou repartir niveau 1 avec un bonus conserve.</div>
      <div class="boss-actions">
        <button id="boss-continue-btn">Continuer la run</button>
        <button id="boss-cashout-btn" class="primary">Encaisser un bonus</button>
      </div>
    </div>
  `;

  document.getElementById('boss-continue-btn')?.addEventListener('click', () => {
    onContinue?.();
  });
  document.getElementById('boss-cashout-btn')?.addEventListener('click', () => {
    onCashout?.();
  });
}

export function renderBossChest({ rewards = [], onPick, onContinue }) {
  const combatLog = document.getElementById('combat-log');
  const actions = document.getElementById('combat-log-actions');
  const target = actions || combatLog;
  if (!target) return;
  const list = Array.isArray(rewards) ? rewards : [];
  const seen = new Set();
  const choices = list.map(reward => {
    const key = reward.key || rewardKeyFrom(reward);
    if (!key || seen.has(key)) return null;
    seen.add(key);
    return { ...reward, key };
  }).filter(Boolean);

  target.innerHTML = `
    <div class="chest-panel">
      <div class="boss-header-row">
        <div class="boss-title">Choisis le bonus a conserver</div>
        <div class="boss-filters">
          <label class="filter">
            <span>Type</span>
            <select id="boss-filter-type">
              <option value="all">Tous</option>
              <option value="stat">Stat</option>
              <option value="talent">Talent</option>
              <option value="weapon">Arme</option>
              <option value="relic">Relique</option>
            </select>
          </label>
          <label class="filter">
            <span>Rarite</span>
            <select id="boss-filter-rarity">
              <option value="all">Toutes</option>
              <option value="common">Commun</option>
              <option value="uncommon">Peu commun</option>
              <option value="rare">Rare</option>
              <option value="epic">Epique</option>
              <option value="legendary">Legendaire</option>
              <option value="ultimate">Ultime</option>
            </select>
          </label>
        </div>
      </div>
      <div class="reward-grid cashout-grid">
        ${choices.map(reward => {
          const typeLabel = reward.type === 'weapon' ? 'WEAPON' : reward.type === 'talent' ? 'TALENT' : reward.type === 'relic' ? 'RELIC' : 'STAT';
          const weapon = reward.type === 'weapon' ? getWeaponById(reward.weaponId) : null;
          const talent = reward.type === 'talent' ? getTalentById(reward.talentId) : null;
          const relic = reward.type === 'relic' ? getRelicById(reward.relicId) : null;
          const title = reward.label || weapon?.name || talent?.name || relic?.name || 'Bonus';
          const desc = reward.type === 'weapon'
            ? (weapon?.desc || '')
            : reward.type === 'talent'
              ? (getTalentDescription(reward.talentId) || '')
              : reward.type === 'relic'
                ? (relic?.desc || '')
                : 'Bonus permanent.';
          const rarity = normalizeRarity(reward.rarity || weapon?.rarity || talent?.rarity || relic?.rarity || 'common');
          const tip = reward.type === 'weapon'
            ? weaponStatsText({ id: reward.weaponId, rarity })
            : '';
          const showTip = shouldShowRewardTip(tip, title, desc);
          const tipAttr = showTip ? ` data-tip="${tip}"` : '';
          return `
            <button class="reward-card rarity-${rarity}" data-reward-key="${reward.key}" data-type="${reward.type}" data-rarity="${rarity}"${tipAttr}>
              <div class="reward-title">${title}</div>
              <div class="reward-desc">${desc}</div>
              <div class="reward-meta">${typeLabel}</div>
            </button>
          `;
        }).join('')}
      </div>
      <div class="chest-result muted" id="chest-result"></div>
      <button id="chest-continue-btn" class="primary" disabled>Continuer</button>
    </div>
  `;

  const settings = getSettings();
  const resultEl = document.getElementById('chest-result');
  const continueBtn = document.getElementById('chest-continue-btn');
  let opened = false;

  const revealReward = reward => {
    if (!resultEl) return;
    if (!reward) {
      resultEl.textContent = 'Aucun bonus a recuperer.';
    } else {
      resultEl.textContent = `Bonus recupere: ${reward.label || 'Inconnu'}.`;
    }
    if (continueBtn) continueBtn.disabled = false;
  };

  const applyFilters = () => {
    const typeFilter = document.getElementById('boss-filter-type')?.value || 'all';
    const rarityFilter = document.getElementById('boss-filter-rarity')?.value || 'all';
    const cards = Array.from(target.querySelectorAll('[data-reward-key]'));
    cards.forEach(card => {
      const type = card.getAttribute('data-type');
      const rarity = card.getAttribute('data-rarity');
      const typeOk = typeFilter === 'all' || type === typeFilter;
      const rarityOk = rarityFilter === 'all' || rarity === rarityFilter;
      card.style.display = typeOk && rarityOk ? '' : 'none';
    });
  };

  document.getElementById('boss-filter-type')?.addEventListener('change', applyFilters);
  document.getElementById('boss-filter-rarity')?.addEventListener('change', applyFilters);
  applyFilters();

  if (!choices.length) {
    revealReward(null);
  } else {
    Array.from(target.querySelectorAll('[data-reward-key]')).forEach(btn => {
      btn.addEventListener('click', () => {
        if (opened) return;
        opened = true;
        btn.classList.add('selected');
        playChestSound(settings.sound);
        const reward = onPick ? onPick(btn.getAttribute('data-reward-key')) : null;
        setTimeout(() => revealReward(reward), 300);
        Array.from(target.querySelectorAll('[data-reward-key]')).forEach(other => {
          other.disabled = true;
        });
      });
    });
  }

  continueBtn?.addEventListener('click', () => {
    onContinue?.();
  });
}

export function renderEventPanel(eventData, onSelect = null, target = null, playIntro = false) {
  if (!eventData) return;
  const container = target || document.getElementById('combat-log-actions') || document.getElementById('combat-log');
  if (!container) return;
  const kind = eventData.kind || 'event';
  const iconText = EVENT_ICON_TEXT[kind] || 'EVT';
  const player = getPlayerState();
  const gold = player.gold || 0;
  const renderResult = result => {
    const currentPlayer = getPlayerState();
    const nextGold = currentPlayer.gold || 0;
    const title = result?.title || eventData.title || 'Evenement';
    const choiceLabel = result?.choiceLabel ? `<div class="event-result-choice">${result.choiceLabel}</div>` : '';
    const summary = result?.summary || 'Aucun effet.';
    const continueLabel = result?.continueLabel || 'Continuer';

    container.innerHTML = `
      <div class="event-panel event-${kind}">
        <div class="event-header">
          <div class="event-icon event-${kind}">${iconText}</div>
          <span class="event-tag">EVENEMENT</span>
          ${kind === 'shop' ? `<span class="event-gold">Or: ${nextGold}</span>` : ''}
          <div>
            <div class="event-title">${title}</div>
            <div class="event-text">${eventData.text || ''}</div>
          </div>
        </div>
        <div class="event-result">
          ${choiceLabel}
          <div class="event-result-text">${summary}</div>
        </div>
        <button id="event-continue-btn" class="primary">${continueLabel}</button>
      </div>
    `;

    const continueBtn = container.querySelector('#event-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (result?.onContinue) {
          result.onContinue();
        } else {
          window.dispatchEvent(new Event('return-main'));
        }
      });
    }

    const resultBox = container.querySelector('.event-result');
    if (resultBox) {
      resultBox.classList.remove('flash');
      void resultBox.offsetWidth;
      resultBox.classList.add('flash');
    }
    const settings = getSettings();
    playEventSound(settings.sound);
  };

  container.innerHTML = `
    <div class="event-panel event-${kind}">
      <div class="event-header">
        <div class="event-icon event-${kind}">${iconText}</div>
        <span class="event-tag">EVENEMENT</span>
        ${kind === 'shop' ? `<span class="event-gold">Or: ${gold}</span>` : ''}
        <div>
          <div class="event-title">${eventData.title || 'Evenement'}</div>
          <div class="event-text">${eventData.text || ''}</div>
        </div>
      </div>
      <div class="event-grid">
        ${(eventData.options || []).map(option => {
          const weapon = option.weaponId ? getWeaponById(option.weaponId) : null;
          const rarity = normalizeRarity(option.rarity || 'common');
          const tip = weapon ? weaponStatsText({ id: option.weaponId, rarity }) : '';
          const showTip = shouldShowRewardTip(tip, option.label, option.desc);
          const tipAttr = showTip ? ` data-tip="${tip}"` : '';
          const cost = option.cost || 0;
          const canAfford = cost ? gold >= cost : true;
          const disabledAttr = canAfford ? '' : ' disabled';
          const lockedClass = canAfford ? '' : ' locked';
          return `
            <button class="reward-card event-card rarity-${rarity}${lockedClass}" data-event-choice="${option.id}"${tipAttr}${disabledAttr}>
              <div class="reward-title">${option.label}</div>
              <div class="reward-desc">${option.desc || ''}</div>
              ${cost ? `<div class="reward-meta">COUT: ${cost} OR</div>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const buttons = Array.from(container.querySelectorAll('[data-event-choice]'));
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const choiceId = btn.getAttribute('data-event-choice');
      if (!choiceId) return;
      buttons.forEach(other => {
        other.disabled = true;
      });
      if (onSelect) {
        const result = onSelect(choiceId);
        if (result) {
          renderResult(result);
        }
      } else {
        const event = new CustomEvent('event-choice', { detail: choiceId });
        window.dispatchEvent(event);
      }
    });
  });

  if (playIntro) {
    const panel = container.querySelector('.event-panel');
    if (panel) {
      panel.classList.remove('event-intro');
      void panel.offsetWidth;
      panel.classList.add('event-intro');
    }
    const settings = getSettings();
    playEventSound(settings.sound);
  }
}

export function setHPBar(player, hp, maxHp) {
  const percent = Math.max(0, Math.round((hp / maxHp) * 100));
  const el = document.getElementById(player === 'A' ? 'hpA' : 'hpB');
  const textEl = document.getElementById(player === 'A' ? 'hpTextA' : 'hpTextB');
  const barEl = el ? el.parentElement : null;
  if (el) {
    el.style.width = percent + '%';
    if (!textEl) {
      el.innerHTML = `<span>${hp} PV</span>`;
    }
  }
  if (textEl) {
    textEl.textContent = `${hp} PV`;
  }
  if (barEl) {
    if (percent <= 25) {
      barEl.classList.add('hp-low');
    } else {
      barEl.classList.remove('hp-low');
    }
  }
}

export function updateCombatLog(lines) {
  const entries = document.getElementById('combat-log-entries');
  if (entries) {
    entries.innerHTML = lines.join('<br>');
    entries.scrollTop = entries.scrollHeight;
    return;
  }
  const combatLog = document.getElementById('combat-log');
  if (combatLog) combatLog.innerHTML = lines.join('<br>');
}

export function renderLevelUpChoices(levelEntry, onConfirm) {
  const combatLog = document.getElementById('combat-log');
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.disabled = true;

  combatLog.innerHTML = `
    <div class="levelup-panel">
      <h3>Niveau ${levelEntry.level} - Choisis une recompense</h3>
      <div class="reward-grid">
        ${levelEntry.options.map(option => {
          const weapon = option.type === 'weapon' ? getWeaponById(option.weaponId) : null;
          const tip = option.type === 'weapon'
            ? weaponStatsText({ id: option.weaponId, rarity: option.rarity })
            : '';
          const showTip = shouldShowRewardTip(tip, option.label, option.desc);
          const tipAttr = showTip ? ` data-tip="${tip}"` : '';
          const rarity = normalizeRarity(option.rarity);
          return `
            <button class="reward-card rarity-${rarity}" data-choice="${option.id}"${tipAttr}>
              <div class="reward-title">${option.label}</div>
              <div class="reward-desc">${option.desc || ''}</div>
              <div class="reward-meta">${option.type.toUpperCase()}</div>
            </button>
          `;
        }).join('')}
      </div>
      <button id="confirm-reward-btn" class="primary" disabled>Valider</button>
    </div>
  `;

  let selectedId = null;
  const confirmBtn = document.getElementById('confirm-reward-btn');
  Array.from(combatLog.querySelectorAll('.reward-card')).forEach(btn => {
    btn.addEventListener('click', () => {
      Array.from(combatLog.querySelectorAll('.reward-card')).forEach(card => {
        card.classList.remove('selected');
      });
      btn.classList.add('selected');
      selectedId = btn.getAttribute('data-choice');
      if (confirmBtn) confirmBtn.disabled = false;
    });
  });

  confirmBtn?.addEventListener('click', () => {
    if (!selectedId) return;
    onConfirm(selectedId);
  });
}
