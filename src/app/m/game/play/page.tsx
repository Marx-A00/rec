import { Metadata } from 'next';

import { MobilePlayClient } from './MobilePlayClient';

export const metadata: Metadata = {
  title: 'Play | Uncover',
  description: 'Guess the album from the revealed cover art',
};

/**
 * Mobile game play route for Uncover daily challenge.
 * This is where the actual gameplay happens on mobile.
 *
 * Path: /m/game/play
 */
export default function MobileGamePlayPage() {
  return <MobilePlayClient />;
}
