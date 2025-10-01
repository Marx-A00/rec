// Comprehensive test of Spotify API response structures across different endpoints
require('dotenv').config(); // Load environment variables
const { SpotifyApi } = require('@spotify/web-api-ts-sdk');
const fs = require('fs');
const path = require('path');

async function testSpotifyEndpoints() {
  const results = {
    timestamp: new Date().toISOString(),
    endpoints: {}
  };

  try {
    // Initialize Spotify client
    const spotify = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    );

    console.log('🎵 Testing Multiple Spotify API Endpoints...\n');

    // 1. TEST: New Releases
    console.log('📀 Testing /browse/new-releases...');
    try {
      const newReleases = await spotify.browse.getNewReleases('US', 2);
      results.endpoints.newReleases = {
        endpoint: '/browse/new-releases',
        method: 'GET',
        params: { country: 'US', limit: 2 },
        responseStructure: {
          topLevelKeys: Object.keys(newReleases),
          albumsContainerKeys: Object.keys(newReleases.albums),
          paginationInfo: {
            total: newReleases.albums.total,
            limit: newReleases.albums.limit,
            offset: newReleases.albums.offset,
            hasNext: !!newReleases.albums.next,
            hasPrevious: !!newReleases.albums.previous
          }
        },
        sampleAlbum: newReleases.albums.items[0] ? {
          allKeys: Object.keys(newReleases.albums.items[0]),
          sampleData: {
            id: newReleases.albums.items[0].id,
            name: newReleases.albums.items[0].name,
            album_type: newReleases.albums.items[0].album_type,
            artists: newReleases.albums.items[0].artists?.map(a => ({ id: a.id, name: a.name })),
            release_date: newReleases.albums.items[0].release_date,
            total_tracks: newReleases.albums.items[0].total_tracks,
            images: newReleases.albums.items[0].images?.map(img => ({ url: img.url, height: img.height, width: img.width })),
            external_urls: newReleases.albums.items[0].external_urls
          },
          artistStructure: newReleases.albums.items[0].artists?.[0] ? {
            keys: Object.keys(newReleases.albums.items[0].artists[0]),
            sample: newReleases.albums.items[0].artists[0]
          } : null
        } : null
      };
      console.log('  ✅ New Releases tested');
    } catch (error) {
      results.endpoints.newReleases = { error: error.message };
      console.log('  ❌ New Releases failed:', error.message);
    }

    // 2. TEST: Featured Playlists
    console.log('📝 Testing /browse/featured-playlists...');
    try {
      const featured = await spotify.browse.getFeaturedPlaylists('US', 2);
      results.endpoints.featuredPlaylists = {
        endpoint: '/browse/featured-playlists',
        method: 'GET',
        params: { country: 'US', limit: 2 },
        responseStructure: {
          topLevelKeys: Object.keys(featured),
          playlistsContainerKeys: Object.keys(featured.playlists),
          paginationInfo: {
            total: featured.playlists.total,
            limit: featured.playlists.limit,
            offset: featured.playlists.offset,
            hasNext: !!featured.playlists.next
          }
        },
        samplePlaylist: featured.playlists.items[0] ? {
          allKeys: Object.keys(featured.playlists.items[0]),
          sampleData: featured.playlists.items[0]
        } : null
      };
      console.log('  ✅ Featured Playlists tested');
    } catch (error) {
      results.endpoints.featuredPlaylists = { error: error.message };
      console.log('  ❌ Featured Playlists failed:', error.message);
    }

    // 3. TEST: Categories
    console.log('🏷️ Testing /browse/categories...');
    try {
      const categories = await spotify.browse.getCategories('US', 3);
      results.endpoints.categories = {
        endpoint: '/browse/categories',
        method: 'GET',
        params: { country: 'US', limit: 3 },
        responseStructure: {
          topLevelKeys: Object.keys(categories),
          categoriesContainerKeys: Object.keys(categories.categories),
        },
        sampleCategory: categories.categories.items[0] || null
      };
      console.log('  ✅ Categories tested');
    } catch (error) {
      results.endpoints.categories = { error: error.message };
      console.log('  ❌ Categories failed:', error.message);
    }

    // 4. TEST: Playlist Tracks (if we got a playlist from featured)
    if (results.endpoints.featuredPlaylists?.samplePlaylist?.sampleData?.id) {
      console.log('🎵 Testing /playlists/{id}/tracks...');
      try {
        const playlistId = results.endpoints.featuredPlaylists.samplePlaylist.sampleData.id;
        const tracks = await spotify.playlists.getPlaylistItems(playlistId, 'US', undefined, 2, 0);
        results.endpoints.playlistTracks = {
          endpoint: `/playlists/${playlistId}/tracks`,
          method: 'GET',
          params: { market: 'US', limit: 2, offset: 0 },
          responseStructure: {
            topLevelKeys: Object.keys(tracks),
            paginationInfo: {
              total: tracks.total,
              limit: tracks.limit,
              offset: tracks.offset,
              hasNext: !!tracks.next
            }
          },
          sampleTrack: tracks.items[0] ? {
            allKeys: Object.keys(tracks.items[0]),
            trackKeys: tracks.items[0].track ? Object.keys(tracks.items[0].track) : null,
            sampleData: tracks.items[0]
          } : null
        };
        console.log('  ✅ Playlist Tracks tested');
      } catch (error) {
        results.endpoints.playlistTracks = { error: error.message };
        console.log('  ❌ Playlist Tracks failed:', error.message);
      }
    }

    // 5. TEST: Search
    console.log('🔍 Testing /search...');
    try {
      const search = await spotify.search('Daft Punk', ['artist', 'album'], 'US', 2);
      results.endpoints.search = {
        endpoint: '/search',
        method: 'GET',
        params: { q: 'Daft Punk', type: 'artist,album', market: 'US', limit: 2 },
        responseStructure: {
          topLevelKeys: Object.keys(search),
          artistsKeys: search.artists ? Object.keys(search.artists) : null,
          albumsKeys: search.albums ? Object.keys(search.albums) : null
        },
        sampleArtist: search.artists?.items[0] || null,
        sampleAlbum: search.albums?.items[0] || null
      };
      console.log('  ✅ Search tested');
    } catch (error) {
      results.endpoints.search = { error: error.message };
      console.log('  ❌ Search failed:', error.message);
    }

    // Write results to file
    const outputPath = path.join(__dirname, 'spotify-api-test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\n✅ Test complete! Results written to: ${outputPath}`);
    console.log(`📊 Tested ${Object.keys(results.endpoints).length} endpoints`);
    
    // Also create a summary file
    const summary = {
      timestamp: results.timestamp,
      endpointsSummary: Object.keys(results.endpoints).map(key => ({
        endpoint: key,
        success: !results.endpoints[key].error,
        error: results.endpoints[key].error || null
      }))
    };
    
    const summaryPath = path.join(__dirname, 'spotify-api-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📋 Summary written to: ${summaryPath}`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    fs.writeFileSync('spotify-api-error.json', JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }, null, 2));
  }
}

// Run the test
testSpotifyEndpoints().catch(console.error);
