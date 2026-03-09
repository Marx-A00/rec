'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import {
  useMyUncoverSessionsQuery,
  useUncoverChallengeDatesQuery,
} from '@/generated/graphql';
import { GAME_EPOCH } from '@/lib/daily-challenge/date-utils';
import {
  format,
  isBefore,
  isAfter,
  isSameDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { LumaSpinner } from '@/components/ui/LumaSpinner';

interface ArchiveCalendarProps {
  mobile?: boolean;
}

export function ArchiveCalendar({ mobile = false }: ArchiveCalendarProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Use LOCAL midnight for calendar display — react-day-picker renders in local
  // time, so comparing against UTC midnight misaligns by a day in western TZs.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Query sessions for the current month
  const { data, isLoading } = useMyUncoverSessionsQuery(
    {
      fromDate: monthStart as unknown as Date,
      toDate: monthEnd as unknown as Date,
    },
    {
      enabled: true,
    }
  );

  // Query which dates have challenges (public, no auth needed)
  const { data: challengeDatesData } = useUncoverChallengeDatesQuery({
    fromDate: monthStart as unknown as Date,
    toDate: monthEnd as unknown as Date,
  });

  // Build set of dates that have a challenge
  const challengeDateSet = new Set<string>();
  if (challengeDatesData?.uncoverChallengeDates) {
    for (const d of challengeDatesData.uncoverChallengeDates) {
      challengeDateSet.add(format(new Date(d), 'yyyy-MM-dd'));
    }
  }

  // Build session map: date string -> 'won' | 'lost'
  const sessionMap = new Map<string, 'won' | 'lost'>();
  if (data?.myUncoverSessions) {
    for (const session of data.myUncoverSessions) {
      const dateKey = format(new Date(session.challengeDate), 'yyyy-MM-dd');
      sessionMap.set(dateKey, session.won ? 'won' : 'lost');
    }
  }

  // Determine which dates are won, lost, or missed.
  // Use local dates throughout — the calendar renders in local time.
  const wonDates: Date[] = [];
  const lostDates: Date[] = [];
  const missedDates: Date[] = [];

  // Start from GAME_EPOCH in local-date terms
  const epochLocal = new Date(
    GAME_EPOCH.getUTCFullYear(),
    GAME_EPOCH.getUTCMonth(),
    GAME_EPOCH.getUTCDate()
  );
  const checkDate = new Date(epochLocal);
  while (isBefore(checkDate, today) || isSameDay(checkDate, today)) {
    // Only check dates in the current month view
    if (
      (isBefore(checkDate, monthStart) || isAfter(checkDate, monthEnd)) &&
      !isSameDay(checkDate, monthStart) &&
      !isSameDay(checkDate, monthEnd)
    ) {
      checkDate.setDate(checkDate.getDate() + 1);
      continue;
    }

    const dateKey = format(checkDate, 'yyyy-MM-dd');
    const status = sessionMap.get(dateKey);

    if (status === 'won') {
      wonDates.push(new Date(checkDate));
    } else if (status === 'lost') {
      lostDates.push(new Date(checkDate));
    } else if (isBefore(checkDate, today)) {
      // Missed: before today and no session
      missedDates.push(new Date(checkDate));
    }

    checkDate.setDate(checkDate.getDate() + 1);
  }

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Today redirects to daily game
    if (isSameDay(date, today)) {
      router.push(mobile ? '/m/game' : '/game/play');
      return;
    }

    // Past dates go to archive — format as YYYY-MM-DD from local date parts
    // so the URL matches the calendar cell the user clicked.
    if (isBefore(date, today)) {
      const dateStr = format(date, 'yyyy-MM-dd');
      router.push(
        mobile ? `/m/game/archive/${dateStr}` : `/game/archive/${dateStr}`
      );
    }
  };

  // Disable dates before GAME_EPOCH, after today, or without a challenge
  const disabledDates = (date: Date) => {
    if (isBefore(date, epochLocal) || isAfter(date, today)) return true;
    // Today is always clickable (redirects to daily game)
    if (isSameDay(date, today)) return false;
    // If challenge dates have loaded, only enable dates with a challenge
    if (challengeDatesData) {
      const dateKey = format(date, 'yyyy-MM-dd');
      return !challengeDateSet.has(dateKey);
    }
    return false;
  };

  return (
    <div className='flex flex-col items-center space-y-6'>
      {/* Calendar */}
      {isLoading ? (
        <div className='flex h-64 items-center justify-center'>
          <LumaSpinner />
        </div>
      ) : (
        <Calendar
          mode='single'
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          onSelect={handleDateSelect}
          disabled={disabledDates}
          modifiers={{
            won: wonDates,
            lost: lostDates,
            missed: missedDates,
            today: today,
          }}
          modifiersClassNames={{
            won: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold',
            lost: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 font-semibold',
            missed: 'bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700/70',
            today:
              'border-2 border-emerald-400 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/25 font-semibold',
          }}
          className='rounded-lg border border-zinc-700 bg-zinc-900 p-4'
        />
      )}

      {/* Legend */}
      <div className='flex flex-wrap justify-center gap-4 text-sm'>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-4 rounded bg-emerald-500/20 border border-emerald-500/40' />
          <span className='text-zinc-300'>Won</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-4 rounded bg-red-500/20 border border-red-500/40' />
          <span className='text-zinc-300'>Lost</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-4 rounded bg-zinc-700/50 border border-zinc-600' />
          <span className='text-zinc-300'>Missed</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-4 w-4 rounded border-2 border-emerald-400 bg-emerald-500/10' />
          <span className='text-zinc-300'>Today</span>
        </div>
      </div>
    </div>
  );
}
