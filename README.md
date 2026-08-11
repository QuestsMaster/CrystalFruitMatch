# Crystal Fruit Match

Offline portrait match-3 game for iPhone Safari. Complete five deterministic levels by swiping adjacent tiles to create matches; invalid swaps do not use a move. The game saves after every valid move, level transition, and retry.

## Local development

```sh
npm install
npm test -- --run
npx tsc --noEmit
npm run build
```

Preview the production bundle with `npx vite preview` after building.

## GitHub Pages

This repository is deployed at `https://<owner>.github.io/CrystalFruitMatch/`. Vite's `base` is set to `/CrystalFruitMatch/`, and the HTML manifest, module entry, and service-worker registration use relative URLs so assets remain inside that repository subpath.

Build with `npm run build` and publish the contents of `dist/` using the repository's GitHub Pages workflow or Pages artifact configuration. If the repository name changes, update `base` in `vite.config.ts`, then rebuild and verify the generated asset URLs before publishing.

## Install and use offline on iPhone

1. Open the GitHub Pages URL in Safari while online and wait for the “Offline ready” message.
2. Tap Share, choose **Add to Home Screen**, then open the installed game once.
3. Turn on Airplane Mode and launch it from the Home Screen. The game should load and retain the saved level.

The first visit must be online so Safari can install the service-worker cache.

If a saved game is corrupt or Safari blocks storage access, the game remains open and asks for confirmation before clearing the old save and starting level 1. Each release uses a separate app-shell cache; activation removes only older Crystal Fruit Match caches and leaves other GitHub Pages caches untouched.
