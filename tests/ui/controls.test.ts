import { describe, expect, it } from 'vitest';
import { TouchControls, boardViewport } from '../../src/ui/controls.js';

type Listener = (event: PointerLike) => void;
interface PointerLike { pointerId: number; clientX: number; clientY: number; preventDefault(): void; }

function fakeCanvas(): HTMLCanvasElement & { emit(type: string, event: PointerLike): void; captured: number[] } {
  const listeners = new Map<string, Listener>();
  const canvas = {
    captured: [] as number[],
    addEventListener(type: string, listener: Listener) { listeners.set(type, listener); },
    removeEventListener(type: string) { listeners.delete(type); },
    setPointerCapture(pointerId: number) { this.captured.push(pointerId); },
    releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 20, top: 40, width: 360, height: 640 }),
    emit(type: string, event: PointerLike) { listeners.get(type)?.(event); },
  };
  return canvas as unknown as HTMLCanvasElement & { emit(type: string, event: PointerLike): void; captured: number[] };
}

const pointer = (pointerId: number, clientX: number, clientY: number): PointerLike => ({ pointerId, clientX, clientY, preventDefault() {} });

describe('TouchControls', () => {
  it.each([
    ['right', 1, 0], ['left', -1, 0], ['down', 0, 1], ['up', 0, -1],
  ])('emits a cardinal %s swap after a 24px swipe', (_name, column, row) => {
    const canvas = fakeCanvas();
    const swaps: unknown[] = [];
    new TouchControls(canvas, (swap) => swaps.push(swap));
    const board = boardViewport(canvas.getBoundingClientRect());
    const x = 20 + board.left + board.size * 3.5 / 8;
    const y = 40 + board.top + board.size * 3.5 / 8;

    canvas.emit('pointerdown', pointer(7, x, y));
    canvas.emit('pointermove', pointer(7, x + column * 25, y + row * 25));

    expect(swaps).toEqual([{ from: { row: 3, column: 3 }, to: { row: 3 + row, column: 3 + column } }]);
    expect(canvas.captured).toEqual([7]);
  });

  it('rejects taps, diagonal gestures, and gestures that begin outside the board', () => {
    const canvas = fakeCanvas();
    const swaps: unknown[] = [];
    new TouchControls(canvas, (swap) => swaps.push(swap));
    const board = boardViewport(canvas.getBoundingClientRect());
    const x = 20 + board.left + board.size * 2.5 / 8;
    const y = 40 + board.top + board.size * 2.5 / 8;

    canvas.emit('pointerdown', pointer(1, x, y));
    canvas.emit('pointerup', pointer(1, x, y));
    canvas.emit('pointerdown', pointer(2, x, y));
    canvas.emit('pointermove', pointer(2, x + 40, y + 40));
    canvas.emit('pointerdown', pointer(3, 25, 45));
    canvas.emit('pointermove', pointer(3, x + 40, y));

    expect(swaps).toEqual([]);
  });

  it('rejects an unequal diagonal gesture instead of choosing its dominant axis', () => {
    const canvas = fakeCanvas();
    const swaps: unknown[] = [];
    new TouchControls(canvas, (swap) => swaps.push(swap));
    const board = boardViewport(canvas.getBoundingClientRect());
    const x = 20 + board.left + board.size * 2.5 / 8;
    const y = 40 + board.top + board.size * 2.5 / 8;

    canvas.emit('pointerdown', pointer(5, x, y));
    canvas.emit('pointermove', pointer(5, x + 40, y + 25));

    expect(swaps).toEqual([]);
  });

  it('cancels an active gesture without emitting a swap', () => {
    const canvas = fakeCanvas();
    const swaps: unknown[] = [];
    new TouchControls(canvas, (swap) => swaps.push(swap));
    const board = boardViewport(canvas.getBoundingClientRect());
    const x = 20 + board.left + board.size * 4.5 / 8;
    const y = 40 + board.top + board.size * 4.5 / 8;

    canvas.emit('pointerdown', pointer(4, x, y));
    canvas.emit('pointercancel', pointer(4, x, y));
    canvas.emit('pointermove', pointer(4, x + 50, y));

    expect(swaps).toEqual([]);
  });

  it('keeps the 8-by-8 board inside portrait canvas safe margins', () => {
    const board = boardViewport({ left: 0, top: 0, width: 360, height: 640 });
    expect(board).toEqual({ left: 18, top: 172, size: 324 });
  });
});
