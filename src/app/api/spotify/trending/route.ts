import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { NextResponse } from 'next/server';

// Initialize Spotify client with credentials
const client = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID!,
  process.env.SPOTIFY_CLIENT_SECRET!
);

export async function GET() {
  try {
    const data: any = {
      newReleases: [],
      featuredPlaylists: [],
      topCharts: [],
      popularArtists: [],
      recommendations: []
    };

    // 1. Get New Releases
    try {
      const newReleases = await client.browse.getNewReleases('US', 10);
      data.newReleases = newReleases.albums.items.map(album => ({
        name: album.name,
        artists: album.artists.map(a => a.name).join(', '),
        releaseDate: album.release_date,
        image: album.images[0]?.url,
        spotifyUrl: album.external_urls.spotify,
        id: album.id
      }));
    } catch (error) {
      console.log('Could not fetch new releases:', error);
    }

    // 2. Get Featured Playlists
    try {
      const featured = await client.browse.getFeaturedPlaylists('US', 5);
      data.featuredPlaylists = featured.playlists.items.map(playlist => ({
        name: playlist.name,
        description: playlist.description,
        image: playlist.images[0]?.url,
        tracksTotal: playlist.tracks.total,
        id: playlist.id
      }));
    } catch (error) {
      console.log('Could not fetch featured playlists:', error);
    }

    // 3. Get Top Charts (if category exists)
    try {
      const topLists = await client.browse.getPlaylistsForCategory('toplists', 'US', 3);
      for (const playlist of topLists.playlists.items.slice(0, 2)) {
        const tracks = await client.playlists.getPlaylistItems(playlist.id, 'US', undefined, 5, 0);
        data.topCharts.push({
          playlistName: playlist.name,
          playlistId: playlist.id,
          tracks: tracks.items.map(item => ({
            name: item.track?.name,
            artists: item.track?.artists?.map(a => a.name).join(', '),
            popularity: item.track?.popularity,
            id: item.track?.id
          })).filter(t => t.name) // Filter out null tracks
        });
      }
    } catch (error) {
      console.log('Could not fetch top charts');
    }

    // 4. Search for trending/popular artists
    try {
      const searchTerms = ['viral', '2025', 'trending'];
      for (const term of searchTerms) {
        const results = await client.search(term, ['artist'], 'US', 3);
        if (results.artists.items.length > 0) {
          data.popularArtists.push({
            searchTerm: term,
            artists: results.artists.items.map(artist => ({
              name: artist.name,
              popularity: artist.popularity,
              followers: artist.followers.total,
              genres: artist.genres,
              image: artist.images[0]?.url,
              id: artist.id
            }))
          });
        }
      }
    } catch (error) {
      console.log('Could not search for artists:', error);
    }

    // 5. Get recommendations based on popular artists
    try {
      if (data.popularArtists.length > 0 && data.popularArtists[0].artists.length > 0) {
        const seedArtistId = data.popularArtists[0].artists[0].id;
        const recs = await client.recommendations.get({
          seed_artists: [seedArtistId],
          seed_genres: ['pop', 'hip-hop'],
          limit: 10,
          market: 'US'
        });
        
        data.recommendations = recs.tracks.map(track => ({
          name: track.name,
          artists: track.artists.map(a => a.name).join(', '),
          popularity: track.popularity,
          preview_url: track.preview_url,
          id: track.id
        }));
      }
    } catch (error) {
      console.log('Could not get recommendations:', error);
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Spotify API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch Spotify data',
        details: error.body || error
      },
      { status: 500 }
    );
  }
}