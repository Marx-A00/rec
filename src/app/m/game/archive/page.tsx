import type { Metadata } from 'next';

import { ArchiveCalendar } from '@/components/uncover/ArchiveCalendar';

export const metadata: Metadata = {
  title: 'Archive Calendar | Uncover',
  description: 'Browse and play past daily album art challenges',
};

export default function MobileArchivePage() {
  return (
    <div className='flex h-full flex-col items-center overflow-y-auto px-4 py-6'>
      <p className='mb-6 text-center text-sm text-zinc-400'>
        Play past daily challenges you missed
      </p>
      <div className='w-full'>
        <ArchiveCalendar mobile />
      </div>
    </div>
  );
}
