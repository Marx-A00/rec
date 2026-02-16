/**
 * Game Service
 * 
 * Server-side business logic for Uncover game.
 * Enforces all game rules and validation.
 */

import type { PrismaClient, UncoverSession, UncoverGuess } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
  validateGuess,
  validateSkip,
  calculateGameResult,
} from './game-validation';
import { getOrCreateDailyChallenge } from '@/lib/daily-challenge/challenge-service';

// ----- Types -----

interface SessionWithGuesses extends UncoverSession {
  guesses: UncoverGuess[];
}

interface ChallengeWithAlbum {
  id: string;
  date: Date;
  albumId: string;
  maxAttempts: number;
  totalPlays: number;
  totalWins: number;
  avgAttempts: number | null;
  album: {
    id: string;
    title: string;
    cloudflareImageId: string | null;
    artists: Array<{
      artist: {
        id: string;
        name: string;
      };
    }>;
  };
}

interface StartSessionResult {
  session: SessionWithGuesses;
  challenge: ChallengeWithAlbum;
  isNew: boolean;
}

interface GuessedAlbumInfo {
  id: string;
  title: string;
  cloudflareImageId: string | null;
  artistName: string;
}

interface GuessWithAlbum {
  id: string;
  guessNumber: number;
  isCorrect: boolean;
  guessedAt: Date;
  guessedAlbumId: string | null;
  guessedAlbum: GuessedAlbumInfo | null;
}

interface SubmitGuessResult {
  guess: GuessWithAlbum;
  session: SessionWithGuesses;
  gameOver: boolean;
  correctAlbum: GuessedAlbumInfo | null;
}

interface SkipGuessResult {
  guess: GuessWithAlbum;
  session: SessionWithGuesses;
  gameOver: boolean;
  correctAlbum: GuessedAlbumInfo | null;
}

// ----- Service Functions -----

/**
 * Start a session for today's challenge.
 * Returns existing session if already started (no replay).
 */
export async function startSession(
  userId: string,
  prisma: PrismaClient
): Promise<StartSessionResult> {
  // Get today's challenge (creates if doesn't exist)
  const challenge = await getOrCreateDailyChallenge();

  // Check for existing session
  const existingSession = await prisma.uncoverSession.findUnique({
    where: {
      challengeId_userId: {
        challengeId: challenge.id,
        userId,
      },
    },
    include: {
      guesses: {
        orderBy: { guessNumber: 'asc' },
      },
    },
  });

  if (existingSession) {
    return {
      session: existingSession,
      challenge: challenge as ChallengeWithAlbum,
      isNew: false,
    };
  }

  // Create new session
  const newSession = await prisma.uncoverSession.create({
    data: {
      userId,
      challengeId: challenge.id,
      status: 'IN_PROGRESS',
      attemptCount: 0,
      won: false,
    },
    include: {
      guesses: {
        orderBy: { guessNumber: 'asc' },
      },
    },
  });

  // Increment challenge totalPlays
  await prisma.uncoverChallenge.update({
    where: { id: challenge.id },
    data: {
      totalPlays: { increment: 1 },
    },
  });

  return {
    session: newSession,
    challenge: challenge as ChallengeWithAlbum,
    isNew: true,
  };
}

/**
 * Submit a guess for a session.
 * Validates ownership, game rules, and updates state.
 */
