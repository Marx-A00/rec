import { createSeededRng, fisherYatesShuffle } from './seeded-random';
import { TOTAL_STAGES, STAGE_REVEAL_TARGETS } from './reveal-constants';
import type { TextRegion } from '@/lib/vision/text-detection';

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
 * Uses STAGE_REVEAL_TARGETS for percentage-based progression.
 *
 * @param orderedTiles - Tiles in reveal order (first = revealed first)
 * @param stage - Current stage (1 to totalStages)
 * @param totalStages - Total number of stages (default TOTAL_STAGES)
 * @returns Subset of tiles revealed so far at this stage
 */
export function getTilesForStage(
  orderedTiles: Tile[],
  stage: number,
  totalStages = TOTAL_STAGES
): Tile[] {
  const clampedStage = Math.max(1, Math.min(stage, totalStages));
  const target = STAGE_REVEAL_TARGETS[clampedStage - 1] ?? 1.0;
  const count = Math.floor(target * orderedTiles.length);
  return orderedTiles.slice(0, count);
}

/**
 * Divides the grid into horizontal strips for blur-style reveal.
 *
 * @param gridSize - Grid dimension (default 16)
 * @param numStrips - Number of strips to generate (default 4)
 * @returns Array of Strip objects covering all rows
 */
export function generateStrips(gridSize = 16, numStrips = 4): Strip[] {
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
 * Stage 1 reveals 1 strip, stage 4 reveals all strips.
 *
 * @param strips - Array of strips in reveal order
 * @param stage - Current stage (1 to total strips)
 * @returns Subset of strips revealed so far at this stage
 */
export function getStripsForStage(strips: Strip[], stage: number): Strip[] {
  const count = Math.max(1, Math.min(stage, strips.length));
  return strips.slice(0, count);
}

/** Penalty applied per text-overlapping tile when scoring candidate positions */
const TEXT_PENALTY = 80;

/** Fallback heuristic regions when Cloud Vision data is unavailable (top/bottom 20%) */
const FALLBACK_TEXT_REGIONS: TextRegion[] = [
  { x: 0, y: 0, w: 1.0, h: 0.2 },
  { x: 0, y: 0.8, w: 1.0, h: 0.2 },
];

/**
 * Check if a tile (in grid coords) overlaps with a text region (in normalized 0-1 coords).
 * Uses AABB intersection test.
 */
function tileOverlapsTextRegion(
  tileX: number,
  tileY: number,
  gridSize: number,
  region: TextRegion
): boolean {
  const tileSize = 1 / gridSize;
  const tileLeft = tileX * tileSize;
  const tileTop = tileY * tileSize;
  const tileRight = tileLeft + tileSize;
  const tileBottom = tileTop + tileSize;

  const regionRight = region.x + region.w;
  const regionBottom = region.y + region.h;

  return (
    tileLeft < regionRight &&
    tileRight > region.x &&
    tileTop < regionBottom &&
    tileBottom > region.y
  );
}

/**
 * Count how many tiles in a candidate rectangle overlap with any text region.
 */
function countTextOverlap(
  cx: number,
  cy: number,
  w: number,
  h: number,
  gridSize: number,
  regions: TextRegion[]
): number {
  let count = 0;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      for (const region of regions) {
        if (tileOverlapsTextRegion(tx, ty, gridSize, region)) {
          count++;
          break; // Only count each tile once
        }
      }
    }
  }
  return count;
}

/**
 * Generates contiguous rectangular reveal regions using seeded randomness.
 * Each stage reveals one new rectangular block of tiles sized to hit a
 * cumulative percentage target defined in STAGE_REVEAL_TARGETS.
 *
 * When textRegions are provided, stages 1-3 penalize positions that overlap
 * with detected text (album title, artist name) to avoid revealing the answer
 * too early. Stages 4+ ignore text penalties (the player needs more info by then).
 *
 * When textRegions is null (Cloud Vision unavailable), a fallback heuristic
 * deprioritizes the top and bottom 20% of the image where text commonly appears.
 *
 * The last stage always reveals the entire grid (full reveal for game-over).
 *
 * @param seed - Seed string for deterministic placement
 * @param gridSize - Grid dimension (default 16)
 * @param totalStages - Number of stages (default TOTAL_STAGES)
 * @param textRegions - Normalized text bounding boxes from Cloud Vision, or null for fallback
 * @returns Array of RevealRegion[], one per stage (index 0 = stage 1)
 */
export function generateRegionReveal(
  seed: string,
  gridSize = 16,
  totalStages = TOTAL_STAGES,
  textRegions?: TextRegion[] | null
): RevealRegion[][] {
  const rng = createSeededRng(seed);

  // Resolve text regions: use provided, fallback heuristic if null, empty if []
  const effectiveTextRegions: TextRegion[] =
    textRegions === null || textRegions === undefined
      ? FALLBACK_TEXT_REGIONS
      : textRegions;

  const stageRegions: RevealRegion[][] = [];
  const totalTiles = gridSize * gridSize;

  // Track which tiles are already revealed to bias placement toward fresh areas
  const revealed = new Set<number>();

  // Generate one region per stage (except the last, which is always full grid)
  for (let s = 0; s < totalStages - 1; s++) {
    const cumulativeTarget = STAGE_REVEAL_TARGETS[s] ?? 1.0;
    const targetTileCount = Math.floor(cumulativeTarget * totalTiles);
    // How many NEW tiles this stage needs to add
    const needed = Math.max(1, targetTileCount - revealed.size);

    // Compute rectangle dimensions from needed tile count.
    // Target a roughly square region, with slight random aspect ratio variation.
    const side = Math.sqrt(needed);
    const aspectJitter = 0.8 + rng() * 0.4; // 0.8 to 1.2
    let w = Math.max(1, Math.round(side * aspectJitter));
    let h = Math.max(1, Math.round(needed / w));

    // Clamp to grid bounds
    w = Math.min(w, gridSize);
    h = Math.min(h, gridSize);

    // Apply text penalty for all in-game stages (0-3), not the final full-reveal.
    // Stages 1-3 get full penalty, stage 4 gets half penalty (softer avoidance
    // since the player needs more visible area on their last guess).
    const applyTextPenalty = s < 4 && effectiveTextRegions.length > 0;
    const textPenaltyWeight = s < 3 ? TEXT_PENALTY : TEXT_PENALTY * 0.5;

    // Try several random positions, pick the one with least overlap + text penalty
    let bestX = 0;
    let bestY = 0;
    let bestScore = Infinity;
    const attempts = 30;

    for (let a = 0; a < attempts; a++) {
      const cx = Math.floor(rng() * (gridSize - w + 1));
      const cy = Math.floor(rng() * (gridSize - h + 1));

      // Score = overlap with already-revealed tiles
      let score = 0;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const idx = (cy + dy) * gridSize + (cx + dx);
          if (revealed.has(idx)) score++;
        }
      }

      // Add text overlap penalty for early stages
      if (applyTextPenalty) {
        const textOverlap = countTextOverlap(
          cx,
          cy,
          w,
          h,
          gridSize,
          effectiveTextRegions
        );
        score += textOverlap * textPenaltyWeight;
      }

      if (score < bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = cy;
        if (score === 0) break;
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

  // Last stage: full grid reveal (game-over / post-game)
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
