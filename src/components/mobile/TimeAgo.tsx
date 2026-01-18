'use client';

import { useState, useEffect } from 'react';
import { formatTimeAgo } from '@/utils/activity-grouping';

interface TimeAgoProps {
  date: string;
  className?: string;
}

/**
 * Client-only time ago component that avoids hydration mismatches.
 * Renders empty on server, then shows relative time on client.
 */
export default function TimeAgo({ date, className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState<string | null>(null);

  useEffect(() => {
    // Only calculate time on client to avoid hydration mismatch
    setTimeAgo(formatTimeAgo(date));

    // Update every minute for fresh times
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  // Render nothing on server, time on client
  if (timeAgo === null) {
    return <span className={className}>&nbsp;</span>;
  }

  return <span className={className}>{timeAgo}</span>;
}
