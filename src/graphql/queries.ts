import { gql } from 'graphql-request';

// =============================================
// ALBUM QUERIES
// =============================================

export const GET_ALBUM_DETAILS = gql`
  query GetAlbumDetails($id: UUID!) {
    album(id: $id) {
      id
      musicbrainzId
      title
      releaseDate
      releaseType
      trackCount
      durationMs
      coverArtUrl
      barcode
      label
      catalogNumber
      createdAt
      updatedAt
      dataQuality
      enrichmentStatus
      lastEnriched
      duration
      averageRating
      inCollectionsCount
      recommendationScore
      needsEnrichment
      artists {
        id
        artistId
        name
        joinPhrase
        isMain
        artist {
          id
          name
          imageUrl
          musicbrainzId
        }
      }
      tracks {
        id
        title
        trackNumber
        discNumber
        durationMs
        duration
        explicit
        previewUrl
      }
    }
  }
`;

export const GET_ALBUM_TRACKS = gql`
  query GetAlbumTracks($albumId: UUID!) {
    albumTracks(albumId: $albumId) {
      id
      title
      trackNumber
      discNumber
      durationMs
      duration
      explicit
      previewUrl
      artists {
        id
        artistId
        name
        joinPhrase
        isMain
        artist {
          id
          name
          imageUrl
        }
      }
    }
  }
`;

// =============================================
// ARTIST QUERIES
// =============================================

export const GET_ARTIST_DETAILS = gql`
  query GetArtistDetails($id: UUID!) {
    artist(id: $id) {
      id
      musicbrainzId
      name
      biography
      formedYear
      countryCode
      imageUrl
      createdAt
      updatedAt
      dataQuality
      enrichmentStatus
      lastEnriched
      albumCount
      trackCount
      popularity
      needsEnrichment
      albums {
        id
        title
        releaseDate
        releaseType
        coverArtUrl
        trackCount
        duration
        averageRating
      }
      tracks {
        id
        title
        trackNumber
        duration
        explicit
        album {
          id
          title
          coverArtUrl
        }
      }
    }
  }
`;

// =============================================
// SEARCH QUERIES
// =============================================

export const SEARCH_MUSIC = gql`
  query SearchMusic($input: SearchInput!) {
    search(input: $input) {
      artists {
        id
        name
        imageUrl
        albumCount
        trackCount
        popularity
      }
      albums {
        id
        title
        releaseDate
        coverArtUrl
        trackCount
        duration
        artists {
          id
          name
          isMain
          artist {
            id
            name
            imageUrl
          }
        }
      }
      tracks {
        id
        title
        trackNumber
        duration
        explicit
        previewUrl
        album {
          id
          title
          coverArtUrl
        }
        artists {
          id
          name
          isMain
          artist {
            id
            name
          }
        }
      }
      total
      hasMore
    }
  }
`;

export const SEARCH_ALBUMS = gql`
  query SearchAlbums(
    $query: String!
    $limit: Int
    $offset: Int
    $sortBy: AlbumSortField
    $sortOrder: SortOrder
    $filters: AlbumFilters
  ) {
    searchAlbums(
      query: $query
      limit: $limit
      offset: $offset
      sortBy: $sortBy
      sortOrder: $sortOrder
      filters: $filters
    ) {
      albums {
        id
        title
        releaseDate
        coverArtUrl
        trackCount
        duration
        averageRating
        artists {
          id
          name
          isMain
          artist {
            id
            name
            imageUrl
          }
        }
      }
      total
      hasMore
    }
  }
`;

export const SEARCH_TRACKS = gql`
  query SearchTracks($query: String!, $limit: Int) {
    searchTracks(query: $query, limit: $limit) {
      id
      title
      trackNumber
      durationMs
      duration
      explicit
      previewUrl
      album {
        id
        title
        coverArtUrl
        releaseDate
      }
      artists {
        id
        name
        isMain
        artist {
          id
          name
          imageUrl
        }
      }
    }
  }
`;

// =============================================
// RECOMMENDATION QUERIES
// =============================================

export const GET_ALBUM_RECOMMENDATIONS = gql`
  query GetAlbumRecommendations($input: RecommendationInput!) {
    albumRecommendations(input: $input) {
      id
      title
      releaseDate
      coverArtUrl
      trackCount
      duration
      averageRating
      recommendationScore
      artists {
        id
        name
        isMain
        artist {
          id
          name
          imageUrl
        }
      }
    }
  }
`;

export const GET_TRACK_RECOMMENDATIONS = gql`
  query GetTrackRecommendations($trackId: UUID!, $limit: Int) {
    trackRecommendations(trackId: $trackId, limit: $limit) {
      id
      title
      trackNumber
      duration
      explicit
      previewUrl
      album {
        id
        title
        coverArtUrl
      }
      artists {
        id
        name
        isMain
        artist {
          id
          name
        }
      }
    }
  }
`;

// =============================================
// COLLECTION QUERIES
// =============================================

export const GET_USER_COLLECTIONS = gql`
  query GetUserCollections {
    myCollections {
      id
      name
      description
      isPublic
      createdAt
      updatedAt
      albumCount
      totalDuration
      averageRating
      albums {
        id
        personalRating
        personalNotes
        position
        addedAt
        album {
          id
          title
          coverArtUrl
          releaseDate
          artists {
            id
            name
            isMain
            artist {
              id
              name
            }
          }
        }
      }
    }
  }
`;

// =============================================
// USER QUERIES
// =============================================

export const GET_USER_RECOMMENDATIONS = gql`
  query GetUserRecommendations($sort: RecommendationSort, $limit: Int) {
    myRecommendations(sort: $sort, limit: $limit) {
      id
      score
      normalizedScore
      similarity
      createdAt
      updatedAt
      basisAlbum {
        id
        title
        coverArtUrl
        artists {
          id
          name
          isMain
          artist {
            id
            name
          }
        }
      }
      recommendedAlbum {
        id
        title
        coverArtUrl
        artists {
          id
          name
          isMain
          artist {
            id
            name
          }
        }
      }
    }
  }
`;

// =============================================
// SOCIAL QUERIES
// =============================================

export const GET_SOCIAL_FEED = gql`
  query GetSocialFeed($type: ActivityType, $cursor: String, $limit: Int) {
    socialFeed(type: $type, cursor: $cursor, limit: $limit) {
      activities {
        id
        type
        createdAt
        actor {
          id
          displayName
          username
          avatarUrl
        }
        targetUser {
          id
          displayName
          username
          avatarUrl
        }
        album {
          id
          title
          coverArtUrl
          artists {
            id
            name
            isMain
            artist {
              id
              name
            }
          }
        }
        recommendation {
          id
          score
          normalizedScore
        }
        collection {
          id
          name
        }
        metadata {
          description
        }
      }
      cursor
      hasMore
    }
  }
`;
