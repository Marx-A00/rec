'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  User,
  Cog,
  Edit,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useGetEnrichmentLogsQuery,
  EnrichmentEntityType,
  EnrichmentLogStatus,
} from '@/generated/graphql';

interface EnrichmentLogTableProps {
  entityType?: EnrichmentEntityType;
  entityId?: string;
  limit?: number;
  enrichmentStatus?: string | null;
  onReset?: () => void;
}

function EnrichmentStatusBadge({ status }: { status: EnrichmentLogStatus }) {
  const statusConfig: Record<
    EnrichmentLogStatus,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    SUCCESS: {
      color: 'bg-green-500/10 text-green-400 border-green-500/20',
      icon: <CheckCircle className='h-3 w-3' />,
      label: 'Success',
    },
    PARTIAL_SUCCESS: {
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      icon: <AlertCircle className='h-3 w-3' />,
      label: 'Partial',
    },
    FAILED: {
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <XCircle className='h-3 w-3' />,
      label: 'Failed',
    },
    NO_DATA_AVAILABLE: {
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: <AlertCircle className='h-3 w-3' />,
      label: 'No Data',
    },
    SKIPPED: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: <Clock className='h-3 w-3' />,
      label: 'Skipped',
    },
    PREVIEW: {
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: <AlertCircle className='h-3 w-3' />,
      label: 'Preview',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant='outline' className={`${config.color} gap-1 font-normal`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function OperationIcon({
  operation,
  sources,
}: {
  operation: string;
  sources: string[];
}) {
  // Determine icon based on operation type or source
  const isManual = operation.includes('MANUAL') || sources.includes('USER');
  const isAutomated = operation.includes('AUTO') || sources.includes('SYSTEM');
  const isApiEnrichment = sources.some(s =>
    ['MUSICBRAINZ', 'SPOTIFY', 'LASTFM', 'DISCOGS'].includes(s)
  );

  if (isManual) {
    return (
      <span title='Manual operation'>
        <User className='h-3.5 w-3.5 text-blue-400' />
      </span>
    );
  }
  if (isAutomated) {
    return (
      <span title='Automated operation'>
        <Cog className='h-3.5 w-3.5 text-purple-400' />
      </span>
    );
  }
  if (isApiEnrichment) {
    return (
      <span title='API enrichment'>
        <Database className='h-3.5 w-3.5 text-green-400' />
      </span>
    );
  }
  return (
    <span title='Data change'>
      <Edit className='h-3.5 w-3.5 text-zinc-400' />
    </span>
  );
}

export function EnrichmentLogTable({
  entityType,
  entityId,
  limit = 100,
  enrichmentStatus,
  onReset,
}: EnrichmentLogTableProps): React.JSX.Element {
  const { data, isLoading, error } = useGetEnrichmentLogsQuery(
    { entityType, entityId, limit },
    {
      enabled: !!(entityType || entityId),
      refetchInterval: query => {
        // Poll while enrichment is pending or in progress (from parent prop)
        if (
          enrichmentStatus === 'PENDING' ||
          enrichmentStatus === 'IN_PROGRESS'
        ) {
          return 3000;
        }

        // Also poll if the most recent log was created within the last 30 seconds
        // This catches the case where a background job just completed
        const logs = query.state.data?.enrichmentLogs || [];
        if (logs.length > 0) {
          const mostRecentLog = logs[0];
          const logAge =
            Date.now() - new Date(mostRecentLog.createdAt).getTime();
          if (logAge < 30000) {
            return 3000; // Keep polling for 30 seconds after last log entry
          }
        }

        return false; // Stop polling
      },
    }
  );

  const logs = data?.enrichmentLogs || [];

  if (isLoading) {
    return (
      <div className='p-8 text-center text-zinc-400'>
        <Clock className='h-6 w-6 animate-spin mx-auto mb-2' />
        <p className='text-sm'>Loading enrichment logs...</p>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {/* Header with Reset button - always show */}
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-white flex items-center gap-2'>
          <Clock className='h-4 w-4' />
          Enrichment History
          <span className='text-xs text-zinc-500 font-normal'>
            ({logs.length} {logs.length === 1 ? 'log' : 'logs'})
          </span>
        </h3>
        {onReset && enrichmentStatus ? (
          <Button
            size='sm'
            variant='outline'
            onClick={onReset}
            className='text-yellow-400 border-yellow-500/20 hover:text-yellow-300 hover:bg-yellow-500/10'
          >
            <svg
              className='h-3 w-3 mr-1.5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
            Reset Status
          </Button>
        ) : null}
      </div>

      {/* Error state */}
      {error ? (
        <div className='p-8 text-center text-red-400'>
          <XCircle className='h-6 w-6 mx-auto mb-2' />
          <p className='text-sm'>Failed to load enrichment logs</p>
          <p className='text-xs text-zinc-500 mt-1'>
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : null}

      {/* Empty state */}
      {!error && logs.length === 0 ? (
        <div className='p-8 text-center text-zinc-500 border border-zinc-700 rounded-md bg-zinc-900/50'>
          <AlertCircle className='h-6 w-6 mx-auto mb-2' />
          <p className='text-sm'>No enrichment logs found</p>
          <p className='text-xs text-zinc-600 mt-1'>
            This entity has not been enriched yet
          </p>
        </div>
      ) : null}

      {/* Logs table */}
      {!error && logs.length > 0 ? (
        <div className='rounded-md border border-zinc-700 bg-zinc-900/50'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-zinc-700'>
                <TableHead className='text-zinc-400'>Time</TableHead>
                <TableHead className='text-zinc-400'>Operation</TableHead>
                <TableHead className='text-zinc-400'>Sources</TableHead>
                <TableHead className='text-zinc-400'>Status</TableHead>
                <TableHead className='text-zinc-400'>Reason</TableHead>
                <TableHead className='text-zinc-400'>Fields Changed</TableHead>
                <TableHead className='text-zinc-400'>Changes</TableHead>
                <TableHead className='text-zinc-400 text-right'>
                  Duration
                </TableHead>
                <TableHead className='text-zinc-400'>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow
                  key={log.id}
                  className='border-zinc-800 hover:bg-zinc-800/50'
                >
                  <TableCell className='text-xs text-zinc-400'>
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className='text-xs text-zinc-300 font-mono'>
                    <div className='flex items-center gap-1.5'>
                      <OperationIcon
                        operation={log.operation}
                        sources={log.sources}
                      />
                      {log.operation}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-wrap gap-1'>
                      {log.sources.map(source => (
                        <Badge
                          key={source}
                          variant='outline'
                          className='text-xs bg-zinc-800 text-zinc-300 border-zinc-700'
                        >
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <EnrichmentStatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className='max-w-md'>
                    {log.reason ? (
                      <div className='text-xs text-zinc-300 whitespace-pre-wrap break-words'>
                        {log.reason}
                      </div>
                    ) : (
                      <span className='text-xs text-zinc-600'>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.fieldsEnriched.length > 0 ? (
                      <div className='flex flex-wrap gap-1 max-w-xs'>
                        {log.fieldsEnriched.map(field => (
                          <Badge
                            key={field}
                            variant='secondary'
                            className='text-xs bg-blue-500/10 text-blue-300 border-blue-500/20'
                          >
                            {field}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className='text-xs text-zinc-500'>None</span>
                    )}
                  </TableCell>
                  <TableCell className='text-xs'>
                    {log.dataQualityBefore && log.dataQualityAfter ? (
                      log.dataQualityBefore === log.dataQualityAfter ? (
                        <Badge
                          className={
                            log.dataQualityAfter === 'HIGH'
                              ? 'bg-green-500/10 text-green-300 border-green-500/20'
                              : log.dataQualityAfter === 'MEDIUM'
                                ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                                : 'bg-red-500/10 text-red-300 border-red-500/20'
                          }
                        >
                          {log.dataQualityAfter}
                        </Badge>
                      ) : (
                        <div className='flex items-center gap-1.5'>
                          <Badge
                            className={
                              log.dataQualityBefore === 'HIGH'
                                ? 'bg-green-500/10 text-green-300 border-green-500/20'
                                : log.dataQualityBefore === 'MEDIUM'
                                  ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                                  : 'bg-red-500/10 text-red-300 border-red-500/20'
                            }
                          >
                            {log.dataQualityBefore}
                          </Badge>
                          <span className='text-zinc-500'>→</span>
                          <Badge
                            className={
                              log.dataQualityAfter === 'HIGH'
                                ? 'bg-green-500/10 text-green-300 border-green-500/20'
                                : log.dataQualityAfter === 'MEDIUM'
                                  ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                                  : 'bg-red-500/10 text-red-300 border-red-500/20'
                            }
                          >
                            {log.dataQualityAfter}
                          </Badge>
                        </div>
                      )
                    ) : (
                      <span className='text-zinc-500'>-</span>
                    )}
                  </TableCell>
                  <TableCell className='text-xs text-zinc-400 text-right'>
                    {log.durationMs ? `${log.durationMs}ms` : '-'}
                  </TableCell>
                  <TableCell className='max-w-md'>
                    {log.errorMessage ? (
                      <div className='text-xs text-red-400 whitespace-pre-wrap break-words'>
                        {log.errorMessage}
                      </div>
                    ) : (
                      <span className='text-xs text-zinc-600'>-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
