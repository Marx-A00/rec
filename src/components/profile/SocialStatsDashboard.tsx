'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';

interface UserStats {
  userId: string;
  overview: {
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
    profileViews: number;
    joinedAt: string;
  };
  growth: {
    followersGrowth: {
      daily: number;
      weekly: number;
      monthly: number;
      percentageChange: number;
    };
    recommendationsGrowth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  engagement: {
    avgRecommendationScore: number;
    totalRecommendationViews: number;
    followersFromRecommendations: number;
    mostPopularRecommendation: {
      id: string;
      title: string;
      artist: string;
      score: number;
      views: number;
    } | null;
  };
  socialReach: {
    uniqueFollowersReached: number;
    totalRecommendationImpressions: number;
    engagementRate: number;
  };
  activityPatterns: {
    mostActiveDay: string;
    mostActiveHour: number;
    avgRecommendationsPerWeek: number;
    streakDays: number;
  };
}

interface AnalyticsData {
  userId: string;
  timeRange: string;
  metrics: {
    followersOverTime: { date: string; value: number }[];
    recommendationsOverTime: { date: string; value: number }[];
    engagementOverTime: { date: string; value: number }[];
    activityHeatmap: { day: string; hour: number; value: number }[];
  };
  summary: {
    totalGrowth: number;
    peakActivity: string;
    mostActiveHour: number;
    consistencyScore: number;
  };
}

interface TopRecommendation {
  id: string;
  basisAlbum: {
    title: string;
    artist: string;
    imageUrl: string | null;
  };
  recommendedAlbum: {
    title: string;
    artist: string;
    imageUrl: string | null;
  };
  score: number;
  createdAt: string;
  metrics: {
    estimatedViews: number;
    engagementScore: number;
    ageInDays: number;
    popularityRank: number;
  };
}

interface SocialStatsDashboardProps {
  userId: string;
  isOwnProfile?: boolean;
}

const StatCard = ({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <div className='bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow'>
    <div className='flex items-center justify-between'>
      <div>
        <p className='text-sm font-medium text-gray-600'>{title}</p>
        <p className='text-2xl font-bold text-gray-900'>{value}</p>
        {change && (
          <p
            className={`text-sm flex items-center mt-1 ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {trend === 'up' && '↗'}
            {trend === 'down' && '↘'}
            {change}
          </p>
        )}
      </div>
      {icon && <div className='text-2xl'>{icon}</div>}
    </div>
  </div>
);

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export default function SocialStatsDashboard({
  userId,
  isOwnProfile = false,
}: SocialStatsDashboardProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'growth' | 'engagement' | 'activity'
  >('overview');

  // Fetch user stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', userId, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/users/${userId}/stats?range=${timeRange}`
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['userAnalytics', userId, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/users/${userId}/analytics?range=${timeRange}`
      );
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  // Fetch top recommendations
  const { data: topRecsData, isLoading: topRecsLoading } = useQuery({
    queryKey: ['topRecommendations', userId, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/users/${userId}/top-recommendations?range=${timeRange}&limit=5`
      );
      if (!response.ok) throw new Error('Failed to fetch top recommendations');
      return response.json();
    },
  });

  const stats: UserStats | null = statsData?.stats;
  const analytics: AnalyticsData | null = analyticsData?.analytics;
  const topRecs: TopRecommendation[] = topRecsData?.topRecommendations || [];

  const isLoading = statsLoading || analyticsLoading || topRecsLoading;

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-1/3 mb-4'></div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='h-32 bg-gray-200 rounded'></div>
            ))}
          </div>
          <div className='h-80 bg-gray-200 rounded'></div>
        </div>
      </div>
    );
  }

  if (!stats || !analytics) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-600'>Unable to load statistics data.</p>
      </div>
    );
  }

  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ];

  const tabOptions = [
    { value: 'overview', label: 'Overview', icon: '📊' },
    { value: 'growth', label: 'Growth', icon: '📈' },
    { value: 'engagement', label: 'Engagement', icon: '💬' },
    { value: 'activity', label: 'Activity', icon: '⚡' },
  ];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>
            {isOwnProfile ? 'Your Social Statistics' : 'Social Statistics'}
          </h2>
          <p className='text-gray-600'>
            Insights into social engagement and growth patterns
          </p>
        </div>

        {/* Time Range Selector */}
        <div className='flex bg-gray-100 rounded-lg p-1'>
          {timeRangeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className='flex space-x-1 bg-gray-100 rounded-lg p-1'>
        {tabOptions.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className='space-y-6'>
          {/* Key Metrics */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <StatCard
              title='Followers'
              value={stats.overview.followersCount.toLocaleString()}
              change={`+${stats.growth.followersGrowth.monthly} this month`}
              trend={
                stats.growth.followersGrowth.percentageChange > 0
                  ? 'up'
                  : 'neutral'
              }
              icon='👥'
            />
            <StatCard
              title='Following'
              value={stats.overview.followingCount.toLocaleString()}
              icon='🔗'
            />
            <StatCard
              title='Recommendations'
              value={stats.overview.recommendationsCount.toLocaleString()}
              change={`+${stats.growth.recommendationsGrowth.monthly} this month`}
              trend='up'
              icon='🎵'
            />
            <StatCard
              title='Avg Score'
              value={stats.engagement.avgRecommendationScore.toFixed(1)}
              icon='⭐'
            />
          </div>

          {/* Growth Chart */}
          <div className='bg-white rounded-lg border p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Follower Growth
            </h3>
            <ResponsiveContainer width='100%' height={300}>
              <AreaChart data={analytics.metrics.followersOverTime}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='date'
                  tickFormatter={date => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={date => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => [value, 'Followers']}
                />
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#8884d8'
                  fill='#8884d8'
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <StatCard
              title='Growth Rate'
              value={`${stats.growth.followersGrowth.percentageChange.toFixed(1)}%`}
              change='vs last month'
              trend={
                stats.growth.followersGrowth.percentageChange > 0
                  ? 'up'
                  : 'down'
              }
              icon='📈'
            />
            <StatCard
              title='Weekly Followers'
              value={stats.growth.followersGrowth.weekly}
              icon='📅'
            />
            <StatCard
              title='Monthly Followers'
              value={stats.growth.followersGrowth.monthly}
              icon='📊'
            />
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='bg-white rounded-lg border p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Followers Over Time
              </h3>
              <ResponsiveContainer width='100%' height={250}>
                <LineChart data={analytics.metrics.followersOverTime}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type='monotone'
                    dataKey='value'
                    stroke='#8884d8'
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className='bg-white rounded-lg border p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Recommendations Over Time
              </h3>
              <ResponsiveContainer width='100%' height={250}>
                <BarChart data={analytics.metrics.recommendationsOverTime}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={date => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey='value' fill='#82ca9d' />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <StatCard
              title='Engagement Rate'
              value={`${stats.socialReach.engagementRate.toFixed(1)}%`}
              icon='💬'
            />
            <StatCard
              title='Total Impressions'
              value={stats.socialReach.totalRecommendationImpressions.toLocaleString()}
              icon='👁️'
            />
            <StatCard
              title='Reach'
              value={stats.socialReach.uniqueFollowersReached.toLocaleString()}
              icon='🌐'
            />
          </div>

          {/* Top Recommendations */}
          <div className='bg-white rounded-lg border p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Top Performing Recommendations
            </h3>
            <div className='space-y-4'>
              {topRecs.map((rec, index) => (
                <div
                  key={rec.id}
                  className='flex items-center space-x-4 p-4 bg-gray-50 rounded-lg'
                >
                  <div className='flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                    <span className='text-sm font-medium text-blue-600'>
                      #{index + 1}
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-900 truncate'>
                      {rec.basisAlbum.title} → {rec.recommendedAlbum.title}
                    </p>
                    <p className='text-sm text-gray-500 truncate'>
                      {rec.basisAlbum.artist} / {rec.recommendedAlbum.artist}
                    </p>
                  </div>
                  <div className='flex-shrink-0 text-right'>
                    <p className='text-sm font-medium text-gray-900'>
                      Score: {rec.score.toFixed(1)}
                    </p>
                    <p className='text-sm text-gray-500'>
                      {rec.metrics.estimatedViews} views
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Over Time */}
          <div className='bg-white rounded-lg border p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Average Recommendation Score
            </h3>
            <ResponsiveContainer width='100%' height={250}>
              <LineChart data={analytics.metrics.engagementOverTime}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='date'
                  tickFormatter={date => new Date(date).toLocaleDateString()}
                />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line
                  type='monotone'
                  dataKey='value'
                  stroke='#ffc658'
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <StatCard
              title='Most Active Day'
              value={stats.activityPatterns.mostActiveDay}
              icon='📅'
            />
            <StatCard
              title='Peak Hour'
              value={`${stats.activityPatterns.mostActiveHour}:00`}
              icon='🕐'
            />
            <StatCard
              title='Weekly Average'
              value={stats.activityPatterns.avgRecommendationsPerWeek.toFixed(
                1
              )}
              icon='📊'
            />
            <StatCard
              title='Activity Streak'
              value={`${stats.activityPatterns.streakDays} days`}
              icon='🔥'
            />
          </div>

          {/* Activity Heatmap */}
          <div className='bg-white rounded-lg border p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Activity Heatmap
            </h3>
            <p className='text-sm text-gray-600 mb-4'>
              Shows when you're most active creating recommendations
            </p>

            {/* Simple activity visualization */}
            <div className='space-y-2'>
              {[
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ].map(day => {
                const dayData = analytics.metrics.activityHeatmap
                  .filter(item => item.day === day)
                  .reduce((sum, item) => sum + item.value, 0);

                const maxActivity = Math.max(
                  ...analytics.metrics.activityHeatmap.map(item => item.value)
                );
                const intensity =
                  maxActivity > 0 ? (dayData / maxActivity) * 100 : 0;

                return (
                  <div key={day} className='flex items-center space-x-3'>
                    <div className='w-20 text-sm text-gray-600'>{day}</div>
                    <div className='flex-1 bg-gray-200 rounded-full h-4 relative'>
                      <div
                        className='bg-blue-500 h-4 rounded-full transition-all duration-300'
                        style={{ width: `${intensity}%` }}
                      />
                    </div>
                    <div className='w-12 text-sm text-gray-600 text-right'>
                      {dayData}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consistency Score */}
          <div className='bg-white rounded-lg border p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Consistency Score
            </h3>
            <div className='flex items-center space-x-4'>
              <div className='flex-1'>
                <div className='w-full bg-gray-200 rounded-full h-4'>
                  <div
                    className='bg-green-500 h-4 rounded-full transition-all duration-300'
                    style={{ width: `${analytics.summary.consistencyScore}%` }}
                  />
                </div>
              </div>
              <div className='text-2xl font-bold text-gray-900'>
                {analytics.summary.consistencyScore.toFixed(0)}%
              </div>
            </div>
            <p className='text-sm text-gray-600 mt-2'>
              How consistently you create recommendations over time
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
