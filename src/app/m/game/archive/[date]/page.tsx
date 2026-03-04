import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';

import { GAME_EPOCH } from '@/lib/daily-challenge/date-utils';
import { MobileArchivePlayClient } from './MobileArchivePlayClient';

/**
 * Parse a YYYY-MM-DD string directly as a UTC midnight Date.
 * Avoids timezone-dependent parsing (parseISO uses local TZ).
 */
function parseDateUTC(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return isNaN(d.getTime()) ? null : d;
}

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { date } = await params;

  const parsed = parseDateUTC(date);
  if (parsed) {
    const formattedDate = format(parsed, 'MMMM d, yyyy');
    return {
      title: `Archive - ${formattedDate} | Uncover`,
      description: `Play the daily album art challenge from ${formattedDate}`,
    };
  }

  return {
    title: 'Archive | Uncover',
    description: 'Play past daily album art challenges',
  };
}

export default async function MobileArchiveGamePage({ params }: PageProps) {
  const { date } = await params;

  // Parse as explicit UTC to avoid timezone-dependent shifts
  const normalizedDate = parseDateUTC(date);
  if (!normalizedDate) notFound();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Validate: must be >= GAME_EPOCH and strictly before today (UTC)
  if (normalizedDate < GAME_EPOCH || normalizedDate >= today) {
    notFound();
  }

  return <MobileArchivePlayClient challengeDate={normalizedDate} />;
}
