import { Metadata } from 'next';

import { UncoverGame } from '@/components/uncover/UncoverGame';

export const metadata: Metadata = {
  title: 'Play | Uncover',
  description: 'Guess the album from the revealed cover art',
};

/**
 * Desktop game play route for Uncover daily challenge.
 * This is where the actual gameplay happens.
 *
 * Uses fixed positioning to escape document flow and fill viewport
 * below TopBar (h-16 + 1px border = 65px) with sidebar offset (md:ml-16).
 * Path: /game/play
 */
export default function GamePlayPage() {
  return <UncoverGame />;
}
