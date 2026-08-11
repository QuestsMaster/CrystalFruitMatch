import { levelDefinition, LEVELS } from './levels.js';
import { applySwap, startLevel, type MatchState } from './match.js';
import { MatchRepository } from './storage.js';
import type { Cell } from './types.js';

/** Coordinates persistence and the player-facing level lifecycle. */
export class MatchSession {
  private current: MatchState;
  private recoveryRequired: boolean;

  constructor(private readonly repository: MatchRepository, private readonly initialSeed: number) {
    const saved = repository.load();
    this.recoveryRequired = saved.status === 'recovered';
    this.current = saved.status === 'ready' ? saved.match : startLevel(1, initialSeed);
    if (saved.status === 'empty') repository.save(this.current);
  }

  get state(): MatchState { return this.current; }
  get recoveredSave(): boolean { return this.recoveryRequired; }
  get needsRecovery(): boolean { return this.recoveryRequired; }
  get canAdvance(): boolean { return this.current.status === 'won' && this.current.level < LEVELS.length; }

  swap(from: Cell, to: Cell): MatchState {
    if (this.recoveryRequired) return this.current;
    return this.persist(applySwap(this.current, from, to));
  }

  startNewGame(): MatchState {
    this.repository.clear();
    this.recoveryRequired = false;
    return this.persist(startLevel(1, this.initialSeed));
  }

  nextLevel(): MatchState | undefined {
    if (this.recoveryRequired || !this.canAdvance) return undefined;
    return this.persist(startLevel(this.current.level + 1, this.nextSeed()));
  }

  retry(): MatchState | undefined {
    if (this.recoveryRequired || this.current.status !== 'lost') return undefined;
    return this.persist(startLevel(this.current.level, this.nextSeed()));
  }

  replace(state: MatchState): MatchState {
    if (this.recoveryRequired) return this.current;
    levelDefinition(state.level);
    return this.persist(state);
  }

  private persist(state: MatchState): MatchState {
    this.current = state;
    this.repository.save(state);
    return state;
  }

  private nextSeed(): number { return (this.current.seed + this.current.level + 1) >>> 0; }
}
