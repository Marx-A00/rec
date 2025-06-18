import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import {
  createErrorResponse,
  createSuccessResponse,
  collectionRequestSchema,
  validateRequestBody,
} from '@/lib/validations/api';
import { collectionParamsSchema } from '@/lib/validations/params';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const rawParams = await params;

    // Validate parameters
    const paramsResult = collectionParamsSchema.safeParse(rawParams);
    if (!paramsResult.success) {
      console.error('Invalid collection parameters:', paramsResult.error);
      const { response, status } = createErrorResponse(
        'Invalid collection ID format',
        400,
        paramsResult.error.errors.map(e => e.message).join(', '),
        'INVALID_COLLECTION_PARAMS'
      );
      return NextResponse.json(response, { status });
    }

    const { id: collectionId } = paramsResult.data;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        user: { select: { id: true, name: true, image: true } },
        albums: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!collection) {
      const { response, status } = createErrorResponse(
        'Collection not found',
        404,
        `Collection with ID ${collectionId} does not exist`,
        'COLLECTION_NOT_FOUND'
      );
      return NextResponse.json(response, { status });
    }

    // Check access permissions
    if (!collection.isPublic && collection.userId !== session?.user?.id) {
      const { response, status } = createErrorResponse(
        'Access denied',
        403,
        'You do not have permission to view this collection',
        'COLLECTION_ACCESS_DENIED'
      );
      return NextResponse.json(response, { status });
    }

    const { response, status } = createSuccessResponse(
      'Collection retrieved successfully',
      { collection },
      200
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Error fetching collection:', error);
    const { response, status } = createErrorResponse(
      'Failed to fetch collection',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'COLLECTION_FETCH_FAILED'
    );
    return NextResponse.json(response, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const { response, status } = createErrorResponse(
        'Authentication required',
        401,
        'You must be logged in to update collections',
        'UNAUTHORIZED'
      );
      return NextResponse.json(response, { status });
    }

    const rawParams = await params;

    // Validate parameters
    const paramsResult = collectionParamsSchema.safeParse(rawParams);
    if (!paramsResult.success) {
      console.error('Invalid collection parameters:', paramsResult.error);
      const { response, status } = createErrorResponse(
        'Invalid collection ID format',
        400,
        paramsResult.error.errors.map(e => e.message).join(', '),
        'INVALID_COLLECTION_PARAMS'
      );
      return NextResponse.json(response, { status });
    }

    const { id: collectionId } = paramsResult.data;

    // Parse and validate request body
    const requestBody = await request.json();
    const validation = validateRequestBody(
      collectionRequestSchema,
      requestBody
    );

    if (!validation.success) {
      console.error('Invalid collection request body:', validation.details);
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_REQUEST_BODY'
      );
      return NextResponse.json(response, { status });
    }

    const { name, description, isPublic } = validation.data;

    // Verify ownership
    const existingCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });

    if (!existingCollection || existingCollection.userId !== session.user.id) {
      const { response, status } = createErrorResponse(
        'Collection not found or access denied',
        404,
        `Collection with ID ${collectionId} does not exist or you do not have permission to modify it`,
        'COLLECTION_NOT_FOUND_OR_ACCESS_DENIED'
      );
      return NextResponse.json(response, { status });
    }

    const collection = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        _count: { select: { albums: true } },
      },
    });

    const { response, status } = createSuccessResponse(
      'Collection updated successfully',
      { collection },
      200
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Error updating collection:', error);
    const { response, status } = createErrorResponse(
      'Failed to update collection',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'COLLECTION_UPDATE_FAILED'
    );
    return NextResponse.json(response, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const { response, status } = createErrorResponse(
        'Authentication required',
        401,
        'You must be logged in to delete collections',
        'UNAUTHORIZED'
      );
      return NextResponse.json(response, { status });
    }

    const rawParams = await params;

    // Validate parameters
    const paramsResult = collectionParamsSchema.safeParse(rawParams);
    if (!paramsResult.success) {
      console.error('Invalid collection parameters:', paramsResult.error);
      const { response, status } = createErrorResponse(
        'Invalid collection ID format',
        400,
        paramsResult.error.errors.map(e => e.message).join(', '),
        'INVALID_COLLECTION_PARAMS'
      );
      return NextResponse.json(response, { status });
    }

    const { id: collectionId } = paramsResult.data;

    // Verify ownership
    const existingCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });

    if (!existingCollection || existingCollection.userId !== session.user.id) {
      const { response, status } = createErrorResponse(
        'Collection not found or access denied',
        404,
        `Collection with ID ${collectionId} does not exist or you do not have permission to delete it`,
        'COLLECTION_NOT_FOUND_OR_ACCESS_DENIED'
      );
      return NextResponse.json(response, { status });
    }

    await prisma.collection.delete({
      where: { id: collectionId },
    });

    const { response, status } = createSuccessResponse(
      'Collection deleted successfully',
      { collectionId },
      200
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Error deleting collection:', error);
    const { response, status } = createErrorResponse(
      'Failed to delete collection',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'COLLECTION_DELETE_FAILED'
    );
    return NextResponse.json(response, { status });
  }
}
