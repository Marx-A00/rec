'use client';

import { useGamePoolStatsQuery } from '@/generated/graphql';

export function GamePoolStats() {
  const { data, isLoading } = useGamePoolStatsQuery();

  const stats = [
    {
      label: 'Unreviewed',
      value: data?.gamePoolStats?.neutralCount ?? 0,
      color: 'text-zinc-400',
    },
    {
      label: 'Excluded',
      value: data?.gamePoolStats?.excludedCount ?? 0,
      color: 'text-red-400',
    },
    {
      label: 'With Cover Art',
      value: data?.gamePoolStats?.totalWithCoverArt ?? 0,
      color: 'text-blue-400',
    },
  ];

  return (
    <div>
      <div className='flex items-center gap-6 text-sm pb-4'>
        {stats.map(stat => (
          <div key={stat.label} className='flex items-center gap-1.5'>
            <span className='text-zinc-500'>{stat.label}:</span>
            <span className={`font-medium ${stat.color}`}>
              {isLoading ? '...' : stat.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className='border-b border-zinc-800' />
    </div>
  );
}
