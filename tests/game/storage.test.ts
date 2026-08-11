import { describe, expect, it } from 'vitest';
import { decodeMatch, encodeMatch, startLevel } from '../../src/game/match.js';
import { MatchRepository } from '../../src/game/storage.js';
import { MatchSession } from '../../src/game/session.js';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('match persistence', () => {
  it('round-trips a valid match state through JSON', () => {
    const state = startLevel(3, 71);

    expect(decodeMatch(encodeMatch(state))).toEqual(state);
  });

  it('rejects JSON with an unsupported schema or malformed board', () => {
    expect(() => decodeMatch('{"schemaVersion":2}')).toThrow(/schema/i);
    expect(() => decodeMatch(JSON.stringify({ ...startLevel(1, 4), board: [[{ kind: 'ruby' }]] }))).toThrow(/board/i);
  });

  it('rejects invalid tile kinds, moves, scores, and goal progress', () => {
    const state = startLevel(1, 4);
    expect(() => decodeMatch(JSON.stringify({ ...state, board: state.board.map((row, index) => index ? row : [{ kind: 'pear' }, ...row.slice(1)]), movesRemaining: -1 }))).toThrow();
    expect(() => decodeMatch(JSON.stringify({ ...state, score: -1 }))).toThrow(/score/i);
    expect(() => decodeMatch(JSON.stringify({ ...state, goalProgress: { score: 0 } }))).toThrow(/goal/i);
  });

  it('returns an explicit recovery result instead of throwing for a corrupt saved match', () => {
    const storage = memoryStorage();
    storage.setItem('match', '{bad json');

    expect(new MatchRepository(storage, 'match').load()).toEqual({ status: 'recovered' });
  });

  it('rejects semantic status contradictions against moves and exact level goals', () => {
    const playing = startLevel(1, 4);
    const won = { ...playing, score: 1000, goalProgress: { ...playing.goalProgress, score: 1000 }, status: 'won' as const };

    expect(() => decodeMatch(JSON.stringify({ ...playing, status: 'won' }))).toThrow(/status/i);
    expect(() => decodeMatch(JSON.stringify({ ...playing, movesRemaining: 0 }))).toThrow(/status/i);
    expect(() => decodeMatch(JSON.stringify({ ...playing, status: 'lost', movesRemaining: 1 }))).toThrow(/status/i);
    expect(() => decodeMatch(JSON.stringify({ ...won, status: 'lost', movesRemaining: 0 }))).toThrow(/status/i);
    expect(() => decodeMatch(JSON.stringify(won))).not.toThrow();
  });

  it('rejects unknown save and tile fields from the closed schema', () => {
    const state = startLevel(1, 4);
    expect(() => decodeMatch(JSON.stringify({ ...state, debug: true }))).toThrow(/field/i);
    expect(() => decodeMatch(JSON.stringify({
      ...state,
      board: state.board.map((row, rowIndex) => row.map((entry, column) => rowIndex === 0 && column === 0
        ? { ...entry, debug: true }
        : entry)),
    }))).toThrow(/field/i);
  });

  it('does not overwrite a corrupt save until recovery is explicitly confirmed', () => {
    const storage = memoryStorage();
    storage.setItem('match', '{bad json');
    const repository = new MatchRepository(storage, 'match');
    const session = new MatchSession(repository, 17);

    expect(session.needsRecovery).toBe(true);
    expect(storage.getItem('match')).toBe('{bad json');
    expect(session.swap({ row: 0, column: 0 }, { row: 0, column: 1 })).toBe(session.state);
    expect(storage.getItem('match')).toBe('{bad json');

    session.startNewGame();
    expect(session.needsRecovery).toBe(false);
    expect(decodeMatch(storage.getItem('match') ?? '')).toEqual(session.state);
  });

  it('keeps storage access failures from blocking load, save, clear, or recovery', () => {
    const storage = {
      get length(): number { throw new Error('blocked'); },
      clear() { throw new Error('blocked'); },
      getItem() { throw new Error('blocked'); },
      key() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    } as Storage;
    const repository = new MatchRepository(storage);

    expect(repository.load()).toEqual({ status: 'recovered' });
    expect(() => repository.save(startLevel(1, 1))).not.toThrow();
    expect(() => repository.clear()).not.toThrow();
    const session = new MatchSession(repository, 1);
    expect(() => session.startNewGame()).not.toThrow();
    expect(session.state).toMatchObject({ level: 1, status: 'playing' });
  });
});
