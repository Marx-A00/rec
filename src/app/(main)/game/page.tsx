import { Metadata } from 'next';

import { UncoverHome } from './UncoverHome';

export const metadata: Metadata = {
  title: 'Uncover | Daily Album Challenge',
  description:
    'Guess the album from its cover art. 6 attempts. New puzzle daily.',
};

/**
 * Desktop home/landing page for the Uncover game.
 * Shows teaser image, play button, and archive link.
 *
 * Path: /game
 */
export default function GamePage() {
  return (
    <div className='container mx-auto max-w-4xl py-8'>
      <UncoverHome />
    </div>
  );
}
