import { createSeededRng, fisherYatesShuffle } from './seeded-random';

/** A single tile in the reveal grid */
export interface Tile {
  /** Column index (0 to gridSize-1) */
  x: number;
  /** Row index (0 to gridSize-1) */
  y: number;
  /** Flat index in the grid (row * gridSize + col) */
  index: number;
}

/** A horizontal strip for blur-style reveal */
export interface Strip {
  /** First row of the strip (inclusive) */
  startRow: number;
  /** Last row of the strip (exclusive) */
  endRow: number;
}

/**
 * Generates a flat array of tiles for a square grid.
 *
 * @param gridSize - Number of rows/columns (default 16 = 256 tiles)
 * @returns Array of Tile objects ordered row-by-row
 */
export function generateTileGrid(gridSize = 16): Tile[] {
  const tiles: Tile[] = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      tiles.push({ x, y, index: y * gridSize + x });
    }
  }

  return tiles;
}

/**
 * Orders tiles by Euclidean distance from the grid center.
 * Tiles furthest from center come FIRST (edges/corners reveal first).
 * Center tiles come LAST (most identifying part revealed last).
 *
 * @param tiles - Array of tiles to order
 * @param gridSize - Grid dimension (default 16)
 * @returns New array sorted far-to-near from center
 */
export function orderTilesByDistance(tiles: Tile[], gridSize = 16): Tile[] {
  const center = gridSize / 2 - 0.5;

  return [...tiles].sort((a, b) => {
    const distA = Math.sqrt(
      Math.pow(a.x - center, 2) + Math.pow(a.y - center, 2)
    );
    const distB = Math.sqrt(
      Math.pow(b.x - center, 2) + Math.pow(b.y - center, 2)
    );
    // Descending: furthest from center first
    return distB - distA;
  });
}

/**
 * Applies a seeded Fisher-Yates shuffle to tiles for deterministic randomness.
 * All players with the same seed see the same ordering.
 *
 * @param tiles - Array of tiles to shuffle
 * @param seed - Seed string (e.g., "uncover-{challengeId}")
 * @returns New array with tiles in shuffled order
 */
export function shuffleTilesWithSeed(tiles: Tile[], seed: string): Tile[] {
  const rng = createSeededRng(seed);
  return fisherYatesShuffle(tiles, rng);
}

/**
 * Returns the tiles that should be revealed at a given stage (cumulative).
 * Stage 1 reveals ~16% of tiles, stage 6 reveals 100%.
 *
 * @param orderedTiles - Tiles in reveal order (first = revealed first)
 * @param stage - Current stage (1 to totalStages)
 * @param totalStages - Total number of stages (default 6)
 * @returns Subset of tiles revealed so far at this stage
 */
export function getTilesForStage(
  orderedTiles: Tile[],
  stage: number,
  totalStages = 6
): Tile[] {
  const clampedStage = Math.max(1, Math.min(stage, totalStages));
  const count = Math.floor((clampedStage / totalStages) * orderedTiles.length);
  return orderedTiles.slice(0, count);
}

/**
 * Divides the grid into horizontal strips for blur-style reveal.
 *
 * @param gridSize - Grid dimension (default 16)
 * @param numStrips - Number of strips to generate (default 6)
 * @returns Array of Strip objects covering all rows
 */
export function generateStrips(gridSize = 16, numStrips = 6): Strip[] {
  const strips: Strip[] = [];
  const rowsPerStrip = Math.floor(gridSize / numStrips);
  let currentRow = 0;

  for (let i = 0; i < numStrips; i++) {
    const isLast = i === numStrips - 1;
    const endRow = isLast ? gridSize : currentRow + rowsPerStrip;
    strips.push({ startRow: currentRow, endRow });
    currentRow = endRow;
  }

  return strips;
}

/**
 * Returns the strips that should be revealed at a given stage (cumulative).
 * Stage 1 reveals 1 strip, stage 6 reveals all strips.
 *
 * @param strips - Array of strips in reveal order
 * @param stage - Current stage (1 to total strips)
 * @returns Subset of strips revealed so far at this stage
 */
export function getStripsForStage(strips: Strip[], stage: number): Strip[] {
  const count = Math.max(1, Math.min(stage, strips.length));
  return strips.slice(0, count);
}
