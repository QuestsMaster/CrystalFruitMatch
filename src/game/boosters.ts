import { resolveBoard } from './cascade.js';
import type { Random } from './random.js';
import type { Board, BoosterKind, Cell } from './types.js';
import type { CascadeResult } from './cascade.js';

export interface Explosion {
  readonly cells: readonly Cell[];
}

export function combineBoosters(board: Board, rng: Random, first: Cell, second: Cell): CascadeResult {
  return resolveBoard(board, rng, [first, second]);
}

export function explosionForBoosters(board: Board, first: Cell, second: Cell): Explosion {
  const affected = new Map<string, Cell>();

  for (const cell of explosionForBooster(board, first).cells) addCell(affected, cell.row, cell.column);
  for (const cell of explosionForBooster(board, second).cells) addCell(affected, cell.row, cell.column);

  return { cells: [...affected.values()].sort(compareCells) };
}

export function explosionForBooster(board: Board, origin: Cell): Explosion {
  const affected = new Map<string, Cell>();
  addEffect(affected, board, origin, boosterAt(board, origin));
  return { cells: [...affected.values()].sort(compareCells) };
}

function boosterAt(board: Board, cell: Cell): BoosterKind {
  const booster = board[cell.row]?.[cell.column]?.booster;
  if (!booster) {
    throw new Error('A booster is required at each selected cell.');
  }
  return booster;
}

function addEffect(affected: Map<string, Cell>, board: Board, origin: Cell, booster: BoosterKind): void {
  if (booster === 'rowRocket') {
    for (let column = 0; column < board[origin.row].length; column += 1) addCell(affected, origin.row, column);
    return;
  }
  if (booster === 'columnRocket') {
    for (let row = 0; row < board.length; row += 1) addCell(affected, row, origin.column);
    return;
  }

  for (let row = Math.max(0, origin.row - 1); row <= Math.min(board.length - 1, origin.row + 1); row += 1) {
    for (let column = Math.max(0, origin.column - 1); column <= Math.min(board[row].length - 1, origin.column + 1); column += 1) {
      addCell(affected, row, column);
    }
  }
}

function addCell(affected: Map<string, Cell>, row: number, column: number): void {
  affected.set(`${row}:${column}`, { row, column });
}

function compareCells(left: Cell, right: Cell): number {
  return left.row - right.row || left.column - right.column;
}
