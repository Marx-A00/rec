'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Share2, MoreHorizontal, User, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import AlbumImage from '@/components/ui/AlbumImage';
import { Button } from '@/components/ui/button';
import Toast, { useToast } from '@/components/ui/toast';
import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import { useNavigation } from '@/hooks/useNavigation';
import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';
import { Release } from '@/types/album';
import { CollectionAlbum } from '@/types/collection';
import { Album } from '@/types/album';
import { sanitizeArtistName } from '@/lib/utils';
import { graphqlClient } from '@/lib/graphql-client';
import {
  useAddToListenLaterMutation,
  GetArtistByMusicBrainzIdDocument,
  type GetArtistByMusicBrainzIdQuery,
} from '@/generated/graphql';

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Release | CollectionAlbum | null;
  isExiting: boolean;
  onNavigateToAlbum?: (albumId: string) => void;
}

function isCollectionAlbum(
  data: Release | CollectionAlbum | null
): data is CollectionAlbum {
  return data !== null && 'albumTitle' in data && 'albumArtist' in data;
}

function isRelease(data: Release | CollectionAlbum | null): data is Release {
  return (
    data !== null &&
    'title' in data &&
    ('thumb' in data || 'basic_information' in data)
  );
}

export default function AlbumModal({
  isOpen,
  onClose,
  data,
  isExiting,
  onNavigateToAlbum,
}: AlbumModalProps) {
  const [highQualityImageUrl, setHighQualityImageUrl] = useState<string | null>(
    null
  );
  const router = useRouter();
  const {} = useNavigation();
  const { toast, showToast, hideToast } = useToast();
  const { openDrawer } = useRecommendationDrawerContext();
  const queryClient = useQueryClient();
  const addToListenLater = useAddToListenLaterMutation({
    onSuccess: () => showToast('Added to Listen Later', 'success'),
    onError: () => showToast('Failed to add to Listen Later', 'error'),
  });

  const isMasterRelease = useMemo(
    () => isRelease(data) && data.type === 'master',
    [data]
  );

  // Get the image URL with proper fallbacks for different data types
  const getImageUrl = () => {
    // For master releases, prefer high-quality image if available
    if (highQualityImageUrl) {
      return highQualityImageUrl;
    }

    // For collection albums, use the stored image URL
    if (isCollectionAlbum(data)) {
      return data.albumImageUrl;
    }

    // For releases, try to get image from various sources
    if (isRelease(data)) {
      // Try thumb first, then basic_information image
      if (data.thumb) {
        return data.thumb;
      }
      if (data.basic_information?.thumb) {
        return data.basic_information.thumb;
      }
      if (data.basic_information?.cover_image) {
        return data.basic_information.cover_image;
      }
    }

    // Fallback to null if no image is available
    return null;
  };

  const getTitle = () => {
    if (isCollectionAlbum(data)) {
      return data.albumTitle;
    } else if (isRelease(data)) {
      return data.title;
    }
    return 'Unknown Title';
  };

  // Get album ID for navigation
  const getAlbumId = () => {
    if (isCollectionAlbum(data)) {
      return data.albumId;
    } else if (isRelease(data)) {
      // BUG TRACE: Log the ID selection logic
      console.log('🚨 AlbumModal getAlbumId - Release data:', {
        id: data.id,
        main_release: data.main_release,
        type: data.type,
        title: data.title,
        selectedId: data.main_release || data.id,
      });

      // ISSUE: This prioritizes main_release over master ID!
      // For masters, we should use data.id (master ID), not main_release!
      if (data.type === 'master') {
        console.log('🟢 AlbumModal - Using MASTER ID for navigation:', data.id);
        return data.id;
      } else {
        console.log(
          '🔵 AlbumModal - Using main_release or fallback ID:',
          data.main_release || data.id
        );
        return data.main_release || data.id;
      }
    }
    return null;
  };

  const getSource = (): 'local' | 'musicbrainz' | 'discogs' | undefined => {
    if (!data) return undefined;
    if (isCollectionAlbum(data)) return 'local'; // Always local for collection albums
    if (isRelease(data)) return (data as any).source as any;
    return undefined;
  };

  const getArtist = () => {
    if (isCollectionAlbum(data)) {
      return data.albumArtist;
    } else if (isRelease(data)) {
      return (
        data.artist ||
        data.basic_information?.artists?.[0]?.name ||
        'Unknown Artist'
      );
    }
    return 'Unknown Artist';
  };

  // Convert Release/CollectionAlbum data to Album format for interactions
  const albumForInteractions = useMemo((): Album | null => {
    if (!data) return null;

    const albumId = getAlbumId();
    if (!albumId) return null;
    const source = getSource();
    const normalizedSource = source
      ? (source.toLowerCase() as 'local' | 'musicbrainz' | 'discogs')
      : undefined;

    if (isCollectionAlbum(data)) {
      return {
        id: String(albumId),
        title: data.albumTitle,
        artists: data.albumArtist
          ? [{ id: data.albumArtistId || '', name: data.albumArtist }]
          : [],
        source: 'local',
        year:
          typeof data.albumYear === 'string'
            ? parseInt(data.albumYear)
            : data.albumYear || undefined,
        image: {
          url: data.albumImageUrl || '',
          width: 300,
          height: 300,
          alt: data.albumTitle,
        },
        label: undefined,
        genre: [],
      };
    } else if (isRelease(data)) {
      console.log('🎨 [AlbumModal] albumForInteractions - Release data:', {
        basicInfoArtists: data.basic_information?.artists,
        artist: data.artist,
      });

      return {
        id: String(albumId),
        title: data.title,
        artists:
          data.basic_information?.artists &&
          data.basic_information.artists.length > 0
            ? data.basic_information.artists.map(a => {
                const artistId = a.id ? String(a.id) : '';
                console.log('🎯 [AlbumModal] Mapping artist:', {
                  name: a.name,
                  id: a.id,
                  resultId: artistId,
                });
                return {
                  id: artistId,
                  name: a.name,
                };
              })
            : data.artist
              ? [{ id: '', name: data.artist }]
              : [],
        source: normalizedSource,
        musicbrainzId:
          normalizedSource === 'musicbrainz' ? String(data.id) : undefined,
        year: data.year,
        image: {
          url: getImageUrl() || '',
          width: 300,
          height: 300,
          alt: data.title,
        },
        label: Array.isArray(data.label)
          ? data.label.join(', ')
          : data.label?.[0],
        genre: [],
      };
    }

    return null;
  }, [data, highQualityImageUrl]);

  // Album interaction handlers
  // TODO: Performance optimization - Pass currentArtistContext from DiscographyTab
  // to skip the GetArtistByMusicBrainzId lookup when clicking artist button while
  // already viewing that artist's page. Currently cached by React Query for 5min,
  // but could eliminate the query entirely in this scenario.
  const handleArtistClick = async (artistId: string, artistName: string) => {
    console.log('[AlbumModal] handleArtistClick called:', {
      artistId,
      artistName,
      data,
    });

    if (!artistId || artistId === '') {
      console.warn('[AlbumModal] Artist ID is missing or empty:', {
        artistId,
        artistName,
      });
      showToast(`Artist ID not available for ${artistName}`, 'error');
      return;
    }

    try {
      let finalArtistId = artistId;
      let artistSource: string;

      // If album is from local DB (collection album), artists are definitely local
      if (isCollectionAlbum(data)) {
        artistSource = 'local';
      } else {
        // Album is from external source (MusicBrainz/Discogs)
        // Try to find artist in local DB by MusicBrainz ID first
        try {
          const result =
            await queryClient.fetchQuery<GetArtistByMusicBrainzIdQuery>({
              queryKey: ['artistByMusicBrainzId', artistId],
              queryFn: () =>
                graphqlClient.request(GetArtistByMusicBrainzIdDocument, {
                  musicbrainzId: artistId,
                }),
              staleTime: 5 * 60 * 1000, // Cache for 5 minutes
            });

          if (result?.artistByMusicBrainzId?.id) {
            // Found in local DB! Use local ID
            finalArtistId = result.artistByMusicBrainzId.id;
            artistSource = 'local';
            console.log(`[AlbumModal] Found artist locally: ${artistName}`, {
              mbid: artistId,
              localId: finalArtistId,
            });
          } else {
            // Not in local DB, use external source
            const source = getSource();
            artistSource = source?.toLowerCase() || 'musicbrainz';
            console.log(
              `[AlbumModal] Artist not in local DB, using ${artistSource}: ${artistName}`
            );
          }
        } catch (error) {
          // Query failed, fall back to external source
          const source = getSource();
          artistSource = source?.toLowerCase() || 'musicbrainz';
          console.warn(
            '[AlbumModal] Failed to check local DB for artist:',
            error
          );
        }
      }

      // Navigate to artist page with appropriate source
      onClose();
      router.push(`/artists/${finalArtistId}?source=${artistSource}`);
    } catch (error) {
      console.error('Navigation error:', error);
      showToast(
        `Failed to navigate to ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  const handleMakeRecommendation = () => {
    if (!albumForInteractions) {
      showToast('Album data not available for recommendations', 'error');
      return;
    }

    try {
      onClose(); // Close modal first
      openDrawer(albumForInteractions);
    } catch (error) {
      console.error('Failed to open recommendation form:', error);
      showToast('Failed to open recommendation form', 'error');
    }
  };

  const handleShare = async () => {
    try {
      const title = getTitle();
      const artist = getArtist();
      const albumId = getAlbumId();

      if (navigator.share) {
        await navigator.share({
          title: `${title} by ${artist}`,
          text: `Check out this album: ${title}`,
          url: albumId
            ? `${window.location.origin}/albums/${albumId}`
            : window.location.href,
        });
        showToast('Album shared successfully', 'success');
      } else {
        // Fallback to clipboard
        const shareUrl = albumId
          ? `${window.location.origin}/albums/${albumId}`
          : window.location.href;
        await navigator.clipboard.writeText(shareUrl);
        showToast('Album link copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Share failed:', error);
      showToast('Failed to share album', 'error');
    }
  };

  const handleAddToListenLater = async () => {
    if (!albumForInteractions?.id) {
      showToast('Album not available', 'error');
      return;
    }
    try {
      // Prepare album data with artists
      const albumData = {
        title: albumForInteractions.title,
        artists: albumForInteractions.artists.map(artist => ({
          artistName: artist.name,
          artistId: artist.id || undefined,
        })),
        coverImageUrl: albumForInteractions.image?.url || undefined,
        musicbrainzId: albumForInteractions.musicbrainzId || undefined,
        releaseDate: albumForInteractions.year ? `${albumForInteractions.year}-01-01` : undefined,
        totalTracks: albumForInteractions.metadata?.numberOfTracks || undefined,
      };

      await addToListenLater.mutateAsync({
        albumId: albumForInteractions.id,
        albumData,
      });
    } catch {}
  };

  const handleMoreActions = () => {
    showToast('More actions coming soon!', 'success');
  };

  // Enhanced keyboard handling for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Trap focus within modal
      if (event.key === 'Tab') {
        const modal = document.getElementById('album-modal-container');
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the modal title when opened
      setTimeout(() => {
        const titleButton = document.getElementById('album-modal-title');
        if (titleButton && !titleButton.hasAttribute('disabled')) {
          titleButton.focus();
        } else {
          // Focus close button if title is disabled
          const closeButton = document.querySelector(
            '[aria-label="Close album details modal"]'
          ) as HTMLElement;
          closeButton?.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch high-quality image for master releases (skip for MusicBrainz; use existing imageUrl)
  useEffect(() => {
    if (!isOpen || !data) {
      setHighQualityImageUrl(null);
      return;
    }

    // Enhanced high-quality image fetching for master releases
    if (isMasterRelease) {
      const source = getSource();
      const normalizedSource =
        typeof source === 'string' ? source.toLowerCase() : source;
      // For MusicBrainz release-groups (discography), we already have CAA URLs; avoid extra fetch
      if (normalizedSource === 'musicbrainz') {
        return;
      }

      // FIXED: Use same logic as getAlbumId() - for masters, always use master ID!
      const fetchId =
        isRelease(data) && data.type === 'master'
          ? data.id
          : isRelease(data)
            ? data.main_release || data.id
            : data.id;

      console.log(
        '🖼️ AlbumModal - Fetching high-quality image for ID:',
        fetchId,
        'from master:',
        data.id
      );

      const suffix = source ? `?source=${encodeURIComponent(source)}` : '';
      fetch(`/api/albums/${fetchId}${suffix}`)
        .then(res => res.json())
        .then(result => {
          // The API returns the album data directly, not wrapped in {success: true, album: {...}}
          if (result.image && result.image.url) {
            setHighQualityImageUrl(result.image.url);
          }
        })
        .catch(error => {
          console.error('Failed to fetch high-quality image:', error);
        });
    }
  }, [isOpen, data, isMasterRelease]);

  if (!isOpen || !data) return null;

  // Check if album navigation is available
  const isNavigationAvailable = () => {
    const albumId = getAlbumId();
    return albumId !== null && albumId !== undefined;
  };

  // Handle album title click navigation
  const handleAlbumClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const albumId = getAlbumId();
    if (albumId) {
      try {
        // Blur the button to remove focus state
        if (e) {
          e.currentTarget.blur();
        }
        // Close modal first
        onClose();
        // Convert to string to ensure type safety
        const albumIdString = String(albumId);
        // Use custom navigation handler if provided, otherwise use router
        if (onNavigateToAlbum) {
          onNavigateToAlbum(albumIdString);
        } else {
          // Fallback to internal navigation with explicit source
          const source = getSource();
          const suffix = source ? `?source=${encodeURIComponent(source)}` : '';
          router.push(`/albums/${albumIdString}${suffix}`);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Re-open modal if navigation fails
        // onOpen would need to be passed as prop, for now just log the error
      }
    }
  };

  // Enhanced keyboard navigation with better accessibility
  const handleAlbumKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    // Only handle navigation if album ID is available
    if (!isNavigationAvailable()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      // Blur the button to remove focus state
      event.currentTarget.blur();
      handleAlbumClick();
    }
  };

  const renderDetails = () => {
    if (isCollectionAlbum(data)) {
      return (
        <div className='space-y-3 mb-6'>
          {data.albumYear && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Released:</span>{' '}
              {data.albumYear}
            </p>
          )}
          <p className='text-zinc-400'>
            <span className='text-cosmic-latte font-medium'>Added:</span>{' '}
            {new Date(data.addedAt).toLocaleDateString()}
          </p>
          {data.personalRating && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>
                Personal Rating:
              </span>
              <span className='text-emeraled-green ml-2'>
                ★ {data.personalRating}/10
              </span>
            </p>
          )}
        </div>
      );
    } else if (isRelease(data)) {
      return (
        <div className='space-y-3 mb-6'>
          {data.year && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Released:</span>{' '}
              {data.year}
            </p>
          )}
          {data.format && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Format:</span>{' '}
              {Array.isArray(data.format)
                ? data.format.join(', ')
                : data.format}
            </p>
          )}
          {data.label && Array.isArray(data.label) && data.label.length > 0 && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Label:</span>{' '}
              {data.label.join(', ')}
            </p>
          )}
          {data.role && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Role:</span>{' '}
              {data.role}
            </p>
          )}
          {data.type && (
            <p className='text-zinc-400'>
              <span className='text-cosmic-latte font-medium'>Type:</span>{' '}
              <span className='capitalize'>{data.type}</span>
              {data.type === 'master' && (
                <span className='text-emerald-400 ml-2'>(Master Release)</span>
              )}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  return (
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ${
        isExiting ? 'bg-opacity-0' : 'bg-opacity-90'
      }`}
      style={{
        backdropFilter: isExiting ? 'none' : 'blur(4px)',
        transition: isExiting
          ? 'background-color 300ms ease-out, backdrop-filter 0ms ease-out'
          : 'background-color 300ms ease-out, backdrop-filter 150ms ease-out',
      }}
      onClick={e => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role='dialog'
      aria-modal='true'
      aria-labelledby='album-modal-title'
      aria-describedby='album-modal-description'
    >
      <div
        id='album-modal-container'
        className={`flex flex-col lg:flex-row items-center lg:items-start gap-6 max-w-5xl w-full transition-all duration-300 relative ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-4'
            : 'opacity-100 scale-100 translate-y-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          onClick={e => {
            e.currentTarget.blur();
            onClose();
          }}
          className='absolute -top-2 -right-2 z-60 text-cosmic-latte hover:text-white transition-all duration-200 hover:scale-110 focus:outline-none rounded-full p-1'
          aria-label='Close album details modal'
          role='button'
          tabIndex={0}
        >
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>

        {/* Zoomed Album Cover */}
        <div className='flex-shrink-0 lg:mr-2'>
          <div className='w-80 h-80 lg:w-96 lg:h-96 bg-zinc-800 rounded-lg border-2 border-zinc-700 shadow-2xl overflow-hidden relative'>
            <AlbumImage
              src={getImageUrl()}
              alt={`${getTitle()} by ${getArtist()}`}
              width={384}
              height={384}
              priority
              className='w-full h-full object-cover'
              sizes='(max-width: 1024px) 320px, 384px'
              style={{ aspectRatio: '1/1' }}
            />
          </div>
        </div>

        {/* Album Details */}
        <div className='flex-1 text-center lg:text-left'>
          <button
            id='album-modal-title'
            onClick={handleAlbumClick}
            onKeyDown={handleAlbumKeyDown}
            disabled={!isNavigationAvailable()}
            className={`text-3xl lg:text-4xl font-bold mb-2 transition-all duration-200 rounded-md px-1 focus:outline-none ${
              isNavigationAvailable()
                ? 'text-cosmic-latte hover:underline cursor-pointer hover:text-white'
                : 'text-zinc-500 cursor-not-allowed'
            }`}
            tabIndex={isNavigationAvailable() ? 0 : -1}
            aria-label={
              isNavigationAvailable()
                ? `Navigate to album details for ${getTitle()}`
                : `${getTitle()} - Album details not available`
            }
            aria-disabled={!isNavigationAvailable()}
            role='button'
          >
            {getTitle()}
          </button>
          <div className='text-xl mb-4' id='album-modal-description'>
            <span className='text-zinc-400'>By </span>
            <button
              onClick={() => {
                const artist = albumForInteractions?.artists?.[0];
                if (artist) {
                  handleArtistClick(artist.id, artist.name);
                }
              }}
              className='text-cosmic-latte hover:underline cursor-pointer hover:text-white transition-all duration-200 rounded-md px-1 focus:outline-none'
              aria-label={`Navigate to artist ${getArtist()}`}
            >
              {getArtist()}
            </button>
          </div>

          {/* Album Interactions */}
          {albumForInteractions && (
            <div className='mb-4'>
              {/* Artist buttons */}
              {/* TECHNICAL DEBT: Collection albums don't store artist IDs, so we can't navigate to artists.
                  This should be fixed by either:
                  1. Adding albumArtistDiscogsId to CollectionAlbum model in the database
                  2. Fetching artist data from Discogs API when needed
                  For now, we hide artist buttons for collection albums to avoid broken navigation */}
              {!isCollectionAlbum(data) &&
                albumForInteractions.artists &&
                albumForInteractions.artists.length > 0 && (
                  <div className='space-y-1 mb-4'>
                    <h3 className='text-xs font-medium text-zinc-400'>
                      Artists
                    </h3>
                    <div className='flex flex-wrap gap-1.5'>
                      {albumForInteractions.artists.map((artist, index) => (
                        <Button
                          key={`${artist.id}-${index}`}
                          variant='secondary'
                          size='sm'
                          onClick={() =>
                            handleArtistClick(artist.id, artist.name)
                          }
                          className='gap-1.5 text-xs h-7 px-2'
                          aria-label={`View artist ${sanitizeArtistName(artist.name)}`}
                        >
                          <User className='h-3 w-3' />
                          {sanitizeArtistName(artist.name)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className='flex flex-wrap gap-2 justify-center lg:justify-start'>
                <Button
                  variant='primary'
                  size='sm'
                  onClick={handleMakeRecommendation}
                  className='gap-1.5 text-sm'
                  aria-label='Create a recommendation for this album'
                >
                  <Heart className='h-3.5 w-3.5' />
                  Make Rec
                </Button>

                <AddToCollectionButton
                  album={albumForInteractions}
                  size='sm'
                  variant='default'
                />

                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleAddToListenLater}
                  className='gap-1.5 text-sm'
                  aria-label='Add to Listen Later'
                >
                  <Clock className='h-3.5 w-3.5' />
                  Listen Later
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleShare}
                  className='gap-1.5 text-sm'
                  aria-label='Share this album'
                >
                  <Share2 className='h-3.5 w-3.5' />
                  Share
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleMoreActions}
                  className='gap-1.5 text-sm'
                  aria-label='More actions for this album'
                >
                  <MoreHorizontal className='h-3.5 w-3.5' />
                  More
                </Button>
              </div>
            </div>
          )}

          {renderDetails()}
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
