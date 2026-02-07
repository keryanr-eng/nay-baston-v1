import { startCombat } from './game/combat.js';
import { renderMainScreen, renderLevelUpChoices } from './game/ui.js';
import { importSeed, resetPlayer, getPendingRewards, applyRewardChoice, applyEventChoice, resetAfterDeath, shouldPromptForName, setPlayerName, getPlayerState } from './game/player.js';

function wireMainScreen() {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      promptForNameIfNeeded();
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
      renderMain();
    }
  });
}

function promptForNameIfNeeded() {
  if (!shouldPromptForName()) return;
  const current = getPlayerState().name || 'Heros';
  while (true) {
    const input = window.prompt('Choisis le nom de ton heros', current);
    if (input === null) {
      setPlayerName(current);
      return;
    }
    if (!input.trim()) {
      continue;
    }
    setPlayerName(input);
    return;
  }
}

function renderMain() {
  renderMainScreen();
  wireMainScreen();
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
      renderMain();
    }
  };

  renderLevelUpChoices(pending[0], handleChoice);
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  renderMain();
  wireSeedImport();
  showPendingRewardsIfAny();

  window.addEventListener('return-main', () => {
    renderMain();
  });

  window.addEventListener('combat-again', async () => {
    await startCombat();
  });

  window.addEventListener('event-choice', event => {
    applyEventChoice(event.detail);
    renderMain();
  });

  window.addEventListener('sacrifice-run', () => {
    resetAfterDeath();
    renderMain();
  });

  window.resetPlayer = resetPlayer;
});
