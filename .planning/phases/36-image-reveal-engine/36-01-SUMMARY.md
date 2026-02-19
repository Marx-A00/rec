# Plan 36-01 Summary: Foundation

**Status:** Complete
**Duration:** ~2 min

## What was built

- **seedrandom** installed (v3.0.5) + @types/seedrandom
- **src/lib/uncover/seeded-random.ts** — `createSeededRng()` and `fisherYatesShuffle()` for deterministic randomness
- **src/lib/uncover/reveal-pattern.ts** — Tile/Strip interfaces, `generateTileGrid()`, `orderTilesByDistance()`, `shuffleTilesWithSeed()`, `getTilesForStage()`, `generateStrips()`, `getStripsForStage()`
- **src/stores/useRevealStore.ts** — Zustand store persisting `preferredStyle` ('pixelation' | 'blur') to localStorage

## Verification

- `pnpm type-check` — clean
- `pnpm lint` — no issues in new files

## Key decisions

- 16x16 grid (256 tiles) for pixelation
- Distance ordering: edges/corners first, center last
- Fisher-Yates shuffle with seedrandom for deterministic ordering
- Default style: pixelation for new players
- localStorage key: `reveal-preferences`
