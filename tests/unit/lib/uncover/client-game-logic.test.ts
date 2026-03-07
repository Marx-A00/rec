import { describe, it, expect } from 'vitest';

import {
  MAX_ATTEMPTS,
  isCorrectGuess,
  isGameOver,
  getGameResult,
  isDuplicateGuess,
  type ClientGuess,
} from '@/lib/uncover/client-game-logic';

// ----- Helpers -----

function makeGuess(
  overrides: Partial<ClientGuess> & { guessNumber: number }
): ClientGuess {
  return {
    albumId: null,
    albumTitle: null,
    artistName: null,
    isCorrect: false,
    isSkipped: false,
    ...overrides,
  };
}

function makeCorrectGuess(guessNumber: number): ClientGuess {
  return makeGuess({
    guessNumber,
    albumId: 'correct-id',
    albumTitle: 'Correct Album',
    artistName: 'Artist',
    isCorrect: true,
  });
}

function makeWrongGuess(
  guessNumber: number,
  albumId = `wrong-${guessNumber}`
): ClientGuess {
  return makeGuess({
    guessNumber,
    albumId,
    albumTitle: `Wrong Album ${guessNumber}`,
    artistName: 'Artist',
    isCorrect: false,
  });
}

function makeSkippedGuess(guessNumber: number): ClientGuess {
  return makeGuess({
    guessNumber,
    isSkipped: true,
  });
}

// ----- Constants -----

describe('MAX_ATTEMPTS', () => {
  it('should be 4', () => {
    expect(MAX_ATTEMPTS).toBe(4);
  });
});

// ----- isCorrectGuess -----

describe('isCorrectGuess', () => {
  it('returns true when IDs match exactly', () => {
    expect(isCorrectGuess('abc-123', 'abc-123')).toBe(true);
  });

  it('returns false when IDs differ', () => {
    expect(isCorrectGuess('abc-123', 'xyz-456')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isCorrectGuess('ABC-123', 'abc-123')).toBe(false);
  });

  it('handles UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(isCorrectGuess(uuid, uuid)).toBe(true);
    expect(isCorrectGuess(uuid, '550e8400-e29b-41d4-a716-446655440001')).toBe(
      false
    );
  });

  it('handles empty strings', () => {
    expect(isCorrectGuess('', '')).toBe(true);
    expect(isCorrectGuess('', 'abc')).toBe(false);
  });
});

// ----- isGameOver -----

describe('isGameOver', () => {
  it('returns false for no guesses', () => {
    expect(isGameOver([])).toBe(false);
  });

  it('returns false when guesses are below max and none correct', () => {
    const guesses = [makeWrongGuess(1), makeWrongGuess(2)];
    expect(isGameOver(guesses)).toBe(false);
  });

  it('returns true when a correct guess is found', () => {
    const guesses = [makeWrongGuess(1), makeCorrectGuess(2)];
    expect(isGameOver(guesses)).toBe(true);
  });

  it('returns true when correct guess is the first guess', () => {
    const guesses = [makeCorrectGuess(1)];
    expect(isGameOver(guesses)).toBe(true);
  });

  it('returns true when max attempts reached with all wrong', () => {
    const guesses = [
      makeWrongGuess(1),
      makeWrongGuess(2),
      makeWrongGuess(3),
      makeWrongGuess(4),
    ];
    expect(isGameOver(guesses)).toBe(true);
  });

  it('returns true when max attempts reached with skips', () => {
    const guesses = [
      makeSkippedGuess(1),
      makeWrongGuess(2),
      makeSkippedGuess(3),
      makeWrongGuess(4),
    ];
    expect(isGameOver(guesses)).toBe(true);
  });

  it('respects custom maxAttempts parameter', () => {
    const guesses = [makeWrongGuess(1), makeWrongGuess(2)];
    expect(isGameOver(guesses, 2)).toBe(true);
    expect(isGameOver(guesses, 3)).toBe(false);
  });

  it('returns true when correct guess is at max attempts', () => {
    const guesses = [
      makeWrongGuess(1),
      makeWrongGuess(2),
      makeWrongGuess(3),
      makeCorrectGuess(4),
    ];
    expect(isGameOver(guesses)).toBe(true);
  });
});

// ----- getGameResult -----

