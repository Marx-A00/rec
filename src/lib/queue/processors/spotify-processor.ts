// src/lib/queue/processors/spotify-processor.ts
// Spotify API sync handlers

import type {
  SpotifySyncNewReleasesJobData,
  SpotifySyncFeaturedPlaylistsJobData,
} from '../jobs';

// ============================================================================
// Spotify New Releases Helper
// ============================================================================

/**
 * Search for new releases using Spotify Search API with tag:new filter
 * Replaces deprecated browse.getNewReleases() which returns stale data
 */
export async function searchSpotifyNewReleases(
  data: SpotifySyncNewReleasesJobData
): Promise<
  Array<{
    id: string;
    name: string;
    artists: string;
    artistIds: string[];
    releaseDate: string;
    image: string | null;
    spotifyUrl: string;
    type: string;
    totalTracks: number;
  }>
> {
  const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');

  const spotifyClient = SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID!,
    process.env.SPOTIFY_CLIENT_SECRET!
  );

  // Build search query
  const queryParts = ['tag:new'];

  // Add year filter (defaults to current year)
  const year = data.year || new Date().getFullYear();
  queryParts.push(`year:${year}`);

  // Add genre tags if specified
  if (data.genreTags && data.genreTags.length > 0) {
    data.genreTags.forEach(tag => {
      queryParts.push(`tag:${tag}`);
    });
  }

  const query = queryParts.join(' ');
  const limit = data.limit || 50;
  const country = data.country || 'US';

  console.log(
    `🔍 Spotify search query: "${query}" (limit: ${limit}, market: ${country})`
  );

  // Execute search
  const searchResults = await spotifyClient.search(
    query,
    ['album'],
    country as Parameters<typeof spotifyClient.search>[2],
    limit as 0 | 10 | 1 | 25 | 50 | 5 | 20
  );

  const albums = searchResults.albums.items;
  console.log(`📀 Found ${albums.length} new releases from search`);

  // Transform to expected format
  return albums.map(album => ({
    id: album.id,
    name: album.name,
    artists: album.artists.map(a => a.name).join(', '),
    artistIds: album.artists.map(a => a.id),
    releaseDate: album.release_date,
    image: album.images[0]?.url || null,
    spotifyUrl: album.external_urls.spotify,
    type: album.album_type,
    totalTracks: album.total_tracks,
  }));
}

// ============================================================================
// Spotify Sync Handlers
// ============================================================================

/**
 * Handle Spotify new releases sync job
 * Uses Spotify Search API with tag:new filter (replaces deprecated browse.getNewReleases)
 */
export async function handleSpotifySyncNewReleases(
  data: SpotifySyncNewReleasesJobData
): Promise<any> {
  const year = data.year || new Date().getFullYear();
  console.log(
    `🎵 Syncing Spotify new releases (limit: ${data.limit || 50}, country: ${data.country || 'US'})`
  );
  console.log(`🔍 Using Spotify Search API with tag:new filter`);
  console.log(`   Query: "tag:new year:${year}"`);
  if (data.genreTags && data.genreTags.length > 0) {
    console.log(`   Genre filters: ${data.genreTags.join(', ')}`);
  }

  try {
    // Import mappers and error handling
    const { processSpotifyAlbums } = await import('../../spotify/mappers');
    const { withSpotifyRetry, withSpotifyMetrics } = await import(
      '../../spotify/error-handling'
    );

    // Fetch new releases using search API with tag:new filter
    const spotifyAlbums = await withSpotifyMetrics(
      () =>
        withSpotifyRetry(
          async () => await searchSpotifyNewReleases(data),
          'Spotify tag:new search'
        ),
      'Spotify New Releases Search'
    );

    console.log(`📀 Fetched ${spotifyAlbums.length} new releases from Spotify`);

    // Process through our mappers (creates DB records + queues enrichment)
    const result = await processSpotifyAlbums(
      spotifyAlbums,
      data.source || 'spotify_search',
      {
        query: `tag:new year:${year}${data.genreTags ? ' ' + data.genreTags.map(t => `tag:${t}`).join(' ') : ''}`,
        country: data.country,
        genreTags: data.genreTags,
        year: year,
      }
    );

    console.log(`✅ Spotify new releases sync complete:`, result.stats);

    return {
      success: true,
      albumsProcessed: result.stats.albumsProcessed,
      artistsProcessed: result.stats.artistsProcessed,
      duplicatesSkipped: result.stats.duplicatesSkipped,
      errors: result.stats.errors,
      source: 'spotify_search',
      spotifyData: {
        totalFetched: spotifyAlbums.length,
        country: data.country || 'US',
        limit: data.limit || 50,
        year: year,
        genreTags: data.genreTags || [],
      },
    };
  } catch (error) {
    console.error('❌ Spotify new releases sync failed:', error);

    // Import error handling to get better error info
    const { analyzeSpotifyError } = await import(
      '../../spotify/error-handling'
    );
    const errorInfo = analyzeSpotifyError(error);

    // Return structured error response
    return {
      success: false,
      error: {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        statusCode: errorInfo.statusCode,
      },
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [errorInfo.message],
    };
  }
}

/**
 * Handle Spotify featured playlists sync job
 * Fetches playlists and extracts albums from tracks
 */
