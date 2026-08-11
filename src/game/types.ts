export type TileKind = 'ruby' | 'lemon' | 'berry' | 'orange' | 'turquoise' | 'grape';

export type BoosterKind = 'rowRocket' | 'columnRocket' | 'bomb';

export const TILE_KINDS: readonly TileKind[] = Object.freeze(['ruby', 'lemon', 'berry', 'orange', 'turquoise', 'grape']);
export const FRUIT_KINDS: readonly TileKind[] = Object.freeze(['lemon', 'berry', 'orange', 'grape']);
export const BOOSTER_KINDS: readonly BoosterKind[] = Object.freeze(['rowRocket', 'columnRocket', 'bomb']);

export function isTileKind(value: unknown): value is TileKind {
  return typeof value === 'string' && TILE_KINDS.includes(value as TileKind);
}

export function isFruitKind(value: TileKind): boolean {
  return FRUIT_KINDS.includes(value);
}

export function isBoosterKind(value: unknown): value is BoosterKind {
  return typeof value === 'string' && BOOSTER_KINDS.includes(value as BoosterKind);
}

export interface Tile {
  readonly kind: TileKind;
  readonly booster?: BoosterKind;
  readonly ice?: boolean;
}

export type Board = readonly Tile[][];

export interface Cell {
  readonly row: number;
  readonly column: number;
}

export interface Match {
  readonly kind: TileKind;
  readonly direction: 'horizontal' | 'vertical';
  readonly cells: readonly Cell[];
}
