import { describe, it, expect } from 'vitest';

import {
  MAX_ATTEMPTS,
  isCorrectGuess,
  isGameOver,
  getGameResult,
  isDuplicateGuess,
  type ClientGuess,
  type GameStateResult,
} from '@/lib/uncover/client-game-logic';

/**
 * Integration tests for the client-side Uncover game flow.
 *
 * These tests simulate complete game lifecycles by composing the
 * pure functions from client-game-logic.ts the same way the hooks
 * (useUncoverGame / useArchiveGame) do at runtime.
 */

// ----- Helpers -----

interface GameSimulation {
  guesses: ClientGuess[];
  result: GameStateResult;
}

/**
 * Simulate submitting a guess in a running game.
 * Mirrors the logic in useUncoverGame.submitGuess.
 */
function simulateGuess(
  game: GameSimulation,
  albumId: string,
  albumTitle: string,
  correctAlbumId: string
): { game: GameSimulation; accepted: boolean; duplicate: boolean } {
  // Check duplicate
  if (isDuplicateGuess(albumId, game.guesses)) {
    return { game, accepted: false, duplicate: true };
  }

  // Check if game already over
  if (game.result.gameOver) {
    return { game, accepted: false, duplicate: false };
  }

  const correct = isCorrectGuess(albumId, correctAlbumId);
  const newGuess: ClientGuess = {
    guessNumber: game.guesses.length + 1,
    albumId,
    albumTitle,
    artistName: 'Test Artist',
    isCorrect: correct,
    isSkipped: false,
  };

  const newGuesses = [...game.guesses, newGuess];
  const newResult = getGameResult(newGuesses);

  return {
    game: { guesses: newGuesses, result: newResult },
    accepted: true,
    duplicate: false,
  };
}

/**
 * Simulate skipping a guess.
 * Mirrors the logic in useUncoverGame.skipGuess.
 */
function simulateSkip(game: GameSimulation): {
  game: GameSimulation;
  accepted: boolean;
} {
  if (game.result.gameOver) {
    return { game, accepted: false };
  }

  const newGuess: ClientGuess = {
    guessNumber: game.guesses.length + 1,
    albumId: null,
    albumTitle: null,
    artistName: null,
    isCorrect: false,
    isSkipped: true,
  };

  const newGuesses = [...game.guesses, newGuess];
  const newResult = getGameResult(newGuesses);

  return {
    game: { guesses: newGuesses, result: newResult },
    accepted: true,
  };
}

function newGame(): GameSimulation {
  return {
    guesses: [],
    result: { status: 'IN_PROGRESS', won: false, gameOver: false },
  };
}

// ----- Tests -----

describe('Complete daily game flow', () => {
  const CORRECT_ALBUM_ID = 'album-correct-uuid';

  it('player wins on first guess', () => {
    let game = newGame();

    const { game: g1 } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    game = g1;

    expect(game.guesses).toHaveLength(1);
    expect(game.guesses[0].isCorrect).toBe(true);
    expect(game.result.status).toBe('WON');
    expect(game.result.won).toBe(true);
    expect(game.result.gameOver).toBe(true);
  });

  it('player wins on last attempt after 3 wrong guesses', () => {
    let game = newGame();

    // 3 wrong guesses
    for (let i = 1; i <= 3; i++) {
      const { game: g } = simulateGuess(
        game,
        `wrong-${i}`,
        `Wrong Album ${i}`,
        CORRECT_ALBUM_ID
      );
      game = g;
      expect(game.result.status).toBe('IN_PROGRESS');
      expect(game.result.gameOver).toBe(false);
    }

    // 4th guess is correct
    const { game: final } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    game = final;

    expect(game.guesses).toHaveLength(4);
    expect(game.result.status).toBe('WON');
    expect(game.result.won).toBe(true);
    expect(game.result.gameOver).toBe(true);
  });

  it('player loses after 4 wrong guesses', () => {
    let game = newGame();

    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const { game: g } = simulateGuess(
        game,
        `wrong-${i}`,
        `Wrong Album ${i}`,
        CORRECT_ALBUM_ID
      );
      game = g;
    }

    expect(game.guesses).toHaveLength(MAX_ATTEMPTS);
    expect(game.result.status).toBe('LOST');
    expect(game.result.won).toBe(false);
    expect(game.result.gameOver).toBe(true);
  });

  it('rejects guesses after game is over (won)', () => {
    let game = newGame();

    const { game: g1 } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    game = g1;
    expect(game.result.gameOver).toBe(true);

    // Try another guess — should be rejected
    const { game: g2, accepted } = simulateGuess(
      game,
      'another-album',
      'Another Album',
      CORRECT_ALBUM_ID
    );

    expect(accepted).toBe(false);
    expect(g2.guesses).toHaveLength(1); // No new guess added
  });

  it('rejects guesses after game is over (lost)', () => {
    let game = newGame();

    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const { game: g } = simulateGuess(
        game,
        `wrong-${i}`,
        `Wrong Album ${i}`,
        CORRECT_ALBUM_ID
      );
      game = g;
    }
    expect(game.result.gameOver).toBe(true);

    // Try one more guess
    const { accepted } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    expect(accepted).toBe(false);
  });
});

