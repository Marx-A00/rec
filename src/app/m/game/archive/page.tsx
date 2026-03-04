import type { Metadata } from 'next';

import { ArchiveCalendar } from '@/components/uncover/ArchiveCalendar';

export const metadata: Metadata = {
  title: 'Archive Calendar | Uncover',
  description: 'Browse and play past daily album art challenges',
};

export default function MobileArchivePage() {
  return (
    <div className='flex flex-col items-center px-4 py-6'>
      <h1 className='mb-4 text-2xl font-bold text-white'>Archive</h1>
      <p className='mb-6 text-center text-sm text-zinc-400'>
        Play past daily challenges you missed
      </p>
      <div className='w-full'>
        <ArchiveCalendar mobile />
      </div>
    </div>
  );
}
