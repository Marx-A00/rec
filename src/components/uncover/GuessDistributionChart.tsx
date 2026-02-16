'use client';

// NOTE: This component uses CSS-based bars, NOT Recharts.
// Do NOT add any Recharts imports - they are unnecessary and will cause lint errors.

interface GuessDistributionChartProps {
  /** Array of 6 integers: wins by attempt count (index 0 = 1-guess, etc.) */
  distribution: number[];
  /** If player won today, which attempt number (1-6) to highlight */
  todayAttempts?: number | null;
}

/**
 * Horizontal bar chart showing guess distribution (Wordle-style).
 * Displays wins by number of attempts (1-6).
 */
export function GuessDistributionChart({
  distribution,
  todayAttempts,
}: GuessDistributionChartProps) {
  // Transform array to chart data
  const data = distribution.map((count, index) => ({
    attempt: index + 1, // 1-6
    count,
    isToday: todayAttempts === index + 1,
  }));

  const maxCount = Math.max(...distribution, 1);

  return (
    <div className="w-full">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Guess Distribution
      </h3>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.attempt} className="flex items-center gap-2">
            <span className="w-4 text-sm font-medium">{item.attempt}</span>
            <div className="flex-1">
              <div
                className={"flex h-6 items-center justify-end rounded px-2 text-sm font-medium text-white transition-all " + (
                  item.isToday
                    ? 'bg-green-600'
                    : item.count > 0
                      ? 'bg-zinc-600'
                      : 'bg-zinc-800'
                )}
                style={{
                  width:
                    item.count > 0
                      ? Math.max((item.count / maxCount) * 100, 10) + '%'
                      : '24px',
                  minWidth: '24px',
                }}
              >
                {item.count}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
