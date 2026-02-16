import { useMemo } from 'react';

import {
  generateTileGrid,
  orderTilesByDistance,
  shuffleTilesWithSeed,
  getTilesForStage,
  type Tile,
} from '@/lib/uncover/reveal-pattern';

interface UseRevealImageOptions {
  /** Challenge ID used to generate deterministic seed */
  challengeId: string;
  /** Current reveal stage (1-6) */
  stage: number;
  /** Total number of stages (default 6) */
  totalStages?: number;
}

interface UseRevealImageResult {
  /** Tiles to show as clear (cumulative up to current stage) */
  revealedTiles: Tile[];
  /** All tiles in reveal order */
  allTiles: Tile[];
  /** Fraction of image revealed (0 to 1) */
  revealProgress: number;
  /** The seed used for tile ordering */
  seed: string;
}

/**
 * Computes the tile reveal state for a given challenge and stage.
 * Uses deterministic seeded ordering so all players see the same pattern.
 *
 * @param options - Challenge ID, current stage, and optional total stages
 * @returns Revealed tiles, all tiles, progress fraction, and seed
 */
export function useRevealImage({
  challengeId,
  stage,
  totalStages = 6,
}: UseRevealImageOptions): UseRevealImageResult {
  const seed = `uncover-${challengeId}`;

  const allTiles = useMemo(() => {
    const grid = generateTileGrid(16);
    const ordered = orderTilesByDistance(grid, 16);
    return shuffleTilesWithSeed(ordered, seed);
  }, [seed]);

  const revealedTiles = useMemo(
    () => getTilesForStage(allTiles, stage, totalStages),
    [allTiles, stage, totalStages]
  );

  const revealProgress =
    allTiles.length > 0 ? revealedTiles.length / allTiles.length : 0;

  return { revealedTiles, allTiles, revealProgress, seed };
}
