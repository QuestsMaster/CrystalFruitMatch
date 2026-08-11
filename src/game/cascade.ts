import { findMatches, hasValidSwap, reshuffleBoard } from './board.js';
import { explosionForBooster, explosionForBoosters } from './boosters.js';
import type { Random } from './random.js';
import { TILE_KINDS } from './types.js';
import type { Board, BoosterKind, Cell, Tile } from './types.js';
import type { Explosion } from './boosters.js';

const POINTS_PER_TILE = 10;

export interface CreatedBooster {
  readonly cell: Cell;
  readonly booster: BoosterKind;
}

export interface CascadeResult {
  readonly board: Board;
  readonly removed: number;
  readonly removedTiles: readonly { readonly cell: Cell; readonly tile: Tile }[];
  readonly clearedIce: readonly Cell[];
  readonly scoreDelta: number;
  readonly createdBoosters: readonly CreatedBooster[];
  readonly explosions: readonly Explosion[];
}

export function resolveBoard(
  board: Board,
  rng: Random,
  boosterCombination?: readonly [Cell, Cell],
): CascadeResult {
  let current = board;
  let removed = 0;
  const removedTiles: { cell: Cell; tile: Tile }[] = [];
  const clearedIce: Cell[] = [];
  const createdBoosters: CreatedBooster[] = [];
  const explosions: Explosion[] = [];

  if (boosterCombination) {
    const explosion = explosionForBoosters(current, boosterCombination[0], boosterCombination[1]);
    explosions.push(explosion);
    const removedCells = new Map(explosion.cells.map((cell) => [cellKey(cell), cell]));
    expandBoosterChain(current, removedCells, new Set(boosterCombination.map(cellKey)), explosions);
    removed += removedCells.size;
    removedTiles.push(...[...removedCells.values()].map((cell) => ({ cell, tile: current[cell.row][cell.column] })));
    current = refill(compact(current, new Set(removedCells.keys())), rng);
  }

  while (true) {
    const matches = findMatches(current);
    if (matches.length === 0) break;

    const protectedCells = new Map<string, CreatedBooster>();
    for (const match of matches) {
      const booster = boosterFor(match.direction, match.cells.length);
      if (booster) {
        const cell = match.cells[Math.floor(match.cells.length / 2)];
        protectedCells.set(cellKey(cell), { cell, booster });
      }
    }

    const matchedCells = new Map<string, Cell>();
    for (const match of matches) for (const cell of match.cells) matchedCells.set(cellKey(cell), cell);
    for (const key of protectedCells.keys()) matchedCells.delete(key);

    expandBoosterChain(current, matchedCells, new Set(), explosions);

    for (const cell of matchedCells.values()) removedTiles.push({ cell, tile: current[cell.row][cell.column] });
    for (const { cell } of protectedCells.values()) if (current[cell.row][cell.column].ice) clearedIce.push(cell);

    removed += matchedCells.size;
    const withBoosters = current.map((row, rowIndex) => row.map((tile, column) => {
      const created = protectedCells.get(`${rowIndex}:${column}`);
      return created ? { ...tile, ice: undefined, booster: created.booster } : tile;
    }));
    current = refill(compact(withBoosters, new Set(matchedCells.keys())), rng);
    createdBoosters.push(...protectedCells.values());
  }

  if (current.length === 8 && current.every((row) => row.length === 8) && !hasValidSwap(current)) {
    current = reshuffleBoard(current, rng);
  }

  return {
    board: current,
    removed,
    removedTiles,
    clearedIce,
    scoreDelta: removed * POINTS_PER_TILE,
    createdBoosters,
    explosions,
  };
}

function expandBoosterChain(
  board: Board,
  removedCells: Map<string, Cell>,
  activated: Set<string>,
  explosions: Explosion[],
): void {
  const pending = [...removedCells.values()];
  for (let index = 0; index < pending.length; index += 1) {
    const cell = pending[index];
    const key = cellKey(cell);
    const booster = board[cell.row][cell.column].booster;
    if (!booster || activated.has(key)) continue;
    activated.add(key);
    const explosion = explosionForBooster(board, cell);
    explosions.push(explosion);
    for (const affected of explosion.cells) {
      const affectedKey = cellKey(affected);
      if (removedCells.has(affectedKey)) continue;
      removedCells.set(affectedKey, affected);
      pending.push(affected);
    }
  }
}

function boosterFor(direction: 'horizontal' | 'vertical', length: number): BoosterKind | undefined {
  if (length >= 5) return 'bomb';
  if (length === 4) return direction === 'horizontal' ? 'rowRocket' : 'columnRocket';
  return undefined;
}

function compact(board: Board, removed: ReadonlySet<string>): (Tile | undefined)[][] {
  const compacted = board.map((row) => Array.from<Tile | undefined>({ length: row.length }));
  const width = board[0]?.length ?? 0;
  for (let column = 0; column < width; column += 1) {
    const remaining = board.map((row, rowIndex) => ({ tile: row[column], row: rowIndex }))
      .filter(({ row }) => !removed.has(`${row}:${column}`));
    const start = board.length - remaining.length;
    remaining.forEach(({ tile }, index) => { compacted[start + index][column] = tile; });
  }
  return compacted;
}

function refill(
  board: (Tile | undefined)[][],
  rng: Random,
): Board {
  return board.map((row) => row.map((tile) => {
    return tile ?? { kind: TILE_KINDS[rng.nextInt(TILE_KINDS.length)] };
  }));
}

function cellKey(cell: Cell): string {
  return `${cell.row}:${cell.column}`;
}
