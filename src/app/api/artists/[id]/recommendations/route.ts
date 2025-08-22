// src/app/api/artists/[id]/recommendations/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import chalk from 'chalk';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const artistId = params.id;

  if (!artistId) {
    return NextResponse.json(
      { error: 'Artist ID is required' },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    console.log(chalk.bgBlue.white.bold('\n🎨 === ARTIST RECOMMENDATIONS API START === 🎨'));
    console.log(chalk.cyan('Request params:'), {
      artistId: chalk.yellow(artistId),
      filter: chalk.green(filter),
      sort: chalk.green(sort),
      page: chalk.green(page),
      limit: chalk.green(limit),
    });

    // Get current user for ownership checks
    const session = await auth();
    const currentUserId = session?.user?.id;

    // Build the where clause for artist-specific recommendations using artist Discogs ID
    const whereClause: any = {
      OR: [
        { basisAlbumArtistDiscogsId: artistId },
        { recommendedAlbumArtistDiscogsId: artistId },
      ],
    };

    // Apply filter
    if (filter === 'basis') {
      whereClause.basisAlbumArtistDiscogsId = artistId;
      delete whereClause.OR;
    } else if (filter === 'recommended') {
      whereClause.recommendedAlbumArtistDiscogsId = artistId;
      delete whereClause.OR;
    }

    // Build sort order
    let orderBy: any = {};
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest_score':
        orderBy = { score: 'desc' };
        break;
      case 'lowest_score':
        orderBy = { score: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    console.log(chalk.magenta('Query where clause:'), JSON.stringify(whereClause, null, 2));

    // Get total count
    const total = await prisma.recommendation.count({ where: whereClause });
    console.log(chalk.green('✓ Total recommendations found:'), chalk.yellow(total));

    // Get recommendations with user data
    const recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    });
    console.log(chalk.green('✓ Fetched recommendations:'), chalk.yellow(recommendations.length));

    // Transform recommendations to include album role information
    const transformedRecommendations = recommendations.map(rec => {
      const isBasisArtist = rec.basisAlbumArtistDiscogsId === artistId;
      const isRecommendedArtist = rec.recommendedAlbumArtistDiscogsId === artistId;
      
      // Determine which album is from this artist and which is the "other" album
      let albumRole: 'basis' | 'recommended' | 'both';
      let otherAlbum;
      
      if (isBasisArtist && isRecommendedArtist) {
        albumRole = 'both';
        // For albums from the same artist, treat recommended as "other"
        otherAlbum = {
          discogsId: rec.recommendedAlbumDiscogsId,
          title: rec.recommendedAlbumTitle,
          artist: rec.recommendedAlbumArtist,
          imageUrl: rec.recommendedAlbumImageUrl,
          year: rec.recommendedAlbumYear,
        };
      } else if (isBasisArtist) {
        albumRole = 'basis';
        otherAlbum = {
          discogsId: rec.recommendedAlbumDiscogsId,
          title: rec.recommendedAlbumTitle,
          artist: rec.recommendedAlbumArtist,
          imageUrl: rec.recommendedAlbumImageUrl,
          year: rec.recommendedAlbumYear,
        };
      } else {
        albumRole = 'recommended';
        otherAlbum = {
          discogsId: rec.basisAlbumDiscogsId,
          title: rec.basisAlbumTitle,
          artist: rec.basisAlbumArtist,
          imageUrl: rec.basisAlbumImageUrl,
          year: rec.basisAlbumYear,
        };
      }

      return {
        ...rec,
        albumRole,
        otherAlbum,
        isOwnRecommendation: currentUserId === rec.userId,
      };
    });

    console.log(chalk.green('✓ Transformation complete'));
    
    const response = {
      recommendations: transformedRecommendations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    };
    
    console.log(chalk.cyan('Response preview:'), {
      recommendationsCount: response.recommendations.length,
      firstRec: response.recommendations[0] ? {
        id: response.recommendations[0].id,
        albumRole: response.recommendations[0].albumRole,
        basisArtist: response.recommendations[0].basisAlbumArtist,
        recommendedArtist: response.recommendations[0].recommendedAlbumArtist,
      } : 'none',
      pagination: response.pagination,
    });
    
    console.log(chalk.bgGreen.black.bold('\n🎨 === ARTIST RECOMMENDATIONS API SUCCESS === 🎨\n'));

    return NextResponse.json(response);
  } catch (error) {
    console.log(chalk.bgRed.white.bold('\n❌ === ARTIST RECOMMENDATIONS API ERROR === ❌'));
    console.error(chalk.red('Error details:'), {
      artistId: chalk.yellow(artistId),
      error: chalk.red(error instanceof Error ? error.message : error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.log(chalk.bgRed.white.bold('❌ === END ERROR === ❌\n'));
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}