import { describe, expect, it } from 'vitest';
import { createBoard, findMatches, hasValidSwap, reshuffleBoard, swapTiles } from '../../src/game/board.js';
import { SeededRandom } from '../../src/game/random.js';
import type { Board, TileKind } from '../../src/game/types.js';

const tile = (kind: Board[number][number]['kind']) => ({ kind });

describe('board primitives', () => {
  it('creates an 8 by 8 board from a seed', () => {
    const board = createBoard(17);

    expect(board).toHaveLength(8);
    expect(board.every((row) => row.length === 8)).toBe(true);
  });

  it('creates the same board for the same seed', () => {
    expect(createBoard(42)).toEqual(createBoard(42));
  });

  it('creates a stable board with at least one match-producing swap', () => {
    const board = createBoard(99);

    expect(findMatches(board)).toEqual([]);
    expect(hasValidSwap(board)).toBe(true);
  });

  it('swaps adjacent tiles in a copied board', () => {
    const board: Board = [
      [tile('ruby'), tile('lemon')],
      [tile('berry'), tile('orange')],
    ] as unknown as Board;

    const swapped = swapTiles(board, { row: 0, column: 0 }, { row: 0, column: 1 });

    expect(swapped[0][0].kind).toBe('lemon');
    expect(swapped[0][1].kind).toBe('ruby');
    expect(board[0][0].kind).toBe('ruby');
    expect(swapped).not.toBe(board);
    expect(swapped[0]).not.toBe(board[0]);
  });

  it('rejects non-adjacent swaps', () => {
    const board = createBoard(11);

    expect(() => swapTiles(board, { row: 0, column: 0 }, { row: 1, column: 1 })).toThrow(/adjacent/i);
  });

  it('finds complete horizontal and vertical runs', () => {
    const board: Board = [
      [tile('ruby'), tile('ruby'), tile('ruby'), tile('lemon')],
      [tile('lemon'), tile('berry'), tile('orange'), tile('grape')],
      [tile('lemon'), tile('orange'), tile('berry'), tile('grape')],
      [tile('lemon'), tile('turquoise'), tile('grape'), tile('berry')],
    ] as unknown as Board;

    expect(findMatches(board)).toEqual([
      {
        kind: 'ruby',
        direction: 'horizontal',
        cells: [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }],
      },
      {
        kind: 'lemon',
        direction: 'vertical',
        cells: [{ row: 1, column: 0 }, { row: 2, column: 0 }, { row: 3, column: 0 }],
      },
    ]);
  });

  it('deterministically reshuffles a dead 8 by 8 board while preserving cell layers', () => {
    const kinds: readonly (readonly TileKind[])[] = [
      ['ruby', 'lemon', 'ruby', 'lemon', 'berry', 'lemon', 'berry', 'grape'],
      ['turquoise', 'lemon', 'turquoise', 'orange', 'turquoise', 'grape', 'ruby', 'lemon'],
      ['turquoise', 'grape', 'turquoise', 'grape', 'ruby', 'grape', 'ruby', 'lemon'],
      ['lemon', 'grape', 'orange', 'orange', 'lemon', 'turquoise', 'turquoise', 'berry'],
      ['berry', 'lemon', 'ruby', 'grape', 'ruby', 'orange', 'turquoise', 'orange'],
      ['turquoise', 'orange', 'berry', 'orange', 'turquoise', 'grape', 'lemon', 'orange'],
      ['ruby', 'grape', 'turquoise', 'lemon', 'turquoise', 'orange', 'ruby', 'berry'],
      ['berry', 'orange', 'ruby', 'lemon', 'berry', 'grape', 'turquoise', 'grape'],
    ];
    const dead = kinds.map((row, rowIndex) => row.map((kind, column) => ({
      kind,
      ...(rowIndex === 0 && column === 0 ? { ice: true, booster: 'bomb' as const } : {}),
    }))) as Board;

    expect(findMatches(dead)).toEqual([]);
    expect(hasValidSwap(dead)).toBe(false);

    const boosterPlayable = dead.map((row, rowIndex) => row.map((entry, column) => rowIndex === 0 && column === 1
      ? { ...entry, booster: 'rowRocket' as const }
      : entry));
    expect(hasValidSwap(boosterPlayable)).toBe(true);

    const first = reshuffleBoard(dead, new SeededRandom(91));
    const second = reshuffleBoard(dead, new SeededRandom(91));
    expect(first).toEqual(second);
    expect(findMatches(first)).toEqual([]);
    expect(hasValidSwap(first)).toBe(true);
    expect(first[0][0]).toMatchObject({ ice: true, booster: 'bomb' });
  });
});
