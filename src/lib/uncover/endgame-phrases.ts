/**
 * Rotating phrases shown at end of an Uncover game.
 * Add new ones to the end of each list.
 */

const WIN_PHRASES = ['You got it!'] as const;

const LOSS_PHRASES = [
  "Sorry, this ain't Kidz Bop",
  'Better luck tomorrow',
  `Sorry, we don't think Fantano reviewed this one`,
  'Better luck next time',
] as const;

/**
 * Pick a deterministic phrase for a given daily challenge date,
 * or a random one for practice mode.
 */
function pick(phrases: readonly string[], dailyDate?: string): string {
  if (dailyDate) {
    let hash = 0;
    for (let i = 0; i < dailyDate.length; i++) {
      hash = (hash * 31 + dailyDate.charCodeAt(i)) | 0;
    }
    return phrases[Math.abs(hash) % phrases.length];
  }
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function getWinPhrase(dailyDate?: string): string {
  return pick(WIN_PHRASES, dailyDate);
}

export function getLossPhrase(dailyDate?: string): string {
  return pick(LOSS_PHRASES, dailyDate);
}
