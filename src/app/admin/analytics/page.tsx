// src/app/admin/analytics/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  Globe,
  Monitor,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const UMAMI_DASHBOARD_URL = 'https://umami-production-08c5.up.railway.app';

interface AnalyticsData {
  stats: {
    pageviews: { value: number; prev: number };
    visitors: { value: number; prev: number };
    visits: { value: number; prev: number };
    bounces: { value: number; prev: number };
    totaltime: { value: number; prev: number };
  };
  pages: Array<{ x: string; y: number }>;
  referrers: Array<{ x: string; y: number }>;
  countries: Array<{ x: string; y: number }>;
  browsers: Array<{ x: string; y: number }>;
  timestamp: string;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getChangePercent(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return Math.round(((current - prev) / prev) * 100);
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to fetch: ${response.status}`
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch analytics'
      );
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const stats = data?.stats;
  const bounceRate = stats
    ? stats.visits.value > 0
      ? Math.round((stats.bounces.value / stats.visits.value) * 100)
      : 0
    : 0;

  const avgVisitTime = stats
    ? stats.visits.value > 0
      ? stats.totaltime.value / stats.visits.value
      : 0
    : 0;

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Site Analytics</h1>
          <p className='text-zinc-400 mt-1'>
            Traffic and visitor insights from Umami
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <div className='flex gap-1 bg-zinc-800 rounded-lg p-1'>
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeRange === range.value
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchAnalytics}
            disabled={loading}
            className='border-zinc-700 text-white hover:bg-zinc-800'
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <a
            href={UMAMI_DASHBOARD_URL}
            target='_blank'
            rel='noopener noreferrer'
          >
            <Button
              variant='outline'
              size='sm'
              className='border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            >
              <ExternalLink className='h-4 w-4 mr-2' />
              Umami
            </Button>
          </a>
        </div>
      </div>

      {error ? (
        <Card className='bg-zinc-900 border-zinc-800'>
          <CardContent className='py-12'>
            <div className='flex flex-col items-center text-center'>
              <AlertCircle className='h-12 w-12 text-yellow-500 mb-4' />
              <h3 className='text-lg font-medium text-white mb-2'>
                Unable to fetch analytics
              </h3>
              <p className='text-zinc-400 mb-6 max-w-md'>{error}</p>

              <div className='bg-zinc-800 rounded-lg p-4 text-left max-w-lg w-full'>
                <h4 className='text-sm font-medium text-white mb-2'>
                  Setup required:
                </h4>
                <p className='text-sm text-zinc-400'>
                  Add these env vars to Railway:
                </p>
                <ul className='text-sm text-zinc-500 mt-2 space-y-1 font-mono'>
                  <li>
                    UMAMI_URL=https://umami-production-08c5.up.railway.app
                  </li>
                  <li>UMAMI_USERNAME=admin</li>
                  <li>UMAMI_PASSWORD=your-password</li>
                  <li>UMAMI_WEBSITE_ID=9b8dd0c0-f9cf-406a-ab48-d4580cfeae39</li>
                </ul>
              </div>

              <Button
                onClick={fetchAnalytics}
                className='mt-6 bg-white text-black hover:bg-zinc-200'
              >
                <RefreshCw className='h-4 w-4 mr-2' />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading && !data ? (
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='h-8 w-8 text-zinc-500 animate-spin' />
          <span className='ml-3 text-zinc-500'>Loading analytics...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            <Card className='bg-zinc-900 border-zinc-800'>
              <CardContent className='pt-4'>
                <div className='flex items-center justify-between mb-2'>
                  <Users className='h-5 w-5 text-zinc-500' />
                  {stats &&
                    getChangePercent(
                      stats.visitors.value,
                      stats.visitors.prev
                    ) !== null && (
                      <Badge
                        variant='outline'
                        className={`text-xs ${
                          getChangePercent(
                            stats.visitors.value,
                            stats.visitors.prev
                          )! >= 0
                            ? 'text-green-400 border-green-800'
                            : 'text-red-400 border-red-800'
                        }`}
                      >
                        {getChangePercent(
                          stats.visitors.value,
                          stats.visitors.prev
                        )! >= 0
                          ? '+'
                          : ''}
                        {getChangePercent(
                          stats.visitors.value,
                          stats.visitors.prev
                        )}
                        %
                      </Badge>
                    )}
                </div>
                <p className='text-2xl font-bold text-white'>
                  {stats?.visitors.value.toLocaleString() ?? '-'}
                </p>
                <p className='text-xs text-zinc-500 mt-1'>Unique Visitors</p>
              </CardContent>
            </Card>

            <Card className='bg-zinc-900 border-zinc-800'>
              <CardContent className='pt-4'>
                <div className='flex items-center justify-between mb-2'>
                  <Eye className='h-5 w-5 text-zinc-500' />
                  {stats &&
                    getChangePercent(
                      stats.pageviews.value,
                      stats.pageviews.prev
                    ) !== null && (
                      <Badge
                        variant='outline'
                        className={`text-xs ${
                          getChangePercent(
                            stats.pageviews.value,
                            stats.pageviews.prev
                          )! >= 0
                            ? 'text-green-400 border-green-800'
                            : 'text-red-400 border-red-800'
                        }`}
                      >
                        {getChangePercent(
                          stats.pageviews.value,
                          stats.pageviews.prev
                        )! >= 0
                          ? '+'
                          : ''}
                        {getChangePercent(
                          stats.pageviews.value,
                          stats.pageviews.prev
                        )}
                        %
                      </Badge>
                    )}
                </div>
                <p className='text-2xl font-bold text-white'>
                  {stats?.pageviews.value.toLocaleString() ?? '-'}
                </p>
                <p className='text-xs text-zinc-500 mt-1'>Page Views</p>
              </CardContent>
            </Card>

            <Card className='bg-zinc-900 border-zinc-800'>
              <CardContent className='pt-4'>
                <div className='flex items-center justify-between mb-2'>
                  <Clock className='h-5 w-5 text-zinc-500' />
                </div>
                <p className='text-2xl font-bold text-white'>
                  {formatDuration(avgVisitTime)}
                </p>
                <p className='text-xs text-zinc-500 mt-1'>Avg Visit Time</p>
              </CardContent>
            </Card>

            <Card className='bg-zinc-900 border-zinc-800'>
              <CardContent className='pt-4'>
                <div className='flex items-center justify-between mb-2'>
                  <TrendingUp className='h-5 w-5 text-zinc-500' />
                </div>
                <p className='text-2xl font-bold text-white'>{bounceRate}%</p>
                <p className='text-xs text-zinc-500 mt-1'>Bounce Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Top Pages */}
            <Card className='bg-zinc-900 border-zinc-800'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-white text-lg flex items-center gap-2'>
                  <BarChart3 className='h-5 w-5 text-zinc-500' />
                  Top Pages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.pages?.length ? (
                  <p className='text-zinc-500 text-sm'>No data yet</p>
                ) : (
                  <div className='space-y-3'>
                    {data.pages.map((page, i) => (
                      <div
                        key={i}
                        className='flex items-center justify-between'
                      >
                        <span className='text-zinc-300 text-sm truncate flex-1 mr-4'>
                          {page.x || '/'}
                        </span>
                        <span className='text-zinc-500 text-sm font-medium'>
                          {page.y.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Referrers */}
            <Card className='bg-zinc-900 border-zinc-800'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-white text-lg flex items-center gap-2'>
                  <ArrowUpRight className='h-5 w-5 text-zinc-500' />
                  Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.referrers?.length ? (
                  <p className='text-zinc-500 text-sm'>
                    No referrers yet (direct traffic)
                  </p>
                ) : (
                  <div className='space-y-3'>
                    {data.referrers.map((ref, i) => (
                      <div
                        key={i}
                        className='flex items-center justify-between'
                      >
                        <span className='text-zinc-300 text-sm truncate flex-1 mr-4'>
                          {ref.x || 'Direct'}
                        </span>
                        <span className='text-zinc-500 text-sm font-medium'>
                          {ref.y.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Countries */}
            <Card className='bg-zinc-900 border-zinc-800'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-white text-lg flex items-center gap-2'>
                  <Globe className='h-5 w-5 text-zinc-500' />
                  Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.countries?.length ? (
                  <p className='text-zinc-500 text-sm'>No data yet</p>
                ) : (
                  <div className='space-y-3'>
                    {data.countries.map((country, i) => (
                      <div
                        key={i}
                        className='flex items-center justify-between'
                      >
                        <span className='text-zinc-300 text-sm'>
                          {country.x || 'Unknown'}
                        </span>
                        <span className='text-zinc-500 text-sm font-medium'>
                          {country.y.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Browsers */}
            <Card className='bg-zinc-900 border-zinc-800'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-white text-lg flex items-center gap-2'>
                  <Monitor className='h-5 w-5 text-zinc-500' />
                  Browsers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.browsers?.length ? (
                  <p className='text-zinc-500 text-sm'>No data yet</p>
                ) : (
                  <div className='space-y-3'>
                    {data.browsers.map((browser, i) => (
                      <div
                        key={i}
                        className='flex items-center justify-between'
                      >
                        <span className='text-zinc-300 text-sm'>
                          {browser.x || 'Unknown'}
                        </span>
                        <span className='text-zinc-500 text-sm font-medium'>
                          {browser.y.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
