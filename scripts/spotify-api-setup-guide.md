# Spotify API Setup Guide - Popular Artists & Trends

## 1. Get Spotify App Credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account (or create one)
3. Click "Create app"
4. Fill in:
   - App name: "Music Trends Tracker" (or whatever)
   - App description: "Fetch popular music data"
   - Redirect URI: `http://localhost:3000` (required but won't use it)
   - Select "Web API" under "Which API/SDKs are you planning to use?"
5. Click "Save"
6. Go to your app's settings
7. Copy your **Client ID** and **Client Secret**

## 2. Setup Environment Variables

Create a `.env` file in your project root:

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

## 3. Install Dependencies

```bash
npm install dotenv node-fetch
```

Or if using modern Node.js (18+), fetch is built-in, just need:

```bash
npm install dotenv
```

## 4. Basic Spotify API Client

Create `spotify-client.js`:

```javascript
require('dotenv').config();

class SpotifyClient {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get access token using Client Credentials flow
  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const authString = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64');

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      console.log(
        '✓ Access token obtained, expires in',
        data.expires_in,
        'seconds'
      );
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }

  // Make authenticated request to Spotify API
  async makeRequest(endpoint, params = {}) {
    const token = await this.getAccessToken();

    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.spotify.com/v1${endpoint}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 5;
        console.warn(`Rate limited! Waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeRequest(endpoint, params); // Retry
      }

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} - ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get new album releases
  async getNewReleases(country = 'US', limit = 50) {
    return this.makeRequest('/browse/new-releases', { country, limit });
  }

  // Search for artists, tracks, albums
  async search(query, types = ['artist', 'track'], limit = 20) {
    return this.makeRequest('/search', {
      q: query,
      type: types.join(','),
      limit,
    });
  }

  // Get artist details
  async getArtist(artistId) {
    return this.makeRequest(`/artists/${artistId}`);
  }

  // Get artist's top tracks
  async getArtistTopTracks(artistId, market = 'US') {
    return this.makeRequest(`/artists/${artistId}/top-tracks`, { market });
  }

  // Get several artists at once (up to 50)
  async getMultipleArtists(artistIds) {
    return this.makeRequest('/artists', { ids: artistIds.join(',') });
  }

  // Get available genre seeds for recommendations
  async getGenreSeeds() {
    return this.makeRequest('/recommendations/available-genre-seeds');
  }

  // Get recommendations based on seeds
  async getRecommendations(options = {}) {
    // Example: { seed_artists: '4NHQUGzhtTLFvgF5SZesLK', seed_genres: 'hip-hop,rap', limit: 20 }
    return this.makeRequest('/recommendations', options);
  }

  // Get featured playlists (often curated/popular)
  async getFeaturedPlaylists(country = 'US', limit = 50) {
    return this.makeRequest('/browse/featured-playlists', { country, limit });
  }

  // Get a category's playlists (like "Top Lists" or "Hip-Hop")
  async getCategoryPlaylists(categoryId, country = 'US', limit = 50) {
    return this.makeRequest(`/browse/categories/${categoryId}/playlists`, {
      country,
      limit,
    });
  }

  // Get all categories
  async getCategories(country = 'US', limit = 50) {
    return this.makeRequest('/browse/categories', { country, limit });
  }

  // Get playlist details
  async getPlaylist(playlistId, fields = null) {
    const params = {};
    if (fields) params.fields = fields;
    return this.makeRequest(`/playlists/${playlistId}`, params);
  }

  // Get playlist tracks
  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    return this.makeRequest(`/playlists/${playlistId}/tracks`, {
      limit,
      offset,
    });
  }
}

module.exports = SpotifyClient;
```

## 5. Example Usage - Finding Popular Artists & Trends

Create `get-trending-music.js`:

```javascript
const SpotifyClient = require('./spotify-client');

