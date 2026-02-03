// src/game/storage.js
// Gestion de la sauvegarde locale (localStorage)

const STORAGE_KEY = "nay_baston_save";

/**
 * Charge la sauvegarde depuis le navigateur
 */
export function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erreur chargement sauvegarde", e);
    return null;
  }
}

/**
 * Sauvegarde l'état du jeu
 */
export function saveGame(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Supprime la sauvegarde (utile pour reset)
 */
export function clearGame() {
  localStorage.removeItem(STORAGE_KEY);
}
