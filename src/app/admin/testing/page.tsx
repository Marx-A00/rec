// src/app/admin/testing/page.tsx
'use client';

import { Trash2, ArrowRight, Activity } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useGetMyRecommendationsQuery,
  useDeleteRecommendationMutation,
} from '@/generated/graphql';

export default function TestingPage() {
  const queryClient = useQueryClient();
  const HARDCODED_USER_ID = 'cmfmo8b690001mj4pz68j4lci';

  const { data, isLoading, error, refetch } = useGetMyRecommendationsQuery(
    { limit: 100 },
    { staleTime: 0 }
  );

  const deleteMutation = useDeleteRecommendationMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['GetMyRecommendations'] });
      refetch();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Delete this recommendation?')) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className='p-8'>
        <div className='flex items-center justify-center py-12'>
          <Activity className='h-8 w-8 animate-spin text-zinc-400' />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8'>
        <div className='bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded-lg'>
          <strong>Error:</strong>{' '}
          {error instanceof Error
            ? error.message
            : 'Failed to load recommendations'}
        </div>
      </div>
    );
  }

  const recommendations = data?.myRecommendations?.recommendations || [];

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white'>Testing</h1>
        <p className='text-zinc-400 mt-1'>
          Test data management for development
        </p>
      </div>

      {/* Recommendations Section */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>Test Recommendations</CardTitle>
          <CardDescription className='text-zinc-400'>
            Your recommendations ({HARDCODED_USER_ID}) -{' '}
            {recommendations.length} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className='text-zinc-500 text-center py-8'>
              No recommendations yet
            </p>
          ) : (
            <div className='space-y-4'>
              {recommendations.map(rec => (
                <div
                  key={rec.id}
                  className='flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors'
                >
                  {/* Basis Album */}
                  <div className='flex items-center gap-3 flex-1'>
                    {rec.basisAlbum.coverArtUrl && (
                      <Image
                        src={rec.basisAlbum.coverArtUrl}
                        alt={rec.basisAlbum.title}
                        width={48}
                        height={48}
                        className='rounded'
                        unoptimized
                      />
                    )}
                    <div className='min-w-0'>
                      <p className='text-white font-medium truncate'>
                        {rec.basisAlbum.title}
                      </p>
                      <p className='text-xs text-zinc-400 truncate'>
                        {rec.basisAlbum.artists?.[0]?.artist.name ||
                          'Unknown Artist'}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className='h-5 w-5 text-zinc-500 flex-shrink-0' />

                  {/* Recommended Album */}
                  <div className='flex items-center gap-3 flex-1'>
                    {rec.recommendedAlbum.coverArtUrl && (
                      <Image
                        src={rec.recommendedAlbum.coverArtUrl}
                        alt={rec.recommendedAlbum.title}
                        width={48}
                        height={48}
                        className='rounded'
                        unoptimized
                      />
                    )}
                    <div className='min-w-0'>
                      <p className='text-white font-medium truncate'>
                        {rec.recommendedAlbum.title}
                      </p>
                      <p className='text-xs text-zinc-400 truncate'>
                        {rec.recommendedAlbum.artists?.[0]?.artist.name ||
                          'Unknown Artist'}
                      </p>
                    </div>
                  </div>

                  {/* Score & Delete */}
                  <div className='flex items-center gap-3 flex-shrink-0'>
                    <Badge className='bg-zinc-700 text-white'>
                      Score: {rec.score}
                    </Badge>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-red-400 border-red-900 hover:bg-red-950 hover:text-red-300'
                      onClick={() => handleDelete(rec.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
