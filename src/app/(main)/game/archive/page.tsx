import type { Metadata } from 'next';

import { ArchiveCalendar } from '@/components/uncover/ArchiveCalendar';

export const metadata: Metadata = {
  title: 'Archive Calendar | Uncover',
  description: 'Browse and play past daily album art challenges',
};

export default function ArchivePage() {
  return (
    <div className='mx-auto max-w-lg px-4 py-8'>
      <ArchiveCalendar />
    </div>
  );
}
