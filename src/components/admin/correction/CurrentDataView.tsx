'use client';

import { DataQuality } from '@/generated/graphql';
import AlbumImage from '@/components/ui/AlbumImage';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { DataQualityBadge } from './DataQualityBadge';
import { ExternalIdStatus } from './ExternalIdStatus';
import { TrackListing, type Track } from './TrackListing';

export interface AlbumArtist {
  artist: {
    id: string;
    name: string;
  };
  role: string;
  position: number;
}

export interface CurrentDataViewAlbum {
  id: string;
  title: string;
  releaseDate: string | null;
  releaseType: string | null;
  coverArtUrl: string | null;
  cloudflareImageId: string | null;
  musicbrainzId: string | null;
  spotifyId: string | null;
  discogsId: string | null;
  dataQuality: DataQuality | null;
  label: string | null;
  barcode: string | null;
  updatedAt?: string;
  tracks: Track[];
  artists: AlbumArtist[];
}

export interface CurrentDataViewProps {
  album: CurrentDataViewAlbum;
}

/**
 * Formats a date string to a human-readable format.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Displays current album data in collapsible accordion sections.
 *
 * Sections:
 * - Basic Info: Title, artist, release date, type, label, barcode
 * - Tracks: Track listing with auto-collapse for large albums
 * - External IDs: MusicBrainz, Spotify, Discogs status
 */
export function CurrentDataView({ album }: CurrentDataViewProps) {
  // Find primary artist (role "primary" or position 0)
  const primaryArtist = album.artists.find(
    ac => ac.role === 'primary' || ac.position === 0
  );
  const primaryArtistName = primaryArtist?.artist.name ?? 'Unknown Artist';

  // Check if all external IDs are present
  const hasAllExternalIds = Boolean(
    album.musicbrainzId && album.spotifyId && album.discogsId
  );

  const defaultExpanded = ['basic', 'tracks', 'external-ids'];

  return (
    <div className='space-y-6'>
      {/* Header: Cover art + title + quality badge */}
      <div className='flex gap-6'>
        {/* Cover art */}
        <div className='w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700'>
          <AlbumImage
            src={album.coverArtUrl}
            cloudflareImageId={album.cloudflareImageId}
            alt={album.title}
            width={128}
            height={128}
            className='w-full h-full object-cover'
          />
        </div>

        {/* Title and metadata */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start gap-3 mb-2'>
            <h2 className='text-xl font-semibold truncate text-zinc-100'>
              {album.title}
            </h2>
            <DataQualityBadge
              quality={album.dataQuality ?? DataQuality.Low}
              hasAllExternalIds={hasAllExternalIds}
            />
          </div>
          <p className='text-zinc-400'>{primaryArtistName}</p>
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
              <dt className='text-zinc-500'>Title</dt>
              <dd className='text-zinc-300'>{album.title}</dd>

              <dt className='text-zinc-500'>Primary Artist</dt>
              <dd className='text-zinc-300'>{primaryArtistName}</dd>

              <dt className='text-zinc-500'>Release Date</dt>
              <dd className='text-zinc-300'>{formatDate(album.releaseDate)}</dd>

              <dt className='text-zinc-500'>Release Type</dt>
              <dd className='text-zinc-300'>{album.releaseType ?? '—'}</dd>

              <dt className='text-zinc-500'>Label</dt>
              <dd className='text-zinc-300'>{album.label ?? '—'}</dd>

              <dt className='text-zinc-500'>Barcode</dt>
              <dd className='font-mono text-xs text-zinc-300'>
                {album.barcode ?? '—'}
              </dd>
            </dl>
          </AccordionContent>
        </AccordionItem>

        {/* Tracks Section */}
        <AccordionItem value='tracks' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            Tracks ({album.tracks.length})
          </AccordionTrigger>
          <AccordionContent>
            {album.tracks.length > 0 ? (
              <div className='max-h-64 overflow-y-auto pr-2 custom-scrollbar'>
                <TrackListing tracks={album.tracks} />
              </div>
            ) : (
              <p className='text-zinc-500 text-sm'>No tracks available</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* External IDs Section */}
        <AccordionItem value='external-ids' className='border-zinc-700'>
          <AccordionTrigger className='text-zinc-200 hover:text-zinc-100 hover:no-underline'>
            External IDs
          </AccordionTrigger>
          <AccordionContent>
            <ExternalIdStatus
              musicbrainzId={album.musicbrainzId}
              spotifyId={album.spotifyId}
              discogsId={album.discogsId}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
