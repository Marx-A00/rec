// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Users,
  Album,
  Clock,
  Music,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DashboardData {
  health: string;
  queueDepth: number;
  activeJobs: number;
  failedJobs: number;
  completedJobs: number;
  errorRate: number;
  throughput: {
    jobsPerMinute: number;
    jobsPerHour: number;
  };
  activeAlerts: number;
  timestamp: string;
}

interface HealthData {
  status: string;
  components: {
    queue: { status: string; message: string };
    redis: { status: string; message: string };
    worker: { status: string; message: string };
    spotify: { status: string; message: string };
    memory: { status: string; message: string; details?: any };
  };
  metrics: {
    queueDepth: number;
    activeJobs: number;
    failedJobs: number;
    completedJobs: number;
    errorRate: number;
    avgProcessingTime: number;
  };
  alerts: string[];
}

const MONITORING_API = process.env.NEXT_PUBLIC_MONITORING_API_URL || 'http://localhost:3001';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingSpotify, setSyncingSpotify] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Only fetch monitoring data in development
      if (process.env.NODE_ENV === 'development') {
        const [dashboardRes, healthRes] = await Promise.all([
          fetch(`${MONITORING_API}/dashboard`),
          fetch(`${MONITORING_API}/health`),
        ]);

        if (!dashboardRes.ok || !healthRes.ok) {
          throw new Error('Failed to fetch monitoring data');
        }

        const [dashboardData, healthData] = await Promise.all([
          dashboardRes.json(),
          healthRes.json(),
        ]);

        setDashboard(dashboardData);
        setHealth(healthData);
      } else {
        // In production, show simplified view without monitoring dashboard
        setDashboard(null);
        setHealth(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const triggerSpotifySync = async (
    type: 'NEW_RELEASES' | 'FEATURED_PLAYLISTS' | 'BOTH'
  ) => {
    setSyncingSpotify(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation TriggerSpotifySync($type: SpotifySyncType!) {
              triggerSpotifySync(type: $type) {
                success
                jobId
                message
                stats {
                  albumsQueued
                  albumsCreated
                  albumsUpdated
                  enrichmentJobsQueued
                }
              }
            }
          `,
          variables: { type },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      if (data.data.triggerSpotifySync.success) {
        setSyncMessage(`✅ ${data.data.triggerSpotifySync.message}`);
        // Refresh dashboard data after triggering sync
        setTimeout(fetchData, 2000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (err) {
      setSyncMessage(
        `❌ Error: ${err instanceof Error ? err.message : 'Failed to trigger sync'}`
      );
    } finally {
      setSyncingSpotify(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getHealthBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <Badge className='bg-green-500'>Healthy</Badge>;
      case 'degraded':
        return <Badge className='bg-yellow-500'>Degraded</Badge>;
      case 'unhealthy':
        return <Badge className='bg-red-500'>Unhealthy</Badge>;
      default:
        return <Badge variant='outline'>Unknown</Badge>;
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className='h-5 w-5 text-green-500' />;
      case 'degraded':
        return <AlertCircle className='h-5 w-5 text-yellow-500' />;
      case 'unhealthy':
        return <XCircle className='h-5 w-5 text-red-500' />;
      default:
        return <AlertCircle className='h-5 w-5 text-gray-400' />;
    }
  };

  if (loading) {
    return (
      <div className='p-8'>
        <div className='animate-pulse'>
          <div className='h-8 bg-zinc-800 rounded w-1/4 mb-8'></div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {[...Array(8)].map((_, i) => (
              <div key={i} className='h-32 bg-zinc-800 rounded'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8'>
        <div className='bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded-lg'>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Admin Dashboard</h1>
        <p className='text-zinc-400 mt-1'>System monitoring and management</p>
      </div>

      {/* Overall Health Status - Only in Development */}
      {process.env.NODE_ENV === 'development' && health && (
        <div className='mb-6'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                System Health
              </CardTitle>
              {getHealthBadge(health.status)}
            </CardHeader>
            <CardContent>
              {health.alerts && health.alerts.length > 0 && (
                <div className='mt-2 space-y-1'>
                  {health.alerts.map((alert, i) => (
                    <div key={i} className='text-sm text-yellow-400'>
                      ⚠️ {alert}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Grid - Only in Development */}
      {process.env.NODE_ENV === 'development' && dashboard && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Queue Depth
              </CardTitle>
              <Activity className='h-4 w-4 text-zinc-400' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {dashboard.queueDepth || 0}
              </div>
              <p className='text-xs text-zinc-500'>
                {dashboard.activeJobs || 0} active
              </p>
            </CardContent>
          </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Completed Jobs
              </CardTitle>
              <CheckCircle className='h-4 w-4 text-green-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {dashboard.completedJobs || 0}
              </div>
              <p className='text-xs text-zinc-500'>
                {dashboard.throughput?.jobsPerHour || 0}/hour
              </p>
            </CardContent>
          </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Failed Jobs
              </CardTitle>
              <XCircle className='h-4 w-4 text-red-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {dashboard.failedJobs || 0}
              </div>
              <p className='text-xs text-zinc-500'>
                {dashboard.errorRate?.toFixed(1) || 0}% error rate
            </p>
          </CardContent>
        </Card>

          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Active Alerts
              </CardTitle>
              <AlertCircle className='h-4 w-4 text-yellow-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {dashboard.activeAlerts || 0}
              </div>
              <p className='text-xs text-zinc-500'>
                {dashboard.activeAlerts === 0 ? 'All clear' : 'Needs attention'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Component Health - Only in Development */}
      {process.env.NODE_ENV === 'development' && dashboard && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader>
              <CardTitle className='text-white'>Component Health</CardTitle>
              <CardDescription className='text-zinc-400'>
                Status of system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {health?.components &&
                Object.entries(health.components).map(([name, component]) => (
                  <div key={name} className='flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      {getHealthIcon(component.status)}
                      <span className='capitalize font-medium text-white'>
                        {name}
                      </span>
                    </div>
                    <span className='text-sm text-zinc-400'>
                      {component.message}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader>
            <CardTitle className='text-white'>Performance Metrics</CardTitle>
            <CardDescription className='text-zinc-400'>
              System performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Avg Processing Time
                </span>
                <span className='text-sm text-zinc-400'>
                  {health?.metrics?.avgProcessingTime?.toFixed(0) || 0}ms
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Jobs/Minute
                </span>
                <span className='text-sm text-zinc-400'>
                  {dashboard?.throughput?.jobsPerMinute || 0}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Jobs/Hour
                </span>
                <span className='text-sm text-zinc-400'>
                  {dashboard?.throughput?.jobsPerHour || 0}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Memory Usage
                </span>
                <span className='text-sm text-zinc-400'>
                  {health?.components?.memory?.details?.heapUsedMB || 'N/A'} MB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>Quick Actions</CardTitle>
          <CardDescription className='text-zinc-400'>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Spotify Sync Section */}
            <div className='border border-zinc-800 rounded-lg p-4 bg-zinc-800/50'>
              <h4 className='text-sm font-medium mb-3 text-white'>
                Spotify Data Sync
              </h4>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                  onClick={() => triggerSpotifySync('NEW_RELEASES')}
                  disabled={syncingSpotify}
                >
                  {syncingSpotify ? (
                    <>
                      <Activity className='mr-2 h-3 w-3 animate-spin' />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Album className='mr-2 h-3 w-3' />
                      Sync New Releases
                    </>
                  )}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                  onClick={() => triggerSpotifySync('FEATURED_PLAYLISTS')}
                  disabled={syncingSpotify}
                >
                  {syncingSpotify ? (
                    <>
                      <Activity className='mr-2 h-3 w-3 animate-spin' />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Music className='mr-2 h-3 w-3' />
                      Sync Featured Playlists
                    </>
                  )}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                  onClick={() => triggerSpotifySync('BOTH')}
                  disabled={syncingSpotify}
                >
                  {syncingSpotify ? (
                    <>
                      <Activity className='mr-2 h-3 w-3 animate-spin' />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Database className='mr-2 h-3 w-3' />
                      Sync All Spotify Data
                    </>
                  )}
                </Button>
              </div>
              {syncMessage && (
                <div
                  className={`mt-3 text-xs ${syncMessage.startsWith('✅') ? 'text-green-500' : 'text-red-500'}`}
                >
                  {syncMessage}
                </div>
              )}
            </div>

            {/* Other Actions */}
            <div className='border border-zinc-800 rounded-lg p-4 bg-zinc-800/50'>
              <h4 className='text-sm font-medium mb-3 text-white'>
                System Management
              </h4>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                >
                  <a
                    href='http://localhost:3001/admin/queues'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Open Bull Board
                  </a>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                >
                  View Logs
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                >
                  Clear Failed Jobs
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                >
                  Restart Workers
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='text-white border-zinc-700 hover:bg-zinc-700'
                >
                  Export Metrics
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className='mt-4 text-sm text-zinc-500 text-center'>
        Last updated:{' '}
        {dashboard?.timestamp
          ? new Date(dashboard.timestamp).toLocaleString()
          : 'N/A'}
      </div>
    </div>
  );
}
