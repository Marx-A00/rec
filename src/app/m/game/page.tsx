import { Metadata } from 'next';

import { MobileHomeClient } from './MobileHomeClient';

export const metadata: Metadata = {
  title: 'Uncover | Daily Album Challenge',
  description:
    'Guess the album from its cover art. 4 attempts. New puzzle daily.',
};

/**
 * Mobile home/landing page for the Uncover game.
 * Shows teaser image, play button, and archive link.
 *
 * Path: /m/game
 */
export default function MobileGamePage() {
  return <MobileHomeClient />;
}
