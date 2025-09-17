// src/app/admin/job-history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

// Simple date formatting function
function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

interface JobHistoryItem {
  id: string;
  name: string;
  status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  data: any;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
  processedOn?: string;
  duration?: number;
  attempts: number;
  albumId?: string;
  albumName?: string;
}

interface JobStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgDuration: number;
  successRate: number;
  jobsToday: number;
  jobsThisWeek: number;
  trendsUp: boolean;
}

const MONITORING_API = 'http://localhost:3001';

export default function JobHistoryPage() {
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('24h');
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter !== 'all' ? statusFilter : '',
        timeRange: timeFilter,
      });

      const response = await fetch(`${MONITORING_API}/jobs/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job history');
      }

      const data = await response.json();

      setJobs(data.jobs || []);
      setStats(data.stats || null);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load job history');
      console.error('Error fetching job history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobHistory();
  }, [page, statusFilter, timeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobHistory();
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`${MONITORING_API}/jobs/${jobId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry job');
      }

      toast.success('Job queued for retry');
      fetchJobHistory();
    } catch (error) {
      toast.error('Failed to retry job');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'waiting':
      case 'delayed':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'active':
        return 'secondary';
      case 'waiting':
      case 'delayed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Job History</h1>
        <p className="text-zinc-400 mt-1">
          Historical view of all processed jobs and their outcomes
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalJobs.toLocaleString()}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.jobsToday} today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-white">
                  {(stats.successRate * 100).toFixed(1)}%
                </div>
                {stats.trendsUp ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.completedJobs} completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Failed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.failedJobs}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {((stats.failedJobs / stats.totalJobs) * 100).toFixed(1)}% failure rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatDuration(stats.avgDuration)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Per job processing
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Job History</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Job Name</TableHead>
                  <TableHead className="text-zinc-400">Album</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                  <TableHead className="text-zinc-400">Duration</TableHead>
                  <TableHead className="text-zinc-400">Attempts</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                      Loading job history...
                    </TableCell>
                  </TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                      No jobs found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id} className="border-zinc-800">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <Badge variant={getStatusBadgeVariant(job.status) as any} className="text-xs">
                            {job.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300 font-medium">
                        {job.name}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {job.albumName || '-'}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {formatDistanceToNow(new Date(job.createdAt))}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {formatDuration(job.duration)}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {job.attempts}
                      </TableCell>
                      <TableCell>
                        {job.status === 'failed' && (
                          <Button
                            onClick={() => handleRetryJob(job.id)}
                            size="sm"
                            variant="ghost"
                            className="text-zinc-400 hover:text-white"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        {job.error && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-zinc-400 hover:text-white"
                            title={job.error}
                          >
                            <AlertCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
              <div className="text-sm text-zinc-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}