import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parseISO, isBefore, isAfter, isSameDay, format } from 'date-fns';

import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';

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

  // Placeholder for game component (will be added in Plan 04)
  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <div className='rounded-lg border border-zinc-700 bg-zinc-900 p-8 text-center'>
        <h1 className='text-2xl font-bold text-cosmic-latte mb-4'>
          Archive Game - {format(normalizedDate, 'MMMM d, yyyy')}
        </h1>
        <p className='text-zinc-400'>
          Game component will be added in the next plan.
        </p>
      </div>
    </div>
  );
}
