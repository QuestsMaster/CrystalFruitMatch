import { levelDefinition } from '../game/levels.js';
import type { MatchState } from '../game/match.js';
import type { Tile, TileKind } from '../game/types.js';
import { boardViewport } from './controls.js';

const COLORS: Readonly<Record<TileKind, string>> = {
  ruby: '#ee4c72', lemon: '#ffd449', berry: '#ad6bff', orange: '#ff933d', turquoise: '#46d7d2', grape: '#8153cc',
};
const SYMBOLS: Readonly<Record<TileKind, string>> = { ruby: '◆', lemon: '●', berry: '✿', orange: '⬟', turquoise: '✦', grape: '⬢' };

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D rendering is unavailable.');
    this.context = context;
  }

  render(state: MatchState): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.width;
    const height = rect.height || this.canvas.height;
    const context = this.context;
    context.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#19172a';
    context.fillRect(0, 0, width, height);
    this.drawHud(state, width);
    const board = boardViewport({ left: 0, top: 0, width, height });
    const tileSize = board.size / 8;
    state.board.forEach((row, rowIndex) => row.forEach((tile, column) => this.drawTile(tile, board.left + column * tileSize, board.top + rowIndex * tileSize, tileSize)));
    if (state.status !== 'playing') this.drawEffect(state.status === 'won' ? 'LEVEL COMPLETE!' : 'OUT OF MOVES', width, height);
  }

  private drawHud(state: MatchState, width: number): void {
    const context = this.context;
    const goals = levelDefinition(state.level).goals;
    context.fillStyle = '#f8f3ff';
    context.font = '700 16px system-ui';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(`LEVEL ${state.level}`, width / 2, 38);
    context.font = '600 13px system-ui';
    context.fillText(`MOVES ${state.movesRemaining}`, width * 0.24, 76);
    context.fillText(`SCORE ${state.score}`, width * 0.76, 76);
    context.fillStyle = '#c7c0dc';
    goals.forEach((goal, index) => {
      const label = goal.type.toUpperCase();
      context.fillText(`${label} ${state.goalProgress[goal.type]}/${goal.target}`, width / 2, 108 + index * 22);
    });
  }

  private drawTile(tile: Tile, x: number, y: number, size: number): void {
    const context = this.context;
    const inset = Math.max(2, size * 0.06);
    context.fillStyle = '#292541';
    context.fillRect(x + 1, y + 1, size - 2, size - 2);
    context.fillStyle = COLORS[tile.kind];
    context.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    context.fillStyle = '#fff';
    context.font = `${Math.max(14, size * 0.48)}px system-ui`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(SYMBOLS[tile.kind], x + size / 2, y + size / 2);
    if (tile.ice) context.fillText('❄', x + size * 0.25, y + size * 0.25);
    if (tile.booster === 'rowRocket') context.fillText('➜', x + size * 0.74, y + size * 0.72);
    if (tile.booster === 'columnRocket') context.fillText('⇩', x + size * 0.74, y + size * 0.72);
    if (tile.booster === 'bomb') context.fillText('✦', x + size * 0.74, y + size * 0.72);
  }

  private drawEffect(label: string, width: number, height: number): void {
    const context = this.context;
    context.fillStyle = 'rgba(16, 16, 28, 0.72)';
    context.fillRect(0, height * 0.43, width, 64);
    context.fillStyle = '#fff';
    context.font = '700 22px system-ui';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, width / 2, height * 0.48);
  }
}
