// Using the official Spotify TypeScript SDK
// Note: We're using CommonJS since we're in a .js file
const { SpotifyApi } = require('@spotify/web-api-ts-sdk');

class SpotifySDKClient {
  constructor() {
    // Initialize with Client Credentials (no user auth needed)
    this.client = SpotifyApi.withClientCredentials(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    );
  }

  // Get new album releases
  async getNewReleases(country = 'US', limit = 50) {
    return await this.client.browse.getNewReleases(country, limit);
  }

  // Search for artists, tracks, albums
  async search(query, types = ['artist', 'track'], limit = 20) {
    return await this.client.search(query, types, (country = 'US'), limit);
  }

  // Get artist details
  async getArtist(artistId) {
    return await this.client.artists.get(artistId);
  }

  // Get artist's top tracks
  async getArtistTopTracks(artistId, market = 'US') {
    return await this.client.artists.topTracks(artistId, market);
  }

  // Get several artists at once
  async getMultipleArtists(artistIds) {
    return await this.client.artists.get(artistIds);
  }

  // Get recommendations
  async getRecommendations(options = {}) {
    // SDK expects specific format for recommendations
    const {
      seed_artists,
      seed_tracks,
      seed_genres,
      limit = 20,
      market = 'US',
      ...otherParams
    } = options;

    return await this.client.recommendations.get({
      seed_artists: seed_artists ? seed_artists.split(',') : undefined,
      seed_tracks: seed_tracks ? seed_tracks.split(',') : undefined,
      seed_genres: seed_genres ? seed_genres.split(',') : undefined,
      limit,
      market,
      ...otherParams,
    });
  }

  // Get featured playlists
  async getFeaturedPlaylists(country = 'US', limit = 50) {
    return await this.client.browse.getFeaturedPlaylists(country, limit);
  }

  // Get category playlists
  async getCategoryPlaylists(categoryId, country = 'US', limit = 50) {
    return await this.client.browse.getPlaylistsForCategory(
      categoryId,
      country,
      limit
    );
  }

  // Get all categories
  async getCategories(country = 'US', limit = 50) {
    return await this.client.browse.getCategories(country, limit);
  }

  // Get playlist details
  async getPlaylist(playlistId) {
    return await this.client.playlists.getPlaylist(playlistId);
  }

  // Get playlist tracks
  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    return await this.client.playlists.getPlaylistItems(
      playlistId,
      'US',
      undefined,
      limit,
      offset
    );
  }

  // Get available genre seeds
  async getGenreSeeds() {
    return await this.client.recommendations.genreSeeds;
  }
}

module.exports = SpotifySDKClient;
