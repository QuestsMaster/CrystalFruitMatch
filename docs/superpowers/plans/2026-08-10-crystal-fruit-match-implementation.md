# Crystal Fruit Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a five-level offline portrait match-3 PWA for iPhone using simple original crystal-and-fruit tiles.

**Architecture:** Keep the game model pure and deterministic, with board generation, swaps, match detection, cascades, boosters, goals, and level progression independent of the DOM. A Canvas 2D renderer consumes immutable snapshots, while a touch controller converts swipes into swap commands. A small persistence adapter stores the serializable game state and a service worker precaches the production bundle.

**Tech Stack:** TypeScript, Vite, Vitest, Canvas 2D, Web Storage, Service Worker, GitHub Pages.

## Global Constraints

- Target is an offline PWA for iPhone Safari in portrait orientation.
- First version has a fixed 8×8 board, six tile types, five levels, and swipe controls.
- Tiles use color plus a distinct symbol; no external image assets are required.
- Invalid swaps restore the original board and do not consume a move.
- Save data includes `schemaVersion`, level, board, moves, score, and goal progress.
- Corrupt saves fall back to a new game without preventing launch.
- Every implementation task follows RED → GREEN → REFACTOR and ends with a focused test command and commit.

---

### Task 1: Scaffold the standalone PWA

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.ts`, `src/styles.css`
- Create: `tests/pwa/scaffold.test.ts`

**Interfaces:**
- Produces a Vite app entry with `#game`, `#hud`, and `#offline-status` elements.
- Produces `npm test -- --run`, `npm run build`, and `npx tsc --noEmit` scripts.

- [ ] **Step 1: Write the failing scaffold test**

```ts
it('declares the game canvas and portrait viewport metadata', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('id="game"');
  expect(html).toContain('viewport-fit=cover');
});
```

- [ ] **Step 2: Run `npm test -- --run tests/pwa/scaffold.test.ts` and verify the missing files fail.**
- [ ] **Step 3: Add the minimal Vite/TypeScript scaffold and dark portrait CSS.**
- [ ] **Step 4: Run the focused test, `npx tsc --noEmit`, and `npm run build`; all must pass.**
- [ ] **Step 5: Commit with `git add . && git commit -m "chore: scaffold Crystal Fruit Match PWA"`.**

### Task 2: Implement deterministic board primitives

**Files:**
- Create: `src/game/types.ts`, `src/game/random.ts`, `src/game/board.ts`
- Create: `tests/game/board.test.ts`

**Interfaces:**
- `TileKind = 'ruby' | 'lemon' | 'berry' | 'orange' | 'turquoise' | 'grape'`.
- `Board = readonly Tile[][]` with exactly 8 rows and 8 columns.
- `createBoard(seed: number): Board` produces a board with no initial matches and at least one valid swap.
- `swapTiles(board: Board, a: Cell, b: Cell): Board` returns a copy and rejects non-adjacent cells.
- `findMatches(board: Board): readonly Match[]` returns horizontal/vertical runs of length ≥3.

- [ ] **Step 1: Write tests for dimensions, deterministic seed output, no initial matches, adjacent swap, and match detection.**
- [ ] **Step 2: Run `npm test -- --run tests/game/board.test.ts`; verify RED.**
- [ ] **Step 3: Implement a seeded PRNG, board validator, swap copy, and horizontal/vertical run scanner.**
- [ ] **Step 4: Run the focused tests and `npx tsc --noEmit`; verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: add deterministic match-3 board primitives"`.**

### Task 3: Resolve cascades and create boosters

**Files:**
- Create: `src/game/cascade.ts`, `src/game/boosters.ts`
- Create: `tests/game/cascade.test.ts`

**Interfaces:**
- `resolveBoard(board: Board, rng: Random): CascadeResult` removes matches, applies gravity, refills, and repeats until stable.
- `CascadeResult` contains `board`, `removed`, `scoreDelta`, `createdBoosters`, and `explosions`.
- Four-in-line creates a row/column rocket; five-in-line creates a bomb.
- Combining two boosters resolves both effects in the same cascade.

- [ ] **Step 1: Write tests for removal, gravity, refill, chain reactions, rocket creation, bomb creation, and booster combination.**
- [ ] **Step 2: Run the focused cascade test and verify RED.**
- [ ] **Step 3: Implement match removal, downward compaction, deterministic refill, and booster effects.**
- [ ] **Step 4: Run focused tests plus the board suite; verify GREEN.**
- [ ] **Step 5: Commit with `git commit -m "feat: resolve cascades and boosters"`.**

### Task 4: Add level goals and serializable match state

**Files:**
- Create: `src/game/levels.ts`, `src/game/match.ts`, `src/game/storage.ts`
- Create: `tests/game/match.test.ts`, `tests/game/storage.test.ts`