export async function submitGuess(
  sessionId: string,
  albumId: string,
  userId: string,
  prisma: PrismaClient
): Promise<SubmitGuessResult> {
  // Fetch session with challenge and guesses
  const session = await prisma.uncoverSession.findUnique({
    where: { id: sessionId },
    include: {
      challenge: {
        include: {
          album: {
            select: {
              id: true,
              title: true,
              cloudflareImageId: true,
              artists: {
                select: {
                  artist: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      guesses: {
        orderBy: { guessNumber: 'asc' },
      },
    },
  });

  if (!session) {
    throw new GraphQLError('Session not found');
  }

  // Validate user owns this session
  if (session.userId !== userId) {
    throw new GraphQLError('You do not own this session');
  }

  // Validate guess using game-validation
  const validation = validateGuess(
    session,
    albumId,
    session.challenge.maxAttempts
  );

  if (!validation.valid) {
    throw new GraphQLError(validation.error || 'Invalid guess');
  }

  // Check if guess is correct
  const isCorrect = albumId === session.challenge.albumId;
  const newAttemptCount = session.attemptCount + 1;

  // Calculate game result
  const gameResult = calculateGameResult(
    session,
    isCorrect,
    newAttemptCount,
    session.challenge.maxAttempts
  );

  // Fetch guessed album info
  const guessedAlbum = await prisma.album.findUnique({
    where: { id: albumId },
    select: {
      id: true,
      title: true,
      cloudflareImageId: true,
      artists: {
        select: {
          artist: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!guessedAlbum) {
    throw new GraphQLError('Guessed album not found');
  }

  // Create guess record
  const guess = await prisma.uncoverGuess.create({
    data: {
      sessionId: session.id,
      guessedAlbumId: albumId,
      guessNumber: newAttemptCount,
      isCorrect,
    },
  });

  // Update session
  const updatedSession = await prisma.uncoverSession.update({
    where: { id: sessionId },
    data: {
      attemptCount: newAttemptCount,
      status: gameResult.status,
      won: isCorrect,
      completedAt: gameResult.gameOver ? new Date() : null,
    },
    include: {
      guesses: {
        orderBy: { guessNumber: 'asc' },
      },
    },
  });

  // If game over with win, update challenge stats
  if (gameResult.gameOver && isCorrect) {
    const currentChallenge = await prisma.uncoverChallenge.findUnique({
      where: { id: session.challenge.id },
    });

    if (currentChallenge) {
      const newTotalWins = currentChallenge.totalWins + 1;
      const currentAvg = currentChallenge.avgAttempts || 0;
      const currentWins = currentChallenge.totalWins;
      
      // Calculate new average: (oldAvg * oldCount + newAttempts) / newCount
      const newAvgAttempts =
        currentWins === 0
          ? newAttemptCount
          : (currentAvg * currentWins + newAttemptCount) / newTotalWins;

      await prisma.uncoverChallenge.update({
        where: { id: session.challenge.id },
        data: {
          totalWins: newTotalWins,
          avgAttempts: newAvgAttempts,
        },
      });
    }
  }

  // Format guessed album info
  const guessedAlbumInfo: GuessedAlbumInfo = {
    id: guessedAlbum.id,
    title: guessedAlbum.title,
    cloudflareImageId: guessedAlbum.cloudflareImageId,
    artistName: guessedAlbum.artists[0]?.artist.name || 'Unknown Artist',
  };

  // Get correct album info (only if game over)
  let correctAlbumInfo: GuessedAlbumInfo | null = null;
  if (gameResult.gameOver) {
    correctAlbumInfo = {
      id: session.challenge.album.id,
      title: session.challenge.album.title,
      cloudflareImageId: session.challenge.album.cloudflareImageId,
      artistName:
        session.challenge.album.artists[0]?.artist.name || 'Unknown Artist',
    };
  }

  return {
    guess: {
      id: guess.id,
      guessNumber: guess.guessNumber,
      isCorrect: guess.isCorrect,
      guessedAt: guess.guessedAt,
      guessedAlbumId: guess.guessedAlbumId,
      guessedAlbum: guessedAlbumInfo,
    },
    session: updatedSession,
    gameOver: gameResult.gameOver,
    correctAlbum: correctAlbumInfo,
  };
}

/**
 * Skip a guess (counts as wrong).
 * Advances game state without submitting an album.
 */
export async function skipGuess(
  sessionId: string,
  userId: string,
  prisma: PrismaClient
): Promise<SkipGuessResult> {
  // Fetch session with challenge and guesses
  const session = await prisma.uncoverSession.findUnique({
    where: { id: sessionId },
    include: {
      challenge: {
        include: {
          album: {
            select: {
              id: true,
              title: true,
              cloudflareImageId: true,
              artists: {
                select: {
                  artist: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      guesses: {
        orderBy: { guessNumber: 'asc' },
      },
    },
  });

  if (!session) {
    throw new GraphQLError('Session not found');
  }

  // Validate user owns this session
  if (session.userId !== userId) {
    throw new GraphQLError('You do not own this session');
  }

  // Validate skip using game-validation
  const validation = validateSkip(session, session.challenge.maxAttempts);

  if (!validation.valid) {
    throw new GraphQLError(validation.error || 'Invalid skip');
  }

  const newAttemptCount = session.attemptCount + 1;

  // Calculate game result (skip is always wrong)
  const gameResult = calculateGameResult(
    session,
    false, // isCorrect = false for skip
    newAttemptCount,
    session.challenge.maxAttempts
  );

  // Create guess record with null guessedAlbumId (indicates skip)
  const guess = await prisma.uncoverGuess.create({
    data: {
      sessionId: session.id,
      guessedAlbumId: null,
      guessNumber: newAttemptCount,
      isCorrect: false,
    },
  });

  // Update session
  const updatedSession = await prisma.uncoverSession.update({
    where: { id: sessionId },
    data: {
      attemptCount: newAttemptCount,
      status: gameResult.status,
      won: false,
      completedAt: gameResult.gameOver ? new Date() : null,
    },
    include: {
      guesses: {
        orderBy: { guessNumber: 'asc' },
      },
    },
  });

  // Get correct album info (only if game over)
  let correctAlbumInfo: GuessedAlbumInfo | null = null;
  if (gameResult.gameOver) {
    correctAlbumInfo = {
      id: session.challenge.album.id,
      title: session.challenge.album.title,
      cloudflareImageId: session.challenge.album.cloudflareImageId,
      artistName:
        session.challenge.album.artists[0]?.artist.name || 'Unknown Artist',
    };
  }

  return {
    guess: {
      id: guess.id,
      guessNumber: guess.guessNumber,
      isCorrect: false,
      guessedAt: guess.guessedAt,
      guessedAlbumId: null,
      guessedAlbum: null,
    },
    session: updatedSession,
    gameOver: gameResult.gameOver,
    correctAlbum: correctAlbumInfo,
  };
}
