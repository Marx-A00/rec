import { Metadata } from 'next';

import { DesktopHomeClient } from './DesktopHomeClient';

export const metadata: Metadata = {
  title: 'Uncover | Daily Album Challenge',
  description:
    'Guess the album from its cover art. 4 attempts. New puzzle daily.',
};

/**
 * Desktop home/landing page for the Uncover game.
 * Shows teaser image, play button, and archive link.
 * Clicking Play navigates to /game/play where the game auto-starts.
 *
 * Path: /game
 */
export default function GamePage() {
  return <DesktopHomeClient />;
}
