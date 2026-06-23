function normalize(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

export const CACHE_KEYS = {
  spotifyImage: (mbid: string) => `cache:spotify:image:${mbid}`,
  similarArtists: (mbid: string) => `cache:similar:${mbid}`,
  spotifySearch: (query: string) => `cache:spotify:search:${normalize(query)}`,
  lastfmSearch: (query: string) => `cache:lastfm:search:${normalize(query)}`,
  lastfmSimilar: (key: string) => `cache:lastfm:similar:${key}`,
  lastfmInfo: (name: string) => `cache:lastfm:info:${normalize(name)}`,
  listenbrainzSimilar: (mbid: string) => `cache:listenbrainz:similar:${mbid}`,
  discography: (artistId: string, source: string) =>
    `cache:discography:${source}:${artistId}`,
  albumDetails: (albumId: string) => `cache:album:${albumId}`,
  searchResults: (query: string, type: string) =>
    `cache:search:${type}:${normalize(query)}`,
  countArtistAlbums: (artistId: string) =>
    `cache:count:artist-albums:${artistId}`,
  countArtistTracks: (artistId: string) =>
    `cache:count:artist-tracks:${artistId}`,
  countAlbumCollections: (albumId: string) =>
    `cache:count:album-collections:${albumId}`,
  countCollectionAlbums: (collectionId: string) =>
    `cache:count:collection-albums:${collectionId}`,
  userCollections: (userId: string) => `cache:user:collections:${userId}`,
  userRecs: (userId: string) => `cache:user:recs:${userId}`,
  lastfmUserStats: (userId: string) => `cache:lastfm:userstats:${userId}`,
  userTasteProfile: (userId: string) => `cache:user:tasteProfile:${userId}`,
};

/** TTL values in seconds */
export const CACHE_TTLS = {
  /** Spotify artist images - rarely change */
  SPOTIFY_IMAGE: 7 * 24 * 60 * 60, // 7 days
  /** Similar artists results */
  SIMILAR_ARTISTS: 7 * 24 * 60 * 60, // 7 days
  /** Spotify search results - keep fresh */
  SPOTIFY_SEARCH: 60 * 60, // 1 hour
  /** Last.fm API results */
  LASTFM: 7 * 24 * 60 * 60, // 7 days
  /** ListenBrainz similar artists */
  LISTENBRAINZ: 7 * 24 * 60 * 60, // 7 days
  /** Artist discography */
  DISCOGRAPHY: 7 * 24 * 60 * 60, // 7 days
  /** Album detail pages */
  ALBUM_DETAILS: 24 * 60 * 60, // 24 hours
  /** Search results across providers */
  SEARCH_RESULTS: 5 * 60, // 5 minutes
  /** COUNT query results */
  COUNT: 60 * 60, // 1 hour
  /** User collections */
  USER_COLLECTIONS: 15 * 60, // 15 minutes
  /** User recommendations feed */
  USER_RECS: 10 * 60, // 10 minutes
};
