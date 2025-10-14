// src/app/admin/music-database/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/lib/hooks/useDebounce';

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
  const [searchResults, setSearchResults] = useState<{
    albums: AlbumSearchResult[];
    artists: ArtistSearchResult[];
    tracks: TrackSearchResult[];
  }>({
    albums: [],
    artists: [],
    tracks: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [enrichmentQueue, setEnrichmentQueue] = useState<string[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [filters, setFilters] = useState({
    dataQuality: 'all',
    enrichmentStatus: 'all',
    needsEnrichment: false,
  });
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 50;

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Check if any albums are currently being enriched
  const hasInProgressAlbums = searchResults.albums.some(
    album => album.enrichmentStatus === 'IN_PROGRESS'
  );
  const hasInProgressArtists = searchResults.artists.some(
    artist => artist.enrichmentStatus === 'IN_PROGRESS'
  );

  // Fetch database statistics
  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  // Initial load - fetch albums on mount
  useEffect(() => {
    performSearch();
  }, []);

  // Search when query, filters, or pagination changes
  useEffect(() => {
    performSearch();
  }, [debouncedSearchQuery, activeTab, filters, sortBy, sortOrder, page]);

  // Real-time polling when enrichment is in progress
  useEffect(() => {
    if (!hasInProgressAlbums && !hasInProgressArtists) {
      return;
    }

    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for enrichment updates...');
      performSearch();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [hasInProgressAlbums, hasInProgressArtists]);

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetDatabaseStats {
              databaseStats {
                totalAlbums
                totalArtists
                totalTracks
                albumsNeedingEnrichment
                artistsNeedingEnrichment
                recentlyEnriched
                failedEnrichments
                averageDataQuality
              }
            }
          `,
        }),
      });
      const data = await response.json();
      if (data.data?.databaseStats) {
        setStats(data.data.databaseStats);
      }
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const query = getSearchQuery();
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();

      if (data.data) {
        const results =
          data.data[
            `search${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
          ] || [];

        // Check if there are more results (we request limit+1 to check)
        setHasMore(results.length > itemsPerPage);

        // Only show itemsPerPage results
        const displayResults = results.slice(0, itemsPerPage);

        setSearchResults(prev => ({
          ...prev,
          [activeTab]: displayResults,
        }));
      }
    } catch (error) {
      toast.error('Failed to search database');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSearchQuery = () => {
    const skip = (page - 1) * itemsPerPage;
    const commonFilters = `
      ${filters.dataQuality !== 'all' ? `dataQuality: ${filters.dataQuality}` : ''}
      ${filters.enrichmentStatus !== 'all' ? `enrichmentStatus: ${filters.enrichmentStatus}` : ''}
      ${filters.needsEnrichment ? 'needsEnrichment: true' : ''}
    `.trim();

    switch (activeTab) {
      case 'albums':
        return `
          query SearchAlbums {
            searchAlbums(
              query: "${debouncedSearchQuery}"
              ${commonFilters}
              sortBy: "${sortBy}"
              sortOrder: "${sortOrder}"
              skip: ${skip}
              limit: ${itemsPerPage + 1}
            ) {
              id
              title
              releaseDate
              coverArtUrl
              musicbrainzId
              dataQuality
              enrichmentStatus
              lastEnriched
              needsEnrichment
              artists {
                artist {
                  id
                  name
                }
                role
              }
              trackCount
              label
            }
          }
        `;
      case 'artists':
        return `
          query SearchArtists {
            searchArtists(
              query: "${debouncedSearchQuery}"
              ${commonFilters}
              sortBy: "${sortBy}"
              sortOrder: "${sortOrder}"
              skip: ${skip}
              limit: ${itemsPerPage + 1}
            ) {
              id
              name
              musicbrainzId
              imageUrl
              dataQuality
              enrichmentStatus
              lastEnriched
              needsEnrichment
              albumCount
              trackCount
              formedYear
              countryCode
            }
          }
        `;
      case 'tracks':
        return `
          query SearchTracks {
            searchTracks(
              query: "${debouncedSearchQuery}"
              skip: ${skip}
              limit: ${itemsPerPage + 1}
            ) {
              id
              title
              trackNumber
              discNumber
              durationMs
              isrc
              album {
                id
                title
                coverArtUrl
              }
              artists {
                artist {
                  id
                  name
                }
                role
              }
            }
          }
        `;
      default:
        return '';
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
        setEnrichmentQueue(prev => [...prev, itemId]);
        // Refresh the search results
        performSearch();
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
        performSearch();
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
    const currentResults = searchResults[activeTab] as any[];
    if (selectedItems.size === currentResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentResults.map(item => item.id)));
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
    const totalResults = searchResults[activeTab].length;
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
                query GetAlbumDetails($id: ID!) {
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
              MusicBrainz ID
            </div>
            <div className='text-sm text-zinc-300 font-mono'>
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
                `${searchResults.albums.filter(a => a.enrichmentStatus === 'IN_PROGRESS').length} album(s)`}
              {hasInProgressAlbums && hasInProgressArtists && ' and '}
              {hasInProgressArtists &&
                `${searchResults.artists.filter(a => a.enrichmentStatus === 'IN_PROGRESS').length} artist(s)`}{' '}
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
              <Button
                onClick={performSearch}
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
          searchResults[activeTab].length > 0 && (
            <div className='mb-4 flex gap-2'>
              <Button
                variant='outline'
                onClick={handleSelectAll}
                className='text-white border-zinc-700 hover:bg-zinc-700'
              >
                {selectedItems.size === searchResults[activeTab].length
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
            {searchResults.albums.length > 0 && (
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
                          selectedItems.size === searchResults.albums.length &&
                          searchResults.albums.length > 0
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
                  {searchResults.albums.map(album => (
                    <>
                      <TableRow
                        key={album.id}
                        className='border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors'
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
                            .map(a => a.artist.name)
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
                    </>
                  ))}
                </TableBody>
              </Table>
              {searchResults.albums.length === 0 && !loading && (
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
                          selectedItems.size === searchResults.artists.length &&
                          searchResults.artists.length > 0
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
                  {searchResults.artists.map(artist => (
                    <TableRow
                      key={artist.id}
                      className='border-b border-zinc-800 hover:bg-zinc-800/50'
                    >
                      <TableCell>
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
                      <TableCell>
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
                  ))}
                </TableBody>
              </Table>
              {searchResults.artists.length === 0 && !loading && (
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
                  {searchResults.tracks.map(track => (
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
                          .map(a => a.artist.name)
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
              {searchResults.tracks.length === 0 && !loading && (
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
    </div>
  );
}
