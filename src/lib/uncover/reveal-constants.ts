/**
 * Shared constants for the Uncover reveal system.
 *
 * Stages 1-4 are the in-game reveal stages (one per wrong guess).
 * Stage 5 is the full reveal shown on game-over / post-game screens.
 */

/** Total number of reveal stages including the final full-reveal stage. */
export const TOTAL_STAGES = 5;

/**
 * Cumulative reveal percentage targets for each stage (index 0 = stage 1).
 *
 * - Stage 1 (0 wrong guesses): 5% revealed
 * - Stage 2 (1 wrong guess):   15% revealed
 * - Stage 3 (2 wrong guesses): 25% revealed
 * - Stage 4 (3 wrong guesses): 45% revealed
 * - Stage 5 (game over):      100% revealed
 */
export const STAGE_REVEAL_TARGETS = [0.05, 0.15, 0.25, 0.45, 1.0] as const;
