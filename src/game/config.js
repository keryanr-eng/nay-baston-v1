// src/game/config.js
// Toutes les règles du jeu sont ici

export const CONFIG = {
  // ----- STATS DE BASE -----
  BASE_STATS: {
    hp: 100,
    atk: 10,
    def: 5,
    spd: 10,
    crit: 0.05,   // 5 %
    dodge: 0.05,  // 5 %
  },

  // ----- GAIN PAR NIVEAU -----
  PER_LEVEL: {
    hp: 12,
    atk: 2,
    def: 1,
    spd: 1,
    crit: 0.004,
    dodge: 0.003,
  },

  // ----- EXPERIENCE -----
  XP: {
    WIN: 100,
    LOSE: 40,
    NEXT_LEVEL: (level) => 120 + (level - 1) * 35,
  },

  // ----- COMBAT -----
  COMBAT: {
    INITIATIVE_THRESHOLD: 100,
    DEF_FACTOR: 0.6,
    CRIT_MULTIPLIER: 1.7,
    MAX_DURATION_SECONDS: 60,
  },

  // ----- TALENTS (passifs) -----
  TALENTS: [
    { id: "berserk", name: "Berserk", desc: "ATK +35% si HP < 30%" },
    { id: "tank", name: "Tank", desc: "HP +20%" },
    { id: "thorns", name: "Épine", desc: "Renvoie 15% des dégâts" },
    { id: "precision", name: "Précision", desc: "CRIT +8%" },
    { id: "ninja", name: "Ninja", desc: "DODGE +8%" },
    { id: "fast", name: "Rapide", desc: "SPD +15%" },
    { id: "armor", name: "Armure", desc: "DEF +25%" },
    { id: "lifesteal", name: "Vampirisme", desc: "Soigne 20% des dégâts infligés" },
    { id: "firstblood", name: "Premier Sang", desc: "Première attaque x2" },
  ],

  // ----- ARMES -----
  WEAPONS: [
    { id: "dagger", name: "Dague", mods: { spd: 2, crit: 0.03 } },
    { id: "sword", name: "Épée", mods: { atk: 3 } },
    { id: "axe", name: "Hache", mods: { atk: 5, spd: -1 } },
    { id: "shield", name: "Bouclier", mods: { def: 3, dodge: -0.01 } },
  ],

  // ----- PROFILS D’ENNEMIS -----
  ENEMY_PROFILES: [
    { id: "balanced", mult: { hp: 1, atk: 1, def: 1, spd: 1 } },
    { id: "tank", mult: { hp: 1.1, atk: 1, def: 1.05, spd: 0.95 } },
    { id: "speed", mult: { hp: 0.95, atk: 1, def: 0.95, spd: 1.1 } },
    { id: "glass", mult: { hp: 0.9, atk: 1.15, def: 0.9, spd: 1 } },
  ],
};
