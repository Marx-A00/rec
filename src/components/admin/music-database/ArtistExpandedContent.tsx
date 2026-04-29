'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Disc, Eye, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetArtistDetailsQuery, EnrichmentEntityType } from '@/generated/graphql';
import { EnrichmentLogTable } from '@/components/admin/EnrichmentLogTable';
import { EnrichmentPreviewResults } from '@/components/admin/EnrichmentPreviewResults';
import {
  ArtistExpandedSkeleton,
} from '@/components/admin/MusicDatabaseExpandedSkeleton';
import type { PreviewEnrichmentResult } from '@/generated/graphql';

interface ArtistSearchResult {
  id: string;
  name: string;
  spotifyId: string | null;
  enrichmentStatus: string;
}

interface ImagePreview {
  url: string;
  cloudflareId?: string | null;
  title: string;
}

interface ArtistAlbumDetail {
  id: string;
  title: string;
  coverArtUrl?: string | null;
  releaseDate?: Date | string | null;
}

interface ArtistExpandedContentProps {
  artist: ArtistSearchResult;
  previewResult?: PreviewEnrichmentResult;
  onClearPreview: (id: string) => void;
  onResetEnrichment: (id: string, type: 'artist') => void;
  onDeleteArtist: (id: string, name: string) => void;
  onImagePreview: (preview: ImagePreview) => void;
  onNavigateToAlbum: (albumId: string) => void;
}

export function ArtistExpandedContent({
  artist,
  previewResult,
  onClearPreview,
  onResetEnrichment,
  onDeleteArtist,
  onImagePreview,
  onNavigateToAlbum,
}: ArtistExpandedContentProps) {
  const { data, isLoading, error } = useGetArtistDetailsQuery(
    { id: artist.id },
    { enabled: !!artist.id }
  );

  const artistDetails = data?.artist;

  if (isLoading) {
    return <ArtistExpandedSkeleton />;
  }

  if (error || !artistDetails) {
    return (
      <div className='p-4 text-center text-zinc-400'>
        Failed to load artist details
      </div>
    );
  }

  return (
    <div className='p-4 bg-zinc-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
      {/* Metadata Section */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Database ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>{artistDetails.id}</div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>MusicBrainz ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>
            {artistDetails.musicbrainzId || 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Spotify ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>
            {artist.spotifyId ? (
              <a
                href={`https://open.spotify.com/artist/${artist.spotifyId}`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-green-400 hover:text-green-300 hover:underline'
              >
                {artist.spotifyId}
              </a>
            ) : (
              'N/A'
            )}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Discogs ID</div>
          <div className='text-sm text-zinc-300 font-mono text-xs'>
            {artistDetails.discogsId || 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Country</div>
          <div className='text-sm text-zinc-300'>{artistDetails.countryCode || 'N/A'}</div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Formed Year</div>
          <div className='text-sm text-zinc-300'>{artistDetails.formedYear || 'N/A'}</div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Listeners (Last.fm)</div>
          <div className='text-sm text-zinc-300'>
            {artistDetails.listeners ? artistDetails.listeners.toLocaleString() : 'N/A'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Last Enriched</div>
          <div className='text-sm text-zinc-300'>
            {artistDetails.lastEnriched
              ? formatDistanceToNow(new Date(artistDetails.lastEnriched), {
                  addSuffix: true,
                })
              : 'Never'}
          </div>
        </div>
        <div>
          <div className='text-xs text-zinc-500 uppercase mb-1'>Image Status</div>
          <div className='text-sm text-zinc-300 flex items-center gap-2'>
            <span>
              {artistDetails.imageUrl && artistDetails.cloudflareImageId
                ? '✓ Has images'
                : '✗ Missing images'}
            </span>
            {(artistDetails.imageUrl || artistDetails.cloudflareImageId) && (
              <button
                className='text-zinc-500 hover:text-zinc-200 transition-colors'
                onClick={() =>
                  onImagePreview({
                    url: artistDetails.imageUrl || '',
                    cloudflareId: artistDetails.cloudflareImageId,
                    title: artistDetails.name,
                  })
                }
                title='View image'
              >
                <Eye className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
          {artistDetails.imageUrl && (
            <div
              className='mt-1 text-xs text-zinc-500 truncate max-w-xs'
              title={artistDetails.imageUrl}
            >
              {artistDetails.imageUrl}
            </div>
          )}
        </div>
      </div>

      {/* Delete Artist Button */}
      <div className='flex justify-end pt-2 border-t border-zinc-700'>
        <Button
          onClick={() => onDeleteArtist(artistDetails.id, artistDetails.name)}
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
          Delete Artist
        </Button>
      </div>

      {/* Albums Section */}
      {artistDetails.albums && artistDetails.albums.length > 0 && (
        <div>
          <div className='text-sm font-semibold text-white mb-2 flex items-center gap-2'>
            <Disc className='h-4 w-4' />
            Albums ({artistDetails.albums.length})
          </div>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto'>
            {artistDetails.albums.map((album: ArtistAlbumDetail) => (
              <div
                key={album.id}
                className='flex items-center gap-2 p-2 bg-zinc-900/50 rounded text-xs cursor-pointer hover:bg-zinc-800/50 transition-colors'
                onClick={() => onNavigateToAlbum(album.id)}
              >
                {album.coverArtUrl && (
                  <img
                    src={album.coverArtUrl}
                    alt={album.title}
                    className='h-10 w-10 rounded'
                  />
                )}
                <div className='flex-1 min-w-0'>
                  <div className='text-zinc-300 truncate'>{album.title}</div>
                  <div className='text-zinc-500 text-xs'>
                    {album.releaseDate
                      ? new Date(album.releaseDate).getFullYear()
                      : 'Unknown'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!artistDetails.albums || artistDetails.albums.length === 0) && (
        <div className='text-center py-4 text-zinc-500 text-sm'>
          <Music className='h-8 w-8 mx-auto mb-2 opacity-50' />
          No albums available
        </div>
      )}

      {/* Preview Enrichment Results */}
      {previewResult && (
        <EnrichmentPreviewResults
          result={previewResult}
          onClose={() => onClearPreview(artist.id)}
          entityType='artist'
        />
      )}

      {/* Enrichment Logs Section */}
      <div className='border-t border-zinc-700 pt-4'>
        <EnrichmentLogTable
          entityType={EnrichmentEntityType.Artist}
          entityId={artist.id}
          limit={10}
          enrichmentStatus={artist.enrichmentStatus}
          onReset={() => onResetEnrichment(artist.id, 'artist')}
        />
      </div>
    </div>
  );
}
