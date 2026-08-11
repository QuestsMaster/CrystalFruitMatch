import { describe, expect, it } from 'vitest';
import { findMatches, swapTiles } from '../../src/game/board.js';
import { levelDefinition } from '../../src/game/levels.js';
import { applySwap, startLevel, type MatchState } from '../../src/game/match.js';
import { MatchRepository } from '../../src/game/storage.js';
import { MatchSession } from '../../src/game/session.js';
import type { Cell } from '../../src/game/types.js';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); },
  };
}

function matchingSwaps(state: MatchState): readonly [Cell, Cell][] {
  const candidates: [Cell, Cell][] = [];
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    for (const to of [{ row, column: column + 1 }, { row: row + 1, column }]) {
      if (to.row < 8 && to.column < 8 && findMatches(swapTiles(state.board, { row, column }, to)).length > 0) candidates.push([{ row, column }, to]);
    }
  }
  return candidates;
}

function winningSwap(base: MatchState): { readonly state: MatchState; readonly from: Cell; readonly to: Cell } {
  const goals = levelDefinition(base.level).goals;
  for (const [from, to] of matchingSwaps(base)) {
    const outcome = applySwap(base, from, to);
    if (!goals.every((goal) => outcome.goalProgress[goal.type] > base.goalProgress[goal.type])) continue;
    const goalProgress = { ...base.goalProgress };
    for (const goal of goals) {
      const delta = outcome.goalProgress[goal.type] - base.goalProgress[goal.type];
      goalProgress[goal.type] = Math.max(0, goal.target - delta);
    }
    return { state: { ...base, score: goalProgress.score, goalProgress }, from, to };
  }
  throw new Error(`No deterministic winning swap found for level ${base.level}.`);
}

describe('five-level session integration', () => {
  it('advances deterministically through levels 1-5 using actual winning swaps and persists every transition', () => {
    const storage = memoryStorage();
    const repository = new MatchRepository(storage);
    let session = new MatchSession(repository, 0xC0FFEE);

    for (let level = 1; level <= 5; level += 1) {
      expect(session.state.level).toBe(level);
      const { state, from, to } = winningSwap(session.state);
      session.replace(state);

      expect(session.swap(from, to).status).toBe('won');
      expect(repository.load()).toEqual({ status: 'ready', match: session.state });
      expect(session.canAdvance).toBe(level < 5);
      if (level < 5) {
        expect(session.nextLevel()).toMatchObject({ level: level + 1, status: 'playing', movesRemaining: levelDefinition(level + 1).moves });
        session = new MatchSession(repository, 1);
        expect(session.state).toEqual((repository.load() as { status: 'ready'; match: MatchState }).match);
      }
      if (level === 5) expect(session.nextLevel()).toBeUndefined();
    }
  });

  it('restores a persisted game, retries a failed level, and reports corrupt-save recovery', () => {
    const storage = memoryStorage();
    const repository = new MatchRepository(storage);
    const saved = startLevel(3, 77);
    repository.save(saved);

    const restored = new MatchSession(repository, 1);
    expect(restored.state).toEqual(saved);
    restored.replace({ ...saved, movesRemaining: 0, status: 'lost' });
    expect(restored.retry()).toMatchObject({ level: 3, movesRemaining: 24, status: 'playing' });

    storage.setItem('crystal-fruit-match', '{corrupt');
    const recovered = new MatchSession(repository, 4);
    expect(recovered.recoveredSave).toBe(true);
    expect(recovered.state).toMatchObject({ level: 1, status: 'playing' });
  });
});
