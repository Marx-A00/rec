import seedrandom from 'seedrandom';

/**
 * Creates a seeded pseudo-random number generator.
 * Given the same seed, always produces the same sequence of numbers.
 *
 * @param seed - Seed string (e.g., "uncover-{challengeId}")
 * @returns A function that returns a number in [0, 1) each time it's called
 */
export function createSeededRng(seed: string): () => number {
  return seedrandom(seed);
}

/**
 * Performs an unbiased Fisher-Yates shuffle using a provided RNG.
 * Does NOT mutate the original array — returns a new shuffled copy.
 *
 * @param array - The array to shuffle
 * @param rng - A function returning a number in [0, 1) (from createSeededRng)
 * @returns A new array with elements in shuffled order
 */
export function fisherYatesShuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
