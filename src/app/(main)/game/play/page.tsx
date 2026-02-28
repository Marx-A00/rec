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
 * Path: /game/play
 */
export default function GamePlayPage() {
  return (
    <div className='container mx-auto max-w-4xl py-8'>
      <UncoverGame />
    </div>
  );
}