export async function handleSpotifySyncFeaturedPlaylists(
  data: SpotifySyncFeaturedPlaylistsJobData
): Promise<any> {
  console.log(
    `🎵 Syncing Spotify featured playlists (limit: ${data.limit || 10}, country: ${data.country || 'US'})`
  );

  try {
    // Import Spotify client, mappers, and error handling
    const { SpotifyApi } = await import('@spotify/web-api-ts-sdk');
    const { processSpotifyAlbums } = await import('../../spotify/mappers');
    const { withSpotifyRetry, withSpotifyMetrics } = await import(
      '../../spotify/error-handling'
    );

    // Initialize Spotify client with retry wrapper
    const createSpotifyClient = () =>
      SpotifyApi.withClientCredentials(
        process.env.SPOTIFY_CLIENT_ID!,
        process.env.SPOTIFY_CLIENT_SECRET!
      );

    // Fetch featured playlists with retry logic and metrics
    const featured = await withSpotifyMetrics(
      () =>
        withSpotifyRetry(async () => {
          const spotifyClient = createSpotifyClient();
          return await spotifyClient.browse.getFeaturedPlaylists(
            (data.country || 'US') as Parameters<
              typeof spotifyClient.browse.getFeaturedPlaylists
            >[0],
            'en_US', // Locale parameter (required)
            undefined, // Timestamp (optional)
            (data.limit || 10) as Parameters<
              typeof spotifyClient.browse.getFeaturedPlaylists
            >[3]
          );
        }, 'Spotify getFeaturedPlaylists API call'),
      'Spotify Featured Playlists Sync'
    );

    console.log(
      `📋 Fetched ${featured.playlists.items.length} featured playlists from Spotify`
    );

    if (!data.extractAlbums) {
      // Just return playlist info without processing albums
      return {
        success: true,
        playlistsProcessed: featured.playlists.items.length,
        albumsProcessed: 0,
        message: 'Playlists fetched but album extraction was disabled',
      };
    }

    // Extract albums from playlist tracks
    const albumsMap = new Map<string, any>(); // Deduplicate albums by Spotify ID
    let totalTracks = 0;

    for (const playlist of featured.playlists.items) {
      try {
        console.log(`🎧 Processing playlist: "${playlist.name}"`);

        // Get playlist tracks (limit to first 50 tracks per playlist)
        const playlistClient = createSpotifyClient();
        const tracks = await playlistClient.playlists.getPlaylistItems(
          playlist.id,
          (data.country || 'US') as Parameters<
            typeof playlistClient.playlists.getPlaylistItems
          >[1],
          undefined,
          50, // limit
          0 // offset
        );

        totalTracks += tracks.items.length;

        // Extract unique albums from tracks
        for (const item of tracks.items) {
          if (item.track && item.track.type === 'track' && item.track.album) {
            const album = item.track.album;

            // Skip if we already have this album
            if (albumsMap.has(album.id)) continue;

            albumsMap.set(album.id, {
              id: album.id,
              name: album.name,
              artists: album.artists
                .map((a: { name: string }) => a.name)
                .join(', '),
              artistIds: album.artists.map((a: { id: string }) => a.id),
              releaseDate: album.release_date,
              image: album.images[0]?.url || null,
              spotifyUrl: album.external_urls.spotify,
              type: album.album_type,
              totalTracks: album.total_tracks,
            });
          }
        }
      } catch (error) {
        console.error(
          `❌ Failed to process playlist "${playlist.name}":`,
          error
        );
        // Continue with other playlists
      }
    }

    const uniqueAlbums = Array.from(albumsMap.values());
    console.log(
      `📀 Extracted ${uniqueAlbums.length} unique albums from ${totalTracks} tracks`
    );

    if (uniqueAlbums.length === 0) {
      return {
        success: true,
        playlistsProcessed: featured.playlists.items.length,
        albumsProcessed: 0,
        message: 'No albums found in playlist tracks',
      };
    }

    // Process through our mappers
    const result = await processSpotifyAlbums(
      uniqueAlbums,
      data.source || 'spotify_playlists',
      {
        country: data.country,
      }
    );

    console.log(`✅ Spotify featured playlists sync complete:`, result.stats);

    return {
      success: true,
      playlistsProcessed: featured.playlists.items.length,
      albumsProcessed: result.stats.albumsProcessed,
      artistsProcessed: result.stats.artistsProcessed,
      duplicatesSkipped: result.stats.duplicatesSkipped,
      errors: result.stats.errors,
      source: 'spotify_featured_playlists',
      spotifyData: {
        totalPlaylists: featured.playlists.items.length,
        totalTracks: totalTracks,
        uniqueAlbums: uniqueAlbums.length,
        country: data.country || 'US',
        limit: data.limit || 10,
      },
    };
  } catch (error) {
    console.error('❌ Spotify featured playlists sync failed:', error);

    // Import error handling to get better error info
    const { analyzeSpotifyError } = await import(
      '../../spotify/error-handling'
    );
    const errorInfo = analyzeSpotifyError(error);

    // Return structured error response
    return {
      success: false,
      error: {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        statusCode: errorInfo.statusCode,
      },
      playlistsProcessed: 0,
      albumsProcessed: 0,
      artistsProcessed: 0,
      duplicatesSkipped: 0,
      errors: [errorInfo.message],
    };
  }
}
