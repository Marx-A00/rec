// src/app/admin/music-database/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Database,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  Music,
  Album as AlbumIcon,
  User,
  Zap,
  Filter,
  Download,
  Upload,
  TrendingUp,
  Calendar,
  Info,
  ChevronDown,
  ChevronRight,
  Disc,
  Hash,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  useSearchAlbumsAdminQuery,
  useSearchArtistsAdminQuery,
  useSearchTracksAdminQuery,
  useGetDatabaseStatsQuery,
  useGetAlbumDetailsAdminQuery,
  useGetArtistDetailsQuery,
} from '@/generated/graphql';

interface AlbumSearchResult {
  id: string;
  title: string;
  releaseDate: string | null;
  coverArtUrl: string | null;
  musicbrainzId: string | null;
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  enrichmentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastEnriched: string | null;
  needsEnrichment: boolean;
  artists: Array<{
    artist: {
      id: string;
      name: string;
    };
    role: string;
  }>;
  trackCount: number;
  label: string | null;
}

interface ArtistSearchResult {
  id: string;
  name: string;
  musicbrainzId: string | null;
  imageUrl: string | null;
  dataQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  enrichmentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastEnriched: string | null;
  needsEnrichment: boolean;
  albumCount: number;
  trackCount: number;
  formedYear: number | null;
  countryCode: string | null;
}

interface TrackSearchResult {
  id: string;
  title: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number | null;
  isrc: string | null;
  album: {
    id: string;
    title: string;
    coverArtUrl: string | null;
  };
  artists: Array<{
    artist: {
      id: string;
      name: string;
    };
    role: string;
  }>;
}

interface DatabaseStats {
  totalAlbums: number;
  totalArtists: number;
  totalTracks: number;
  albumsNeedingEnrichment: number;
  artistsNeedingEnrichment: number;
  recentlyEnriched: number;
  failedEnrichments: number;
  averageDataQuality: number;
}

