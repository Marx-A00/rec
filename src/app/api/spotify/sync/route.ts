// @ts-nocheck - Minor Spotify API type issues, needs cleanup  
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

// Initialize Spotify client
const spotifyClient = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!
);

// Cache duration in milliseconds (6 hours)
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export async function GET() {
  try {
    // Check if we have cached data
    const cached = await prisma.cacheData.findUnique({
      where: { key: 'spotify_trending' }
    });

    // If cache exists and hasn't expired, return it
    if (cached && cached.expires > new Date()) {
      console.log('Returning cached Spotify data');
      return NextResponse.json({
        success: true,
        source: 'cache',
        data: cached.data,
        expires: cached.expires,
        lastUpdated: cached.updatedAt
      });
    }

    console.log('Fetching fresh data from Spotify API...');
    
    // Fetch fresh data from Spotify
    const data: any = {
      newReleases: [],
      featuredPlaylists: [],
      topCharts: [],
      popularArtists: [],
      recommendations: [],
      fetchedAt: new Date().toISOString()
    };

    // 1. Get New Releases
    try {
      const newReleases = await spotifyClient.browse.getNewReleases('US', 20);
      data.newReleases = newReleases.albums.items.map(album => ({
        id: album.id,
        name: album.name,
        artists: album.artists.map(a => a.name).join(', '),
        artistIds: album.artists.map(a => a.id),
        releaseDate: album.release_date,
        image: album.images[0]?.url,
        spotifyUrl: album.external_urls.spotify,
        type: album.album_type,
        totalTracks: album.total_tracks
      }));
    } catch (error) {
      console.error('Failed to fetch new releases:', error);
    }

    // 2. Get Featured Playlists
    try {
      const featured = await spotifyClient.browse.getFeaturedPlaylists('US', 10);
      data.featuredPlaylists = featured.playlists.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images[0]?.url,
        tracksTotal: playlist.tracks.total,
        spotifyUrl: playlist.external_urls.spotify,
        owner: playlist.owner.display_name
      }));
    } catch (error) {
      console.error('Failed to fetch featured playlists:', error);
    }

    // 3. Get Top Charts (if category exists)
    try {
      const topLists = await spotifyClient.browse.getPlaylistsForCategory('toplists', 'US', 5);
      
      // Get tracks from first 2 playlists
      for (const playlist of topLists.playlists.items.slice(0, 2)) {
        try {
          const tracks = await spotifyClient.playlists.getPlaylistItems(
            playlist.id, 
            'US', 
            undefined, 
            10, 
            0
          );
          
          data.topCharts.push({
            playlistName: playlist.name,
            playlistId: playlist.id,
            playlistImage: playlist.images[0]?.url,
            tracks: tracks.items.map(item => ({
              id: item.track?.id,
              name: item.track?.name,
              artists: item.track?.artists?.map(a => a.name).join(', '),
              artistIds: item.track?.artists?.map(a => a.id),
              album: item.track?.album?.name,
              albumId: item.track?.album?.id,
              popularity: item.track?.popularity,
              image: item.track?.album?.images[0]?.url
            })).filter(t => t.id) // Filter out null tracks
          });
        } catch (error) {
          console.error(`Failed to fetch tracks for playlist ${playlist.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch top charts:', error);
    }

    // 4. Search for viral/trending artists
    try {
      const searchTerms = ['viral', '2025', 'trending', 'hot'];
      
      for (const term of searchTerms) {
        try {
          const results = await spotifyClient.search(term, ['artist'], 'US', 5);
          
          if (results.artists.items.length > 0) {
            data.popularArtists.push({
              searchTerm: term,
              artists: results.artists.items.map(artist => ({
                id: artist.id,
                name: artist.name,
                popularity: artist.popularity,
                followers: artist.followers.total,
                genres: artist.genres,
                image: artist.images[0]?.url,
                spotifyUrl: artist.external_urls.spotify
              }))
            });
          }
        } catch (error) {
          console.error(`Failed to search for ${term}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to search for artists:', error);
    }

    // Save to cache
    const expiresAt = new Date(Date.now() + CACHE_DURATION);
    
    await prisma.cacheData.upsert({
      where: { key: 'spotify_trending' },
      create: {
        key: 'spotify_trending',
        data: data as any, // Prisma Json type
        expires: expiresAt,
        metadata: {
          version: 1,
          source: 'spotify_api',
          itemCount: {
            newReleases: data.newReleases.length,
            featuredPlaylists: data.featuredPlaylists.length,
            topCharts: data.topCharts.length,
            popularArtists: data.popularArtists.length
          }
        }
      },
      update: {
        data: data as any,
        expires: expiresAt,
        metadata: {
          version: 1,
          source: 'spotify_api',
          itemCount: {
            newReleases: data.newReleases.length,
            featuredPlaylists: data.featuredPlaylists.length,
            topCharts: data.topCharts.length,
            popularArtists: data.popularArtists.length
          }
        }
      }
    });

    console.log('Successfully cached Spotify data');

    return NextResponse.json({
      success: true,
      source: 'fresh',
      data: data,
      expires: expiresAt,
      cached: true
    });

  } catch (error: any) {
    console.error('Spotify sync error:', error);
    
    // If we have expired cache, return it as fallback
    const fallbackCache = await prisma.cacheData.findUnique({
      where: { key: 'spotify_trending' }
    });
    
    if (fallbackCache) {
      return NextResponse.json({
        success: true,
        source: 'expired_cache',
        data: fallbackCache.data,
        expires: fallbackCache.expires,
        error: 'Using expired cache due to API error'
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to sync Spotify data'
      },
      { status: 500 }
    );
  }
}