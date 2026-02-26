'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useSuggestedGameAlbumsQuery,
  useUpdateAlbumGameStatusMutation,
  useAddAlbumToQueueMutation,
  AlbumGameStatus,
} from '@/generated/graphql';

const SYNC_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'spotify_playlists', label: 'Spotify Playlists' },
  { value: 'spotify_search', label: 'Spotify Search' },
  { value: 'musicbrainz_sync', label: 'MusicBrainz' },
  { value: 'user_collection', label: 'User Collection' },
  { value: 'user_recommendation', label: 'User Recommendation' },
];

const PAGE_SIZE = 50;

export function SuggestedAlbumsTable() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [syncSource, setSyncSource] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);

  const { data, isLoading } = useSuggestedGameAlbumsQuery({
    limit: PAGE_SIZE,
    offset,
    syncSource: syncSource === 'all' ? undefined : syncSource,
    search: searchQuery,
  });

  const { mutateAsync: updateStatus } = useUpdateAlbumGameStatusMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
      queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
      queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
    },
  });

  const { mutateAsync: addToQueue, isPending: isAddingToQueue } =
    useAddAlbumToQueueMutation({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['SuggestedGameAlbums'] });
        queryClient.invalidateQueries({ queryKey: ['AlbumsByGameStatus'] });
        queryClient.invalidateQueries({ queryKey: ['GamePoolStats'] });
        queryClient.invalidateQueries({ queryKey: ['CuratedChallenges'] });
      },
    });

  const handleApprove = async (albumId: string) => {
    try {
      const result = await updateStatus({
        input: {
          albumId,
          gameStatus: AlbumGameStatus.Eligible,
        },
      });

      if (result.updateAlbumGameStatus.success) {
        toast.success('Album approved for game pool');
      } else {
        toast.error(result.updateAlbumGameStatus.error || 'Approval failed');
      }
    } catch (error) {
      toast.error('Failed to approve album');
      console.error('Approval error:', error);
    }
  };

  const handleAddToQueue = async (albumId: string, albumTitle: string) => {
    try {
      const result = await addToQueue({ albumId });
      if (result.addAlbumToQueue.success) {
        toast.success(`"${albumTitle}" added to game queue`);
      } else {
        toast.error(result.addAlbumToQueue.error || 'Failed to add to queue');
      }
    } catch (error) {
      toast.error('Failed to add to queue');
      console.error('Add to queue error:', error);
    }
  };

  const handleExclude = async (albumId: string) => {
    try {
      const result = await updateStatus({
        input: {
          albumId,
          gameStatus: AlbumGameStatus.Excluded,
        },
      });

      if (result.updateAlbumGameStatus.success) {
        toast.success('Album excluded from game pool');
      } else {
        toast.error(result.updateAlbumGameStatus.error || 'Exclusion failed');
      }
    } catch (error) {
      toast.error('Failed to exclude album');
      console.error('Exclusion error:', error);
    }
  };

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setSearchQuery(trimmed || undefined);
    setOffset(0);
  };

  const handleSyncSourceChange = (value: string) => {
    setSyncSource(value);
    setOffset(0);
  };

  const handleClearFilters = () => {
    setSyncSource('all');
    setSearchInput('');
    setSearchQuery(undefined);
    setOffset(0);
  };

  const albums = data?.suggestedGameAlbums || [];
  const hasFilters = syncSource !== 'all' || searchQuery;

  return (
    <div className='space-y-4'>
      {/* Filter Controls */}
      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex items-center gap-2 flex-1 min-w-[200px] max-w-sm'>
          <Input
            placeholder='Search albums or artists...'
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className='h-9'
          />
          <Button
            variant='outline'
            size='sm'
            onClick={handleSearch}
            className='h-9 px-3'
          >
            <Search className='h-4 w-4' />
          </Button>
        </div>

        <Select value={syncSource} onValueChange={handleSyncSourceChange}>
          <SelectTrigger className='w-48 h-9'>
            <SelectValue placeholder='Filter by source' />
          </SelectTrigger>
          <SelectContent>
            {SYNC_SOURCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearFilters}
            className='h-9 text-zinc-400 hover:text-white'
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className='text-center py-8 text-muted-foreground'>Loading...</div>
      ) : albums.length === 0 ? (
        <div className='text-center py-8 text-muted-foreground'>
          {hasFilters
            ? 'No albums match the current filters'
            : 'No suggested albums found'}
        </div>
      ) : (
        <div className='rounded-md border border-zinc-800'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-16'>Cover</TableHead>
                <TableHead>Album</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead className='w-24'>Year</TableHead>
                <TableHead className='w-64'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {albums.map(album => {
                const artistNames = album.artists
                  .map(a => a.artist.name)
                  .join(', ');
                const year = album.releaseDate
                  ? format(new Date(album.releaseDate), 'yyyy')
                  : 'N/A';

                return (
                  <TableRow key={album.id}>
                    <TableCell>
                      <AlbumImage
                        src={album.coverArtUrl}
                        cloudflareImageId={album.cloudflareImageId}
                        alt={album.title}
                        width={40}
                        height={40}
                        className='rounded'
                      />
                    </TableCell>
                    <TableCell className='font-medium text-white'>
                      {album.title}
                    </TableCell>
                    <TableCell className='text-zinc-400'>
                      {artistNames}
                    </TableCell>
                    <TableCell className='text-zinc-300'>{year}</TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-green-500 border-green-500/20 hover:bg-green-500/10'
                          onClick={() => handleApprove(album.id)}
                        >
                          <CheckCircle className='h-4 w-4 mr-1' />
                          Approve
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-amber-500 border-amber-500/20 hover:bg-amber-500/10'
                          disabled={isAddingToQueue}
                          onClick={() =>
                            handleAddToQueue(album.id, album.title)
                          }
                        >
                          <Zap className='h-4 w-4 mr-1' />
                          Queue
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-red-500 border-red-500/20 hover:bg-red-500/10'
                          onClick={() => handleExclude(album.id)}
                        >
                          <XCircle className='h-4 w-4 mr-1' />
                          Exclude
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {albums.length > 0 && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-zinc-500'>
            Showing {offset + 1}–{offset + albums.length}
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className='h-4 w-4 mr-1' />
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={albums.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
