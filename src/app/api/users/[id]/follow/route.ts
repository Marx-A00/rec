import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: followedId } = await params;
    const followerId = session.user.id;

    // Can't follow yourself
    if (followerId === followedId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if follow relationship already exists
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      );
    }

    // Check if the user being followed exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followedId },
    });

    if (!userToFollow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create follow relationship and update counts in a transaction
    await prisma.$transaction(async tx => {
      // Create the follow relationship
      await tx.userFollow.create({
        data: {
          followerId,
          followedId,
        },
      });

      // Update follower count for the user being followed
      await tx.user.update({
        where: { id: followedId },
        data: {
          followersCount: {
            increment: 1,
          },
        },
      });

      // Update following count for the current user
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: {
            increment: 1,
          },
        },
      });
    });

    return NextResponse.json({
      message: 'Successfully followed user',
      isFollowing: true,
    });
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: followedId } = await params;
    const followerId = session.user.id;

    // Find existing follow relationship
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      );
    }

    // Remove follow relationship and update counts in a transaction
    await prisma.$transaction(async tx => {
      // Delete the follow relationship
      await tx.userFollow.delete({
        where: {
          followerId_followedId: {
            followerId,
            followedId,
          },
        },
      });

      // Update follower count for the user being unfollowed
      await tx.user.update({
        where: { id: followedId },
        data: {
          followersCount: {
            decrement: 1,
          },
        },
      });

      // Update following count for the current user
      await tx.user.update({
        where: { id: followerId },
        data: {
          followingCount: {
            decrement: 1,
          },
        },
      });
    });

    return NextResponse.json({
      message: 'Successfully unfollowed user',
      isFollowing: false,
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if current user is following the specified user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: followedId } = await params;
    const followerId = session.user.id;

    // Can't follow yourself
    if (followerId === followedId) {
      return NextResponse.json({ isFollowing: false, canFollow: false });
    }

    // Check if follow relationship exists
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followedId: {
          followerId,
          followedId,
        },
      },
    });

    return NextResponse.json({
      isFollowing: !!existingFollow,
      canFollow: true,
    });
  } catch (error) {
    console.error('Follow status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
