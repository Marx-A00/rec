import { useMemo } from 'react';

import {
  generateTileGrid,
  orderTilesByDistance,
  shuffleTilesWithSeed,
  getTilesForStage,
  generateRegionReveal,
  getRegionTilesForStage,
  type Tile,
} from '@/lib/uncover/reveal-pattern';

/** Reveal pattern mode */
export type RevealMode = 'scattered' | 'regions';

/**
 * Pixelation grid is always 16x16 for visual quality.
 * Region reveal logic uses a coarser grid (8x8) internally,
 * then maps back to 16x16 tiles for the canvas.
 */
const PIXEL_GRID = 16;
const REGION_GRID = 8;
const TOTAL_TILES = PIXEL_GRID * PIXEL_GRID;

interface UseRevealImageOptions {
  /** Challenge ID used to generate deterministic seed */
  challengeId: string;
  /** Current reveal stage (1-6) */
  stage: number;
  /** Total number of stages (default 6) */
  totalStages?: number;
  /** Reveal pattern mode (default: 'scattered') */
  mode?: RevealMode;
}

interface UseRevealImageResult {
  /** Tiles to show as clear (cumulative up to current stage) */
  revealedTiles: Tile[];
  /** All tiles in reveal order (only populated for scattered mode) */
  allTiles: Tile[];
  /** Fraction of image revealed (0 to 1) */
  revealProgress: number;
  /** The seed used for tile ordering */
  seed: string;
  /** Grid size used for rendering (always 16 for the canvas) */
  gridSize: number;
}

/**
 * Maps coarse-grid region tiles (8x8) to fine-grid pixel tiles (16x16).
 * Each coarse tile maps to a 2x2 block of fine tiles.
 */
function mapCoarseToFineTiles(
  coarseTiles: Tile[],
  coarseGrid: number,
  fineGrid: number
): Tile[] {
  const scale = fineGrid / coarseGrid;
  const seen = new Set<number>();
  const fineTiles: Tile[] = [];

  for (const ct of coarseTiles) {
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const fx = ct.x * scale + dx;
        const fy = ct.y * scale + dy;
        if (fx < fineGrid && fy < fineGrid) {
          const index = fy * fineGrid + fx;
          if (!seen.has(index)) {
            seen.add(index);
            fineTiles.push({ x: fx, y: fy, index });
          }
        }
      }
    }
  }

  return fineTiles;
}

/**
 * Computes the tile reveal state for a given challenge and stage.
 * Uses deterministic seeded ordering so all players see the same pattern.
 *
 * Supports two modes:
 * - 'scattered': 16x16 grid — individual tiles shuffled and revealed progressively
 * - 'regions': Regions computed on 8x8 grid, mapped to 16x16 tiles for rendering.
 *   Gives large contiguous revealed areas while keeping fine pixelation.
 *
 * @param options - Challenge ID, current stage, and optional total stages / mode
 * @returns Revealed tiles (always 16x16), all tiles, progress fraction, seed, and gridSize
 */
export function useRevealImage({
  challengeId,
  stage,
  totalStages = 6,
  mode = 'scattered',
}: UseRevealImageOptions): UseRevealImageResult {
  const seed = `uncover-${challengeId}`;

  // Scattered mode: original tile-by-tile reveal on 16x16
  const allTiles = useMemo(() => {
    if (mode !== 'scattered') return [];
    const grid = generateTileGrid(PIXEL_GRID);
    const ordered = orderTilesByDistance(grid, PIXEL_GRID);
    return shuffleTilesWithSeed(ordered, seed);
  }, [seed, mode]);

  // Region mode: compute regions on coarse 8x8 grid
  const regions = useMemo(() => {
    if (mode !== 'regions') return null;
    return generateRegionReveal(seed, REGION_GRID, totalStages);
  }, [seed, mode, totalStages]);

  const revealedTiles = useMemo(() => {
    if (mode === 'regions' && regions) {
      // Get coarse tiles, then map to fine 16x16 tiles
      const coarseTiles = getRegionTilesForStage(regions, stage, REGION_GRID);
      return mapCoarseToFineTiles(coarseTiles, REGION_GRID, PIXEL_GRID);
    }
    return getTilesForStage(allTiles, stage, totalStages);
  }, [mode, regions, allTiles, stage, totalStages]);

  const revealProgress =
    TOTAL_TILES > 0 ? revealedTiles.length / TOTAL_TILES : 0;

  return {
    revealedTiles,
    allTiles,
    revealProgress,
    seed,
    gridSize: PIXEL_GRID,
  };
}