async function getTrendingMusic() {
  const client = new SpotifyClient();

  console.log('\n🎵 FETCHING TRENDING MUSIC DATA 🎵\n');

  try {
    // 1. Get New Releases (Latest Albums)
    console.log('📀 NEW RELEASES:');
    const newReleases = await client.getNewReleases('US', 10);
    newReleases.albums.items.forEach(album => {
      const artists = album.artists.map(a => a.name).join(', ');
      console.log(`  - "${album.name}" by ${artists} (${album.release_date})`);
    });

    // 2. Get Featured Playlists (Often contain trending music)
    console.log('\n🎧 FEATURED PLAYLISTS:');
    const featured = await client.getFeaturedPlaylists('US', 5);
    for (const playlist of featured.playlists.items) {
      console.log(
        `  - ${playlist.name}: ${playlist.description || 'No description'}`
      );
    }

    // 3. Get "Top Lists" Category Playlists (Usually has charts)
    console.log('\n📊 TOP CHARTS PLAYLISTS:');
    // 'toplists' is the category ID for top charts
    const topLists = await client.getCategoryPlaylists('toplists', 'US', 5);
    for (const playlist of topLists.playlists.items) {
      console.log(`  - ${playlist.name}`);

      // Get first few tracks from the playlist
      const tracks = await client.getPlaylistTracks(playlist.id, 5);
      tracks.items.forEach(item => {
        if (item.track) {
          const artists = item.track.artists.map(a => a.name).join(', ');
          console.log(`      • "${item.track.name}" by ${artists}`);
        }
      });
    }

    // 4. Search for currently popular artists
    console.log('\n🔥 SEARCHING POPULAR ARTISTS:');
    const popularSearchTerms = ['viral', '2024', 'trending'];

    for (const term of popularSearchTerms) {
      const results = await client.search(term, ['artist'], 3);
      if (results.artists.items.length > 0) {
        console.log(`  Results for "${term}":`);
        results.artists.items.forEach(artist => {
          const popularity = artist.popularity; // 0-100 score
          const followers = artist.followers.total.toLocaleString();
          console.log(
            `    - ${artist.name} (Popularity: ${popularity}/100, Followers: ${followers})`
          );
        });
      }
    }

    // 5. Get specific popular artist's top tracks
    console.log('\n🎤 TOP TRACKS FROM POPULAR ARTISTS:');
    // Search for a currently popular artist
    const searchResult = await client.search('Taylor Swift', ['artist'], 1);
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

    // 6. Get Hip-Hop category playlists (or any genre)
    console.log('\n🎤 HIP-HOP PLAYLISTS:');
    const hiphop = await client.getCategoryPlaylists('hiphop', 'US', 3);
    hiphop.playlists.items.forEach(playlist => {
      console.log(`  - ${playlist.name}`);
    });

    // 7. Get recommendations based on popular artists
    console.log('\n💡 RECOMMENDED TRACKS (based on trending):');
    // Get recommendations based on a popular artist
    const recs = await client.getRecommendations({
      seed_artists: searchResult.artists.items[0].id,
      seed_genres: 'pop',
      limit: 5,
      market: 'US',
    });

    recs.tracks.forEach(track => {
      const artists = track.artists.map(a => a.name).join(', ');
      console.log(`  - "${track.name}" by ${artists}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
getTrendingMusic();
```

## 6. Advanced: Analyzing Popularity Patterns

Create `analyze-popularity.js`:

```javascript
const SpotifyClient = require('./spotify-client');

async function analyzePopularity() {
  const client = new SpotifyClient();

  // Collect popularity data from different sources
  const popularityData = {
    newReleases: [],
    topPlaylistTracks: [],
    searchResults: [],
  };

  try {
    // Analyze new releases
    const newReleases = await client.getNewReleases('US', 50);
    for (const album of newReleases.albums.items) {
      // Get full album details to see popularity
      const fullAlbum = await client.makeRequest(`/albums/${album.id}`);
      popularityData.newReleases.push({
        name: album.name,
        artists: album.artists.map(a => a.name).join(', '),
        popularity: fullAlbum.popularity,
        releaseDate: album.release_date,
        type: album.album_type,
      });

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort by popularity
    popularityData.newReleases.sort((a, b) => b.popularity - a.popularity);

    console.log('\n📊 NEW RELEASES BY POPULARITY:');
    popularityData.newReleases.slice(0, 10).forEach(album => {
      console.log(
        `  ${album.popularity}/100 - "${album.name}" by ${album.artists}`
      );
    });

    // Get global top 50 playlist (if available)
    const topLists = await client.getCategoryPlaylists('toplists', 'US', 20);
    const globalTop50 = topLists.playlists.items.find(
      p =>
        p.name.toLowerCase().includes('top 50') ||
        p.name.toLowerCase().includes('viral')
    );

    if (globalTop50) {
      console.log(`\n🌍 ANALYZING: ${globalTop50.name}`);
      const tracks = await client.getPlaylistTracks(globalTop50.id, 50);

      // Collect artist IDs
      const artistIds = new Set();
      tracks.items.forEach(item => {
        if (item.track && item.track.artists) {
          item.track.artists.forEach(artist => artistIds.add(artist.id));
        }
      });

      // Get artist details in batches
      const artistArray = Array.from(artistIds);
      const artistDetails = [];

      for (let i = 0; i < artistArray.length; i += 50) {
        const batch = artistArray.slice(i, i + 50);
        const artists = await client.getMultipleArtists(batch);
        artistDetails.push(...artists.artists);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sort artists by popularity
      artistDetails.sort((a, b) => b.popularity - a.popularity);

      console.log('\n🎤 TOP ARTISTS BY POPULARITY:');
      artistDetails.slice(0, 15).forEach(artist => {
        const followers = artist.followers.total.toLocaleString();
        console.log(
          `  ${artist.popularity}/100 - ${artist.name} (${followers} followers)`
        );
      });

      // Analyze genres
      const genreCount = {};
      artistDetails.forEach(artist => {
        artist.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });

      const sortedGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      console.log('\n🎵 TOP GENRES IN CHARTS:');
      sortedGenres.forEach(([genre, count]) => {
        console.log(`  ${genre}: ${count} artists`);
      });
    }
  } catch (error) {
    console.error('Error analyzing popularity:', error);
  }
}

analyzePopularity();
```

## 7. Running the Scripts

```bash
# Basic trending music data
node get-trending-music.js

# Deep popularity analysis
node analyze-popularity.js
```

## 8. Rate Limiting & Best Practices

1. **Respect Rate Limits**:
   - The code includes retry logic for 429 errors
   - Add delays between requests when doing bulk operations
   - Cache tokens (already implemented)

2. **Batch Requests**:
   - Use `getMultipleArtists()` to get up to 50 artists at once
   - Use higher limits (up to 50-100) when fetching lists

3. **Error Handling**:
   - Always wrap API calls in try-catch blocks
   - Log errors for debugging
   - Implement exponential backoff for retries

4. **Development vs Production**:
   - Start in development mode (default)
   - Apply for Extended Quota if you need higher limits:
     - Go to your app in Spotify Dashboard
     - Click "Request Extension"
     - Fill out the form explaining your use case

## 9. What You Can Find

### Popularity Metrics Available:

- **Artist Popularity**: 0-100 score based on all the artist's tracks
- **Track Popularity**: 0-100 score based on recent plays
- **Album Popularity**: 0-100 score for albums
- **Follower Counts**: Total followers for artists
- **Playlist Followers**: For public playlists

### Trending Data Sources:

- **New Releases**: Latest albums and singles
- **Featured Playlists**: Spotify's editorial picks
- **Category Playlists**: "Top Lists", "Viral", genre-specific
- **Search with Terms**: "viral", "2024", "trending", "top"
- **Recommendations**: Based on popular seed artists/tracks

### Limitations:

- No real-time play counts
- No user-specific data without auth
- No historical trending data
- Popularity scores are relative and Spotify's algorithm

## 10. Next Steps

1. **Store Data**: Save results to database for tracking trends over time
2. **Schedule Updates**: Run scripts periodically (cron job) to track changes
3. **Combine with Other APIs**:
   - Last.fm for scrobble data
   - MusicBrainz for metadata
   - ListenBrainz for listening statistics
4. **Build a Dashboard**: Visualize the trending data
5. **Apply for Extended Quota**: When ready for production

## Troubleshooting

### "Invalid client" error

- Check your Client ID and Secret are correct
- Make sure they're properly loaded from .env

### 429 Rate Limit errors

- Add more delays between requests
- Reduce the number of items fetched
- Consider applying for extended quota

### Empty results

- Some playlists/categories might be region-specific
- Try changing the 'country' parameter
- Check if the category IDs are correct (use getCategories() to list all)

### Token expiry issues

- Token caching is implemented, but if issues persist, force refresh by setting `this.accessToken = null`
