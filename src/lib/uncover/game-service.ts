/**
 * Game Service
 *
 * Server-side business logic for Uncover game.
 * Enforces all game rules and validation.
 */

import type {
  PrismaClient,
  UncoverSession,
  UncoverGuess,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';

import {
  getLatestChallenge,
  getChallengeByDate,
} from '@/lib/daily-challenge/challenge-service';

import { updatePlayerStats } from './stats-service';
import { updateArchiveStats } from './archive-stats-service';
import {
  validateGuess,
  validateSkip,
  calculateGameResult,
} from './game-validation';

// ----- Constants -----

/** Shared Prisma include for session guesses with album data */
const GUESSES_INCLUDE = {
  guesses: {
    orderBy: { guessNumber: 'asc' as const },
    include: {
      guessedAlbum: {
        select: {
          id: true,
          title: true,
          cloudflareImageId: true,
          artists: {
            select: { artist: { select: { name: true } } },
            take: 1,
          },
        },
      },
    },
  },
};

// ----- Types -----

interface GuessWithAlbumRelation extends UncoverGuess {
  guessedAlbum: {
    id: string;
    title: string;
    cloudflareImageId: string | null;
    artists: Array<{ artist: { name: string } }>;
  } | null;
}

interface SessionWithGuesses extends UncoverSession {
  guesses: GuessWithAlbumRelation[];
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
 * Start a session for the current challenge.
 * Uses the most recent challenge created by the scheduler.
 * Returns existing session if already started (no replay).
 */
export async function startSession(
  userId: string,
  prisma: PrismaClient
): Promise<StartSessionResult> {
  // Get the most recent challenge (created by the scheduler)
  const challenge = await getLatestChallenge();

  if (!challenge) {
    throw new GraphQLError('No challenge available yet');
  }

  // Check for existing session
  const existingSession = await prisma.uncoverSession.findUnique({
    where: {
      challengeId_userId: {
        challengeId: challenge.id,
        userId,
      },
    },
    include: GUESSES_INCLUDE,
  });

  if (existingSession) {
    return {
      session: existingSession,
      challenge: challenge as ChallengeWithAlbum,
      isNew: false,
    };
  }

  // Create new session - handle race condition where another request
  // created the session between our findUnique and create calls
  try {
    const newSession = await prisma.uncoverSession.create({
      data: {
        userId,
        challengeId: challenge.id,
        status: 'IN_PROGRESS',
        attemptCount: 0,
        won: false,
      },
      include: GUESSES_INCLUDE,
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
  } catch (error) {
    // Handle race condition: another request created the session first
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const raceSession = await prisma.uncoverSession.findUnique({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId,
          },
        },
        include: GUESSES_INCLUDE,
      });

      if (raceSession) {
        return {
          session: raceSession,
          challenge: challenge as ChallengeWithAlbum,
          isNew: false,
        };
      }
    }
    throw error;
  }
}

/**
 * Start a session for an archive challenge (specific date).
 * Returns existing session if already started for this date.
 * Does NOT create challenges — only looks up existing ones.
 */
export async function startArchiveSession(
  userId: string,
  challengeDate: Date,
  prisma: PrismaClient
): Promise<StartSessionResult> {
  // Look up the challenge for this date (read-only, no creation)
  const challenge = await getChallengeByDate(challengeDate);

  if (!challenge) {
    throw new GraphQLError('No challenge found for this date');
  }

  // Check for existing session
  const existingSession = await prisma.uncoverSession.findUnique({
    where: {
      challengeId_userId: {
        challengeId: challenge.id,
        userId,
      },
    },
    include: GUESSES_INCLUDE,
  });

  if (existingSession) {
    return {
      session: existingSession,
      challenge: challenge as ChallengeWithAlbum,
      isNew: false,
    };
  }

  // Create new session - handle race condition where another request
  // created the session between our findUnique and create calls
  try {
    const newSession = await prisma.uncoverSession.create({
      data: {
        userId,
        challengeId: challenge.id,
        status: 'IN_PROGRESS',
        attemptCount: 0,
        won: false,
      },
      include: GUESSES_INCLUDE,
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
  } catch (error) {
    // Handle race condition: another request created the session first
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const raceSession = await prisma.uncoverSession.findUnique({
        where: {
          challengeId_userId: {
            challengeId: challenge.id,
            userId,
          },
        },
        include: GUESSES_INCLUDE,
      });

      if (raceSession) {
        return {
          session: raceSession,
          challenge: challenge as ChallengeWithAlbum,
          isNew: false,
        };
      }
    }
    throw error;
  }
}

/**
 * Normalize text for comparison: lowercase, trim, strip diacritics, collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Submit a guess for a session.
 * Validates ownership, game rules, and updates state.
 * Uses text-based comparison instead of album ID matching.
 */
export async function submitGuess(
  sessionId: string,
  guessText: string,
  albumId: string | null,
  userId: string,
  prisma: PrismaClient,
  mode: 'daily' | 'archive' = 'daily'
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

  // Validate guess using game-validation (text-based duplicate check)
  const validation = validateGuess(
    session,
    guessText,
    session.challenge.maxAttempts
  );

  if (!validation.valid) {
    throw new GraphQLError(validation.error || 'Invalid guess');
  }

  // Build expected answer text: "Album Title - Artist Name"
  const expectedArtistName =
    session.challenge.album.artists[0]?.artist.name || '';
  const expectedText = `${session.challenge.album.title} - ${expectedArtistName}`;

  // Compare normalized texts
  const isCorrect = normalizeText(guessText) === normalizeText(expectedText);
  const newAttemptCount = session.attemptCount + 1;

  // Calculate game result
  const gameResult = calculateGameResult(
    session,
    isCorrect,
    newAttemptCount,
    session.challenge.maxAttempts
  );

  // If albumId provided, try to fetch album info for display
  let guessedAlbumInfo: GuessedAlbumInfo | null = null;
  if (albumId) {
    const guessedAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        title: true,
        cloudflareImageId: true,
        artists: {
          select: {
            artist: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    if (guessedAlbum) {
      guessedAlbumInfo = {
        id: guessedAlbum.id,
        title: guessedAlbum.title,
        cloudflareImageId: guessedAlbum.cloudflareImageId,
        artistName: guessedAlbum.artists[0]?.artist.name || 'Unknown Artist',
      };
    }
  }

  // Create guess record with guessedText
  const guess = await prisma.uncoverGuess.create({
    data: {
      sessionId: session.id,
      guessedAlbumId: albumId,
      guessedText: guessText,
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
    include: GUESSES_INCLUDE,
  });

  // Update player stats if game ended
  if (gameResult.gameOver) {
    if (mode === 'daily') {
      await updatePlayerStats(
        {
          userId,
          won: isCorrect,
          attemptCount: newAttemptCount,
          challengeDate: session.challenge.date,
        },
        prisma
      );
    } else {
      await updateArchiveStats(
        {
          userId,
          won: isCorrect,
          attemptCount: newAttemptCount,
        },
        prisma
      );
    }
  }

  // If game over with win, update challenge stats
  if (gameResult.gameOver && isCorrect) {
    const currentChallenge = await prisma.uncoverChallenge.findUnique({
      where: { id: session.challenge.id },
    });

    if (currentChallenge) {
      const newTotalWins = currentChallenge.totalWins + 1;
      const currentAvg = currentChallenge.avgAttempts || 0;
      const currentWins = currentChallenge.totalWins;

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
  prisma: PrismaClient,
  mode: 'daily' | 'archive' = 'daily'
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
    include: GUESSES_INCLUDE,
  });

  // Update player stats if game ended
  // Route to daily or archive stats based on mode
  if (gameResult.gameOver) {
    if (mode === 'daily') {
      // Daily mode: updates streaks (STATS-01 through STATS-05)
      await updatePlayerStats(
        {
          userId,
          won: false, // skip is always a loss
          attemptCount: newAttemptCount,
          challengeDate: session.challenge.date,
        },
        prisma
      );
    } else {
      // Archive mode: no streaks, separate stats (ARCHIVE-03, ARCHIVE-04)
      await updateArchiveStats(
        {
          userId,
          won: false, // skip is always a loss
          attemptCount: newAttemptCount,
        },
        prisma
      );
    }
  }

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
