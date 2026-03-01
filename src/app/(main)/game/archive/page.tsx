import type { Metadata } from 'next';

import { ArchiveCalendar } from '@/components/uncover/ArchiveCalendar';

export const metadata: Metadata = {
  title: 'Archive Calendar | Uncover',
  description: 'Browse and play past daily album art challenges',
};

export default function ArchivePage() {
  return (
    <div className='flex h-full flex-col items-center px-4 py-8'>
      <ArchiveCalendar />
    </div>
  );
}
