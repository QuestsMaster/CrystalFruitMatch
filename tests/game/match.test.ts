import { describe, expect, it } from 'vitest';
import { findMatches, swapTiles } from '../../src/game/board.js';
import { LEVELS } from '../../src/game/levels.js';
import { applySwap, startLevel } from '../../src/game/match.js';
import { FRUIT_KINDS } from '../../src/game/types.js';
import type { Cell, TileKind } from '../../src/game/types.js';

function swapsFor(state: ReturnType<typeof startLevel>): readonly [Cell, Cell, boolean][] {
  const swaps: [Cell, Cell, boolean][] = [];
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    for (const next of [{ row, column: column + 1 }, { row: row + 1, column }]) {
      if (next.row < 8 && next.column < 8) {
        swaps.push([{ row, column }, next, findMatches(swapTiles(state.board, { row, column }, next)).length > 0]);
      }
    }
  }
  return swaps;
}

function isolatedCollection(kind: TileKind): ReturnType<typeof applySwap> {
  for (let seed = 1; seed < 5_000; seed += 1) {
    const state = startLevel(5, seed);
    for (const [a, b, matches] of swapsFor(state)) {
      if (!matches) continue;
      const runs = findMatches(swapTiles(state.board, a, b));
      if (runs.length !== 1 || runs[0].kind !== kind || runs[0].cells.length !== 3) continue;
      const outcome = applySwap(state, a, b);
      if (outcome.score === 30) return outcome;
    }
  }
  throw new Error(`No isolated ${kind} collection found.`);
}

describe('level match state', () => {
  it('exposes the five approved level goals and move limits', () => {
    expect(LEVELS).toEqual([
      { level: 1, moves: 20, goals: [{ type: 'score', target: 1000 }] },
      { level: 2, moves: 22, goals: [{ type: 'ice', target: 12 }] },
      { level: 3, moves: 24, goals: [{ type: 'berry', target: 20 }] },
      { level: 4, moves: 25, goals: [{ type: 'ice', target: 16 }, { type: 'score', target: 1500 }] },
      { level: 5, moves: 28, goals: [{ type: 'fruit', target: 30 }] },
    ]);
  });

  it('starts an immutable, playable state with its level move limit', () => {
    const state = startLevel(1, 19);

    expect(state).toMatchObject({ schemaVersion: 1, level: 1, movesRemaining: 20, score: 0, status: 'playing', seed: 19 });
    expect(Object.isFrozen(state)).toBe(true);
    expect(state.board).toHaveLength(8);
  });

  it('resolves a matching swap, consumes one move, and leaves the input unchanged', () => {
    const state = startLevel(1, 23);
    const [a, b] = swapsFor(state).find(([, , matches]) => matches) as [Cell, Cell, boolean];

    const next = applySwap(state, a, b);

    expect(next).not.toBe(state);
    expect(next.movesRemaining).toBe(19);
    expect(next.score).toBeGreaterThan(0);
    expect(next.board).not.toBe(state.board);
    expect(state.movesRemaining).toBe(20);
    expect(state.score).toBe(0);
  });

  it('rolls back a non-matching swap without spending a move', () => {
    const state = startLevel(1, 23);
    const [a, b] = swapsFor(state).find(([, , matches]) => !matches) as [Cell, Cell, boolean];

    expect(applySwap(state, a, b)).toBe(state);
  });

  it('wins when its score goal is reached by a successful swap', () => {
    const state = { ...startLevel(1, 23), score: 990, goalProgress: { score: 990, ice: 0, berry: 0, fruit: 0 } };
    const [a, b] = swapsFor(state).find(([, , matches]) => matches) as [Cell, Cell, boolean];

    expect(applySwap(state, a, b).status).toBe('won');
  });

  it('loses when the last move is spent before all goals are complete', () => {
    const state = { ...startLevel(1, 23), movesRemaining: 1 };
    const [a, b] = swapsFor(state).find(([, , matches]) => matches) as [Cell, Cell, boolean];

    expect(applySwap(state, a, b).status).toBe('lost');
  });

  it.each(FRUIT_KINDS)('counts removed %s tiles toward the fruit goal', (kind) => {
    expect(isolatedCollection(kind).goalProgress.fruit).toBe(3);
  });

  it.each(['ruby', 'turquoise'] as const)('does not count removed %s crystals as fruit', (kind) => {
    expect(isolatedCollection(kind).goalProgress.fruit).toBe(0);
  });
});
