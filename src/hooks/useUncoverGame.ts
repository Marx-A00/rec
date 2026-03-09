'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

import { useUncoverGameStore } from '@/stores/useUncoverGameStore';
import type { Guess } from '@/stores/useUncoverGameStore';
import {
  useDailyPuzzleQuery,
  useArchivePuzzleQuery,
  useSubmitGameResultMutation,
  useMyUncoverSessionsQuery,
  UncoverGameMode,
} from '@/generated/graphql';
import { TOTAL_STAGES } from '@/lib/uncover/reveal-constants';
import {
  isCorrectGuess,
  getGameResult,
  isDuplicateGuess,
  MAX_ATTEMPTS,
  type ClientGuess,
} from '@/lib/uncover/client-game-logic';

export interface UseUncoverGameOptions {
  mode: 'daily' | 'archive';
  challengeDate?: Date; // required when mode === 'archive'
}

/**
 * Unified coordination hook for Uncover game (daily + archive).
 *
 * - Puzzle data (including correct answer) loads upfront via query
 * - Guesses are validated instantly on the client
 * - Server is notified once at game end (fire-and-forget)
 * - Failed submissions are retried on next mount
 *
 * Call with no args for daily mode: `useUncoverGame()`
 * Call with options for archive:    `useUncoverGame({ mode: 'archive', challengeDate })`
 */