describe('getGameResult', () => {
  it('returns IN_PROGRESS for no guesses', () => {
    const result = getGameResult([]);
    expect(result).toEqual({
      status: 'IN_PROGRESS',
      won: false,
      gameOver: false,
    });
  });

  it('returns IN_PROGRESS when guesses below max and none correct', () => {
    const guesses = [makeWrongGuess(1)];
    const result = getGameResult(guesses);
    expect(result).toEqual({
      status: 'IN_PROGRESS',
      won: false,
      gameOver: false,
    });
  });

  it('returns WON when a correct guess exists', () => {
    const guesses = [makeWrongGuess(1), makeCorrectGuess(2)];
    const result = getGameResult(guesses);
    expect(result).toEqual({
      status: 'WON',
      won: true,
      gameOver: true,
    });
  });

  it('returns WON on first attempt', () => {
    const guesses = [makeCorrectGuess(1)];
    const result = getGameResult(guesses);
    expect(result).toEqual({
      status: 'WON',
      won: true,
      gameOver: true,
    });
  });

  it('returns WON on last attempt', () => {
    const guesses = [
      makeWrongGuess(1),
      makeWrongGuess(2),
      makeWrongGuess(3),
      makeCorrectGuess(4),
    ];
    const result = getGameResult(guesses);
    expect(result).toEqual({
      status: 'WON',
      won: true,
      gameOver: true,
    });
  });

  it('returns LOST when max attempts reached with no correct guess', () => {
    const guesses = [
      makeWrongGuess(1),
      makeWrongGuess(2),
      makeWrongGuess(3),
      makeWrongGuess(4),
    ];
    const result = getGameResult(guesses);
    expect(result).toEqual({
      status: 'LOST',
      won: false,
      gameOver: true,
    });
  });

  it('returns LOST when all attempts are skips', () => {
    const guesses = [
      makeSkippedGuess(1),
      makeSkippedGuess(2),
      makeSkippedGuess(3),
      makeSkippedGuess(4),
    ];
    const result = getGameResult(guesses);
    expect(result).toEqual({
      status: 'LOST',
      won: false,
      gameOver: true,
    });
  });

  it('respects custom maxAttempts', () => {
    const guesses = [makeWrongGuess(1), makeWrongGuess(2)];
    expect(getGameResult(guesses, 2)).toEqual({
      status: 'LOST',
      won: false,
      gameOver: true,
    });
    expect(getGameResult(guesses, 3)).toEqual({
      status: 'IN_PROGRESS',
      won: false,
      gameOver: false,
    });
  });

  it('prioritizes WON over attempt count', () => {
    // Even if at max attempts, correct guess means WON not LOST
    const guesses = [
      makeWrongGuess(1),
      makeWrongGuess(2),
      makeWrongGuess(3),
      makeCorrectGuess(4),
    ];
    const result = getGameResult(guesses);
    expect(result.status).toBe('WON');
    expect(result.won).toBe(true);
  });
});

// ----- isDuplicateGuess -----

describe('isDuplicateGuess', () => {
  it('returns false for empty guesses', () => {
    expect(isDuplicateGuess('abc', [])).toBe(false);
  });

  it('returns false when album has not been guessed', () => {
    const guesses = [makeWrongGuess(1, 'other-id')];
    expect(isDuplicateGuess('abc', guesses)).toBe(false);
  });

  it('returns true when album was already guessed', () => {
    const guesses = [makeWrongGuess(1, 'abc')];
    expect(isDuplicateGuess('abc', guesses)).toBe(true);
  });

  it('ignores skipped guesses (null albumId)', () => {
    const guesses = [makeSkippedGuess(1), makeSkippedGuess(2)];
    expect(isDuplicateGuess('abc', guesses)).toBe(false);
  });

  it('detects duplicate among multiple guesses', () => {
    const guesses = [
      makeWrongGuess(1, 'aaa'),
      makeWrongGuess(2, 'bbb'),
      makeWrongGuess(3, 'ccc'),
    ];
    expect(isDuplicateGuess('bbb', guesses)).toBe(true);
    expect(isDuplicateGuess('ddd', guesses)).toBe(false);
  });

  it('detects duplicate even if the guess was correct', () => {
    const guesses = [makeCorrectGuess(1)];
    expect(isDuplicateGuess('correct-id', guesses)).toBe(true);
  });

  it('handles mixed skipped and actual guesses', () => {
    const guesses = [
      makeSkippedGuess(1),
      makeWrongGuess(2, 'target'),
      makeSkippedGuess(3),
    ];
    expect(isDuplicateGuess('target', guesses)).toBe(true);
    expect(isDuplicateGuess('other', guesses)).toBe(false);
  });
});
