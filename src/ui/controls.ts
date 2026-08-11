import type { Cell } from '../game/types.js';

const BOARD_SIZE = 8;
const SWIPE_THRESHOLD = 24;
const MAX_CROSS_AXIS_DRIFT = 8;

export interface BoardViewport {
  readonly left: number;
  readonly top: number;
  readonly size: number;
}

export interface SwapCommand {
  readonly from: Cell;
  readonly to: Cell;
}

type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
type ActivePointer = { readonly id: number; readonly cell: Cell; readonly x: number; readonly y: number };

export function boardViewport(rect: Rect): BoardViewport {
  const size = rect.width * 0.9;
  return { left: (rect.width - size) / 2, top: rect.height * 0.26875, size };
}

export class TouchControls {
  private active?: ActivePointer;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly onSwap: (command: SwapCommand) => void) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerEnd);
    canvas.addEventListener('pointercancel', this.onPointerEnd);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const cell = this.cellAt(event.clientX, event.clientY);
    if (!cell) return;
    this.active = { id: event.pointerId, cell, x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const active = this.active;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= SWIPE_THRESHOLD || Math.abs(dx) === Math.abs(dy)) return;
    if (Math.min(Math.abs(dx), Math.abs(dy)) > MAX_CROSS_AXIS_DRIFT) return;
    const row = Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy);
    const column = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
    const to = { row: active.cell.row + row, column: active.cell.column + column };
    this.finish(event.pointerId);
    if (to.row >= 0 && to.row < BOARD_SIZE && to.column >= 0 && to.column < BOARD_SIZE) {
      this.onSwap({ from: active.cell, to });
      event.preventDefault();
    }
  };

  private readonly onPointerEnd = (event: PointerEvent): void => this.finish(event.pointerId);

  private finish(pointerId: number): void {
    if (!this.active || this.active.id !== pointerId) return;
    this.active = undefined;
    this.canvas.releasePointerCapture(pointerId);
  }

  private cellAt(clientX: number, clientY: number): Cell | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const board = boardViewport(rect);
    const x = clientX - rect.left - board.left;
    const y = clientY - rect.top - board.top;
    if (x < 0 || y < 0 || x >= board.size || y >= board.size) return undefined;
    return { row: Math.floor(y / (board.size / BOARD_SIZE)), column: Math.floor(x / (board.size / BOARD_SIZE)) };
  }
}
