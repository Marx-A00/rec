'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  useSuggestedGameAlbumsQuery,
  useUpdateAlbumGameStatusMutation,
  AlbumGameStatus,
} from '@/generated/graphql';

export function SuggestedAlbumsTable() {
  const queryClient = useQueryClient();
  const [limit] = useState(50);

  const { data, isLoading } = useSuggestedGameAlbumsQuery({
    limit,
  });

  const { mutateAsync: updateStatus } = useUpdateAlbumGameStatusMutation({
    onSuccess: () => {
      // Invalidate all game pool queries
      queryClient.invalidateQueries({
        queryKey: ['SuggestedGameAlbums'],
      });
      queryClient.invalidateQueries({
        queryKey: ['AlbumsByGameStatus'],
      });
      queryClient.invalidateQueries({
        queryKey: ['GamePoolStats'],
      });
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

  const albums = data?.suggestedGameAlbums || [];

  if (isLoading) {
    return (
      <div className='text-center py-8 text-muted-foreground'>Loading...</div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        No suggested albums found
      </div>
    );
  }

  return (
    <div className='rounded-md border border-zinc-800'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-16'>Cover</TableHead>
            <TableHead>Album</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead className='w-24'>Year</TableHead>
            <TableHead className='w-48'>Actions</TableHead>
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
                <TableCell className='text-zinc-400'>{artistNames}</TableCell>
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
  );
}
