// Load environment variables for standalone script
require('dotenv').config({ path: '../.env' });

const SpotifySDKClient = require('./spotify-sdk-client');

async function getTrendingMusic() {
  const client = new SpotifySDKClient();

  console.log('\n🎵 FETCHING TRENDING MUSIC DATA (Using Official SDK) 🎵\n');

  try {
    // 1. Get New Releases
    console.log('📀 NEW RELEASES:');
    const newReleases = await client.getNewReleases('US', 10);
    newReleases.albums.items.forEach(album => {
      const artists = album.artists.map(a => a.name).join(', ');
      console.log(`  - "${album.name}" by ${artists} (${album.release_date})`);
    });

    // 2. Get Featured Playlists
    console.log('\n🎧 FEATURED PLAYLISTS:');
    const featured = await client.getFeaturedPlaylists('US', 5);
    featured.playlists.items.forEach(playlist => {
      console.log(
        `  - ${playlist.name}: ${playlist.description || 'No description'}`
      );
    });

    // 3. Get Top Charts Playlists
    console.log('\n📊 TOP CHARTS PLAYLISTS:');
    try {
      const topLists = await client.getCategoryPlaylists('toplists', 'US', 5);
      for (const playlist of topLists.playlists.items) {
        console.log(`  - ${playlist.name}`);

        // Get first few tracks
        const tracks = await client.getPlaylistTracks(playlist.id, 5);
        tracks.items.forEach(item => {
          if (item.track) {
            const artists = item.track.artists.map(a => a.name).join(', ');
            console.log(`      • "${item.track.name}" by ${artists}`);
          }
        });
      }
    } catch (error) {
      console.log('  Could not fetch top lists category');
    }

    // 4. Search for viral/trending artists
    console.log('\n🔥 SEARCHING POPULAR ARTISTS:');
    const searchTerms = ['viral', '2025', 'trending'];

    for (const term of searchTerms) {
      const results = await client.search(term, ['artist'], 3);
      if (results.artists.items.length > 0) {
        console.log(`  Results for "${term}":`);
        results.artists.items.forEach(artist => {
          const popularity = artist.popularity;
          const followers = artist.followers.total.toLocaleString();
          console.log(
            `    - ${artist.name} (Popularity: ${popularity}/100, Followers: ${followers})`
          );
        });
      }
    }

    // 5. Get popular artist's top tracks
    console.log('\n🎤 TOP TRACKS FROM POPULAR ARTISTS:');
    const searchResult = await client.search('Drake', ['artist'], 1);
    if (searchResult.artists.items.length > 0) {
      const artist = searchResult.artists.items[0];
      console.log(`  ${artist.name}'s top tracks:`);

      const topTracks = await client.getArtistTopTracks(artist.id, 'US');
      topTracks.tracks.slice(0, 5).forEach(track => {
        console.log(
          `    - "${track.name}" (Popularity: ${track.popularity}/100)`
        );
      });
    }

    // 6. Get Hip-Hop playlists
    console.log('\n🎤 HIP-HOP PLAYLISTS:');
    try {
      const hiphop = await client.getCategoryPlaylists('hiphop', 'US', 3);
      hiphop.playlists.items.forEach(playlist => {
        console.log(`  - ${playlist.name}`);
      });
    } catch (error) {
      console.log('  Could not fetch hip-hop category');
    }

    // 7. Get recommendations
    console.log('\n💡 RECOMMENDED TRACKS:');
    if (searchResult.artists.items.length > 0) {
      const recs = await client.getRecommendations({
        seed_artists: searchResult.artists.items[0].id,
        seed_genres: 'hip-hop,rap',
        limit: 5,
      });

      recs.tracks.forEach(track => {
        const artists = track.artists.map(a => a.name).join(', ');
        console.log(`  - "${track.name}" by ${artists}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message || error);
    if (error.body) {
      console.error('API Error:', error.body);
    }
  }
}

// Run it!
getTrendingMusic();
