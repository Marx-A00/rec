// src/components/dashboard/panels/QuickStatsPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Music, Users, Heart, TrendingUp } from 'lucide-react';
import { PanelComponentProps } from '@/types/mosaic';

interface StatsData {
  albumsInCollection: number;
  recommendationsMade: number;
  recommendationsReceived: number;
  followersCount: number;
}

export default function QuickStatsPanel({ 
  panelId, 
  config, 
  isEditMode 
}: PanelComponentProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [stats, setStats] = useState<StatsData>({
    albumsInCollection: 0,
    recommendationsMade: 0,
    recommendationsReceived: 0,
    followersCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user stats
  useEffect(() => {
    if (user && !isEditMode) {
      const fetchStats = async () => {
        setIsLoading(true);
        try {
          // TODO: Replace with actual API calls
          // Simulated data for now
          setTimeout(() => {
            setStats({
              albumsInCollection: Math.floor(Math.random() * 200) + 50,
              recommendationsMade: Math.floor(Math.random() * 50) + 10,
              recommendationsReceived: Math.floor(Math.random() * 30) + 5,
              followersCount: Math.floor(Math.random() * 100) + 20,
            });
            setIsLoading(false);
          }, 1000);
        } catch (error) {
          console.error('Error fetching stats:', error);
          setIsLoading(false);
        }
      };

      fetchStats();
    }
  }, [user, isEditMode]);

  // Show preview content in edit mode
  if (isEditMode) {
    return (
      <div className="bg-zinc-900/50 p-6 h-full overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="mb-3 flex-shrink-0">
            <p className="text-sm text-zinc-400 mb-2">Panel Preview</p>
            <h2 className="text-lg font-semibold text-white">
              Quick Stats
              <br />
              <br />
              <ul>
                <li>Albums</li>
                <li>Recommendations</li>
                <li>consecutive days logged in</li>
                <li>recommendations receive</li>
                <li>Albums to listen to from LL playlist </li>
                <li> profile views (?) </li>
                <li> follows </li>
                <li> genres is collection</li>
                <li> genres recommended</li>
                </ul> 
            </h2>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
            {[
              { icon: Music, label: 'Albums', value: '127' },
              { icon: Heart, label: 'Recommendations', value: '23' },
              { icon: TrendingUp, label: 'Received', value: '15' },
              { icon: Users, label: 'Followers', value: '42' },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-emeraled-green" />
                  <span className="text-xs text-zinc-400">{stat.label}</span>
                </div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 p-6 h-full overflow-hidden">
      {user ? (
        <div className="h-full flex flex-col">
          <div className="flex-1 grid grid-cols-2 gap-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-16" />
                  </div>
                  <div className="h-6 bg-zinc-700 rounded animate-pulse w-12" />
                </div>
              ))
            ) : (
              // Actual stats
              [
                { icon: Music, label: 'Albums', value: stats.albumsInCollection },
                { icon: Heart, label: 'Recommendations', value: stats.recommendationsMade },
                { icon: TrendingUp, label: 'Received', value: stats.recommendationsReceived },
                { icon: Users, label: 'Followers', value: stats.followersCount },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-emeraled-green" />
                    <span className="text-xs text-zinc-400">{stat.label}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            View Your Stats
          </h3>
          <p className="text-zinc-400 text-sm">
            Sign in to see your music collection statistics
          </p>
        </div>
      )}
    </div>
  );
}
