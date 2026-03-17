'use client';

import React from 'react';
import { Clock, Hash, RotateCcw, AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import type { JobHistoryItem } from './ExpandableJobRow';
import {
  getJobDetailFields,
  getJobResultFields,
  getJobCategory,
  type JobDetailField,
} from './job-detail-utils';

// ============================================================================
// Types
// ============================================================================

interface JobDetailPanelProps {
  job: JobHistoryItem;
}

// ============================================================================
// Sub-components
// ============================================================================

function FieldRow({ field }: { field: JobDetailField }) {
  return (
    <div className='grid grid-cols-[140px_1fr] gap-2 py-1'>
      <span className='text-xs text-zinc-500 truncate'>{field.label}</span>
      <span
        className={`text-xs text-zinc-300 break-all ${
          field.hint === 'id' || field.hint === 'code'
            ? 'font-mono text-zinc-400'
            : ''
        }`}
      >
        {field.value === true
          ? 'Yes'
          : field.value === false
            ? 'No'
            : String(field.value ?? '-')}
      </span>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className='flex items-center gap-1.5 mb-2'>
      {icon}
      <span className='text-xs font-medium text-zinc-400 uppercase tracking-wider'>
        {title}
      </span>
    </div>
  );
}

// ============================================================================
// JobDetailPanel Component
// ============================================================================

export function JobDetailPanel({ job }: JobDetailPanelProps) {
  const inputFields = getJobDetailFields(job.name, job.data);
  const resultFields = job.result ? getJobResultFields(job.result) : [];
  const category = getJobCategory(job.name);

  return (
    <div className='space-y-4'>
      {/* Job Input Section */}
      <div>
        <SectionHeader
          icon={<Hash className='h-3 w-3 text-zinc-500' />}
          title='Job Input'
        />
        <div className='flex items-center gap-2 mb-2'>
          <Badge
            variant='outline'
            className='text-xs border-zinc-700 text-zinc-400'
          >
            {category}
          </Badge>
        </div>

        {inputFields.length > 0 ? (
          <div className='rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2'>
            {inputFields.map((f, i) => (
              <FieldRow key={`${f.label}-${i}`} field={f} />
            ))}
          </div>
        ) : (
          <div className='rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2'>
            <pre className='text-xs text-zinc-500 whitespace-pre-wrap break-all max-h-40 overflow-y-auto'>
              {JSON.stringify(job.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Job Result Section */}
      {job.result && (
        <div>
          <SectionHeader
            icon={<Clock className='h-3 w-3 text-zinc-500' />}
            title='Job Result'
          />
          {resultFields.length > 0 ? (
            <div className='rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2'>
              {resultFields.map((f, i) => (
                <FieldRow key={`${f.label}-${i}`} field={f} />
              ))}
            </div>
          ) : (
            <div className='rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2'>
              <pre className='text-xs text-zinc-500 whitespace-pre-wrap break-all max-h-40 overflow-y-auto'>
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Job Metadata Section */}
      <div>
        <SectionHeader
          icon={<RotateCcw className='h-3 w-3 text-zinc-500' />}
          title='Metadata'
        />
        <div className='rounded-md bg-zinc-900/50 border border-zinc-800 px-3 py-2'>
          <FieldRow field={{ label: 'Job ID', value: job.id, hint: 'id' }} />
          <FieldRow field={{ label: 'Attempts', value: job.attempts }} />
          {job.duration !== undefined && (
            <FieldRow
              field={{ label: 'Duration', value: `${job.duration}ms` }}
            />
          )}
          <FieldRow
            field={{
              label: 'Created',
              value: new Date(job.createdAt).toLocaleString(),
            }}
          />
          {job.processedOn && (
            <FieldRow
              field={{
                label: 'Processed',
                value: new Date(job.processedOn).toLocaleString(),
              }}
            />
          )}
          {job.completedAt && (
            <FieldRow
              field={{
                label: 'Completed',
                value: new Date(job.completedAt).toLocaleString(),
              }}
            />
          )}
        </div>
      </div>

      {/* Error Section */}
      {job.error && (
        <div>
          <SectionHeader
            icon={<AlertTriangle className='h-3 w-3 text-red-400' />}
            title='Error'
          />
          <div className='rounded-md bg-red-900/20 border border-red-800/50 px-3 py-2'>
            <pre className='text-xs text-red-300 whitespace-pre-wrap break-all'>
              {job.error}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
