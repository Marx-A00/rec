import { Client } from 'disconnect';
import { NextRequest, NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import { Release } from '@/types/album';

const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export const GET = withApiLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '25');
  const sort = searchParams.get('sort') || 'year';
  const sortOrderParam = searchParams.get('sort_order') || 'desc';
  const typeFilter = searchParams.get('type'); // 'master' or 'release' or null for all
  const sortOrder =
    sortOrderParam === 'asc' || sortOrderParam === 'desc'
      ? sortOrderParam
      : 'desc';

  if (!id) {
    return NextResponse.json(
      { error: 'Artist ID is required' },
      { status: 400 }
    );
  }

  try {
    const releasesData = await db.getArtistReleases(id, {
      page,
      per_page: perPage,
      sort,
      sort_order: sortOrder,
    });

    if (!releasesData.releases || !Array.isArray(releasesData.releases)) {
      return NextResponse.json({
        releases: [],
        pagination: null,
        success: true,
      });
    }

    // Filter by type if specified
    let filteredReleases = releasesData.releases;
    if (typeFilter === 'master' || typeFilter === 'release') {
      filteredReleases = releasesData.releases.filter(
        (release: Release) => release.type === typeFilter
      );
    }

    const releases = filteredReleases.map((release: Release) => ({
      id: release.id,
      title: release.title,
      year: release.year,
      type: release.type, // Include the type field
      format: release.format,
      label: release.label,
      role: release.role,
      resource_url: release.resource_url,
      artist: release.artist,
      thumb: release.thumb || PLACEHOLDER_IMAGE,
      basic_information: release.basic_information,
      // Master-specific fields
      ...(release.type === 'master' && {
        main_release: release.main_release,
      }),
      // Release-specific fields
      ...(release.type === 'release' && {
        status: release.status,
      }),
    }));

    return NextResponse.json({
      releases,
      pagination: releasesData.pagination || null,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch artist releases',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
