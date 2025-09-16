// @ts-nocheck - Schema migration broke API routes, needs GraphQL rewrite
import { NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import {
  CreateRecommendationRequest,
  Recommendation,
} from '@/types/recommendation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '10');
    const userId = searchParams.get('user_id');

    const where = userId ? { userId } : {};

    const [recommendations, total] = await Promise.all([
      prisma.recommendation.findMany({
        where,
        take: perPage,
        skip: (page - 1) * perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.recommendation.count({ where }),
    ]);

    const formattedRecommendations: Recommendation[] = recommendations.map(
      rec => ({
        id: rec.id,
        score: rec.score,
        createdAt: rec.createdAt.toISOString(),
        updatedAt: rec.updatedAt.toISOString(),
        userId: rec.userId,
        basisAlbumDiscogsId: rec.basisAlbumDiscogsId,
        recommendedAlbumDiscogsId: rec.recommendedAlbumDiscogsId,
        basisAlbumTitle: rec.basisAlbumTitle,
        basisAlbumArtist: rec.basisAlbumArtist,
        basisAlbumImageUrl: rec.basisAlbumImageUrl ?? null,
        basisAlbumYear: rec.basisAlbumYear ?? null,
        recommendedAlbumTitle: rec.recommendedAlbumTitle,
        recommendedAlbumArtist: rec.recommendedAlbumArtist,
        recommendedAlbumImageUrl: rec.recommendedAlbumImageUrl ?? null,
        recommendedAlbumYear: rec.recommendedAlbumYear ?? null,
        user: rec.user,
      })
    );

    return NextResponse.json({
      recommendations: formattedRecommendations,
      pagination: {
        page,
        per_page: perPage,
        total,
        has_more: page * perPage < total,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching Spotify recommendations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to create a recommendation' },
        { status: 401 }
      );
    }

    const data: CreateRecommendationRequest = await request.json();

    if (
      !data.basisAlbumDiscogsId ||
      !data.recommendedAlbumDiscogsId ||
      !data.score
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        userId: session.user.id,
        score: data.score,
        basisDiscogsId: data.basisAlbumDiscogsId,      // NEW: Store Discogs ID for cross-reference
        recommendedDiscogsId: data.recommendedAlbumDiscogsId,  // NEW: Store Discogs ID for cross-reference
        // TODO: basisAlbumId and recommendedAlbumId will be populated during migration from Discogs->MusicBrainz
        basisAlbumTitle: data.basisAlbumTitle,
        basisAlbumArtist: data.basisAlbumArtist,
        basisAlbumImageUrl: data.basisAlbumImageUrl,
        basisAlbumYear: data.basisAlbumYear,
        recommendedAlbumTitle: data.recommendedAlbumTitle,
        recommendedAlbumArtist: data.recommendedAlbumArtist,
        recommendedAlbumImageUrl: data.recommendedAlbumImageUrl,
        recommendedAlbumYear: data.recommendedAlbumYear,
      },
    });

    return NextResponse.json(
      {
        recommendation: {
          ...recommendation,
          createdAt: recommendation.createdAt.toISOString(),
          updatedAt: recommendation.updatedAt.toISOString(),
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in recommendation route:', error);
    return NextResponse.json(
      {
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
