import { NextRequest, NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import {
  albumRequestSchema,
  validateRequestBody,
  createErrorResponse,
  createSuccessResponse,
  type AlbumRequest,
} from '@/lib/validations/api';
import {
  AlbumListResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from '@/types/api';

// This would eventually come from your database
const albums = [
  {
    id: '1',
    title: 'BRAT',
    artist: 'Charli XCX',
    // ... other album data
  },
];

export const GET = withApiLogging(async (
): Promise<NextResponse> => {
  try {
    const response: AlbumListResponse = {
      albums,
      total: albums.length,
    };
    return NextResponse.json(response);
  } catch (error) {
    const { response, status } = createErrorResponse(
      'Failed to fetch albums',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'FETCH_ALBUMS_FAILED'
    );
    return NextResponse.json(response as ApiErrorResponse, { status });
  }
});

export const POST = withApiLogging(async (
  request: NextRequest,
): Promise<NextResponse> => {
  try {
    // Parse request body
    const body: unknown = await request.json();

    // Validate request body
    const validation = validateRequestBody(albumRequestSchema, body);

    if (!validation.success) {
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_REQUEST_BODY'
      );
      return NextResponse.json(response as ApiErrorResponse, { status });
    }

    const validatedData: AlbumRequest = validation.data;

    // Create new album with validated data
    const newAlbum = {
      id: (albums.length + 1).toString(),
      ...validatedData,
      createdAt: new Date().toISOString(),
    };

    // Here you would typically save to a database
    albums.push(newAlbum);

    const { response, status } = createSuccessResponse(
      'Album created successfully',
      newAlbum,
      201
    );
    return NextResponse.json(response as ApiSuccessResponse<typeof newAlbum>, {
      status,
    });
  } catch (error) {
    const { response, status } = createErrorResponse(
      'Failed to create album',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'CREATE_ALBUM_FAILED'
    );
    return NextResponse.json(response as ApiErrorResponse, { status });
  }
});
