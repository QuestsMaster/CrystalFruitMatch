import { describe, expect, it } from 'vitest';
import { combineBoosters } from '../../src/game/boosters.js';
import { resolveBoard } from '../../src/game/cascade.js';
import { SeededRandom } from '../../src/game/random.js';
import type { Board, TileKind } from '../../src/game/types.js';

const tile = (kind: TileKind, booster?: 'rowRocket' | 'columnRocket' | 'bomb') => ({ kind, ...(booster ? { booster } : {}) });
const board = (rows: readonly (readonly TileKind[])[]): Board => rows.map((row) => row.map((kind) => tile(kind)));
const sequenceRandom = (...values: number[]) => ({
  nextInt(upperExclusive: number) {
    const value = values.shift();
    if (value === undefined || value >= upperExclusive) throw new Error('Missing deterministic random value.');
    return value;
  },
});

describe('cascade resolution', () => {
  it('removes matches, compacts tiles downward, and refills deterministically', () => {
    const result = resolveBoard(board([
      ['lemon', 'berry', 'orange'],
      ['ruby', 'lemon', 'berry'],
      ['ruby', 'orange', 'lemon'],
      ['ruby', 'berry', 'orange'],
    ]), sequenceRandom(0, 1, 2));

    expect(result.removed).toBe(3);
    expect(result.scoreDelta).toBe(30);
    expect(result.board).toEqual(board([
      ['ruby', 'berry', 'orange'],
      ['lemon', 'lemon', 'berry'],
      ['berry', 'orange', 'lemon'],
      ['lemon', 'berry', 'orange'],
    ]));
  });

  it('keeps resolving newly refilled matches until the board is stable', () => {
    const result = resolveBoard(board([
      ['ruby', 'berry', 'orange'],
      ['ruby', 'lemon', 'berry'],
      ['ruby', 'orange', 'lemon'],
    ]), sequenceRandom(1, 1, 1, 0, 2, 3));

    expect(result.removed).toBe(6);
    expect(result.scoreDelta).toBe(60);
    expect(result.board.map((row) => row.map((entry) => entry.kind))).toEqual([
      ['ruby', 'berry', 'orange'],
      ['berry', 'lemon', 'berry'],
      ['orange', 'orange', 'lemon'],
    ]);
  });

  it('creates a row rocket from four horizontal tiles', () => {
    const result = resolveBoard(board([['ruby', 'ruby', 'ruby', 'ruby']]), sequenceRandom(1, 2, 3));

    expect(result.createdBoosters).toEqual([{ cell: { row: 0, column: 2 }, booster: 'rowRocket' }]);
    expect(result.board[0][2]).toEqual(tile('ruby', 'rowRocket'));
  });

  it('creates a bomb from five tiles in a line', () => {
    const result = resolveBoard(board([['ruby', 'ruby', 'ruby', 'ruby', 'ruby']]), sequenceRandom(1, 2, 3, 4));

    expect(result.createdBoosters).toEqual([{ cell: { row: 0, column: 2 }, booster: 'bomb' }]);
    expect(result.board[0][2]).toEqual(tile('ruby', 'bomb'));
  });

  it('combines two boosters in a cascade with removal, scoring, refill, and explosion data', () => {
    const boosterBoard: Board = [
      [tile('ruby'), tile('lemon'), tile('berry'), tile('orange'), tile('turquoise')],
      [tile('lemon'), tile('berry'), tile('orange'), tile('turquoise'), tile('grape')],
      [tile('berry'), tile('orange', 'rowRocket'), tile('turquoise', 'bomb'), tile('grape'), tile('ruby')],
      [tile('orange'), tile('turquoise'), tile('grape'), tile('ruby'), tile('lemon')],
      [tile('turquoise'), tile('grape'), tile('ruby'), tile('lemon'), tile('berry')],
    ];

    const result = combineBoosters(
      boosterBoard,
      sequenceRandom(0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4),
      { row: 2, column: 1 },
      { row: 2, column: 2 },
    );

    expect(result.removed).toBe(11);
    expect(result.scoreDelta).toBe(110);
    expect(result.explosions).toEqual([{
      cells: [
        { row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 },
        { row: 2, column: 0 }, { row: 2, column: 1 }, { row: 2, column: 2 }, { row: 2, column: 3 }, { row: 2, column: 4 },
        { row: 3, column: 1 }, { row: 3, column: 2 }, { row: 3, column: 3 },
      ],
    }]);
    expect(result.board.flat().some((entry) => entry.booster)).toBe(false);
  });

  it.each([
    ['row rocket', 'rowRocket' as const, [
      { row: 1, column: 0 }, { row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 }, { row: 1, column: 4 },
    ]],
    ['column rocket', 'columnRocket' as const, [
      { row: 0, column: 1 }, { row: 1, column: 1 }, { row: 2, column: 1 },
    ]],
  ])('activates a single matched %s', (_label, booster, affected) => {
    const input: Board = [
      [tile('lemon'), tile('berry'), tile('orange'), tile('turquoise'), tile('grape')],
      [tile('ruby'), tile('ruby', booster), tile('ruby'), tile('lemon'), tile('berry')],
      [tile('berry'), tile('orange'), tile('lemon'), tile('grape'), tile('turquoise')],
    ];

    const result = resolveBoard(input, new SeededRandom(14));

    expect(result.explosions[0]?.cells).toEqual(affected);
    expect(result.removedTiles).toEqual(expect.arrayContaining(affected.map((cell) => expect.objectContaining({ cell }))));
  });

  it('activates a single matched bomb across its 3 by 3 area', () => {
    const input: Board = [
      [tile('lemon'), tile('berry'), tile('orange'), tile('turquoise'), tile('grape')],
      [tile('berry'), tile('orange'), tile('lemon'), tile('grape'), tile('turquoise')],
      [tile('ruby'), tile('ruby', 'bomb'), tile('ruby'), tile('lemon'), tile('berry')],
      [tile('orange'), tile('lemon'), tile('grape'), tile('turquoise'), tile('ruby')],
      [tile('turquoise'), tile('grape'), tile('berry'), tile('ruby'), tile('lemon')],
    ];

    const result = resolveBoard(input, new SeededRandom(29));

    expect(result.explosions[0]?.cells).toEqual([
      { row: 1, column: 0 }, { row: 1, column: 1 }, { row: 1, column: 2 },
      { row: 2, column: 0 }, { row: 2, column: 1 }, { row: 2, column: 2 },
      { row: 3, column: 0 }, { row: 3, column: 1 }, { row: 3, column: 2 },
    ]);
  });

  it('chains into every booster reached by a matched booster effect exactly once', () => {
    const input: Board = [
      [tile('lemon'), tile('berry'), tile('orange'), tile('turquoise'), tile('grape')],
      [tile('berry'), tile('orange'), tile('lemon'), tile('grape'), tile('turquoise')],
      [tile('ruby'), tile('ruby', 'rowRocket'), tile('ruby'), tile('lemon'), tile('berry', 'columnRocket')],
      [tile('orange'), tile('lemon'), tile('grape'), tile('turquoise'), tile('ruby')],
      [tile('turquoise'), tile('grape'), tile('berry'), tile('ruby'), tile('lemon')],
    ];

    const result = resolveBoard(input, new SeededRandom(45));

    expect(result.explosions).toHaveLength(2);
    expect(result.explosions[1]?.cells).toEqual([
      { row: 0, column: 4 }, { row: 1, column: 4 }, { row: 2, column: 4 }, { row: 3, column: 4 }, { row: 4, column: 4 },
    ]);
    const uniqueRemoved = new Set(result.removedTiles.map(({ cell }) => `${cell.row}:${cell.column}`));
    expect(uniqueRemoved.size).toBe(result.removedTiles.length);
  });
});
