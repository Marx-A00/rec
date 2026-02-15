'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
import {
  useAlbumsByGameStatusQuery,
  useUpdateAlbumGameStatusMutation,
  AlbumGameStatus,
} from '@/generated/graphql';

export function EligibleAlbumsTable() {
  const queryClient = useQueryClient();
  const [limit] = useState(50);
  const [offset] = useState(0);

  const { data, isLoading } = useAlbumsByGameStatusQuery({
    status: AlbumGameStatus.Eligible,
    limit,
    offset,
  });

  const { mutateAsync: updateStatus } = useUpdateAlbumGameStatusMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['AlbumsByGameStatus'],
      });
      queryClient.invalidateQueries({
        queryKey: ['GamePoolStats'],
      });
    },
  });

  const handleStatusChange = async (albumId: string, newStatus: string) => {
    try {
      const result = await updateStatus({
        input: {
          albumId,
          gameStatus: newStatus as AlbumGameStatus,
        },
      });

      if (result.updateAlbumGameStatus.success) {
        toast.success('Album status updated');
      } else {
        toast.error(result.updateAlbumGameStatus.error || 'Update failed');
      }
    } catch (error) {
      toast.error('Failed to update album status');
      console.error('Status update error:', error);
    }
  };

  const albums = data?.albumsByGameStatus || [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No eligible albums found
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Cover</TableHead>
            <TableHead>Album</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead className="w-24">Year</TableHead>
            <TableHead className="w-40">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {albums.map((album) => {
            const artistNames = album.artists
              .map((a) => a.artist.name)
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
                    className="rounded"
                  />
                </TableCell>
                <TableCell className="font-medium">{album.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {artistNames}
                </TableCell>
                <TableCell>{year}</TableCell>
                <TableCell>
                  <Select
                    value={album.gameStatus}
                    onValueChange={(value) =>
                      handleStatusChange(album.id, value)
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AlbumGameStatus.Eligible}>
                        Eligible
                      </SelectItem>
                      <SelectItem value={AlbumGameStatus.Excluded}>
                        Excluded
                      </SelectItem>
                      <SelectItem value={AlbumGameStatus.None}>
                        Neutral
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