export function useUncoverGame(options?: UseUncoverGameOptions) {
  const mode = options?.mode ?? 'daily';
  const challengeDate = options?.challengeDate;
  const isArchive = mode === 'archive';

  const { data: session, status: authStatus } = useSession();
  const gameStore = useUncoverGameStore();
  const queryClient = useQueryClient();

  const [localError, setLocalError] = useState<string | null>(null);
  const hasReset = useRef(false);
  const retryAttempted = useRef(false);

  // ISO date string for archive store persistence
  const dateString = challengeDate?.toISOString() ?? null;

  // Fetch puzzle data — daily or archive based on mode
  const dailyQuery = useDailyPuzzleQuery(
    {},
    { enabled: !isArchive && authStatus === 'authenticated' }
  );
  const archiveQuery = useArchivePuzzleQuery(
    { date: challengeDate! },
    { enabled: isArchive && authStatus === 'authenticated' && !!challengeDate }
  );

  const puzzleQuery = isArchive ? archiveQuery : dailyQuery;
  const puzzle = isArchive
    ? archiveQuery.data?.archivePuzzle
    : dailyQuery.data?.dailyPuzzle;

  const submitResultMutation = useSubmitGameResultMutation();
  const correctAlbumId = puzzle?.correctAlbumId ?? null;

  // Archive: reset shared store on mount so stale daily-game state doesn't interfere
  useEffect(() => {
    if (isArchive && !hasReset.current) {
      gameStore.resetSession();
      gameStore.clearGuesses();
      gameStore.clearError();
      hasReset.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Submit result to server (fire-and-forget) -----

  const submitResultToServer = useCallback(
    async (
      challengeId: string,
      guesses: Guess[],
      won: boolean,
      attemptCount: number
    ) => {
      try {
        gameStore.setSubmitting(true);

        const guessInputs = guesses.map((g, i) => ({
          guessNumber: g.guessNumber ?? i + 1,
          albumId: g.guessedAlbumId ?? null,
          albumTitle: g.guessedText ?? null,
          artistName: null as string | null,
          isCorrect: g.isCorrect,
          isSkipped: !g.guessedText && !g.guessedAlbumId,
        }));

        await submitResultMutation.mutateAsync({
          input: {
            challengeId,
            guesses: guessInputs,
            won,
            attemptCount,
            mode: isArchive ? UncoverGameMode.Archive : UncoverGameMode.Daily,
          },
        });

        gameStore.markResultSubmitted();

        // Archive: invalidate calendar query so it shows the new completion
        if (isArchive) {
          queryClient.invalidateQueries({
            queryKey: useMyUncoverSessionsQuery.getKey(),
          });
        }
      } catch (error) {
        console.error(
          `[useUncoverGame:${mode}] Failed to submit result to server:`,
          error
        );
        // Don't mark as submitted — will retry on next mount
      } finally {
        gameStore.setSubmitting(false);
      }
    },
    [gameStore, submitResultMutation, isArchive, mode, queryClient]
  );

  // ----- Retry failed submissions on mount -----

  useEffect(() => {
    if (retryAttempted.current) return;

    const {
      challengeId,
      status,
      resultSubmitted,
      guesses,
      won,
      attemptCount,
      mode: storeMode,
    } = gameStore;

    if (
      challengeId &&
      (status === 'WON' || status === 'LOST') &&
      !resultSubmitted &&
      // Archive: only retry if store mode matches
      (!isArchive || storeMode === 'archive')
    ) {
      retryAttempted.current = true;
      submitResultToServer(challengeId, guesses, won, attemptCount);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Start game -----

  const startGame = useCallback(async () => {
    try {
      gameStore.clearError();
      setLocalError(null);

      // Wait for puzzle data if not yet loaded
      let puzzleData = puzzle;
      if (!puzzleData) {
        if (isArchive) {
          const result = await archiveQuery.refetch();
          puzzleData = result.data?.archivePuzzle;
        } else {
          const result = await dailyQuery.refetch();
          puzzleData = result.data?.dailyPuzzle;
        }
      }

      if (!puzzleData) {
        throw new Error(
          isArchive
            ? 'No puzzle available for this date'
            : 'No puzzle available'
        );
      }

      // Check if server has an existing completed result
      if (puzzleData.existingResult) {
        const existing = puzzleData.existingResult;

        gameStore.setSession({
          id: crypto.randomUUID(),
          challengeId: puzzleData.challengeId,
          mode,
          ...(isArchive && dateString ? { archiveDate: dateString } : {}),
        });

        // Restore guesses from server
        gameStore.clearGuesses();
        existing.guesses.forEach(g => {
          gameStore.addGuess({
            guessNumber: g.guessNumber,
            guessedText: g.albumTitle ?? null,
            isCorrect: g.isCorrect,
            guessedAlbumId: g.albumId ?? undefined,
          });
        });

        gameStore.updateAttemptCount(existing.attemptCount);
        gameStore.endSession(existing.won);
        gameStore.markResultSubmitted();

        return {
          imageUrl: puzzleData.imageUrl ?? '',
          cloudflareImageId: puzzleData.cloudflareImageId ?? undefined,
        };
      }

      // Daily: check if localStorage has an in-progress session for this challenge
      if (
        !isArchive &&
        gameStore.challengeId === puzzleData.challengeId &&
        gameStore.status === 'IN_PROGRESS' &&
        gameStore.sessionId
      ) {
        // Resume existing session — store already has the state
        return {
          imageUrl: puzzleData.imageUrl ?? '',
          cloudflareImageId: puzzleData.cloudflareImageId ?? undefined,
        };
      }

      // Fresh session
      gameStore.setSession({
        id: crypto.randomUUID(),
        challengeId: puzzleData.challengeId,
        mode,
        ...(isArchive && dateString ? { archiveDate: dateString } : {}),
      });
      gameStore.clearGuesses();
      gameStore.updateAttemptCount(0);

      return {
        imageUrl: puzzleData.imageUrl ?? '',
        cloudflareImageId: puzzleData.cloudflareImageId ?? undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start game';
      gameStore.setError(errorMessage);
      setLocalError(errorMessage);
      // Daily: re-throw so component can catch; Archive: return null
      if (isArchive) return null;
      throw error;
    }
  }, [gameStore, puzzle, puzzleQuery, mode, isArchive, dateString]);

  // ----- Submit guess (instant) -----

  const submitGuess = useCallback(
    async (guessText: string, localAlbumId?: string) => {
      if (!gameStore.sessionId || !gameStore.challengeId) {
        throw new Error('No active session');
      }
      if (!correctAlbumId) {
        throw new Error('Puzzle data not loaded');
      }

      gameStore.clearError();
      setLocalError(null);

      // Check for duplicate
      if (localAlbumId) {
        const clientGuesses: ClientGuess[] = gameStore.guesses.map(g => ({
          guessNumber: g.guessNumber,
          albumId: g.guessedAlbumId ?? null,
          albumTitle: g.guessedText,
          artistName: null,
          isCorrect: g.isCorrect,
          isSkipped: !g.guessedText && !g.guessedAlbumId,
        }));

        if (isDuplicateGuess(localAlbumId, clientGuesses)) {
          const msg = 'You have already guessed this album';
          gameStore.setError(msg);
          setLocalError(msg);
          return { isCorrect: false, gameOver: false, won: false };
        }
      }

      // Check correctness instantly
      const correct = localAlbumId
        ? isCorrectGuess(localAlbumId, correctAlbumId)
        : false;

      const newGuessNumber = gameStore.guesses.length + 1;

      // Add guess to store
      gameStore.addGuess({
        guessNumber: newGuessNumber,
        guessedText: guessText,
        isCorrect: correct,
        guessedAlbumId: localAlbumId,
      });

      const newAttemptCount = gameStore.attemptCount + 1;
      gameStore.updateAttemptCount(newAttemptCount);

      // Calculate game result
      const updatedGuesses: ClientGuess[] = [
        ...gameStore.guesses.map(g => ({
          guessNumber: g.guessNumber,
          albumId: g.guessedAlbumId ?? null,
          albumTitle: g.guessedText,
          artistName: null,
          isCorrect: g.isCorrect,
          isSkipped: !g.guessedText && !g.guessedAlbumId,
        })),
        {
          guessNumber: newGuessNumber,
          albumId: localAlbumId ?? null,
          albumTitle: guessText,
          artistName: null,
          isCorrect: correct,
          isSkipped: false,
        },
      ];

      const result = getGameResult(updatedGuesses, MAX_ATTEMPTS);

      if (result.gameOver) {
        gameStore.endSession(result.won);

        // Build the complete guess list including the one we just added.
        // We can't rely on gameStore.guesses here because the Zustand
        // snapshot in this closure may be stale (missing the latest guess).
        const allGuesses: Guess[] = [
          ...gameStore.guesses.filter(g => g.guessNumber !== newGuessNumber),
          {
            guessNumber: newGuessNumber,
            guessedText: guessText,
            isCorrect: correct,
            guessedAlbumId: localAlbumId,
          },
        ];

        submitResultToServer(
          gameStore.challengeId,
          allGuesses,
          result.won,
          newAttemptCount
        );
      }

      return {
        isCorrect: correct,
        gameOver: result.gameOver,
        won: result.won,
      };
    },
    [gameStore, correctAlbumId, submitResultToServer]
  );

  // ----- Skip guess (instant) -----

  const skipGuess = useCallback(async () => {
    if (!gameStore.sessionId || !gameStore.challengeId) {
      throw new Error('No active session');
    }

    gameStore.clearError();
    setLocalError(null);

    const newGuessNumber = gameStore.guesses.length + 1;

    // Add skip to store
    gameStore.addGuess({
      guessNumber: newGuessNumber,
      guessedText: null,
      isCorrect: false,
    });

    const newAttemptCount = gameStore.attemptCount + 1;
    gameStore.updateAttemptCount(newAttemptCount);

    // Calculate game result
    const updatedGuesses: ClientGuess[] = [
      ...gameStore.guesses.map(g => ({
        guessNumber: g.guessNumber,
        albumId: g.guessedAlbumId ?? null,
        albumTitle: g.guessedText,
        artistName: null,
        isCorrect: g.isCorrect,
        isSkipped: !g.guessedText && !g.guessedAlbumId,
      })),
      {
        guessNumber: newGuessNumber,
        albumId: null,
        albumTitle: null,
        artistName: null,
        isCorrect: false,
        isSkipped: true,
      },
    ];

    const result = getGameResult(updatedGuesses, MAX_ATTEMPTS);

    if (result.gameOver) {
      gameStore.endSession(result.won);

      // Build complete guess list — same stale-closure fix as submitGuess
      const allGuesses: Guess[] = [
        ...gameStore.guesses.filter(g => g.guessNumber !== newGuessNumber),
        {
          guessNumber: newGuessNumber,
          guessedText: null,
          isCorrect: false,
        },
      ];

      submitResultToServer(
        gameStore.challengeId,
        allGuesses,
        result.won,
        newAttemptCount
      );
    }

    return { gameOver: result.gameOver };
  }, [gameStore, submitResultToServer]);

  // ----- Reveal stage -----

  const revealStage =
    gameStore.status === 'WON' || gameStore.status === 'LOST'
      ? TOTAL_STAGES
      : Math.min(gameStore.attemptCount + 1, TOTAL_STAGES - 1);

  return {
    // Auth state
    isAuthenticated: !!session?.user,
    isAuthLoading: authStatus === 'loading',
    user: session?.user,

    // Game state from store
    sessionId: gameStore.sessionId,
    challengeId: gameStore.challengeId,
    status: gameStore.status,
    attemptCount: gameStore.attemptCount,
    won: gameStore.won,
    guesses: gameStore.guesses,

    // Puzzle data
    correctAlbumId,
    correctAlbumTitle: puzzle?.correctAlbumTitle ?? null,
    correctAlbumArtist: puzzle?.correctAlbumArtist ?? null,

    // UI state
    isSubmitting: gameStore.isSubmitting,
    isPuzzleLoading: puzzleQuery.isLoading,
    error: gameStore.error || localError,

    // Computed values
    revealStage,
    isGameOver: gameStore.status === 'WON' || gameStore.status === 'LOST',

    // Actions
    startGame,
    submitGuess,
    skipGuess,
    resetGame: gameStore.resetSession,
    clearError: () => {
      gameStore.clearError();
      setLocalError(null);
    },
  };
}
