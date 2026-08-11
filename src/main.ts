import './styles.css';
import { MatchSession } from './game/session.js';
import { MatchRepository } from './game/storage.js';
import { registerOfflineSupport } from './pwa/offline-readiness.js';
import { TouchControls } from './ui/controls.js';
import { CanvasRenderer } from './ui/renderer.js';

const gameCanvas = document.querySelector<HTMLCanvasElement>('#game');
if (!gameCanvas) throw new Error('Game canvas is missing.');
const canvas: HTMLCanvasElement = gameCanvas;

const repository = new MatchRepository(window.localStorage);
const session = new MatchSession(repository, 0xC0FFEE);
const renderer = new CanvasRenderer(canvas);
const offlineStatus = document.querySelector<HTMLElement>('#offline-status');
const message = document.querySelector<HTMLElement>('#game-message');
const pauseButton = document.querySelector<HTMLButtonElement>('#pause');
const resumeButton = document.querySelector<HTMLButtonElement>('#resume');
const actionButton = document.querySelector<HTMLButtonElement>('#level-action');
let paused = false;

function render(): void {
  renderer.render(session.state);
  const { level, status } = session.state;
  if (session.needsRecovery) {
    if (message) message.textContent = 'Saved game could not be loaded. Start a new game to continue.';
    if (actionButton) {
      actionButton.hidden = false;
      actionButton.textContent = 'Start new game';
    }
  } else if (paused) {
    if (message) message.textContent = 'Paused';
    if (actionButton) actionButton.hidden = true;
  } else if (status === 'won') {
    if (message) message.textContent = level === 5 ? 'All five levels complete!' : 'Level complete!';
    if (actionButton) {
      actionButton.hidden = level === 5;
      actionButton.textContent = 'Следующий уровень';
    }
  } else if (status === 'lost') {
    if (message) message.textContent = 'Out of moves';
    if (actionButton) {
      actionButton.hidden = false;
      actionButton.textContent = 'Повторить';
    }
  } else {
    if (message) message.textContent = '';
    if (actionButton) actionButton.hidden = true;
  }
  if (pauseButton) pauseButton.hidden = paused || session.needsRecovery;
  if (resumeButton) resumeButton.hidden = !paused;
}

function resizeAndRender(): void {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  render();
}

new TouchControls(canvas, ({ from, to }) => {
  if (!paused) session.swap(from, to);
  render();
});

pauseButton?.addEventListener('click', () => { paused = true; render(); });
resumeButton?.addEventListener('click', () => { paused = false; render(); });
actionButton?.addEventListener('click', () => {
  if (session.needsRecovery) session.startNewGame();
  else if (session.state.status === 'won') session.nextLevel();
  else if (session.state.status === 'lost') session.retry();
  render();
});
window.addEventListener('resize', resizeAndRender);
resizeAndRender();

if ('serviceWorker' in navigator) {
  void registerOfflineSupport(offlineStatus, navigator.serviceWorker);
} else if (offlineStatus) {
  offlineStatus.textContent = 'Offline features unavailable';
}
