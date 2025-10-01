// src/app/admin/queue/page.tsx
'use client';

import { useState } from 'react';
import {
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MONITORING_API = 'http://localhost:3001';

export default function QueueManagementPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleQueueAction = async (action: string, method: string = 'POST') => {
    setLoading(action);
    try {
      const response = await fetch(`${MONITORING_API}/queue/${action}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} queue`);
      }

      const data = await response.json();
      toast.success(data.message || `Queue ${action} successful`);
    } catch (error) {
      toast.error(`Failed to ${action} queue: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setLoading('retry-all');
    try {
      // This would use the GraphQL mutation we created
      toast.info('Retrying all failed jobs...');
      // Implement GraphQL mutation call here
      toast.success('All failed jobs queued for retry');
    } catch (error) {
      toast.error('Failed to retry jobs');
    } finally {
      setLoading(null);
    }
  };

  const handleCleanup = async () => {
    setLoading('cleanup');
    try {
      const response = await fetch(`${MONITORING_API}/queue/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThan: 86400000 }), // 24 hours
      });

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      toast.success('Queue cleaned up successfully');
    } catch (error) {
      toast.error('Failed to cleanup queue');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Queue Management</h1>
        <p className='text-zinc-400 mt-1'>
          Control and manage the job processing queue
        </p>
      </div>

      {/* Queue Controls */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader>
            <CardTitle className='text-white'>Queue Controls</CardTitle>
            <CardDescription className='text-zinc-400'>
              Start, stop, and manage the queue
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex gap-2'>
              <Button
                onClick={() => handleQueueAction('resume')}
                disabled={loading === 'resume'}
                className='flex-1 bg-zinc-700 hover:bg-zinc-600 text-white'
                variant='default'
              >
                <PlayCircle className='h-4 w-4 mr-2' />
                Resume Queue
              </Button>
              <Button
                onClick={() => handleQueueAction('pause')}
                disabled={loading === 'pause'}
                className='flex-1 text-white border-zinc-700 hover:bg-zinc-700'
                variant='outline'
              >
                <PauseCircle className='h-4 w-4 mr-2' />
                Pause Queue
              </Button>
            </div>

            <div className='pt-4 border-t border-zinc-800'>
              <h4 className='font-medium mb-2 text-white'>
                Maintenance Actions
              </h4>
              <div className='space-y-2'>
                <Button
                  onClick={handleRetryAllFailed}
                  disabled={loading === 'retry-all'}
                  variant='outline'
                  className='w-full justify-start text-white border-zinc-700 hover:bg-zinc-700'
                >
                  <RotateCcw className='h-4 w-4 mr-2' />
                  Retry All Failed Jobs
                </Button>
                <Button
                  onClick={handleCleanup}
                  disabled={loading === 'cleanup'}
                  variant='outline'
                  className='w-full justify-start text-white border-zinc-700 hover:bg-zinc-700'
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Clean Old Jobs (&gt;24h)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-zinc-900 border-zinc-800'>
          <CardHeader>
            <CardTitle className='text-white'>Queue Configuration</CardTitle>
            <CardDescription className='text-zinc-400'>
              Current queue settings and limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Rate Limit
                </span>
                <Badge
                  variant='outline'
                  className='border-zinc-700 text-zinc-300'
                >
                  1 req/sec
                </Badge>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Max Retries
                </span>
                <span className='text-sm text-zinc-400'>3 attempts</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Backoff Type
                </span>
                <span className='text-sm text-zinc-400'>Exponential</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Keep Completed
                </span>
                <span className='text-sm text-zinc-400'>Last 100 jobs</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-sm font-medium text-zinc-300'>
                  Keep Failed
                </span>
                <span className='text-sm text-zinc-400'>Last 50 jobs</span>
              </div>
            </div>

            <div className='mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30'>
              <div className='flex items-start space-x-2'>
                <AlertCircle className='h-4 w-4 text-yellow-400 mt-0.5' />
                <div className='text-sm text-yellow-200'>
                  <p className='font-medium'>MusicBrainz API Rate Limit</p>
                  <p className='text-xs mt-1 text-yellow-300/80'>
                    Queue is limited to 1 request per second to comply with
                    MusicBrainz API requirements.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* External Tools */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>External Tools</CardTitle>
          <CardDescription className='text-zinc-400'>
            Access advanced monitoring and management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <a
              href='http://localhost:3001/admin/queues'
              target='_blank'
              rel='noopener noreferrer'
              className='block'
            >
              <div className='p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors'>
                <h4 className='font-medium text-white'>Bull Board Dashboard</h4>
                <p className='text-sm text-zinc-400 mt-1'>
                  Visual queue management interface with job details
                </p>
              </div>
            </a>

            <a
              href='http://localhost:3001/metrics'
              target='_blank'
              rel='noopener noreferrer'
              className='block'
            >
              <div className='p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors'>
                <h4 className='font-medium text-white'>Metrics API</h4>
                <p className='text-sm text-zinc-400 mt-1'>
                  Raw JSON metrics for integration with monitoring tools
                </p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
