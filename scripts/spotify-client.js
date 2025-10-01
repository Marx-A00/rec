// No need for dotenv in Next.js environment
// require('dotenv').config();

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
