export type GoalType = 'score' | 'ice' | 'berry' | 'fruit';

export interface LevelGoal {
  readonly type: GoalType;
  readonly target: number;
}

export interface LevelDefinition {
  readonly level: number;
  readonly moves: number;
  readonly goals: readonly LevelGoal[];
}

export const LEVELS: readonly LevelDefinition[] = Object.freeze([
  { level: 1, moves: 20, goals: [{ type: 'score', target: 1000 }] },
  { level: 2, moves: 22, goals: [{ type: 'ice', target: 12 }] },
  { level: 3, moves: 24, goals: [{ type: 'berry', target: 20 }] },
  { level: 4, moves: 25, goals: [{ type: 'ice', target: 16 }, { type: 'score', target: 1500 }] },
  { level: 5, moves: 28, goals: [{ type: 'fruit', target: 30 }] },
]);

export function levelDefinition(level: number): LevelDefinition {
  const definition = LEVELS.find((entry) => entry.level === level);
  if (!definition) throw new Error('Unknown level.');
  return definition;
}
