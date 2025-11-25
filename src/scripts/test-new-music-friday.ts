// Test fetching Spotify's "New Music Friday" playlist
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

async function testNewMusicFriday() {
  console.log('🧪 Testing New Music Friday Playlist...\n');

  // Initialize Spotify client
  const spotify = SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID!,
    process.env.SPOTIFY_CLIENT_SECRET!
  );

  // New Music Friday playlist ID (global one)
  const playlistId = '37i9dQZF1DX4JAvHpjipBk';

  console.log('📋 Fetching playlist...');
  try {
    const playlist = await spotify.playlists.getPlaylist(playlistId);

    console.log('✅ Playlist fetched successfully!\n');
    console.log('Playlist Info:');
    console.log(`  Name: ${playlist.name}`);
    console.log(`  Description: ${playlist.description}`);
    console.log(`  Total Tracks: ${playlist.tracks.total}`);
    console.log('');

    // Get tracks
    console.log('🎵 Fetching tracks...');
    const tracks = playlist.tracks.items.slice(0, 10); // First 10 tracks

    console.log(`\nFirst 10 tracks (out of ${playlist.tracks.total}):\n`);

    // Extract unique albums
    const albumMap = new Map();

    tracks.forEach((item, index) => {
      if (!item.track || item.track.type !== 'track') return;

      const track = item.track;
      const album = track.album;

      if (!albumMap.has(album.id)) {
        albumMap.set(album.id, {
          id: album.id,
          name: album.name,
          artists: album.artists.map((a) => a.name).join(', '),
          releaseDate: album.release_date,
          totalTracks: album.total_tracks,
          image: album.images[0]?.url,
          spotifyUrl: album.external_urls.spotify,
        });
      }

      console.log(
        `${index + 1}. "${track.name}" by ${track.artists.map((a) => a.name).join(', ')}`
      );
      console.log(`   Album: "${album.name}" (${album.release_date})`);
    });

    console.log(`\n📀 Unique albums found: ${albumMap.size}`);
    console.log('\nAlbums:');
    Array.from(albumMap.values()).forEach((album, index) => {
      console.log(
        `${index + 1}. "${album.name}" by ${album.artists} (${album.releaseDate})`
      );
    });

    console.log('\n✅ SUCCESS!');
    console.log(
      '\n💡 New Music Friday updates every Friday with actual new releases!'
    );
    console.log(
      '   This is a much better source than browse.getNewReleases() which rarely changes.'
    );
  } catch (error: any) {
    console.error('❌ Failed to fetch playlist:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }

  process.exit(0);
}

testNewMusicFriday();
