import { createBoard, findMatches, swapTiles } from './board.js';
import { resolveBoard } from './cascade.js';
import { levelDefinition, type GoalType } from './levels.js';
import { SeededRandom } from './random.js';
import { isBoosterKind, isFruitKind, isTileKind } from './types.js';
import type { Board, Cell } from './types.js';

export const MATCH_SCHEMA_VERSION = 1;
export type MatchStatus = 'playing' | 'won' | 'lost';
export type GoalProgress = Readonly<Record<GoalType, number>>;

export interface MatchState {
  readonly schemaVersion: typeof MATCH_SCHEMA_VERSION;
  readonly level: number;
  readonly board: Board;
  readonly movesRemaining: number;
  readonly score: number;
  readonly goalProgress: GoalProgress;
  readonly status: MatchStatus;
  readonly seed: number;
}

const GOAL_TYPES: readonly GoalType[] = ['score', 'ice', 'berry', 'fruit'];
const MATCH_FIELDS = ['schemaVersion', 'level', 'board', 'movesRemaining', 'score', 'goalProgress', 'status', 'seed'] as const;
const TILE_FIELDS = ['kind', 'booster', 'ice'] as const;

export function startLevel(level: number, seed: number): MatchState {
  const definition = levelDefinition(level);
  assertSeed(seed);
  const iceCount = definition.goals.find((goal) => goal.type === 'ice')?.target ?? 0;
  const board = addIce(createBoard(seed), iceCount, seed);
  return freezeState({
    schemaVersion: MATCH_SCHEMA_VERSION,
    level,
    board,
    movesRemaining: definition.moves,
    score: 0,
    goalProgress: { score: 0, ice: 0, berry: 0, fruit: 0 },
    status: 'playing',
    seed,
  });
}

export function applySwap(state: MatchState, a: Cell, b: Cell): MatchState {
  if (state.status !== 'playing') return state;
  let swapped: Board;
  try { swapped = swapTiles(state.board, a, b); } catch { return state; }
  const boosts = [swapped[a.row][a.column]?.booster, swapped[b.row][b.column]?.booster];
  if (findMatches(swapped).length === 0 && !(boosts[0] && boosts[1])) return state;

  const cascade = resolveBoard(swapped, new SeededRandom(state.seed), boosts[0] && boosts[1] ? [a, b] : undefined);
  const progress: GoalProgress = {
    score: state.score + cascade.scoreDelta,
    ice: state.goalProgress.ice + cascade.removedTiles.filter(({ tile }) => tile.ice).length + cascade.clearedIce.length,
    berry: state.goalProgress.berry + cascade.removedTiles.filter(({ tile }) => tile.kind === 'berry').length,
    fruit: state.goalProgress.fruit + cascade.removedTiles.filter(({ tile }) => isFruitKind(tile.kind)).length,
  };
  const movesRemaining = state.movesRemaining - 1;
  const score = state.score + cascade.scoreDelta;
  const definition = levelDefinition(state.level);
  const complete = definition.goals.every((goal) => progress[goal.type] >= goal.target);
  return freezeState({
    ...state,
    board: cascade.board,
    movesRemaining,
    score,
    goalProgress: progress,
    status: complete ? 'won' : movesRemaining === 0 ? 'lost' : 'playing',
    seed: (state.seed + 1) >>> 0,
  });
}

export function encodeMatch(state: MatchState): string {
  validateState(state);
  return JSON.stringify(state);
}

export function decodeMatch(serialized: string): MatchState {
  let value: unknown;
  try { value = JSON.parse(serialized); } catch { throw new Error('Match save is not valid JSON.'); }
  validateState(value);
  return freezeState(value);
}

function addIce(board: Board, count: number, seed: number): Board {
  if (count === 0) return board;
  const random = new SeededRandom(seed ^ 0x9e3779b9);
  const chosen = new Set<number>();
  while (chosen.size < count) chosen.add(random.nextInt(64));
  return board.map((row, rowIndex) => row.map((tile, column) => chosen.has(rowIndex * 8 + column) ? { ...tile, ice: true } : tile));
}

function validateState(value: unknown): asserts value is MatchState {
  if (!isRecord(value)) throw new Error('Match save must be an object.');
  if (value.schemaVersion !== MATCH_SCHEMA_VERSION) throw new Error('Unsupported match schema version.');
  assertExactFields(value, MATCH_FIELDS, 'match');
  const definition = levelDefinition(value.level as number);
  if (!isUint(value.movesRemaining) || value.movesRemaining > definition.moves) throw new Error('Invalid moves remaining.');
  if (!isUint(value.score)) throw new Error('Invalid score.');
  assertSeed(value.seed);
  if (value.status !== 'playing' && value.status !== 'won' && value.status !== 'lost') throw new Error('Invalid match status.');
  validateBoard(value.board);
  const progress = value.goalProgress;
  if (!isRecord(progress) || !GOAL_TYPES.every((type) => isUint(progress[type])) || Object.keys(progress).length !== GOAL_TYPES.length) {
    throw new Error('Invalid goal progress.');
  }
  if (progress.score !== value.score) throw new Error('Score goal progress must equal score.');
  const complete = definition.goals.every((goal) => (progress[goal.type] as number) >= goal.target);
  const consistent = value.status === 'won'
    ? complete
    : value.status === 'lost'
      ? value.movesRemaining === 0 && !complete
      : value.movesRemaining > 0 && !complete;
  if (!consistent) throw new Error('Match status contradicts moves or level goals.');
}

function validateBoard(value: unknown): asserts value is Board {
  if (!Array.isArray(value) || value.length !== 8 || !value.every((row) => Array.isArray(row) && row.length === 8)) throw new Error('Invalid board dimensions.');
  for (const row of value) for (const tile of row) {
    if (!isRecord(tile)) throw new Error('Invalid board tile.');
    assertNoUnknownFields(tile, TILE_FIELDS, 'tile');
    if (!isTileKind(tile.kind)
      || (tile.booster !== undefined && !isBoosterKind(tile.booster))
      || (tile.ice !== undefined && typeof tile.ice !== 'boolean')) throw new Error('Invalid board tile.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isUint(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function assertSeed(value: unknown): asserts value is number { if (!isUint(value) || value > 0xffff_ffff) throw new Error('Invalid seed.'); }

function assertExactFields(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  assertNoUnknownFields(value, allowed, label);
  if (allowed.some((field) => !(field in value))) throw new Error(`Missing ${label} field.`);
}

function assertNoUnknownFields(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  if (Object.keys(value).some((field) => !allowed.includes(field))) throw new Error(`Unknown ${label} field.`);
}

function freezeState(state: MatchState): MatchState {
  const board = state.board.map((row) => Object.freeze(row.map((tile) => Object.freeze({ ...tile })))) as unknown as Board;
  return Object.freeze({ ...state, board: Object.freeze(board), goalProgress: Object.freeze({ ...state.goalProgress }) });
}
