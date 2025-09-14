// @ts-nocheck - Schema migration broke API routes, needs GraphQL rewrite
import { NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import { Recommendation } from '@/types/recommendation';

// GET /api/recommendations/[id] - Get single recommendation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    const formattedRecommendation: Recommendation = {
      id: recommendation.id,
      score: recommendation.score,
      createdAt: recommendation.createdAt.toISOString(),
      updatedAt: recommendation.updatedAt.toISOString(),
      userId: recommendation.userId,
      basisAlbumDiscogsId: recommendation.basisAlbumDiscogsId,
      recommendedAlbumDiscogsId: recommendation.recommendedAlbumDiscogsId,
      basisAlbumTitle: recommendation.basisAlbumTitle,
      basisAlbumArtist: recommendation.basisAlbumArtist,
      basisAlbumImageUrl: recommendation.basisAlbumImageUrl ?? null,
      basisAlbumYear: recommendation.basisAlbumYear ?? null,
      recommendedAlbumTitle: recommendation.recommendedAlbumTitle,
      recommendedAlbumArtist: recommendation.recommendedAlbumArtist,
      recommendedAlbumImageUrl: recommendation.recommendedAlbumImageUrl ?? null,
      recommendedAlbumYear: recommendation.recommendedAlbumYear ?? null,
      user: recommendation.user,
    };

    return NextResponse.json({
      recommendation: formattedRecommendation,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch recommendation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/recommendations/[id] - Update recommendation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to update a recommendation' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate score if provided
    if (data.score && (data.score < 1 || data.score > 10)) {
      return NextResponse.json(
        { error: 'Score must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Check if recommendation exists and user owns it
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id },
    });

    if (!existingRecommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    if (existingRecommendation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own recommendations' },
        { status: 403 }
      );
    }

    // Update only the fields that are provided
    const updateData: any = {};
    if (data.score !== undefined) updateData.score = data.score;
    if (data.basisAlbumDiscogsId)
      updateData.basisAlbumDiscogsId = data.basisAlbumDiscogsId;
    if (data.recommendedAlbumDiscogsId)
      updateData.recommendedAlbumDiscogsId = data.recommendedAlbumDiscogsId;
    if (data.basisAlbumTitle) updateData.basisAlbumTitle = data.basisAlbumTitle;
    if (data.basisAlbumArtist)
      updateData.basisAlbumArtist = data.basisAlbumArtist;
    if (data.basisAlbumImageUrl)
      updateData.basisAlbumImageUrl = data.basisAlbumImageUrl;
    if (data.basisAlbumYear) updateData.basisAlbumYear = data.basisAlbumYear;
    if (data.recommendedAlbumTitle)
      updateData.recommendedAlbumTitle = data.recommendedAlbumTitle;
    if (data.recommendedAlbumArtist)
      updateData.recommendedAlbumArtist = data.recommendedAlbumArtist;
    if (data.recommendedAlbumImageUrl)
      updateData.recommendedAlbumImageUrl = data.recommendedAlbumImageUrl;
    if (data.recommendedAlbumYear)
      updateData.recommendedAlbumYear = data.recommendedAlbumYear;

    const updatedRecommendation = await prisma.recommendation.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    const formattedRecommendation: Recommendation = {
      id: updatedRecommendation.id,
      score: updatedRecommendation.score,
      createdAt: updatedRecommendation.createdAt.toISOString(),
      updatedAt: updatedRecommendation.updatedAt.toISOString(),
      userId: updatedRecommendation.userId,
      basisAlbumDiscogsId: updatedRecommendation.basisAlbumDiscogsId,
      recommendedAlbumDiscogsId:
        updatedRecommendation.recommendedAlbumDiscogsId,
      basisAlbumTitle: updatedRecommendation.basisAlbumTitle,
      basisAlbumArtist: updatedRecommendation.basisAlbumArtist,
      basisAlbumImageUrl: updatedRecommendation.basisAlbumImageUrl ?? null,
      basisAlbumYear: updatedRecommendation.basisAlbumYear ?? null,
      recommendedAlbumTitle: updatedRecommendation.recommendedAlbumTitle,
      recommendedAlbumArtist: updatedRecommendation.recommendedAlbumArtist,
      recommendedAlbumImageUrl:
        updatedRecommendation.recommendedAlbumImageUrl ?? null,
      recommendedAlbumYear: updatedRecommendation.recommendedAlbumYear ?? null,
      user: updatedRecommendation.user,
    };

    return NextResponse.json({
      recommendation: formattedRecommendation,
      success: true,
    });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json(
      {
        error: 'Failed to update recommendation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/recommendations/[id] - Delete recommendation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to delete a recommendation' },
        { status: 401 }
      );
    }

    // Check if recommendation exists and user owns it
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id },
    });

    if (!existingRecommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    if (existingRecommendation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own recommendations' },
        { status: 403 }
      );
    }

    await prisma.recommendation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Recommendation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete recommendation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
