import type {
  UncoverSession,
  UncoverGuess,
  UncoverSessionStatus,
} from '@prisma/client';

import { normalizeText } from './game-service';

// ----- Types -----

interface User {
  id: string;
  [key: string]: unknown;
}

interface SessionWithGuesses extends UncoverSession {
  guesses: UncoverGuess[];
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface SessionStartResult {
  canStart: boolean;
  existingSession?: UncoverSession;
}

interface GameResultCalculation {
  status: UncoverSessionStatus;
  gameOver: boolean;
}

// ----- Validation Functions -----

/**
 * Validate that a user can start a new session
 * AUTH-01: User must be authenticated
 */
export function validateSessionStart(
  user: User | null,
  challengeId: string,
  existingSession?: UncoverSession | null
): SessionStartResult {
  // AUTH-01: User must be authenticated
  if (!user) {
    throw new Error('Authentication required to play');
  }

  // Check if session already exists for this user+challenge
  if (existingSession) {
    return {
      canStart: false,
      existingSession,
    };
  }

  return {
    canStart: true,
  };
}

/**
 * Validate a guess submission
 * DAILY-03: Session must be IN_PROGRESS
 * GAME-02: Must not exceed max attempts
 * GAME-06: Enforce attempt limit
 * GAME-10: No duplicate guesses (text-based comparison)
 */
export function validateGuess(
  session: SessionWithGuesses,
  guessText: string,
  maxAttempts: number
): ValidationResult {
  // DAILY-03: Validate session status is IN_PROGRESS
  if (session.status !== 'IN_PROGRESS') {
    return {
      valid: false,
      error: 'This game has already been completed',
    };
  }

  // GAME-02, GAME-06: Validate attemptCount < maxAttempts
  if (session.attemptCount >= maxAttempts) {
    return {
      valid: false,
      error: 'Maximum attempts exceeded',
    };
  }

  // GAME-10: Check guessText not in previous guesses (normalized text comparison)
  const normalizedGuess = normalizeText(guessText);
  const isDuplicate = session.guesses.some(guess => {
    if (!guess.guessedText) return false;
    return normalizeText(guess.guessedText) === normalizedGuess;
  });

  if (isDuplicate) {
    return {
      valid: false,
      error: 'You have already guessed this album',
    };
  }

  return { valid: true };
}

/**
 * Validate a skip action
 * Must be IN_PROGRESS and under max attempts
 */
export function validateSkip(
  session: UncoverSession,
  maxAttempts: number
): ValidationResult {
  // Validate session status is IN_PROGRESS
  if (session.status !== 'IN_PROGRESS') {
    return {
      valid: false,
      error: 'This game has already been completed',
    };
  }

  // Validate attemptCount < maxAttempts
  if (session.attemptCount >= maxAttempts) {
    return {
      valid: false,
      error: 'Maximum attempts exceeded',
    };
  }

  return { valid: true };
}

/**
 * Calculate game result based on current state
 * GAME-05: Win condition
 * GAME-06: Loss condition (max attempts reached)
 */
export function calculateGameResult(
  session: UncoverSession,
  isCorrect: boolean,
  newAttemptCount: number,
  maxAttempts: number
): GameResultCalculation {
  // GAME-05: If isCorrect, return 'WON'
  if (isCorrect) {
    return {
      status: 'WON',
      gameOver: true,
    };
  }

  // GAME-06: If newAttemptCount >= maxAttempts, return 'LOST'
  if (newAttemptCount >= maxAttempts) {
    return {
      status: 'LOST',
      gameOver: true,
    };
  }

  // Otherwise return 'IN_PROGRESS'
  return {
    status: 'IN_PROGRESS',
    gameOver: false,
  };
}
