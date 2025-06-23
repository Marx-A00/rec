import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

interface TopRecommendation {
  id: string;
  basisAlbum: {
    title: string;
    artist: string;
    imageUrl: string | null;
    year: string | null;
    discogsId: string;
  };
  recommendedAlbum: {
    title: string;
    artist: string;
    imageUrl: string | null;
    year: string | null;
    discogsId: string;
  };
  score: number;
  createdAt: string;
  metrics: {
    estimatedViews: number;
    engagementScore: number;
    ageInDays: number;
    popularityRank: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await auth();
    const targetUserId = params.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        followersCount: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const timeRange = searchParams.get('range') || 'all'; // 7d, 30d, 90d, all
    const sortBy = searchParams.get('sort') || 'engagement'; // engagement, score, recent, views

    // Calculate date ranges
    const now = new Date();
    const getDaysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const ranges = {
      '7d': getDaysAgo(7),
      '30d': getDaysAgo(30),
      '90d': getDaysAgo(90),
      all: new Date('2020-01-01'),
    };

    const startDate = ranges[timeRange as keyof typeof ranges] || ranges['all'];

    // Get user's recommendations with metrics
    const recommendations = await prisma.recommendation.findMany({
      where: {
        userId: targetUserId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        basisAlbumTitle: true,
        basisAlbumArtist: true,
        basisAlbumImageUrl: true,
        basisAlbumYear: true,
        basisAlbumDiscogsId: true,
        recommendedAlbumTitle: true,
        recommendedAlbumArtist: true,
        recommendedAlbumImageUrl: true,
        recommendedAlbumYear: true,
        recommendedAlbumDiscogsId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recommendations.length === 0) {
      return NextResponse.json({
        topRecommendations: [],
        totalCount: 0,
        timeRange,
        sortBy,
      });
    }

    // Calculate engagement metrics for each recommendation
    const topRecommendations: TopRecommendation[] = recommendations.map(
      (rec, index) => {
        const ageInDays = Math.floor(
          (now.getTime() - rec.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const estimatedViews =
          targetUser.followersCount *
          Math.max(1, Math.floor(Math.random() * 3) + 1); // Rough estimate

        // Calculate engagement score based on multiple factors
        const scoreWeight = rec.score / 10; // Normalize score (0-1)
        const ageWeight = Math.max(0.1, 1 - ageInDays / 365); // Newer recommendations get higher weight
        const followerWeight = Math.min(1, targetUser.followersCount / 100); // More followers = higher reach

        const engagementScore =
          scoreWeight * 0.4 + ageWeight * 0.3 + followerWeight * 0.3;

        return {
          id: rec.id,
          basisAlbum: {
            title: rec.basisAlbumTitle,
            artist: rec.basisAlbumArtist,
            imageUrl: rec.basisAlbumImageUrl,
            year: rec.basisAlbumYear,
            discogsId: rec.basisAlbumDiscogsId,
          },
          recommendedAlbum: {
            title: rec.recommendedAlbumTitle,
            artist: rec.recommendedAlbumArtist,
            imageUrl: rec.recommendedAlbumImageUrl,
            year: rec.recommendedAlbumYear,
            discogsId: rec.recommendedAlbumDiscogsId,
          },
          score: rec.score,
          createdAt: rec.createdAt.toISOString(),
          metrics: {
            estimatedViews,
            engagementScore: Math.round(engagementScore * 1000) / 1000,
            ageInDays,
            popularityRank: index + 1, // Will be recalculated after sorting
          },
        };
      }
    );

    // Sort recommendations based on the requested criteria
    const sortedRecommendations = topRecommendations.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'recent':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'views':
          return b.metrics.estimatedViews - a.metrics.estimatedViews;
        case 'engagement':
        default:
          return b.metrics.engagementScore - a.metrics.engagementScore;
      }
    });

    // Update popularity ranks after sorting
    sortedRecommendations.forEach((rec, index) => {
      rec.metrics.popularityRank = index + 1;
    });

    // Apply limit
    const limitedRecommendations = sortedRecommendations.slice(0, limit);

    // Calculate summary statistics
    const totalViews = limitedRecommendations.reduce(
      (sum, rec) => sum + rec.metrics.estimatedViews,
      0
    );
    const avgScore =
      limitedRecommendations.reduce((sum, rec) => sum + rec.score, 0) /
      limitedRecommendations.length;
    const avgEngagement =
      limitedRecommendations.reduce(
        (sum, rec) => sum + rec.metrics.engagementScore,
        0
      ) / limitedRecommendations.length;

    return NextResponse.json({
      topRecommendations: limitedRecommendations,
      totalCount: recommendations.length,
      timeRange,
      sortBy,
      summary: {
        totalViews,
        avgScore: Math.round(avgScore * 100) / 100,
        avgEngagement: Math.round(avgEngagement * 1000) / 1000,
        topGenres: [], // TODO: Extract genres from album data
        bestPerformingMonth: '', // TODO: Calculate from date analysis
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching top recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