describe('Duplicate guess prevention', () => {
  const CORRECT_ALBUM_ID = 'album-correct-uuid';

  it('rejects a duplicate guess', () => {
    let game = newGame();

    const { game: g1 } = simulateGuess(
      game,
      'wrong-1',
      'Wrong Album 1',
      CORRECT_ALBUM_ID
    );
    game = g1;

    // Try to guess the same album again
    const {
      game: g2,
      accepted,
      duplicate,
    } = simulateGuess(game, 'wrong-1', 'Wrong Album 1', CORRECT_ALBUM_ID);

    expect(accepted).toBe(false);
    expect(duplicate).toBe(true);
    expect(g2.guesses).toHaveLength(1); // No new guess added
  });

  it('allows different albums to be guessed', () => {
    let game = newGame();

    const { game: g1, accepted: a1 } = simulateGuess(
      game,
      'album-a',
      'Album A',
      CORRECT_ALBUM_ID
    );
    game = g1;
    expect(a1).toBe(true);

    const { game: g2, accepted: a2 } = simulateGuess(
      game,
      'album-b',
      'Album B',
      CORRECT_ALBUM_ID
    );
    game = g2;
    expect(a2).toBe(true);

    expect(game.guesses).toHaveLength(2);
  });

  it('does not count skips as duplicates of each other', () => {
    let game = newGame();

    const { game: g1 } = simulateSkip(game);
    game = g1;
    const { game: g2 } = simulateSkip(game);
    game = g2;

    expect(game.guesses).toHaveLength(2);
    expect(game.guesses.every(g => g.isSkipped)).toBe(true);
  });
});

describe('Skip functionality', () => {
  const CORRECT_ALBUM_ID = 'album-correct-uuid';

  it('skip counts as an attempt', () => {
    let game = newGame();

    const { game: g1 } = simulateSkip(game);
    game = g1;

    expect(game.guesses).toHaveLength(1);
    expect(game.guesses[0].isSkipped).toBe(true);
    expect(game.guesses[0].albumId).toBeNull();
    expect(game.result.status).toBe('IN_PROGRESS');
  });

  it('all skips leads to a loss', () => {
    let game = newGame();

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const { game: g } = simulateSkip(game);
      game = g;
    }

    expect(game.guesses).toHaveLength(MAX_ATTEMPTS);
    expect(game.result.status).toBe('LOST');
    expect(game.result.won).toBe(false);
    expect(game.result.gameOver).toBe(true);
  });

  it('cannot skip after game is over', () => {
    let game = newGame();

    // Win on first guess
    const { game: g1 } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    game = g1;

    const { accepted } = simulateSkip(game);
    expect(accepted).toBe(false);
  });

  it('mixed skips and guesses work correctly', () => {
    let game = newGame();

    // Skip, wrong, skip, correct
    const { game: g1 } = simulateSkip(game);
    game = g1;
    expect(game.result.status).toBe('IN_PROGRESS');

    const { game: g2 } = simulateGuess(
      game,
      'wrong-1',
      'Wrong Album',
      CORRECT_ALBUM_ID
    );
    game = g2;
    expect(game.result.status).toBe('IN_PROGRESS');

    const { game: g3 } = simulateSkip(game);
    game = g3;
    expect(game.result.status).toBe('IN_PROGRESS');

    const { game: g4 } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    game = g4;

    expect(game.guesses).toHaveLength(4);
    expect(game.result.status).toBe('WON');
    expect(game.guesses[0].isSkipped).toBe(true);
    expect(game.guesses[1].isSkipped).toBe(false);
    expect(game.guesses[2].isSkipped).toBe(true);
    expect(game.guesses[3].isCorrect).toBe(true);
  });
});

