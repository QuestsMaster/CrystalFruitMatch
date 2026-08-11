import { SeededRandom } from './random.js';
import type { Random } from './random.js';
import { TILE_KINDS } from './types.js';
import type { Board, Cell, Match, Tile, TileKind } from './types.js';

const BOARD_SIZE = 8;
export function createBoard(seed: number): Board {
  const random = new SeededRandom(seed);

  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const board = createStableBoard(random);
    if (hasValidSwap(board)) {
      return board;
    }
  }

  throw new Error('Unable to create a board with a valid swap.');
}

export function swapTiles(board: Board, a: Cell, b: Cell): Board {
  assertInBounds(board, a);
  assertInBounds(board, b);

  if (Math.abs(a.row - b.row) + Math.abs(a.column - b.column) !== 1) {
    throw new Error('Tiles must be adjacent to swap.');
  }

  const copy = board.map((row) => [...row]);
  const first = copy[a.row][a.column];
  copy[a.row][a.column] = copy[b.row][b.column];
  copy[b.row][b.column] = first;
  return copy;
}

export function findMatches(board: Board): readonly Match[] {
  const matches: Match[] = [];

  for (let row = 0; row < board.length; row += 1) {
    scanLine(board[row], (column) => ({ row, column }), 'horizontal', matches);
  }

  const width = board[0]?.length ?? 0;
  for (let column = 0; column < width; column += 1) {
    scanLine(board.map((row) => row[column]), (row) => ({ row, column }), 'vertical', matches);
  }

  return matches;
}

function createStableBoard(random: SeededRandom): Board {
  const board: Tile[][] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const nextRow: Tile[] = [];
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const forbidden = new Set<TileKind>();
      if (column >= 2 && nextRow[column - 1].kind === nextRow[column - 2].kind) {
        forbidden.add(nextRow[column - 1].kind);
      }
      if (row >= 2 && board[row - 1][column].kind === board[row - 2][column].kind) {
        forbidden.add(board[row - 1][column].kind);
      }
      const choices = TILE_KINDS.filter((kind) => !forbidden.has(kind));
      nextRow.push({ kind: choices[random.nextInt(choices.length)] });
    }
    board.push(nextRow);
  }

  return board;
}

export function hasValidSwap(board: Board): boolean {
  for (let row = 0; row < board.length; row += 1) {
    for (let column = 0; column < board[row].length; column += 1) {
      const cell = { row, column };
      for (const neighbor of [{ row, column: column + 1 }, { row: row + 1, column }]) {
        if (neighbor.row < board.length && neighbor.column < board[neighbor.row].length
          && ((board[cell.row][cell.column].booster && board[neighbor.row][neighbor.column].booster)
            || findMatches(swapTiles(board, cell, neighbor)).length > 0)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function reshuffleBoard(board: Board, random: Random): Board {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const candidate: Tile[][] = [];
    for (let row = 0; row < board.length; row += 1) {
      const nextRow: Tile[] = [];
      for (let column = 0; column < board[row].length; column += 1) {
        const forbidden = new Set<TileKind>();
        if (column >= 2 && nextRow[column - 1].kind === nextRow[column - 2].kind) forbidden.add(nextRow[column - 1].kind);
        if (row >= 2 && candidate[row - 1][column].kind === candidate[row - 2][column].kind) forbidden.add(candidate[row - 1][column].kind);
        const choices = TILE_KINDS.filter((kind) => !forbidden.has(kind));
        nextRow.push({ ...board[row][column], kind: choices[random.nextInt(choices.length)] });
      }
      candidate.push(nextRow);
    }
    if (hasValidSwap(candidate)) return candidate;
  }
  throw new Error('Unable to reshuffle the board with a valid swap.');
}

function scanLine(
  tiles: readonly (Tile | undefined)[],
  cellAt: (index: number) => Cell,
  direction: Match['direction'],
  matches: Match[],
): void {
  let start = 0;
  while (start < tiles.length) {
    const kind = tiles[start]?.kind;
    let end = start + 1;
    while (end < tiles.length && tiles[end]?.kind === kind) {
      end += 1;
    }
    if (kind && end - start >= 3) {
      matches.push({ kind, direction, cells: Array.from({ length: end - start }, (_, index) => cellAt(start + index)) });
    }
    start = end;
  }
}

function assertInBounds(board: Board, cell: Cell): void {
  if (!Number.isInteger(cell.row) || !Number.isInteger(cell.column)
    || cell.row < 0 || cell.column < 0 || cell.row >= board.length || cell.column >= board[cell.row].length) {
    throw new Error('Cell is outside the board.');
  }
}
