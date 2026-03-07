/**
 * Client-side game logic for Uncover (Wordle-style).
 *
 * All functions are pure — no server calls, no Prisma, no side effects.
 * Designed to run in the browser for instant validation.
 */

// ----- Constants -----

export const MAX_ATTEMPTS = 4;

// ----- Types -----

export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface ClientGuess {
  guessNumber: number;
  albumId: string | null;
  albumTitle: string | null;
  artistName: string | null;
  isCorrect: boolean;
  isSkipped: boolean;
}

export interface GameStateResult {
  status: GameStatus;
  won: boolean;
  gameOver: boolean;
}

// ----- Functions -----

/**
 * Check if a guess matches the correct album.
 * Simple UUID equality — comparison happens client-side since
 * the correct answer is loaded upfront (Wordle-style).
 */
export function isCorrectGuess(
  guessAlbumId: string,
  correctAlbumId: string
): boolean {
  return guessAlbumId === correctAlbumId;
}

/**
 * Determine if the game is over based on guesses so far.
 * Game ends when a correct guess is found OR max attempts are reached.
 */
export function isGameOver(
  guesses: ClientGuess[],
  maxAttempts: number = MAX_ATTEMPTS
): boolean {
  if (guesses.some(g => g.isCorrect)) return true;
  if (guesses.length >= maxAttempts) return true;
  return false;
}

/**
 * Compute the full game state from the current guesses.
 * Returns status (IN_PROGRESS / WON / LOST), whether the player won,
 * and whether the game is over.
 */
export function getGameResult(
  guesses: ClientGuess[],
  maxAttempts: number = MAX_ATTEMPTS
): GameStateResult {
  if (guesses.some(g => g.isCorrect)) {
    return { status: 'WON', won: true, gameOver: true };
  }

  if (guesses.length >= maxAttempts) {
    return { status: 'LOST', won: false, gameOver: true };
  }

  return { status: 'IN_PROGRESS', won: false, gameOver: false };
}

/**
 * Check if an album has already been guessed.
 * Skipped guesses (null albumId) are ignored.
 */
export function isDuplicateGuess(
  albumId: string,
  guesses: ClientGuess[]
): boolean {
  return guesses.some(g => g.albumId !== null && g.albumId === albumId);
}
