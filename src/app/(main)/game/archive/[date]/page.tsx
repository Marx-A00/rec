import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parseISO, isBefore, isAfter, isSameDay, format } from 'date-fns';

import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';
import { ArchiveGame } from '@/components/uncover/ArchiveGame';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { date } = await params;

  try {
    const parsedDate = parseISO(date);
    const formattedDate = format(parsedDate, 'MMMM d, yyyy');

    return {
      title: `Archive - ${formattedDate} | Uncover`,
      description: `Play the daily album art challenge from ${formattedDate}`,
    };
  } catch {
    return {
      title: 'Archive | Uncover',
      description: 'Play past daily album art challenges',
    };
  }
}

export default async function ArchiveGamePage({ params }: PageProps) {
  const { date } = await params;

  // Validate date format
  let parsedDate: Date;
  try {
    parsedDate = parseISO(date);
    if (isNaN(parsedDate.getTime())) {
      notFound();
    }
  } catch {
    notFound();
  }

  const normalizedDate = toUTCMidnight(parsedDate);
  const today = toUTCMidnight(new Date());

  // Validate date range: must be >= GAME_EPOCH and < today (strictly less than)
  if (
    isBefore(normalizedDate, GAME_EPOCH) ||
    isAfter(normalizedDate, today) ||
    isSameDay(normalizedDate, today)
  ) {
    notFound();
  }

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <ArchiveGame challengeDate={normalizedDate} mobile={false} />
    </div>
  );
}
