import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import {
  userProfileUpdateSchema,
  validateRequestBody,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/validations/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        recommendationsCount: true,
        profileUpdatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestBody = await request.json();
    const validation = validateRequestBody(
      userProfileUpdateSchema,
      requestBody
    );

    if (!validation.success) {
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_PROFILE_DATA'
      );
      return NextResponse.json(response, { status });
    }

    const { username, bio, image } = validation.data;

    // Check if username is already taken by another user (case-insensitive)
    if (username !== undefined) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
          NOT: {
            id: id,
          },
        },
      });

      if (existingUser) {
        const { response, status } = createErrorResponse(
          'Username already taken',
          409,
          'This username is already in use by another account.',
          'USERNAME_TAKEN'
        );
        return NextResponse.json(response, { status });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
        profileUpdatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        recommendationsCount: true,
        profileUpdatedAt: true,
      },
    });

    const { response, status } = createSuccessResponse(
      'Profile updated successfully',
      { user: updatedUser }
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Error updating profile:', error);
    const { response, status } = createErrorResponse(
      'Failed to update profile',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(response, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only edit their own profiles
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestBody = await request.json();
    const validation = validateRequestBody(
      userProfileUpdateSchema,
      requestBody
    );

    if (!validation.success) {
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_PROFILE_DATA'
      );
      return NextResponse.json(response, { status });
    }

    const { username, bio, image } = validation.data;

    // Check if username is already taken by another user (case-insensitive)
    if (username !== undefined) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
          NOT: {
            id: id,
          },
        },
      });

      if (existingUser) {
        const { response, status } = createErrorResponse(
          'Username already taken',
          409,
          'This username is already in use by another account.',
          'USERNAME_TAKEN'
        );
        return NextResponse.json(response, { status });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
        profileUpdatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        recommendationsCount: true,
        profileUpdatedAt: true,
      },
    });

    const { response, status } = createSuccessResponse(
      'Profile updated successfully',
      { user: updatedUser }
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Error updating user profile:', error);
    const { response, status } = createErrorResponse(
      'Failed to update profile',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(response, { status });
  }
}
