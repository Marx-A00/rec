import { NextRequest, NextResponse } from "next/server";
var Discogs = require('disconnect').Client;

var db = new Discogs({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET
}).database();

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '25');
    const sort = searchParams.get('sort') || 'year';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    if (!id) {
        console.error('Artist ID is required');
        return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    try {
        console.log(`Fetching releases for artist ID: ${id}`);

        const releasesData = await db.getArtistReleases(id, {
            page,
            per_page: perPage,
            sort,
            sort_order: sortOrder
        });

        console.log(`Found ${releasesData.releases?.length || 0} releases`);
        console.log('Raw releases data:', JSON.stringify(releasesData, null, 2));

        const releases = releasesData.releases.map((release: any) => ({
            id: release.id,
            title: release.title,
            year: release.year,
            format: release.format,
            label: release.label,
            role: release.role,
            resource_url: release.resource_url,
            artist: release.artist,
            thumb: release.thumb || PLACEHOLDER_IMAGE,
            basic_information: release.basic_information
        }));

        console.log(`Successfully formatted ${releases.length} releases`);

        return NextResponse.json({
            releases,
            pagination: releasesData.pagination || null,
            success: true
        })


    } catch (error: any) {
        console.error('Error fetching artist releases:', error);

            // Check if it's a "not found" type error
        if (error.message?.includes('404') || error.statusCode === 404) {
            return NextResponse.json({ error: 'Artist releases not found' }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
}
