import { createSeededRng, fisherYatesShuffle } from './seeded-random';

/** A rectangular region in the reveal grid */
export interface RevealRegion {
  /** Top-left column (inclusive) */
  x: number;
  /** Top-left row (inclusive) */
  y: number;
  /** Width in tiles */
  w: number;
  /** Height in tiles */
  h: number;
}

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

/**
 * Generates contiguous rectangular reveal regions using seeded randomness.
 * Each stage reveals one new rectangular block of tiles.
 * Regions grow larger with each stage, and are placed at seeded-random
 * positions avoiding heavy overlap with previously revealed areas.
 *
 * Stage 6 always reveals the entire grid.
 *
 * @param seed - Seed string for deterministic placement
 * @param gridSize - Grid dimension (default 16)
 * @param totalStages - Number of stages (default 6)
 * @returns Array of RevealRegion[], one per stage (index 0 = stage 1)
 */
export function generateRegionReveal(
  seed: string,
  gridSize = 16,
  totalStages = 6
): RevealRegion[][] {
  const rng = createSeededRng(seed);

  // Generate one region per stage (stages 1 through totalStages-1).
  // Stage 6 (last) always reveals the full grid.
  const stageRegions: RevealRegion[][] = [];

  // Track which tiles are already revealed to bias placement toward fresh areas
  const revealed = new Set<number>();

  // Region sizes scale relative to gridSize.
  // Each stage reveals a progressively larger rectangle.
  const unit = gridSize / 8; // Normalize so sizes work at any grid dimension
  const regionSizes: Array<{
    minW: number;
    maxW: number;
    minH: number;
    maxH: number;
  }> = [
    {
      minW: Math.max(1, Math.round(1.5 * unit)),
      maxW: Math.round(2 * unit),
      minH: Math.max(1, Math.round(1.5 * unit)),
      maxH: Math.round(2 * unit),
    },
    {
      minW: Math.round(2 * unit),
      maxW: Math.round(2.5 * unit),
      minH: Math.round(2 * unit),
      maxH: Math.round(2.5 * unit),
    },
    {
      minW: Math.round(2 * unit),
      maxW: Math.round(3 * unit),
      minH: Math.round(2 * unit),
      maxH: Math.round(3 * unit),
    },
    {
      minW: Math.round(2.5 * unit),
      maxW: Math.round(3.5 * unit),
      minH: Math.round(2.5 * unit),
      maxH: Math.round(3.5 * unit),
    },
    {
      minW: Math.round(3 * unit),
      maxW: Math.round(4 * unit),
      minH: Math.round(3 * unit),
      maxH: Math.round(4 * unit),
    },
  ];

  for (let s = 0; s < totalStages - 1; s++) {
    const size = regionSizes[Math.min(s, regionSizes.length - 1)];

    // Random dimensions for this region
    const w = size.minW + Math.floor(rng() * (size.maxW - size.minW + 1));
    const h = size.minH + Math.floor(rng() * (size.maxH - size.minH + 1));

    // Try several random positions, pick the one with least overlap
    let bestX = 0;
    let bestY = 0;
    let bestOverlap = Infinity;
    const attempts = 20;

    for (let a = 0; a < attempts; a++) {
      const cx = Math.floor(rng() * (gridSize - w + 1));
      const cy = Math.floor(rng() * (gridSize - h + 1));

      // Count overlap with already-revealed tiles
      let overlap = 0;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const idx = (cy + dy) * gridSize + (cx + dx);
          if (revealed.has(idx)) overlap++;
        }
      }

      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestX = cx;
        bestY = cy;
        if (overlap === 0) break; // Perfect — no overlap
      }
    }

    const region: RevealRegion = { x: bestX, y: bestY, w, h };
    stageRegions.push([region]);

    // Mark tiles as revealed
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        revealed.add((bestY + dy) * gridSize + (bestX + dx));
      }
    }
  }

  // Stage 6: full grid reveal
  stageRegions.push([{ x: 0, y: 0, w: gridSize, h: gridSize }]);

  return stageRegions;
}

/**
 * Returns all tiles that should be revealed at a given stage (cumulative)
 * using the contiguous-region reveal pattern.
 *
 * @param regions - Region arrays per stage (from generateRegionReveal)
 * @param stage - Current stage (1 to totalStages)
 * @param gridSize - Grid dimension (default 16)
 * @returns Array of Tile objects that are revealed
 */
export function getRegionTilesForStage(
  regions: RevealRegion[][],
  stage: number,
  gridSize = 16
): Tile[] {
  const clampedStage = Math.max(1, Math.min(stage, regions.length));
  const revealedSet = new Set<number>();
  const tiles: Tile[] = [];

  for (let s = 0; s < clampedStage; s++) {
    for (const region of regions[s]) {
      for (let dy = 0; dy < region.h; dy++) {
        for (let dx = 0; dx < region.w; dx++) {
          const x = region.x + dx;
          const y = region.y + dy;
          if (x < gridSize && y < gridSize) {
            const index = y * gridSize + x;
            if (!revealedSet.has(index)) {
              revealedSet.add(index);
              tiles.push({ x, y, index });
            }
          }
        }
      }
    }
  }

  return tiles;
}
