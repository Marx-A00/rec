import { Metadata } from 'next';

import { UncoverGame } from '@/components/uncover/UncoverGame';

export const metadata: Metadata = {
  title: 'Daily Challenge | Uncover',
  description: 'Guess the album from the revealed cover art',
};

/**
 * Desktop game route for Uncover daily challenge.
 *
 * Server component that renders the UncoverGame client component.
 */
export default function GamePage() {
  return (
    <div className='container mx-auto max-w-4xl py-8'>
      <UncoverGame />
    </div>
  );
}