describe('Archive game mode', () => {
  const CORRECT_ALBUM_ID = 'archive-correct-uuid';

  it('archive game uses the same logic as daily', () => {
    // The difference between daily and archive is only in the hook layer
    // (which query is used, which mode is sent to the server).
    // The client-side game logic is identical.
    let game = newGame();

    const { game: g1 } = simulateGuess(
      game,
      'wrong-1',
      'Wrong Album 1',
      CORRECT_ALBUM_ID
    );
    game = g1;
    expect(game.result.status).toBe('IN_PROGRESS');

    const { game: g2 } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct Album',
      CORRECT_ALBUM_ID
    );
    game = g2;
    expect(game.result.status).toBe('WON');
    expect(game.guesses).toHaveLength(2);
  });

  it('game result data is suitable for server submission', () => {
    let game = newGame();

    const { game: g1 } = simulateGuess(
      game,
      'wrong-1',
      'Wrong',
      CORRECT_ALBUM_ID
    );
    game = g1;
    const { game: g2 } = simulateGuess(
      game,
      CORRECT_ALBUM_ID,
      'Correct',
      CORRECT_ALBUM_ID
    );
    game = g2;

    // Verify the data shape matches what submitGameResult expects
    expect(game.result.gameOver).toBe(true);
    expect(game.result.won).toBe(true);
    expect(game.guesses).toHaveLength(2);

    // Each guess has the fields needed for GameResultGuessInput
    for (const guess of game.guesses) {
      expect(guess).toHaveProperty('guessNumber');
      expect(guess).toHaveProperty('albumId');
      expect(guess).toHaveProperty('albumTitle');
      expect(guess).toHaveProperty('isCorrect');
      expect(guess).toHaveProperty('isSkipped');
      expect(typeof guess.guessNumber).toBe('number');
      expect(typeof guess.isCorrect).toBe('boolean');
      expect(typeof guess.isSkipped).toBe('boolean');
    }
  });
});

describe('Edge cases', () => {
  it('game with maxAttempts = 1 ends immediately', () => {
    const guesses: ClientGuess[] = [
      {
        guessNumber: 1,
        albumId: 'wrong',
        albumTitle: 'Wrong',
        artistName: 'Artist',
        isCorrect: false,
        isSkipped: false,
      },
    ];

    const result = getGameResult(guesses, 1);
    expect(result.status).toBe('LOST');
    expect(result.gameOver).toBe(true);

    expect(isGameOver(guesses, 1)).toBe(true);
  });

  it('handles guesses that exceed max attempts gracefully', () => {
    // If somehow guesses array has more than maxAttempts,
    // the game should still be over
    const guesses: ClientGuess[] = [];
    for (let i = 1; i <= 6; i++) {
      guesses.push({
        guessNumber: i,
        albumId: `wrong-${i}`,
        albumTitle: `Wrong ${i}`,
        artistName: 'Artist',
        isCorrect: false,
        isSkipped: false,
      });
    }

    expect(isGameOver(guesses)).toBe(true);
    expect(getGameResult(guesses).status).toBe('LOST');
  });

  it('correct guess at position > maxAttempts still registers as WON', () => {
    // Edge case: if guesses array somehow exceeds max with a correct guess
    const guesses: ClientGuess[] = [];
    for (let i = 1; i <= 5; i++) {
      guesses.push({
        guessNumber: i,
        albumId: `wrong-${i}`,
        albumTitle: `Wrong ${i}`,
        artistName: 'Artist',
        isCorrect: false,
        isSkipped: false,
      });
    }
    guesses.push({
      guessNumber: 6,
      albumId: 'correct',
      albumTitle: 'Correct',
      artistName: 'Artist',
      isCorrect: true,
      isSkipped: false,
    });

    // WON takes priority over count
    expect(getGameResult(guesses).status).toBe('WON');
  });
});
