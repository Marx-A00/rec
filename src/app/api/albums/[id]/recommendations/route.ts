// src/app/api/albums/[id]/recommendations/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

import prisma from '@/lib/prisma';

interface AlbumRecommendation {
  id: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  albumRole: 'basis' | 'recommended';
  otherAlbum: {
    discogsId: string;
    title: string;
    artist: string;
    imageUrl: string | null;
    year: string | null;
  };
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// Input validation schemas
const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(12),
  filter: z.enum(['all', 'basis', 'recommended']).default('all'),
  sort: z
    .enum(['newest', 'oldest', 'highest_score', 'lowest_score'])
    .default('newest'),
});

const albumIdSchema = z.string().regex(/^\d+$/, 'Album ID must be numeric');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: albumId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate album ID
    const albumIdResult = albumIdSchema.safeParse(albumId);
    if (!albumIdResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid album ID',
          code: 'INVALID_ALBUM_ID',
          details: albumIdResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const queryParams = {
      page: searchParams.get('page') || '1',
      per_page: searchParams.get('per_page') || '12',
      filter: searchParams.get('filter') || 'all',
      sort: searchParams.get('sort') || 'newest',
    };

    const validationResult = queryParamsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY_PARAMS',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { page, per_page: perPage, filter, sort } = validationResult.data;

    // Build where clause based on filter
    const whereClause = {
      OR:
        filter === 'all'
          ? [
              { basisAlbumDiscogsId: albumId },
              { recommendedAlbumDiscogsId: albumId },
            ]
          : filter === 'basis'
            ? [{ basisAlbumDiscogsId: albumId }]
            : [{ recommendedAlbumDiscogsId: albumId }],
    };

    // Build order by clause based on sort
    const orderByClause =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'highest_score'
          ? { score: 'desc' as const }
          : sort === 'lowest_score'
            ? { score: 'asc' as const }
            : { createdAt: 'desc' as const }; // default to newest

    // Fetch recommendations with pagination
    const [recommendations, total] = await Promise.all([
      prisma.recommendation.findMany({
        where: whereClause,
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy: orderByClause,
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.recommendation.count({ where: whereClause }),
    ]);

    // Transform recommendations to include albumRole and otherAlbum
    const formattedRecommendations: AlbumRecommendation[] = recommendations.map(
      rec => {
        const isBasisAlbum = rec.basisAlbumDiscogsId === albumId;
        const albumRole = isBasisAlbum ? 'basis' : 'recommended';

        const otherAlbum = isBasisAlbum
          ? {
              discogsId: rec.recommendedAlbumDiscogsId,
              title: rec.recommendedAlbumTitle,
              artist: rec.recommendedAlbumArtist,
              imageUrl: rec.recommendedAlbumImageUrl,
              year: rec.recommendedAlbumYear,
            }
          : {
              discogsId: rec.basisAlbumDiscogsId,
              title: rec.basisAlbumTitle,
              artist: rec.basisAlbumArtist,
              imageUrl: rec.basisAlbumImageUrl,
              year: rec.basisAlbumYear,
            };

        return {
          id: rec.id,
          score: rec.score,
          createdAt: rec.createdAt.toISOString(),
          updatedAt: rec.updatedAt.toISOString(),
          userId: rec.userId,
          albumRole,
          otherAlbum,
          user: rec.user,
        };
      }
    );

    const response = NextResponse.json({
      recommendations: formattedRecommendations,
      pagination: {
        page,
        per_page: perPage,
        total,
        has_more: page * perPage < total,
      },
      success: true,
    });

    // Add cache headers for performance
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );

    // Log successful request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Recommendations API] Success - Album: ${albumId}, Filter: ${filter}, Sort: ${sort}, Page: ${page}/${Math.ceil(total / perPage)}, Time: ${Date.now() - startTime}ms`
      );
    }

    return response;
  } catch (error) {
    // Log error with context
    console.error('[Recommendations API] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`,
    });

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        return NextResponse.json(
          {
            error: 'Album not found',
            code: 'ALBUM_NOT_FOUND',
            message: 'The requested album does not exist',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('P2002')) {
        return NextResponse.json(
          {
            error: 'Database constraint violation',
            code: 'DB_CONSTRAINT_ERROR',
            message: 'A database constraint was violated',
          },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching recommendations',
      },
      { status: 500 }
    );
  }
}
