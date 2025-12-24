'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useGetEnrichmentLogsQuery, EnrichmentEntityType, EnrichmentLogStatus } from '@/generated/graphql';

interface EnrichmentLogTableProps {
  entityType?: EnrichmentEntityType;
  entityId?: string;
  limit?: number;
}

function EnrichmentStatusBadge({ status }: { status: EnrichmentLogStatus }) {
  const statusConfig: Record<EnrichmentLogStatus, { color: string; icon: React.ReactNode; label: string }> = {
    SUCCESS: {
      color: 'bg-green-500/10 text-green-400 border-green-500/20',
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Success',
    },
    PARTIAL_SUCCESS: {
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Partial',
    },
    FAILED: {
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <XCircle className="h-3 w-3" />,
      label: 'Failed',
    },
    NO_DATA_AVAILABLE: {
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'No Data',
    },
    SKIPPED: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: <Clock className="h-3 w-3" />,
      label: 'Skipped',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`${config.color} gap-1 font-normal`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function EnrichmentLogTable({
  entityType,
  entityId,
  limit = 100,
}: EnrichmentLogTableProps) {
  const { data, isLoading, error } = useGetEnrichmentLogsQuery(
    { entityType, entityId, limit },
    { enabled: !!(entityType || entityId) }
  );

  const logs = data?.enrichmentLogs || [];

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading enrichment logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        <XCircle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Failed to load enrichment logs</p>
        <p className="text-xs text-zinc-500 mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">No enrichment logs found</p>
        <p className="text-xs text-zinc-600 mt-1">
          This entity has not been enriched yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Enrichment History
          <span className="text-xs text-zinc-500 font-normal">
            ({logs.length} {logs.length === 1 ? 'log' : 'logs'})
          </span>
        </h3>
      </div>

      <div className="rounded-md border border-zinc-700 bg-zinc-900/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-zinc-700">
              <TableHead className="text-zinc-400">Time</TableHead>
              <TableHead className="text-zinc-400">Operation</TableHead>
              <TableHead className="text-zinc-400">Sources</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Fields Enriched</TableHead>
              <TableHead className="text-zinc-400 text-right">Duration</TableHead>
              <TableHead className="text-zinc-400">Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="border-zinc-800 hover:bg-zinc-800/50"
              >
                <TableCell className="text-xs text-zinc-400">
                  {formatDistanceToNow(new Date(log.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-xs text-zinc-300 font-mono">
                  {log.operation}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {log.sources.map((source) => (
                      <Badge
                        key={source}
                        variant="outline"
                        className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700"
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <EnrichmentStatusBadge status={log.status} />
                </TableCell>
                <TableCell>
                  {log.fieldsEnriched.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {log.fieldsEnriched.map((field) => (
                        <Badge
                          key={field}
                          variant="secondary"
                          className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/20"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">None</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-zinc-400 text-right">
                  {log.durationMs ? `${log.durationMs}ms` : '-'}
                </TableCell>
                <TableCell className="max-w-xs">
                  {log.errorMessage ? (
                    <div
                      className="text-xs text-red-400 truncate"
                      title={log.errorMessage}
                    >
                      {log.errorMessage}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
