import { renderMainScreen, renderLevelUpChoices } from './game/ui.js';
import { startCombat } from './game/combat.js';
import { importSeed, resetPlayer, getPendingRewards, applyRewardChoice, applyEventChoice, resetAfterDeath } from './game/player.js';

function wireMainScreen() {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      await startCombat();
      startBtn.disabled = false;
    });
  }
}

function wireSeedImport() {
  window.addEventListener('import-seed', event => {
    const seed = event.detail;
    const imported = importSeed(seed);
    if (imported) {
      renderMainScreen();
      wireMainScreen();
    }
  });
}

function showPendingRewardsIfAny() {
  const pending = getPendingRewards();
  if (!pending.length) return false;

  const handleChoice = choiceId => {
    applyRewardChoice(choiceId);
    const next = getPendingRewards();
    if (next.length) {
      renderLevelUpChoices(next[0], handleChoice);
    } else {
      renderMainScreen();
      wireMainScreen();
    }
  };

  renderLevelUpChoices(pending[0], handleChoice);
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  renderMainScreen();
  wireMainScreen();
  wireSeedImport();
  showPendingRewardsIfAny();

  window.addEventListener('return-main', () => {
    renderMainScreen();
    wireMainScreen();
  });

  window.addEventListener('combat-again', async () => {
    await startCombat();
  });

  window.addEventListener('event-choice', event => {
    applyEventChoice(event.detail);
    renderMainScreen();
    wireMainScreen();
  });

  window.addEventListener('sacrifice-run', () => {
    resetAfterDeath();
    renderMainScreen();
    wireMainScreen();
  });

  window.resetPlayer = resetPlayer;
});
