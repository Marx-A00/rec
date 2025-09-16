// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, Activity, Database, Users, Album, Clock } from 'lucide-react';

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

const MONITORING_API = 'http://localhost:3001';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [dashboardRes, healthRes] = await Promise.all([
        fetch(`${MONITORING_API}/dashboard`),
        fetch(`${MONITORING_API}/health`)
      ]);

      if (!dashboardRes.ok || !healthRes.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const [dashboardData, healthData] = await Promise.all([
        dashboardRes.json(),
        healthRes.json()
      ]);

      setDashboard(dashboardData);
      setHealth(healthData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
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
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-500">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          System monitoring and management
        </p>
      </div>

      {/* Overall Health Status */}
      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {health && getHealthBadge(health.status)}
          </CardHeader>
          <CardContent>
            {health?.alerts && health.alerts.length > 0 && (
              <div className="mt-2 space-y-1">
                {health.alerts.map((alert, i) => (
                  <div key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ {alert}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.queueDepth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.activeJobs || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.completedJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.throughput?.jobsPerHour || 0}/hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.failedJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.errorRate?.toFixed(1) || 0}% error rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.activeAlerts === 0 ? 'All clear' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Component Health</CardTitle>
            <CardDescription>Status of system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {health?.components && Object.entries(health.components).map(([name, component]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getHealthIcon(component.status)}
                    <span className="capitalize font-medium">{name}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {component.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>System performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Avg Processing Time</span>
                <span className="text-sm">{health?.metrics?.avgProcessingTime?.toFixed(0) || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Jobs/Minute</span>
                <span className="text-sm">{dashboard?.throughput?.jobsPerMinute || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Jobs/Hour</span>
                <span className="text-sm">{dashboard?.throughput?.jobsPerHour || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm">
                  {health?.components?.memory?.details?.heapUsedMB || 'N/A'} MB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <a href="http://localhost:3001/admin/queues" target="_blank" rel="noopener noreferrer">
                Open Bull Board
              </a>
            </Button>
            <Button variant="outline" size="sm">
              View Logs
            </Button>
            <Button variant="outline" size="sm">
              Clear Failed Jobs
            </Button>
            <Button variant="outline" size="sm">
              Restart Workers
            </Button>
            <Button variant="outline" size="sm">
              Export Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
        Last updated: {dashboard?.timestamp ? new Date(dashboard.timestamp).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}