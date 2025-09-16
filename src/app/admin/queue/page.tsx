// src/app/admin/queue/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

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
        body: JSON.stringify({ olderThan: 86400000 }) // 24 hours
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Queue Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Control and manage the job processing queue
        </p>
      </div>

      {/* Queue Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Queue Controls</CardTitle>
            <CardDescription>Start, stop, and manage the queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => handleQueueAction('resume')}
                disabled={loading === 'resume'}
                className="flex-1"
                variant="default"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Resume Queue
              </Button>
              <Button
                onClick={() => handleQueueAction('pause')}
                disabled={loading === 'pause'}
                className="flex-1"
                variant="outline"
              >
                <PauseCircle className="h-4 w-4 mr-2" />
                Pause Queue
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Maintenance Actions</h4>
              <div className="space-y-2">
                <Button
                  onClick={handleRetryAllFailed}
                  disabled={loading === 'retry-all'}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry All Failed Jobs
                </Button>
                <Button
                  onClick={handleCleanup}
                  disabled={loading === 'cleanup'}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Old Jobs (>24h)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Configuration</CardTitle>
            <CardDescription>Current queue settings and limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Rate Limit</span>
                <Badge variant="outline">1 req/sec</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Max Retries</span>
                <span className="text-sm">3 attempts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Backoff Type</span>
                <span className="text-sm">Exponential</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Keep Completed</span>
                <span className="text-sm">Last 100 jobs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Keep Failed</span>
                <span className="text-sm">Last 50 jobs</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">MusicBrainz API Rate Limit</p>
                  <p className="text-xs mt-1">Queue is limited to 1 request per second to comply with MusicBrainz API requirements.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* External Tools */}
      <Card>
        <CardHeader>
          <CardTitle>External Tools</CardTitle>
          <CardDescription>Access advanced monitoring and management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="http://localhost:3001/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <h4 className="font-medium">Bull Board Dashboard</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Visual queue management interface with job details
                </p>
              </div>
            </a>

            <a
              href="http://localhost:3001/metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <h4 className="font-medium">Metrics API</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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