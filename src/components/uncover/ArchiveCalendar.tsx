'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import {
  useMyUncoverSessionsQuery,
  useUncoverChallengeDatesQuery,
  useFirstUncoverChallengeDateQuery,
} from '@/generated/graphql';
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

  // Query the earliest challenge date to restrict calendar navigation
  const { data: firstDateData } = useFirstUncoverChallengeDateQuery();

  // Build set of dates that have a challenge.
  // Dates arrive as UTC midnight strings (e.g. '2026-03-12T00:00:00.000Z').
  // Using new Date() would shift them back a day in western timezones,
  // so we extract the date portion directly from the ISO string.
  const challengeDateSet = new Set<string>();
  if (challengeDatesData?.uncoverChallengeDates) {
    for (const d of challengeDatesData.uncoverChallengeDates) {
      challengeDateSet.add(String(d).slice(0, 10));
    }
  }

  // Build session map: date string -> 'won' | 'lost'
  // Same UTC-midnight slicing as challengeDateSet to avoid timezone shift.
  const sessionMap = new Map<string, 'won' | 'lost'>();
  if (data?.myUncoverSessions) {
    for (const session of data.myUncoverSessions) {
      const dateKey = String(session.challengeDate).slice(0, 10);
      sessionMap.set(dateKey, session.won ? 'won' : 'lost');
    }
  }

  // Determine which dates are won, lost, or missed.
  // Use local dates throughout — the calendar renders in local time.
  const wonDates: Date[] = [];
  const lostDates: Date[] = [];
  const missedDates: Date[] = [];

  // Derive the earliest challenge date for calendar bounds.
  // Falls back to today so nothing renders until the query loads.
  const firstDateStr = firstDateData?.firstUncoverChallengeDate
    ? String(firstDateData.firstUncoverChallengeDate).slice(0, 10)
    : null;
  const epochLocal = firstDateStr
    ? new Date(
        parseInt(firstDateStr.slice(0, 4)),
        parseInt(firstDateStr.slice(5, 7)) - 1,
        parseInt(firstDateStr.slice(8, 10))
      )
    : today;
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
    } else if (isBefore(checkDate, today) && challengeDateSet.has(dateKey)) {
      // Missed: before today, challenge exists, but no session
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

    // Past dates go to archive — only if a challenge exists for that date.
    // Format as YYYY-MM-DD from local date parts so the URL matches the
    // calendar cell the user clicked.
    if (isBefore(date, today)) {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!challengeDateSet.has(dateStr)) return;
      router.push(
        mobile ? `/m/game/archive/${dateStr}` : `/game/archive/${dateStr}`
      );
    }
  };

  // Disable dates before the first challenge, after today, or without a challenge
  const disabledDates = (date: Date) => {
    if (isBefore(date, epochLocal) || isAfter(date, today)) return true;
    if (isSameDay(date, today)) return false;
    const dateKey = format(date, 'yyyy-MM-dd');
    return !challengeDateSet.has(dateKey);
  };

  return (
    <div className='flex flex-col items-center space-y-6'>
      {/* Glassmorphism calendar container */}
      <div className='relative inline-block'>
        {/* Ambient glow behind the glass */}
        <div className='pointer-events-none absolute -inset-6 rounded-3xl bg-emerald-500/[0.06] blur-3xl' />

        {/* Glass card */}
        <div className='relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl'>
          {/* Top edge highlight */}
          <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent' />
          {/* Subtle inner gradient */}
          <div className='pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01]' />

          {/* Always render calendar so the card never shifts size;
              overlay spinner when loading */}
          <div className='relative'>
            {isLoading && (
              <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm'>
                <LumaSpinner />
              </div>
            )}
            <Calendar
              mode='single'
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              startMonth={epochLocal}
              endMonth={today}
              onSelect={isLoading ? undefined : handleDateSelect}
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
              className='bg-transparent p-0 [--cell-size:2.5rem]'
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className='flex flex-wrap justify-center gap-3 text-sm'>
        <div className='flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 backdrop-blur-md'>
          <div className='h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' />
          <span className='text-zinc-300'>Won</span>
        </div>
        <div className='flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 backdrop-blur-md'>
          <div className='h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]' />
          <span className='text-zinc-300'>Lost</span>
        </div>
        <div className='flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 backdrop-blur-md'>
          <div className='h-2.5 w-2.5 rounded-full bg-zinc-500' />
          <span className='text-zinc-300'>Missed</span>
        </div>
        <div className='flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 backdrop-blur-md'>
          <div className='h-2.5 w-2.5 rounded-full border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_6px_rgba(52,211,153,0.4)]' />
          <span className='text-zinc-300'>Today</span>
        </div>
      </div>
    </div>
  );
}
