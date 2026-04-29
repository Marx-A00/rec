'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatDateOnly } from '@/lib/date-utils';
import {
  ChevronDown,
  ChevronRight,
  Disc,
  Eye,
  Music,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetAlbumDetailsAdminQuery, EnrichmentEntityType } from '@/generated/graphql';
import { EnrichmentLogTable } from '@/components/admin/EnrichmentLogTable';
import { EnrichmentPreviewResults } from '@/components/admin/EnrichmentPreviewResults';
import {
  AlbumExpandedSkeleton,
} from '@/components/admin/MusicDatabaseExpandedSkeleton';
import type { PreviewEnrichmentResult } from '@/generated/graphql';

interface AlbumSearchResult {
  id: string;
  title: string;
  spotifyId: string | null;
  enrichmentStatus: string;
}

interface ImagePreview {
  url: string;
  cloudflareId?: string | null;
  title: string;
}

interface TrackDetail {
  id: string;
  title: string;
  trackNumber: number;
  discNumber: number;
  durationMs?: number | null;
  isrc?: string | null;
}

interface AlbumExpandedContentProps {
  album: AlbumSearchResult;
  previewResult?: PreviewEnrichmentResult;
  onClearPreview: (id: string) => void;
  onResetEnrichment: (id: string, type: 'album') => void;
  onDeleteAlbum: (id: string, title: string) => void;
  onImagePreview: (preview: ImagePreview) => void;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AlbumExpandedContent({
  album,
  previewResult,
  onClearPreview,
  onResetEnrichment,
  onDeleteAlbum,
  onImagePreview,
}: AlbumExpandedContentProps) {
  const [tracksExpanded, setTracksExpanded] = useState(false);

  const { data, isLoading, error } = useGetAlbumDetailsAdminQuery(
    { id: album.id },
    { enabled: !!album.id }
  );

  const albumDetails = data?.album;

  if (isLoading) {
    return <AlbumExpandedSkeleton />;
  }

  if (error || !albumDetails) {
    return (
      <div className='p-4 text-center text-zinc-400'>
        Failed to load album details
      </div>
    );
  }

  return (
    <div className='p-4 bg-zinc-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
      {/* Metadata Section */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Database ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>{albumDetails.id}</div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>MusicBrainz ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>
            {albumDetails.musicbrainzId || 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Spotify ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>
            {album.spotifyId ? (
              <a
                href={`https://open.spotify.com/album/${album.spotifyId}`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-green-400 hover:text-green-300 hover:underline'
              >
                {album.spotifyId}
              </a>
            ) : (
              'N/A'
            )}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Discogs ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>
            {albumDetails.discogsId || 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Release Date</div>
          <div className='text-sm text-zinc-300'>
            {albumDetails.releaseDate ? formatDateOnly(albumDetails.releaseDate) : 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Label</div>
          <div className='text-sm text-zinc-300'>{albumDetails.label || 'N/A'}</div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Genres</div>
          <div className='text-sm text-zinc-300'>
            {albumDetails.genres && albumDetails.genres.length > 0 ? (
              <div className='flex flex-wrap gap-1'>
                {albumDetails.genres.map((genre: string) => (
                  <Badge
                    key={genre}
                    variant='secondary'
                    className='text-xs bg-zinc-700 text-zinc-300'
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            ) : (
              'N/A'
            )}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Barcode</div>
          <div className='text-sm text-zinc-300 font-mono'>
            {albumDetails.barcode || 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Last Enriched</div>
          <div className='text-sm text-zinc-300'>
            {albumDetails.lastEnriched
              ? formatDistanceToNow(new Date(albumDetails.lastEnriched), {
                  addSuffix: true,
                })
              : 'Never'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Track Count</div>
          <div className='text-sm text-zinc-300'>
            {albumDetails.tracks?.length || 0} tracks
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Image Status</div>
          <div className='text-sm text-zinc-300 flex items-center gap-2'>
            <span>
              {albumDetails.coverArtUrl && albumDetails.cloudflareImageId
                ? '✓ Has images'
                : '✗ Missing images'}
            </span>
            {(albumDetails.coverArtUrl || albumDetails.cloudflareImageId) && (
              <button
                className='text-zinc-500 hover:text-zinc-200 transition-colors'
                onClick={() =>
                  onImagePreview({
                    url: albumDetails.coverArtUrl || '',
                    cloudflareId: albumDetails.cloudflareImageId,
                    title: albumDetails.title,
                  })
                }
                title='View image'
              >
                <Eye className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
          {albumDetails.coverArtUrl && (
            <div
              className='mt-1 text-xs text-zinc-500 truncate max-w-xs'
              title={albumDetails.coverArtUrl}
            >
              {albumDetails.coverArtUrl}
            </div>
          )}
        </div>
      </div>

      {/* Delete Button */}
      <div className='flex justify-end pt-4 border-t border-zinc-700'>
        <Button
          onClick={() => onDeleteAlbum(albumDetails.id, albumDetails.title)}
          variant='destructive'
          size='sm'
          className='gap-2'
        >
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
            />
          </svg>
          Delete Album
        </Button>
      </div>

      {/* Tracks Section */}
      {albumDetails.tracks && albumDetails.tracks.length > 0 && (
        <div>
          <button
            onClick={() => setTracksExpanded(!tracksExpanded)}
            className='text-sm font-semibold text-white mb-2 flex items-center gap-2 hover:text-zinc-300 transition-colors w-full'
          >
            {tracksExpanded ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
            <Disc className='h-4 w-4' />
            Tracks ({albumDetails.tracks.length})
          </button>
          {tracksExpanded && (
            <div className='space-y-1 max-h-60 overflow-y-auto custom-scrollbar'>
              {albumDetails.tracks.map((track: TrackDetail) => (
                <div
                  key={track.id}
                  className='flex items-center justify-between p-2 bg-zinc-900/50 rounded text-xs'
                >
                  <div className='flex items-center gap-3 flex-1'>
                    <span className='text-zinc-500 w-8'>
                      {track.discNumber > 1 && `${track.discNumber}-`}
                      {track.trackNumber}
                    </span>
                    <span className='text-zinc-300'>{track.title}</span>
                  </div>
                  <div className='flex items-center gap-4'>
                    {track.isrc && (
                      <span className='text-zinc-500 font-mono'>
                        {track.isrc}
                      </span>
                    )}
                    <span className='text-zinc-400'>
                      {formatDuration(track.durationMs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(!albumDetails.tracks || albumDetails.tracks.length === 0) && (
        <div className='text-center py-4 text-zinc-500 text-sm'>
          <Music className='h-8 w-8 mx-auto mb-2 opacity-50' />
          No tracks available
        </div>
      )}

      {/* Preview Enrichment Results */}
      {previewResult && (
        <EnrichmentPreviewResults
          result={previewResult}
          onClose={() => onClearPreview(album.id)}
          entityType='album'
        />
      )}

      {/* Enrichment Logs Section */}
      <div className='border-t border-zinc-700 pt-4'>
        <EnrichmentLogTable
          entityType={EnrichmentEntityType.Album}
          entityId={album.id}
          limit={10}
          enrichmentStatus={album.enrichmentStatus}
          onReset={() => onResetEnrichment(album.id, 'album')}
        />
      </div>
    </div>
  );
}
