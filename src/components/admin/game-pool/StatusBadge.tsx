'use client';

import { Badge } from '@/components/ui/badge';
import { AlbumGameStatus } from '@/generated/graphql';

interface StatusBadgeProps {
  status: AlbumGameStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (status: AlbumGameStatus) => {
    switch (status) {
      case AlbumGameStatus.Eligible:
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case AlbumGameStatus.Excluded:
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case AlbumGameStatus.None:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getStatusLabel = (status: AlbumGameStatus) => {
    switch (status) {
      case AlbumGameStatus.Eligible:
        return 'Eligible';
      case AlbumGameStatus.Excluded:
        return 'Excluded';
      case AlbumGameStatus.None:
        return 'Neutral';
      default:
        return 'Unknown';
    }
  };

  return (
    <Badge variant='outline' className={getStatusColor(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
