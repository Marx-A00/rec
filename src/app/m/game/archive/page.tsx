import type { Metadata } from 'next';
import { ArchiveCalendar } from '@/components/uncover/ArchiveCalendar';

export const metadata: Metadata = {
  title: 'Archive Calendar | Uncover',
  description: 'Browse and play past daily album art challenges',
};

export default function MobileArchivePage() {
  return (
    <div className="px-4 py-6">
      <ArchiveCalendar mobile />
    </div>
  );
}
