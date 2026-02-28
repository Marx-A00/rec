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
 * Uses fixed positioning to escape document flow and fill viewport
 * below TopBar (h-16 + 1px border = 65px) with sidebar offset (md:ml-16).
 * Path: /game
 */
export default function GamePage() {
  return (
    <div className='fixed inset-x-0 bottom-0 top-[65px] overflow-hidden md:left-16'>
      <UncoverHome />
    </div>
  );
}