**Interfaces:**
- `LevelDefinition` encodes the five exact goals and move limits from the approved spec.
- `MatchState` contains `schemaVersion`, `level`, `board`, `movesRemaining`, `score`, `goalProgress`, `status`, and `seed`.
- `startLevel(level: number, seed: number): MatchState` starts a valid level.
- `applySwap(state: MatchState, a: Cell, b: Cell): MatchState` consumes a move only for a successful match.
- `encodeMatch` and `decodeMatch` validate schema, dimensions, tile kinds, moves, score, and goal progress.

- [ ] **Step 1: Write tests for all five level definitions, successful/invalid swaps, win/loss status, round-trip encoding, and corrupt-save rejection.**
- [ ] **Step 2: Run both focused suites and verify RED.**
- [ ] **Step 3: Implement goal accounting for score, ice cells, berry collection, and total fruit collection.**
- [ ] **Step 4: Implement strict JSON validation and graceful `load()` fallback to `{ status: 'empty' }`.**
- [ ] **Step 5: Run focused tests and commit `feat: add levels goals and match persistence model`.**

### Task 5: Implement swipe input and Canvas renderer

**Files:**
- Create: `src/ui/controls.ts`, `src/ui/renderer.ts`
- Modify: `src/main.ts`, `src/styles.css`
- Create: `tests/ui/controls.test.ts`, `tests/ui/renderer.test.ts`

**Interfaces:**
- `TouchControls` emits `swap` only when pointer movement exceeds 24 CSS pixels in one cardinal direction.
- A tap, diagonal gesture, or swipe outside the board emits no command.
- `CanvasRenderer.render(state: MatchState): void` draws goal text, moves, score, 8×8 tiles, ice, rockets, bombs, and simple match/explosion effects.
- Renderer does not mutate `MatchState`.

- [ ] **Step 1: Write tests for right/left/up/down swipes, cancellation, tap rejection, safe-area placement, and renderer labels/tile counts.**
- [ ] **Step 2: Run focused UI tests and verify RED.**
- [ ] **Step 3: Implement pointer capture state machine and normalized board coordinates.**
- [ ] **Step 4: Implement simple symbol-based tile drawing and goal HUD without image assets.**
- [ ] **Step 5: Run UI tests, `npx tsc --noEmit`, and build; commit `feat: add swipe controls and canvas UI`.**

### Task 6: Wire persistence and offline lifecycle

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon.svg`, `public/sw.js`
- Modify: `src/main.ts`, `index.html`
- Create: `tests/pwa/offline.test.ts`

**Interfaces:**
- `MatchRepository.load/save/clear` persists the validated `MatchState`.
- Service worker precaches `index.html`, the manifest, icon, CSS, JS, and `sw.js` itself.
- Offline status reports cache readiness and does not block gameplay.
- New versions activate only after precache succeeds; a match in progress is not discarded.

- [ ] **Step 1: Write tests for manifest fields, precache list, offline fallback, and corrupt-save recovery.**
- [ ] **Step 2: Run the focused PWA suite and verify RED.**
- [ ] **Step 3: Implement repository, installable manifest, service worker install/activate/fetch, and readiness message.**
- [ ] **Step 4: Run PWA tests, full tests, TypeScript, and production build.**
- [ ] **Step 5: Commit `feat: make Crystal Fruit Match installable and offline`.**

### Task 7: Integrate five levels and release verification

**Files:**
- Modify: `src/main.ts`, `README.md`
- Create: `tests/integration/match.test.ts`, `docs/iphone-checklist.md`

**Interfaces:**
- Main loop starts a new level, restores a saved level, dispatches swaps, renders state, and advances to the next level after a win.
- A completed level exposes a `Следующий уровень` action; a failed level exposes `Повторить`.
- `README.md` documents local build, GitHub Pages deployment, and iPhone offline installation.

- [ ] **Step 1: Write an integration test that completes levels 1–5 with deterministic boards and verifies progression and persistence.**
- [ ] **Step 2: Run the integration test and verify RED.**
- [ ] **Step 3: Wire the controller, level actions, pause/resume, and recovery UI.**
- [ ] **Step 4: Run `npm test -- --run`, `npx tsc --noEmit`, `npm run build`, and `npm audit --audit-level=high`.**
- [ ] **Step 5: Perform the manual iPhone checklist: first online load, Add to Home Screen, airplane-mode launch, swipe, save/reload, and safe-area check.**
- [ ] **Step 6: Commit `feat: ship Crystal Fruit Match v1` and publish through GitHub Pages.**

## Verification matrix

| Requirement | Task | Evidence |
|---|---:|---|
| 8×8 board and six tile types | 2 | board tests |
| Swipes and invalid-swap rollback | 5 | controls + match tests |
| Cascades and boosters | 3 | cascade tests |
| Five exact goals and move limits | 4 | level tests |
| Save/reload and corrupt-save fallback | 4, 6 | storage tests |
| Offline PWA | 6 | service-worker tests + iPhone checklist |
| Portrait safe-area layout | 5, 7 | renderer tests + device checklist |
