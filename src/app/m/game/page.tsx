import { Metadata } from 'next';

import { MobileGameClient } from './MobileGameClient';

export const metadata: Metadata = {
  title: 'Daily Challenge | Uncover',
  description: 'Guess the album from the revealed cover art',
};

/**
 * Mobile game route for Uncover daily challenge.
 *
 * Server component that renders the MobileGameClient component.
 * Path: /m/game
 */
export default function MobileGamePage() {
  return <MobileGameClient />;
}
