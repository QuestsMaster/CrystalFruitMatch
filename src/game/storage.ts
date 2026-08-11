import { decodeMatch, encodeMatch, type MatchState } from './match.js';

export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'recovered' }
  | { readonly status: 'ready'; readonly match: MatchState };

export class MatchRepository {
  constructor(private readonly storage: Storage, private readonly key = 'crystal-fruit-match') {}

  load(): LoadResult {
    try {
      const saved = this.storage.getItem(this.key);
      if (!saved) return { status: 'empty' };
      return { status: 'ready', match: decodeMatch(saved) };
    } catch {
      return { status: 'recovered' };
    }
  }

  save(state: MatchState): boolean {
    const encoded = encodeMatch(state);
    try { this.storage.setItem(this.key, encoded); return true; } catch { return false; }
  }

  clear(): boolean {
    try { this.storage.removeItem(this.key); return true; } catch { return false; }
  }
}
