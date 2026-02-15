'use client';

import { CheckCircle, XCircle, Circle, Image } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGamePoolStatsQuery } from '@/generated/graphql';

export function GamePoolStats() {
  const { data, isLoading } = useGamePoolStatsQuery();

  const stats = [
    {
      title: 'Eligible Albums',
      value: data?.gamePoolStats?.eligibleCount ?? 0,
      icon: CheckCircle,
      description: 'Ready for daily game',
      color: 'text-green-500',
    },
    {
      title: 'Excluded Albums',
      value: data?.gamePoolStats?.excludedCount ?? 0,
      icon: XCircle,
      description: 'Manually excluded',
      color: 'text-red-500',
    },
    {
      title: 'Neutral Albums',
      value: data?.gamePoolStats?.neutralCount ?? 0,
      icon: Circle,
      description: 'Not yet reviewed',
      color: 'text-zinc-400',
    },
    {
      title: 'With Cover Art',
      value: data?.gamePoolStats?.totalWithCoverArt ?? 0,
      icon: Image,
      description: 'Total albums with covers',
      color: 'text-blue-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