type SearchType = 'albums' | 'artists' | 'tracks';
type EnrichmentPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export default function MusicDatabasePage() {
  const [activeTab, setActiveTab] = useState<SearchType>('albums');
  const [searchQuery, setSearchQuery] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    dataQuality: 'all',
    enrichmentStatus: 'all',
    needsEnrichment: false,
  });
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<{ id: string; title: string } | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Calculate skip for pagination
  const skip = (page - 1) * itemsPerPage;

  // Fetch database stats
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useGetDatabaseStatsQuery();

  // Search albums with React Query
  const {
    data: albumsData,
    isLoading: albumsLoading,
    refetch: refetchAlbums,
  } = useSearchAlbumsAdminQuery(
    {
      query: debouncedSearchQuery || undefined,
      id: idSearch.trim() || undefined,
      dataQuality:
        filters.dataQuality !== 'all' ? filters.dataQuality : undefined,
      enrichmentStatus:
        filters.enrichmentStatus !== 'all'
          ? filters.enrichmentStatus
          : undefined,
      needsEnrichment: filters.needsEnrichment || undefined,
      sortBy: sortBy,
      sortOrder: sortOrder,
      skip: skip,
      limit: itemsPerPage + 1, // Request +1 to check if there are more results
    },
    {
      enabled: activeTab === 'albums',
      refetchInterval: query => {
        // Enable polling if any albums are in progress
        const albums = query.state.data?.searchAlbums || [];
        const hasInProgress = albums.some(
          (a: any) => a.enrichmentStatus === 'IN_PROGRESS'
        );
        return hasInProgress ? 3000 : false; // Poll every 3 seconds
      },
    }
  );

  // Search artists with React Query
  const {
    data: artistsData,
    isLoading: artistsLoading,
    refetch: refetchArtists,
  } = useSearchArtistsAdminQuery(
    {
      query: debouncedSearchQuery || undefined,
      dataQuality:
        filters.dataQuality !== 'all' ? filters.dataQuality : undefined,
      enrichmentStatus:
        filters.enrichmentStatus !== 'all'
          ? filters.enrichmentStatus
          : undefined,
      needsEnrichment: filters.needsEnrichment || undefined,
      sortBy: sortBy,
      sortOrder: sortOrder,
      skip: skip,
      limit: itemsPerPage + 1,
    },
    {
      enabled: activeTab === 'artists',
      refetchInterval: query => {
        const artists = query.state.data?.searchArtists || [];
        const hasInProgress = artists.some(
          (a: any) => a.enrichmentStatus === 'IN_PROGRESS'
        );
        return hasInProgress ? 3000 : false;
      },
    }
  );

  // Search tracks with React Query
  const {
    data: tracksData,
    isLoading: tracksLoading,
    refetch: refetchTracks,
  } = useSearchTracksAdminQuery(
    {
      query: debouncedSearchQuery || '',
      skip: skip,
      limit: itemsPerPage + 1,
    },
    {
      enabled: activeTab === 'tracks',
    }
  );

  // Extract results and check for more pages
  const albums = albumsData?.searchAlbums || [];
  const artists = artistsData?.searchArtists || [];
  const tracks = tracksData?.searchTracks || [];
  const stats = statsData?.databaseStats;

  const hasMore =
    (activeTab === 'albums' && albums.length > itemsPerPage) ||
    (activeTab === 'artists' && artists.length > itemsPerPage) ||
    (activeTab === 'tracks' && tracks.length > itemsPerPage);

  // Display results (remove the extra item used for pagination check)
  const displayAlbums = albums.slice(0, itemsPerPage);
  const displayArtists = artists.slice(0, itemsPerPage);
  const displayTracks = tracks.slice(0, itemsPerPage);

  // Check if any items are currently being enriched
  const hasInProgressAlbums = displayAlbums.some(
    (album: any) => album.enrichmentStatus === 'IN_PROGRESS'
  );
  const hasInProgressArtists = displayArtists.some(
    (artist: any) => artist.enrichmentStatus === 'IN_PROGRESS'
  );

  // Loading state
  const loading = albumsLoading || artistsLoading || tracksLoading;

  // Get current results based on active tab
  const getCurrentResults = () => {
    if (activeTab === 'albums') return displayAlbums;
    if (activeTab === 'artists') return displayArtists;
    return displayTracks;
  };

  const handleDeleteAlbum = async () => {
    if (!albumToDelete) return;

    try {
      const response = await fetch('/api/admin/albums/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: albumToDelete.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to delete album');
      }

      toast.success(`Successfully deleted "${albumToDelete.title}"`);

      // Collapse the row and refetch data
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.delete(albumToDelete.id);
        return next;
      });

      setDeleteModalOpen(false);
      setAlbumToDelete(null);
      refetchAlbums();
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete album';
      toast.error(errorMessage);
    }
  };

  const handleEnrichItem = async (
    itemId: string,
    type: 'album' | 'artist',
    priority: EnrichmentPriority = 'MEDIUM'
  ) => {
    try {
      const mutation =
        type === 'album' ? 'triggerAlbumEnrichment' : 'triggerArtistEnrichment';
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation TriggerEnrichment {
              ${mutation}(id: "${itemId}", priority: ${priority}) {
                success
                jobId
                message
              }
            }
          `,
          variables: { itemId, priority },
        }),
      });

      const data = await response.json();
      if (data.data?.[mutation]?.success) {
        toast.success(`Enrichment job queued for ${type}`);
        // Refresh the search results based on active tab
        if (activeTab === 'albums') {
          refetchAlbums();
        } else if (activeTab === 'artists') {
          refetchArtists();
        }
      } else {
        throw new Error(
          data.data?.[mutation]?.message || 'Failed to queue enrichment'
        );
      }
    } catch (error) {
      toast.error(`Failed to queue enrichment: ${error}`);
    }
  };

  const handleBatchEnrichment = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    const itemsArray = Array.from(selectedItems);
    const type =
      activeTab === 'albums'
        ? 'album'
        : activeTab === 'artists'
          ? 'artist'
          : null;

    if (!type) {
      toast.error('Batch enrichment not available for tracks');
      return;
    }

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation BatchEnrichment {
              batchEnrichment(
                ids: ${JSON.stringify(itemsArray)},
                type: "${type.toUpperCase()}",
                priority: MEDIUM
              ) {
                success
                jobsQueued
                message
              }
            }
          `,
        }),
      });

      const data = await response.json();
      if (data.data?.batchEnrichment?.success) {
        toast.success(
          `${data.data.batchEnrichment.jobsQueued} enrichment jobs queued`
        );
        setSelectedItems(new Set());
        // Refresh the search results based on active tab
        if (activeTab === 'albums') {
          refetchAlbums();
        } else if (activeTab === 'artists') {
          refetchArtists();
        }
      } else {
        throw new Error(
          data.data?.batchEnrichment?.message ||
            'Failed to queue batch enrichment'
        );
      }
    } catch (error) {
      toast.error(`Failed to queue batch enrichment: ${error}`);
    }
  };

  const handleSelectAll = () => {
    const currentResults = getCurrentResults();
    if (selectedItems.size === currentResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentResults.map((item: any) => item.id)));
    }
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      HIGH: 'bg-green-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-red-500',
    };
    return (
      <Badge
        className={colors[quality as keyof typeof colors] || 'bg-gray-500'}
      >
        {quality}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'IN_PROGRESS':
        return <Clock className='h-4 w-4 text-yellow-500 animate-pulse' />;
      case 'FAILED':
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      default:
        return <Info className='h-4 w-4 text-zinc-400' />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setExpandedRows(new Set()); // Clear expanded rows when changing pages
  };

  const handleTabChange = (newTab: SearchType) => {
    setActiveTab(newTab);
    setPage(1); // Reset to page 1 when switching tabs
    setExpandedRows(new Set()); // Clear expanded rows
  };

  // Pagination component
  const PaginationControls = () => {
    const totalResults = getCurrentResults().length;
    const showPagination = totalResults > 0 || page > 1;

    if (!showPagination) return null;

    return (
      <div className='flex items-center justify-between px-4 py-3 border-t border-zinc-800'>
        <div className='text-sm text-zinc-400'>
          Page {page} {hasMore && '• More results available'}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(1)}
            disabled={page === 1 || loading}
            className='text-white border-zinc-700 hover:bg-zinc-700'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loading}
            className='text-white border-zinc-700 hover:bg-zinc-700'
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='px-3 text-sm text-zinc-300'>Page {page}</span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasMore || loading}
            className='text-white border-zinc-700 hover:bg-zinc-700'
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    );
  };

  // Component for expanded album details
  const AlbumExpandedContent = ({ album }: { album: AlbumSearchResult }) => {
    const [albumDetails, setAlbumDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(true);

    useEffect(() => {
      const fetchAlbumDetails = async () => {
        try {
          const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query GetAlbumDetails($id: UUID!) {
                  album(id: $id) {
                    id
                    title
                    musicbrainzId
                    releaseDate
                    label
                    barcode
                    dataQuality
                    enrichmentStatus
                    lastEnriched
                    tracks {
                      id
                      title
                      trackNumber
                      discNumber
                      durationMs
                      isrc
                    }
                  }
                }
              `,
              variables: { id: album.id },
            }),
          });
          const data = await response.json();
          if (data.data?.album) {
            setAlbumDetails(data.data.album);
          }
        } catch (error) {
          console.error('Failed to fetch album details:', error);
        } finally {
          setLoadingDetails(false);
        }
      };

      fetchAlbumDetails();
    }, [album.id]);

    if (loadingDetails) {
      return (
        <div className='p-4 text-center text-zinc-400'>
          <RefreshCcw className='h-5 w-5 animate-spin mx-auto mb-2' />
          Loading details...
        </div>
      );
    }

    if (!albumDetails) {
      return (
        <div className='p-4 text-center text-zinc-400'>
          Failed to load album details
        </div>
      );
    }

    return (
      <div className='p-4 bg-zinc-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200'>
        {/* Metadata Section */}
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Database ID
            </div>
            <div className='text-sm text-zinc-300 font-mono text-xs'>
              {albumDetails.id}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              MusicBrainz ID
            </div>
            <div className='text-sm text-zinc-300 font-mono text-xs'>
              {albumDetails.musicbrainzId || 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Release Date
            </div>
            <div className='text-sm text-zinc-300'>
              {albumDetails.releaseDate
                ? new Date(albumDetails.releaseDate).toLocaleDateString()
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>Label</div>
            <div className='text-sm text-zinc-300'>
              {albumDetails.label || 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>Barcode</div>
            <div className='text-sm text-zinc-300 font-mono'>
              {albumDetails.barcode || 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Last Enriched
            </div>
            <div className='text-sm text-zinc-300'>
              {albumDetails.lastEnriched
                ? new Date(albumDetails.lastEnriched).toLocaleString()
                : 'Never'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Track Count
            </div>
            <div className='text-sm text-zinc-300'>
              {albumDetails.tracks?.length || 0} tracks
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <div className='flex justify-end pt-4 border-t border-zinc-700'>
          <Button
            onClick={() => {
              setAlbumToDelete({
                id: albumDetails.id,
                title: albumDetails.title,
              });
              setDeleteModalOpen(true);
            }}
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
            <div className='text-sm font-semibold text-white mb-2 flex items-center gap-2'>
              <Disc className='h-4 w-4' />
              Tracks
            </div>
            <div className='space-y-1 max-h-60 overflow-y-auto'>
              {albumDetails.tracks.map((track: any) => (
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
          </div>
        )}

        {(!albumDetails.tracks || albumDetails.tracks.length === 0) && (
          <div className='text-center py-4 text-zinc-500 text-sm'>
            <Music className='h-8 w-8 mx-auto mb-2 opacity-50' />
            No tracks available
          </div>
        )}
      </div>
    );
  };

  // Component for expanded artist details
  const ArtistExpandedContent = ({ artist }: { artist: ArtistSearchResult }) => {
    const { data, isLoading, error } = useGetArtistDetailsQuery(
      { id: artist.id },
      { enabled: !!artist.id }
    );

    const artistDetails = data?.artist;

    if (isLoading) {
      return (
        <div className='p-4 text-center text-zinc-400'>
          <RefreshCcw className='h-5 w-5 animate-spin mx-auto mb-2' />
          Loading details...
        </div>
      );
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
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Database ID
            </div>
            <div className='text-sm text-zinc-300 font-mono text-xs'>
              {artistDetails.id}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              MusicBrainz ID
            </div>
            <div className='text-sm text-zinc-300 font-mono text-xs'>
              {artistDetails.musicbrainzId || 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Country
            </div>
            <div className='text-sm text-zinc-300'>
              {artistDetails.countryCode || 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Formed Year
            </div>
            <div className='text-sm text-zinc-300'>
              {artistDetails.formedYear || 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Listeners (Last.fm)
            </div>
            <div className='text-sm text-zinc-300'>
              {artistDetails.listeners
                ? artistDetails.listeners.toLocaleString()
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Last Enriched
            </div>
            <div className='text-sm text-zinc-300'>
              {artistDetails.lastEnriched
                ? new Date(artistDetails.lastEnriched).toLocaleString()
                : 'Never'}
            </div>
          </div>
          <div>
            <div className='text-xs text-zinc-500 uppercase mb-1'>
              Image Status
            </div>
            <div className='text-sm text-zinc-300'>
              {artistDetails.imageUrl && artistDetails.cloudflareImageId
                ? '✓ Has images'
                : '✗ Missing images'}
            </div>
          </div>
        </div>

        {/* Albums Section */}
        {artistDetails.albums && artistDetails.albums.length > 0 && (
          <div>
            <div className='text-sm font-semibold text-white mb-2 flex items-center gap-2'>
              <Disc className='h-4 w-4' />
              Albums ({artistDetails.albums.length})
            </div>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto'>
              {artistDetails.albums.map((album: any) => (
                <div
                  key={album.id}
                  className='flex items-center gap-2 p-2 bg-zinc-900/50 rounded text-xs'
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
      </div>
    );
  };

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Music Database</h1>
        <p className='text-zinc-400 mt-1'>
          Search, manage, and enrich music metadata
        </p>
        {(hasInProgressAlbums || hasInProgressArtists) && (
          <div className='mt-3 flex items-center gap-2 text-sm text-yellow-400'>
            <RefreshCcw className='h-4 w-4 animate-spin' />
            <span>
              Auto-refreshing every 3 seconds -{' '}
              {hasInProgressAlbums &&
                `${displayAlbums.filter((a: any) => a.enrichmentStatus === 'IN_PROGRESS').length} album(s)`}
              {hasInProgressAlbums && hasInProgressArtists && ' and '}
              {hasInProgressArtists &&
                `${displayArtists.filter((a: any) => a.enrichmentStatus === 'IN_PROGRESS').length} artist(s)`}{' '}
              currently enriching
            </span>
          </div>
        )}
      </div>

      {/* Database Stats */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Total Albums
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {stats.totalAlbums.toLocaleString()}
              </div>
              <p className='text-xs text-zinc-500'>
                {stats.albumsNeedingEnrichment} need enrichment
              </p>
            </CardContent>
          </Card>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Total Artists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {stats.totalArtists.toLocaleString()}
              </div>
              <p className='text-xs text-zinc-500'>
                {stats.artistsNeedingEnrichment} need enrichment
              </p>
            </CardContent>
          </Card>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Total Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {stats.totalTracks.toLocaleString()}
              </div>
              <p className='text-xs text-zinc-500'>
                {stats.recentlyEnriched} enriched today
              </p>
            </CardContent>
          </Card>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-white'>
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-white'>
                {(stats.averageDataQuality * 100).toFixed(0)}%
              </div>
              <p className='text-xs text-zinc-500'>
                {stats.failedEnrichments} failed enrichments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className='mb-6 bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4' />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                />
              </div>
              <div className='relative flex-1'>
                <Hash className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4' />
                <Input
                  placeholder='Or search by ID...'
                  value={idSearch}
                  onChange={e => {
                    const value = e.target.value;
                    setIdSearch(value);
                    // Clear text search when using ID search
                    if (value.trim()) {
                      setSearchQuery('');
                    }
                  }}
                  className='pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 font-mono text-sm'
                />
              </div>
              <Button
                onClick={() => {
                  if (activeTab === 'albums') refetchAlbums();
                  else if (activeTab === 'artists') refetchArtists();
                  else if (activeTab === 'tracks') refetchTracks();
                }}
                disabled={loading}
                className='bg-zinc-700 hover:bg-zinc-600 text-white'
              >
                {loading ? (
                  <RefreshCcw className='h-4 w-4 animate-spin' />
                ) : (
                  'Search'
                )}
              </Button>
            </div>

            <div className='flex gap-2 flex-wrap'>
              <Select
                value={filters.dataQuality}
                onValueChange={(value: string) =>
                  setFilters(prev => ({ ...prev, dataQuality: value }))
                }
              >
                <SelectTrigger className='w-[180px] bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue placeholder='Data Quality' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Quality</SelectItem>
                  <SelectItem value='HIGH'>High Quality</SelectItem>
                  <SelectItem value='MEDIUM'>Medium Quality</SelectItem>
                  <SelectItem value='LOW'>Low Quality</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.enrichmentStatus}
                onValueChange={(value: string) =>
                  setFilters(prev => ({ ...prev, enrichmentStatus: value }))
                }
              >
                <SelectTrigger className='w-[180px] bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue placeholder='Enrichment Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='COMPLETED'>Completed</SelectItem>
                  <SelectItem value='IN_PROGRESS'>In Progress</SelectItem>
                  <SelectItem value='PENDING'>Pending</SelectItem>
                  <SelectItem value='FAILED'>Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={filters.needsEnrichment ? 'default' : 'outline'}
                onClick={() =>
                  setFilters(prev => ({
                    ...prev,
                    needsEnrichment: !prev.needsEnrichment,
                  }))
                }
                className={
                  filters.needsEnrichment
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                    : 'text-white border-zinc-700 hover:bg-zinc-700'
                }
              >
                <Filter className='h-4 w-4 mr-2' />
                Needs Enrichment
              </Button>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className='w-[180px] bg-zinc-800 border-zinc-700 text-white'>
                  <SelectValue placeholder='Sort By' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='title'>Title/Name</SelectItem>
                  <SelectItem value='releaseDate'>Release Date</SelectItem>
                  <SelectItem value='lastEnriched'>Last Enriched</SelectItem>
                  <SelectItem value='dataQuality'>Data Quality</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant='outline'
                size='icon'
                onClick={() =>
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                }
                className='text-white border-zinc-700 hover:bg-zinc-700'
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={value => handleTabChange(value as SearchType)}
      >
        <TabsList className='grid w-full grid-cols-3 mb-4 bg-zinc-900 border border-zinc-800'>
          <TabsTrigger value='albums' className='flex items-center gap-2'>
            <AlbumIcon className='h-4 w-4' />
            Albums
          </TabsTrigger>
          <TabsTrigger value='artists' className='flex items-center gap-2'>
            <User className='h-4 w-4' />
            Artists
          </TabsTrigger>
          <TabsTrigger value='tracks' className='flex items-center gap-2'>
            <Music className='h-4 w-4' />
            Tracks
          </TabsTrigger>
        </TabsList>

        {/* Action Bar */}
        {(activeTab === 'albums' || activeTab === 'artists') &&
          getCurrentResults().length > 0 && (
            <div className='mb-4 flex gap-2'>
              <Button
                variant='outline'
                onClick={handleSelectAll}
                className='text-white border-zinc-700 hover:bg-zinc-700'
              >
                {selectedItems.size === getCurrentResults().length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
              <Button
                onClick={handleBatchEnrichment}
                disabled={selectedItems.size === 0}
                className='bg-zinc-700 hover:bg-zinc-600 text-white'
              >
                <Zap className='h-4 w-4 mr-2' />
                Enrich Selected ({selectedItems.size})
              </Button>
            </div>
          )}

        {/* Albums Tab */}
        <TabsContent value='albums'>
          <Card className='bg-zinc-900 border-zinc-800'>
            {displayAlbums.length > 0 && (
              <div className='px-4 pt-3 pb-2 border-b border-zinc-800'>
                <p className='text-xs text-zinc-500 flex items-center gap-1'>
                  <Info className='h-3 w-3' />
                  Click on any row to view detailed metadata and tracks
                </p>
              </div>
            )}
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-12 text-zinc-400'>
                      <input
                        type='checkbox'
                        checked={
                          selectedItems.size === displayAlbums.length &&
                          displayAlbums.length > 0
                        }
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className='text-zinc-400'>Album</TableHead>
                    <TableHead className='text-zinc-400'>Artists</TableHead>
                    <TableHead className='text-zinc-400'>
                      Release Date
                    </TableHead>
                    <TableHead className='text-zinc-400'>Tracks</TableHead>
                    <TableHead className='text-zinc-400'>Quality</TableHead>
                    <TableHead className='text-zinc-400'>Status</TableHead>
                    <TableHead className='text-zinc-400'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayAlbums.map((album: any) => (
                    <React.Fragment key={album.id}>
                      <TableRow
                        className='border-b border-zinc-800 hover:bg-zinc-800/10 cursor-pointer transition-colors'
                        onClick={e => {
                          // Don't toggle if clicking checkbox or action button
                          if (
                            (e.target as HTMLElement).closest(
                              'input[type="checkbox"], button'
                            )
                          ) {
                            return;
                          }
                          toggleExpanded(album.id);
                        }}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <input
                            type='checkbox'
                            checked={selectedItems.has(album.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedItems);
                              if (newSelected.has(album.id)) {
                                newSelected.delete(album.id);
                              } else {
                                newSelected.add(album.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {expandedRows.has(album.id) ? (
                              <ChevronDown className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                            ) : (
                              <ChevronRight className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                            )}
                            {album.coverArtUrl && (
                              <img
                                src={album.coverArtUrl}
                                alt={album.title}
                                className='h-10 w-10 rounded'
                              />
                            )}
                            <div>
                              <div className='font-medium text-white'>
                                {album.title}
                              </div>
                              {album.label && (
                                <div className='text-xs text-zinc-500'>
                                  {album.label}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='text-zinc-300'>
                          {album.artists
                            .slice(0, 2)
                            .map((a: any) => a.artist.name)
                            .join(', ')}
                          {album.artists.length > 2 &&
                            ` +${album.artists.length - 2}`}
                        </TableCell>
                        <TableCell className='text-zinc-300'>
                          {album.releaseDate
                            ? new Date(album.releaseDate).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className='text-zinc-300'>
                          {album.trackCount || '-'}
                        </TableCell>
                        <TableCell>
                          {getQualityBadge(album.dataQuality)}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            {getStatusIcon(album.enrichmentStatus)}
                            <span className='text-xs text-zinc-300'>
                              {album.enrichmentStatus}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleEnrichItem(album.id, 'album')}
                            disabled={
                              album.enrichmentStatus === 'IN_PROGRESS' ||
                              !album.needsEnrichment
                            }
                            className='text-white border-zinc-700 hover:bg-zinc-700 disabled:opacity-50'
                          >
                            <RefreshCcw className='h-3 w-3 mr-1' />
                            Enrich
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(album.id) && (
                        <TableRow key={`${album.id}-expanded`}>
                          <TableCell colSpan={8} className='p-0 border-none'>
                            <AlbumExpandedContent album={album} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {displayAlbums.length === 0 && !loading && (
                <div className='text-center py-8 text-zinc-500'>
                  {searchQuery ? 'No albums found' : 'Loading albums...'}
                </div>
              )}
            </CardContent>
            <PaginationControls />
          </Card>
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value='artists'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-12 text-zinc-400'>
                      <input
                        type='checkbox'
                        checked={
                          selectedItems.size === displayArtists.length &&
                          displayArtists.length > 0
                        }
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className='text-zinc-400'>Artist</TableHead>
                    <TableHead className='text-zinc-400'>Country</TableHead>
                    <TableHead className='text-zinc-400'>Formed</TableHead>
                    <TableHead className='text-zinc-400'>Albums</TableHead>
                    <TableHead className='text-zinc-400'>Tracks</TableHead>
                    <TableHead className='text-zinc-400'>Quality</TableHead>
                    <TableHead className='text-zinc-400'>Status</TableHead>
                    <TableHead className='text-zinc-400'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayArtists.map((artist: any) => (
                    <React.Fragment key={artist.id}>
                      <TableRow
                        className='border-b border-zinc-800 hover:bg-zinc-800/10 cursor-pointer transition-colors'
                        onClick={e => {
                          // Don't toggle if clicking checkbox or action button
                          if (
                            (e.target as HTMLElement).closest(
                              'input[type="checkbox"], button'
                            )
                          ) {
                            return;
                          }
                          toggleExpanded(artist.id);
                        }}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <input
                            type='checkbox'
                            checked={selectedItems.has(artist.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedItems);
                              if (newSelected.has(artist.id)) {
                                newSelected.delete(artist.id);
                              } else {
                                newSelected.add(artist.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {expandedRows.has(artist.id) ? (
                              <ChevronDown className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                            ) : (
                              <ChevronRight className='h-4 w-4 text-zinc-400 flex-shrink-0' />
                            )}
                            {artist.imageUrl && (
                              <img
                                src={artist.imageUrl}
                                alt={artist.name}
                                className='h-10 w-10 rounded-full'
                              />
                            )}
                            <div className='font-medium text-white'>
                              {artist.name}
                            </div>
                          </div>
                        </TableCell>
                      <TableCell className='text-zinc-300'>
                        {artist.countryCode || '-'}
                      </TableCell>
                      <TableCell className='text-zinc-300'>
                        {artist.formedYear || '-'}
                      </TableCell>
                      <TableCell className='text-zinc-300'>
                        {artist.albumCount}
                      </TableCell>
                      <TableCell className='text-zinc-300'>
                        {artist.trackCount}
                      </TableCell>
                      <TableCell>
                        {getQualityBadge(artist.dataQuality)}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          {getStatusIcon(artist.enrichmentStatus)}
                          <span className='text-xs text-zinc-300'>
                            {artist.enrichmentStatus}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleEnrichItem(artist.id, 'artist')}
                          disabled={
                            artist.enrichmentStatus === 'IN_PROGRESS' ||
                            !artist.needsEnrichment
                          }
                          className='text-white border-zinc-700 hover:bg-zinc-700 disabled:opacity-50'
                        >
                          <RefreshCcw className='h-3 w-3 mr-1' />
                          Enrich
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(artist.id) && (
                      <TableRow key={`${artist.id}-expanded`}>
                        <TableCell colSpan={8} className='p-0 border-none'>
                          <ArtistExpandedContent artist={artist} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {displayArtists.length === 0 && !loading && (
                <div className='text-center py-8 text-zinc-500'>
                  {searchQuery ? 'No artists found' : 'Loading artists...'}
                </div>
              )}
            </CardContent>
            <PaginationControls />
          </Card>
        </TabsContent>

        {/* Tracks Tab */}
        <TabsContent value='tracks'>
          <Card className='bg-zinc-900 border-zinc-800'>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-zinc-400'>Track</TableHead>
                    <TableHead className='text-zinc-400'>Artists</TableHead>
                    <TableHead className='text-zinc-400'>Album</TableHead>
                    <TableHead className='text-zinc-400'>Track #</TableHead>
                    <TableHead className='text-zinc-400'>Duration</TableHead>
                    <TableHead className='text-zinc-400'>ISRC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTracks.map((track: any) => (
                    <TableRow
                      key={track.id}
                      className='border-b border-zinc-800 hover:bg-zinc-800/50'
                    >
                      <TableCell>
                        <div className='font-medium text-white'>
                          {track.title}
                        </div>
                      </TableCell>
                      <TableCell className='text-zinc-300'>
                        {track.artists
                          .slice(0, 2)
                          .map((a: any) => a.artist.name)
                          .join(', ')}
                        {track.artists.length > 2 &&
                          ` +${track.artists.length - 2}`}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {track.album.coverArtUrl && (
                            <img
                              src={track.album.coverArtUrl}
                              alt={track.album.title}
                              className='h-8 w-8 rounded'
                            />
                          )}
                          <span className='text-sm text-zinc-300'>
                            {track.album.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-zinc-300'>
                        {track.discNumber > 1 && `${track.discNumber}-`}
                        {track.trackNumber}
                      </TableCell>
                      <TableCell className='text-zinc-300'>
                        {formatDuration(track.durationMs)}
                      </TableCell>
                      <TableCell className='text-xs font-mono text-zinc-300'>
                        {track.isrc || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {displayTracks.length === 0 && !loading && (
                <div className='text-center py-8 text-zinc-500'>
                  {searchQuery ? 'No tracks found' : 'Loading tracks...'}
                </div>
              )}
            </CardContent>
            <PaginationControls />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className='mt-6 bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>Quick Actions</CardTitle>
          <CardDescription className='text-zinc-400'>
            Bulk operations and maintenance tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            <Button
              variant='outline'
              className='justify-start text-white border-zinc-700 hover:bg-zinc-700'
            >
              <Upload className='h-4 w-4 mr-2' />
              Import CSV Data
            </Button>
            <Button
              variant='outline'
              className='justify-start text-white border-zinc-700 hover:bg-zinc-700'
            >
              <Download className='h-4 w-4 mr-2' />
              Export Database
            </Button>
            <Button
              variant='outline'
              className='justify-start text-white border-zinc-700 hover:bg-zinc-700'
            >
              <TrendingUp className='h-4 w-4 mr-2' />
              Enrich Popular Items
            </Button>
            <Button
              variant='outline'
              className='justify-start text-white border-zinc-700 hover:bg-zinc-700'
            >
              <Calendar className='h-4 w-4 mr-2' />
              Schedule Enrichment
            </Button>
            <Button
              variant='outline'
              className='justify-start text-white border-zinc-700 hover:bg-zinc-700'
            >
              <Database className='h-4 w-4 mr-2' />
              Database Cleanup
            </Button>
            <Button
              variant='outline'
              className='justify-start text-white border-zinc-700 hover:bg-zinc-700'
            >
              <AlertCircle className='h-4 w-4 mr-2' />
              Retry Failed Jobs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className='bg-zinc-900 border-zinc-800 text-white'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-500'>
              <AlertCircle className='h-5 w-5' />
              Delete Album
            </DialogTitle>
            <DialogDescription className='text-zinc-400'>
              This action cannot be undone. This will permanently delete the album
              and all associated data.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='bg-zinc-800 border border-zinc-700 rounded-lg p-4'>
              <div className='font-semibold text-white mb-2'>
                {albumToDelete?.title}
              </div>
              <div className='text-sm text-zinc-400'>
                Database ID: <span className='font-mono text-xs'>{albumToDelete?.id}</span>
              </div>
            </div>

            <div className='bg-red-950/20 border border-red-900/50 rounded-lg p-4'>
              <div className='font-medium text-red-400 mb-2 flex items-center gap-2'>
                <AlertCircle className='h-4 w-4' />
                Warning
              </div>
              <ul className='text-sm text-red-300/80 space-y-1 list-disc list-inside'>
                <li>Album will be removed from all user collections</li>
                <li>All recommendations referencing this album will be deleted</li>
                <li>All associated tracks and artist relationships will be removed</li>
                <li>This operation cannot be reversed</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteModalOpen(false);
                setAlbumToDelete(null);
              }}
              className='border-zinc-700 text-white hover:bg-zinc-800'
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteAlbum}
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
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
