'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useMyUncoverSessionsQuery } from '@/generated/graphql';
import { GAME_EPOCH, toUTCMidnight } from '@/lib/daily-challenge/date-utils';
import {
  format,
  isBefore,
  isAfter,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ArchiveCalendarProps {
  mobile?: boolean;
}

export function ArchiveCalendar({ mobile = false }: ArchiveCalendarProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = toUTCMidnight(new Date());
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

  // Build session map: date string -> 'won' | 'lost'
  const sessionMap = new Map<string, 'won' | 'lost'>();
  if (data?.myUncoverSessions) {
    for (const session of data.myUncoverSessions) {
      const dateKey = format(new Date(session.challengeDate), 'yyyy-MM-dd');
      sessionMap.set(dateKey, session.won ? 'won' : 'lost');
    }
  }

  // Determine which dates are won, lost, or missed
  const wonDates: Date[] = [];
  const lostDates: Date[] = [];
  const missedDates: Date[] = [];

  // Check each day in the visible range from GAME_EPOCH to today
  const checkDate = new Date(GAME_EPOCH);
  while (isBefore(checkDate, today) || isSameDay(checkDate, today)) {
    // Only check dates in the current month view
    if (
      (isBefore(checkDate, monthStart) || isAfter(checkDate, monthEnd)) &&
      !isSameDay(checkDate, monthStart) &&
      !isSameDay(checkDate, monthEnd)
    ) {
      checkDate.setUTCDate(checkDate.getUTCDate() + 1);
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

    checkDate.setUTCDate(checkDate.getUTCDate() + 1);
  }

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const normalizedDate = toUTCMidnight(date);

    // Today redirects to main game
    if (isSameDay(normalizedDate, today)) {
      router.push(mobile ? '/m/game' : '/game');
      return;
    }

    // Past dates go to archive
    if (isBefore(normalizedDate, today)) {
      const dateStr = format(normalizedDate, 'yyyy-MM-dd');
      router.push(mobile ? `/m/game/archive/${dateStr}` : `/game/archive/${dateStr}`);
    }
  };

  // Disable dates before GAME_EPOCH and after today
  const disabledDates = (date: Date) => {
    return isBefore(date, GAME_EPOCH) || isAfter(date, today);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const canGoBack = isAfter(startOfMonth(currentMonth), GAME_EPOCH);
  const canGoForward = isBefore(endOfMonth(currentMonth), today);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cosmic-latte">
          Archive Calendar
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(mobile ? '/m/game' : '/game')}
        >
          Today's Game
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold text-cosmic-latte">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          disabled={!canGoForward}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-zinc-400">Loading calendar...</p>
        </div>
      ) : (
        <Calendar
          mode="single"
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
            today: 'border-2 border-cosmic-latte',
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 p-4"
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-emerald-500/20 border border-emerald-500/40" />
          <span className="text-zinc-300">Won</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-red-500/20 border border-red-500/40" />
          <span className="text-zinc-300">Lost</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-zinc-700/50 border border-zinc-600" />
          <span className="text-zinc-300">Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-cosmic-latte" />
          <span className="text-zinc-300">Not Played</span>
        </div>
      </div>
    </div>
  );
}
