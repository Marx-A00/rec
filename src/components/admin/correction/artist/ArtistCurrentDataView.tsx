'use client';

import { User } from 'lucide-react';

import { type Artist, DataQuality } from '@/generated/graphql';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { DataQualityBadge } from '../DataQualityBadge';

export interface ArtistCurrentDataViewProps {
  artist: Artist;
}

/**
 * Displays current artist data in collapsible accordion sections.
 *
 * Sections:
 * - Basic Info: Name, country, type, formed year, biography
 * - External IDs: MusicBrainz ID status
 */
export function ArtistCurrentDataView({ artist }: ArtistCurrentDataViewProps) {
  // Check external IDs presence
  const hasAllExternalIds = Boolean(artist.musicbrainzId);

  const defaultExpanded = ['basic', 'external-ids'];

  return (
    <div className='space-y-6'>
      {/* Header: Avatar placeholder + name + quality badge */}
      <div className='flex gap-6'>
        {/* Avatar placeholder */}
        <div className='w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center'>
          {artist.imageUrl ? (
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className='w-full h-full object-cover'
            />
          ) : (
            <User className='w-16 h-16 text-zinc-600' />
          )}
        </div>

        {/* Title and metadata */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start gap-3 mb-2'>
            <h2 className='text-xl font-semibold truncate text-zinc-100'>
              {artist.name}
            </h2>
            <DataQualityBadge
              quality={artist.dataQuality ?? DataQuality.Low}
              hasAllExternalIds={hasAllExternalIds}
            />
          </div>
          <p className='text-zinc-400'>
            {artist.countryCode && <span>{artist.countryCode}</span>}
            {artist.formedYear && (
              <span>
                {artist.countryCode ? ' • ' : ''}Formed {artist.formedYear}
              </span>
            )}
            {artist.albumCount > 0 && (
              <span>
                {artist.countryCode || artist.formedYear ? ' • ' : ''}
                {artist.albumCount} album{artist.albumCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion
        type='multiple'
        defaultValue={defaultExpanded}
        className='w-full'
      >
        {/* Basic Info Section */}
        <AccordionItem value='basic' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            Basic Info
          </AccordionTrigger>
          <AccordionContent>
            <dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
              <dt className='text-zinc-500'>Name</dt>
              <dd className='text-zinc-300'>{artist.name}</dd>

              <dt className='text-zinc-500'>Country</dt>
              <dd className='text-zinc-300'>{artist.countryCode ?? '—'}</dd>

              <dt className='text-zinc-500'>Formed Year</dt>
              <dd className='text-zinc-300'>{artist.formedYear ?? '—'}</dd>

              <dt className='text-zinc-500'>Biography</dt>
              <dd className='text-zinc-300 col-span-2 mt-1'>
                {artist.biography || '—'}
              </dd>
            </dl>
          </AccordionContent>
        </AccordionItem>

        {/* External IDs Section */}
        <AccordionItem value='external-ids' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            External IDs
          </AccordionTrigger>
          <AccordionContent>
            <dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
              <dt className='text-zinc-500'>MusicBrainz ID</dt>
              <dd className='font-mono text-xs text-zinc-300'>
                {artist.musicbrainzId ?? '—'}
              </dd>
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
