import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  UseMutationOptions,
  UseQueryOptions,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };

function fetcher<TData, TVariables>(query: string, variables?: TVariables) {
  return async (): Promise<TData> => {
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL || ('/api/graphql' as string),
      {
        method: 'POST',
        ...{
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const json = await res.json();

    if (json.errors) {
      const { message } = json.errors[0];

      throw new Error(message);
    }

    return json.data;
  };
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: Date; output: Date };
  JSON: { input: any; output: any };
  UUID: { input: string; output: string };
};

export type Activity = {
  __typename?: 'Activity';
  actor: User;
  album?: Maybe<Album>;
  collection?: Maybe<Collection>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  metadata?: Maybe<ActivityMetadata>;
  recommendation?: Maybe<Recommendation>;
  targetUser?: Maybe<User>;
  type: ActivityType;
};

export type ActivityFeed = {
  __typename?: 'ActivityFeed';
  activities: Array<Activity>;
  cursor?: Maybe<Scalars['String']['output']>;
  hasMore: Scalars['Boolean']['output'];
};

export type ActivityMetadata = {
  __typename?: 'ActivityMetadata';
  basisAlbum?: Maybe<Album>;
  collectionName?: Maybe<Scalars['String']['output']>;
  personalRating?: Maybe<Scalars['Int']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  score?: Maybe<Scalars['Int']['output']>;
};

export enum ActivityType {
  CollectionAdd = 'COLLECTION_ADD',
  Follow = 'FOLLOW',
  ProfileUpdate = 'PROFILE_UPDATE',
  Recommendation = 'RECOMMENDATION',
}

export type AddAlbumToCollectionPayload = {
  __typename?: 'AddAlbumToCollectionPayload';
  id: Scalars['String']['output'];
};

/**
 * Input for adding an album to a collection with optional album creation.
 * Supports both existing albums (by ID) and creating new albums inline.
 */
export type AddAlbumToCollectionWithCreateInput = {
  /** Create new album with this data (mutually exclusive with albumId) */
  albumData?: InputMaybe<AlbumInput>;
  /** Use existing album by ID (mutually exclusive with albumData) */
  albumId?: InputMaybe<Scalars['UUID']['input']>;
  /** Collection ID to add the album to */
  collectionId: Scalars['String']['input'];
  /** Personal notes about the album */
  personalNotes?: InputMaybe<Scalars['String']['input']>;
  /** Personal rating (1-10) */
  personalRating?: InputMaybe<Scalars['Int']['input']>;
  /** Position in the collection (0 = beginning) */
  position?: InputMaybe<Scalars['Int']['input']>;
};

export type AddAlbumToQueueResult = {
  __typename?: 'AddAlbumToQueueResult';
  album?: Maybe<Album>;
  curatedChallenge?: Maybe<CuratedChallengeEntry>;
  error?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AdminUpdateUserSettingsPayload = {
  __typename?: 'AdminUpdateUserSettingsPayload';
  message?: Maybe<Scalars['String']['output']>;
  showOnboardingTour?: Maybe<Scalars['Boolean']['output']>;
  success: Scalars['Boolean']['output'];
  userId: Scalars['String']['output'];
};

export type Album = {
  __typename?: 'Album';
  artists: Array<ArtistCredit>;
  averageRating?: Maybe<Scalars['Float']['output']>;
  barcode?: Maybe<Scalars['String']['output']>;
  basisRecommendations: Array<Recommendation>;
  catalogNumber?: Maybe<Scalars['String']['output']>;
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  collectionAlbums: Array<CollectionAlbum>;
  coverArtUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  dataQuality?: Maybe<DataQuality>;
  discogsId?: Maybe<Scalars['String']['output']>;
  duration?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  enrichmentStatus?: Maybe<EnrichmentStatus>;
  gameStatus: AlbumGameStatus;
  genres?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['UUID']['output'];
  inCollectionsCount: Scalars['Int']['output'];
  label?: Maybe<Scalars['String']['output']>;
  lastEnriched?: Maybe<Scalars['DateTime']['output']>;
  latestLlamaLog?: Maybe<LlamaLog>;
  llamaLogs: Array<LlamaLog>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  needsEnrichment: Scalars['Boolean']['output'];
  recommendationScore?: Maybe<Scalars['Float']['output']>;
  releaseDate?: Maybe<Scalars['DateTime']['output']>;
  releaseType?: Maybe<Scalars['String']['output']>;
  spotifyId?: Maybe<Scalars['String']['output']>;
  targetRecommendations: Array<Recommendation>;
  title: Scalars['String']['output'];
  trackCount?: Maybe<Scalars['Int']['output']>;
  tracks: Array<Track>;
  updatedAt: Scalars['DateTime']['output'];
};

export type AlbumLlamaLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export enum AlbumGameStatus {
  Eligible = 'ELIGIBLE',
  Excluded = 'EXCLUDED',
  None = 'NONE',
}

export type AlbumInput = {
  albumType?: InputMaybe<Scalars['String']['input']>;
  appleMusicId?: InputMaybe<Scalars['String']['input']>;
  artists: Array<ArtistAlbumInput>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  discogsMasterReleaseId?: InputMaybe<Scalars['String']['input']>;
  discogsReleaseId?: InputMaybe<Scalars['String']['input']>;
  musicbrainzId?: InputMaybe<Scalars['String']['input']>;
  releaseDate?: InputMaybe<Scalars['String']['input']>;
  spotifyId?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  totalTracks?: InputMaybe<Scalars['Int']['input']>;
};

export type AlbumRecommendation = {
  __typename?: 'AlbumRecommendation';
  albumRole: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  otherAlbum: OtherAlbumInfo;
  score: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type AlbumRecommendationsResponse = {
  __typename?: 'AlbumRecommendationsResponse';
  pagination: PaginationInfo;
  recommendations: Array<AlbumRecommendation>;
};

export enum AlbumRole {
  Basis = 'BASIS',
  Both = 'BOTH',
  Recommended = 'RECOMMENDED',
}

export type Alert = {
  __typename?: 'Alert';
  details?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['String']['output'];
  level: AlertLevel;
  message: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
  type: AlertType;
};

export enum AlertLevel {
  Critical = 'CRITICAL',
  Error = 'ERROR',
  Info = 'INFO',
  Warning = 'WARNING',
}

export type AlertThresholds = {
  __typename?: 'AlertThresholds';
  avgProcessingTimeMs: Scalars['Int']['output'];
  errorRatePercent: Scalars['Float']['output'];
  memoryUsageMB: Scalars['Int']['output'];
  queueDepth: Scalars['Int']['output'];
};

export type AlertThresholdsInput = {
  avgProcessingTimeMs?: InputMaybe<Scalars['Int']['input']>;
  errorRatePercent?: InputMaybe<Scalars['Float']['input']>;
  memoryUsageMB?: InputMaybe<Scalars['Int']['input']>;
  queueDepth?: InputMaybe<Scalars['Int']['input']>;
};

export enum AlertType {
  ErrorRate = 'ERROR_RATE',
  MemoryUsage = 'MEMORY_USAGE',
  ProcessingTime = 'PROCESSING_TIME',
  QueueDepth = 'QUEUE_DEPTH',
  RateLimit = 'RATE_LIMIT',
  RedisConnection = 'REDIS_CONNECTION',
  WorkerFailure = 'WORKER_FAILURE',
}

/** Applied artist changes summary. */
export type AppliedArtistChanges = {
  __typename?: 'AppliedArtistChanges';
  /** Names of artists added to album */
  added: Array<Scalars['String']['output']>;
  /** Names of artists removed from album */
  removed: Array<Scalars['String']['output']>;
};

/** Summary of changes that were applied to the album. */
export type AppliedChanges = {
  __typename?: 'AppliedChanges';
  /** Artist changes applied */
  artists: AppliedArtistChanges;
  /** Whether cover art was changed */
  coverArt: Scalars['Boolean']['output'];
  /** Data quality after correction */
  dataQualityAfter: DataQuality;
  /** Data quality before correction */
  dataQualityBefore: DataQuality;
  /** List of external ID field names that were updated */
  externalIds: Array<Scalars['String']['output']>;
  /** List of metadata field names that were updated */
  metadata: Array<Scalars['String']['output']>;
  /** Track changes applied */
  tracks: AppliedTrackChanges;
};

/** Applied track changes summary. */
export type AppliedTrackChanges = {
  __typename?: 'AppliedTrackChanges';
  /** Number of tracks added */
  added: Scalars['Int']['output'];
  /** Number of tracks modified */
  modified: Scalars['Int']['output'];
  /** Number of tracks removed */
  removed: Scalars['Int']['output'];
};

/** Error codes for correction apply operation failures. */
export enum ApplyErrorCode {
  /** Album no longer exists */
  AlbumNotFound = 'ALBUM_NOT_FOUND',
  /** Invalid field selection provided */
  InvalidSelection = 'INVALID_SELECTION',
  /** Resource not found (release group, etc.) */
  NotFound = 'NOT_FOUND',
  /** Album was modified since preview was generated */
  StaleData = 'STALE_DATA',
  /** Database transaction error */
  TransactionFailed = 'TRANSACTION_FAILED',
  /** Data validation failed */
  ValidationError = 'VALIDATION_ERROR',
}

/** Diff for array fields (genres, secondaryTypes, etc.) */
export type ArrayDiff = {
  __typename?: 'ArrayDiff';
  /** Items added in source */
  added: Array<Scalars['String']['output']>;
  /** Overall change classification */
  changeType: ChangeType;
  /** Current array values */
  currentItems: Array<Scalars['String']['output']>;
  /** Field name (e.g., 'genres', 'secondaryTypes') */
  field: Scalars['String']['output'];
  /** Items removed (exist in current but not source) */
  removed: Array<Scalars['String']['output']>;
  /** Source array values */
  sourceItems: Array<Scalars['String']['output']>;
  /** Items unchanged (exist in both) */
  unchanged: Array<Scalars['String']['output']>;
};

export type Artist = {
  __typename?: 'Artist';
  albumCount: Scalars['Int']['output'];
  albums: Array<Album>;
  biography?: Maybe<Scalars['String']['output']>;
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  dataQuality?: Maybe<DataQuality>;
  discogsId?: Maybe<Scalars['String']['output']>;
  enrichmentStatus?: Maybe<EnrichmentStatus>;
  formedYear?: Maybe<Scalars['Int']['output']>;
  id: Scalars['UUID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  lastEnriched?: Maybe<Scalars['DateTime']['output']>;
  latestLlamaLog?: Maybe<LlamaLog>;
  listeners?: Maybe<Scalars['Int']['output']>;
  llamaLogs: Array<LlamaLog>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  name: Scalars['String']['output'];
  needsEnrichment: Scalars['Boolean']['output'];
  popularity?: Maybe<Scalars['Float']['output']>;
  spotifyId?: Maybe<Scalars['String']['output']>;
  trackCount: Scalars['Int']['output'];
  tracks: Array<Track>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ArtistLlamaLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type ArtistAlbumInput = {
  artistId?: InputMaybe<Scalars['UUID']['input']>;
  artistName?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

/** Summary of changes applied to an artist. */
export type ArtistAppliedChanges = {
  __typename?: 'ArtistAppliedChanges';
  /** Number of albums affected */
  affectedAlbumCount: Scalars['Int']['output'];
  /** Data quality after correction */
  dataQualityAfter: DataQuality;
  /** Data quality before correction */
  dataQualityBefore: DataQuality;
  /** List of external ID field names updated */
  externalIds: Array<Scalars['String']['output']>;
  /** List of metadata field names updated */
  metadata: Array<Scalars['String']['output']>;
};

/** Input for applying an artist correction. */
export type ArtistCorrectionApplyInput = {
  /** Artist ID to apply correction to */
  artistId: Scalars['UUID']['input'];
  /** Expected artist updatedAt timestamp for optimistic locking */
  expectedUpdatedAt: Scalars['DateTime']['input'];
  /** Field selections determining which changes to apply */
  selections: ArtistFieldSelectionsInput;
  /** Source of correction data (default: MUSICBRAINZ) */
  source?: InputMaybe<CorrectionSource>;
  /** Source artist ID (MusicBrainz MBID or Discogs ID) */
  sourceArtistId: Scalars['String']['input'];
};

/** Result of artist correction apply operation. */
export type ArtistCorrectionApplyResult = {
  __typename?: 'ArtistCorrectionApplyResult';
  /** Number of affected albums (when success=true) */
  affectedAlbumCount?: Maybe<Scalars['Int']['output']>;
  /** Updated artist (when success=true) */
  artist?: Maybe<Artist>;
  /** Summary of changes applied (when success=true) */
  changes?: Maybe<ArtistAppliedChanges>;
  /** Error code (when success=false) */
  code?: Maybe<ApplyErrorCode>;
  /** Error message (when success=false) */
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Complete preview of all changes between current artist and external source. */
export type ArtistCorrectionPreview = {
  __typename?: 'ArtistCorrectionPreview';
  /** Number of albums by this artist */
  albumCount: Scalars['Int']['output'];
  /** Current artist data from database */
  currentArtist: Artist;
  /** Field-by-field diffs */
  fieldDiffs: Array<ArtistFieldDiff>;
  /** Full MusicBrainz artist data */
  mbArtistData?: Maybe<Scalars['JSON']['output']>;
  /** Data source used for this preview */
  source: CorrectionSource;
  /** Summary statistics */
  summary: ArtistPreviewSummary;
};

/** Response from artist correction search operation. */
export type ArtistCorrectionSearchResponse = {
  __typename?: 'ArtistCorrectionSearchResponse';
  /** Whether more results are available */
  hasMore: Scalars['Boolean']['output'];
  /** The query that was executed */
  query: Scalars['String']['output'];
  /** Search results */
  results: Array<ArtistCorrectionSearchResult>;
};

/** Artist search result from MusicBrainz for correction. */
export type ArtistCorrectionSearchResult = {
  __typename?: 'ArtistCorrectionSearchResult';
  /** Area name (city/region) */
  area?: Maybe<Scalars['String']['output']>;
  /** MusicBrainz artist ID */
  artistMbid: Scalars['UUID']['output'];
  /** Begin date (partial date string) */
  beginDate?: Maybe<Scalars['String']['output']>;
  /** Country code (ISO 3166-1 alpha-2) */
  country?: Maybe<Scalars['String']['output']>;
  /** Disambiguation comment (e.g., "British rock band") */
  disambiguation?: Maybe<Scalars['String']['output']>;
  /** End date (partial date string) */
  endDate?: Maybe<Scalars['String']['output']>;
  /** Whether the artist has ended */
  ended?: Maybe<Scalars['Boolean']['output']>;
  /** Gender (only meaningful for Person type) */
  gender?: Maybe<Scalars['String']['output']>;
  /** MusicBrainz search score (0-100) */
  mbScore: Scalars['Int']['output'];
  /** Artist name */
  name: Scalars['String']['output'];
  /** Sort name (e.g., "Beatles, The") */
  sortName: Scalars['String']['output'];
  /** Data source this result came from (musicbrainz or discogs) */
  source?: Maybe<Scalars['String']['output']>;
  /** Top releases for disambiguation */
  topReleases?: Maybe<Array<ArtistTopRelease>>;
  /** Artist type: Person, Group, Orchestra, Choir, Character, Other */
  type?: Maybe<Scalars['String']['output']>;
};

export type ArtistCredit = {
  __typename?: 'ArtistCredit';
  artist: Artist;
  position: Scalars['Int']['output'];
  role: Scalars['String']['output'];
};

/** Diff for artist credits. */
export type ArtistCreditDiff = {
  __typename?: 'ArtistCreditDiff';
  /** Change classification */
  changeType: ChangeType;
  /** Current artist credits */
  current: Array<CorrectionArtistCredit>;
  /** Formatted current artist string */
  currentDisplay: Scalars['String']['output'];
  /** Name diff parts if modified */
  nameDiff?: Maybe<Array<TextDiffPart>>;
  /** Source artist credits */
  source: Array<CorrectionArtistCredit>;
  /** Formatted source artist string */
  sourceDisplay: Scalars['String']['output'];
};

/** Artist external ID field selections. */
export type ArtistExternalIdSelectionsInput = {
  discogsId?: InputMaybe<Scalars['Boolean']['input']>;
  ipi?: InputMaybe<Scalars['Boolean']['input']>;
  isni?: InputMaybe<Scalars['Boolean']['input']>;
  musicbrainzId?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Diff for a single artist field. */
export type ArtistFieldDiff = {
  __typename?: 'ArtistFieldDiff';
  /** Change classification */
  changeType: ChangeType;
  /** Current value in database */
  current?: Maybe<Scalars['String']['output']>;
  /** Field name */
  field: Scalars['String']['output'];
  /** Value from MusicBrainz source */
  source?: Maybe<Scalars['String']['output']>;
};

/** Complete field selections for artist correction. */
export type ArtistFieldSelectionsInput = {
  externalIds: ArtistExternalIdSelectionsInput;
  metadata: ArtistMetadataSelectionsInput;
};

export type ArtistInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  musicbrainzId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** Artist metadata field selections. */
export type ArtistMetadataSelectionsInput = {
  area?: InputMaybe<Scalars['Boolean']['input']>;
  artistType?: InputMaybe<Scalars['Boolean']['input']>;
  beginDate?: InputMaybe<Scalars['Boolean']['input']>;
  countryCode?: InputMaybe<Scalars['Boolean']['input']>;
  disambiguation?: InputMaybe<Scalars['Boolean']['input']>;
  endDate?: InputMaybe<Scalars['Boolean']['input']>;
  gender?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Summary statistics for artist field changes. */
export type ArtistPreviewSummary = {
  __typename?: 'ArtistPreviewSummary';
  /** Number of fields added */
  addedFields: Scalars['Int']['output'];
  /** Number of fields that changed */
  changedFields: Scalars['Int']['output'];
  /** Number of fields modified */
  modifiedFields: Scalars['Int']['output'];
  /** Total number of fields compared */
  totalFields: Scalars['Int']['output'];
};

export type ArtistRecommendation = {
  __typename?: 'ArtistRecommendation';
  albumRole: AlbumRole;
  basisAlbum: Album;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isOwnRecommendation: Scalars['Boolean']['output'];
  recommendedAlbum: Album;
  score: Scalars['Int']['output'];
  user: User;
};

export enum ArtistRecommendationSort {
  HighestScore = 'HIGHEST_SCORE',
  LowestScore = 'LOWEST_SCORE',
  Newest = 'NEWEST',
  Oldest = 'OLDEST',
}

export type ArtistRecommendationsConnection = {
  __typename?: 'ArtistRecommendationsConnection';
  hasMore: Scalars['Boolean']['output'];
  recommendations: Array<ArtistRecommendation>;
  totalCount: Scalars['Int']['output'];
};

/**
 * A top release for artist disambiguation.
 * Helps identify the right artist when multiple share the same name.
 */
export type ArtistTopRelease = {
  __typename?: 'ArtistTopRelease';
  title: Scalars['String']['output'];
  type?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['String']['output']>;
};

export type ArtistTrackInput = {
  artistId?: InputMaybe<Scalars['UUID']['input']>;
  artistName?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type AudioFeatures = {
  __typename?: 'AudioFeatures';
  acousticness?: Maybe<Scalars['Float']['output']>;
  danceability?: Maybe<Scalars['Float']['output']>;
  energy?: Maybe<Scalars['Float']['output']>;
  instrumentalness?: Maybe<Scalars['Float']['output']>;
  key?: Maybe<Scalars['Int']['output']>;
  liveness?: Maybe<Scalars['Float']['output']>;
  loudness?: Maybe<Scalars['Float']['output']>;
  mode?: Maybe<Scalars['Int']['output']>;
  speechiness?: Maybe<Scalars['Float']['output']>;
  tempo?: Maybe<Scalars['Float']['output']>;
  timeSignature?: Maybe<Scalars['Int']['output']>;
  valence?: Maybe<Scalars['Float']['output']>;
};

export type BatchEnrichmentResult = {
  __typename?: 'BatchEnrichmentResult';
  jobsQueued: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type CategorizedDiscography = {
  __typename?: 'CategorizedDiscography';
  albums: Array<UnifiedRelease>;
  compilations: Array<UnifiedRelease>;
  eps: Array<UnifiedRelease>;
  liveAlbums: Array<UnifiedRelease>;
  other: Array<UnifiedRelease>;
  remixes: Array<UnifiedRelease>;
  singles: Array<UnifiedRelease>;
  soundtracks: Array<UnifiedRelease>;
};

/** Five-state classification for field changes in correction previews. */
export enum ChangeType {
  /** Field exists in source but not in current (e.g., missing release date) */
  Added = 'ADDED',
  /** Both exist but differ significantly (manual review needed) */
  Conflict = 'CONFLICT',
  /** Both exist but differ (e.g., title changed) */
  Modified = 'MODIFIED',
  /** Field exists in current but not in source (rare for corrections) */
  Removed = 'REMOVED',
  /** Values are semantically identical */
  Unchanged = 'UNCHANGED',
}

export type Collection = {
  __typename?: 'Collection';
  albumCount: Scalars['Int']['output'];
  albums: Array<CollectionAlbum>;
  averageRating?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isPublic: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  totalDuration?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
};

export type CollectionAlbum = {
  __typename?: 'CollectionAlbum';
  addedAt: Scalars['DateTime']['output'];
  album: Album;
  collection: Collection;
  id: Scalars['String']['output'];
  personalNotes?: Maybe<Scalars['String']['output']>;
  personalRating?: Maybe<Scalars['Int']['output']>;
  position: Scalars['Int']['output'];
};

export type CollectionAlbumInput = {
  albumId: Scalars['UUID']['input'];
  personalNotes?: InputMaybe<Scalars['String']['input']>;
  personalRating?: InputMaybe<Scalars['Int']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
};

export enum CollectionSort {
  AddedDateAsc = 'ADDED_DATE_ASC',
  AddedDateDesc = 'ADDED_DATE_DESC',
  PositionAsc = 'POSITION_ASC',
  PositionDesc = 'POSITION_DESC',
  RatingAsc = 'RATING_ASC',
  RatingDesc = 'RATING_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
}

export type ComponentHealth = {
  __typename?: 'ComponentHealth';
  details?: Maybe<Scalars['JSON']['output']>;
  lastCheck: Scalars['DateTime']['output'];
  message: Scalars['String']['output'];
  status: HealthStatus;
};

/** Confidence tier for tiered scoring strategy. */
export enum ConfidenceTier {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  None = 'NONE',
}

/** Failed correction apply result. */
export type CorrectionApplyError = {
  __typename?: 'CorrectionApplyError';
  /** Error classification code */
  code: ApplyErrorCode;
  /** Additional context for debugging (as JSON) */
  context?: Maybe<Scalars['JSON']['output']>;
  /** Human-readable error message */
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

/** Input for applying a correction. */
export type CorrectionApplyInput = {
  /** Album ID to apply correction to */
  albumId: Scalars['UUID']['input'];
  /** Expected album updatedAt timestamp for optimistic locking */
  expectedUpdatedAt: Scalars['DateTime']['input'];
  /** Selected release group MBID */
  releaseGroupMbid: Scalars['String']['input'];
  /** Field selections determining which changes to apply */
  selections: FieldSelectionsInput;
  /** Source of correction data (defaults to MusicBrainz) */
  source?: InputMaybe<CorrectionSource>;
};

/**
 * Apply operation result (union returned as interface for simplicity).
 * Check 'success' field to determine which fields are populated.
 */
export type CorrectionApplyResult = {
  __typename?: 'CorrectionApplyResult';
  album?: Maybe<Album>;
  changes?: Maybe<AppliedChanges>;
  code?: Maybe<ApplyErrorCode>;
  context?: Maybe<Scalars['JSON']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Successful correction apply result. */
export type CorrectionApplySuccess = {
  __typename?: 'CorrectionApplySuccess';
  /** Updated album record */
  album: Album;
  /** Summary of changes applied */
  changes: AppliedChanges;
  success: Scalars['Boolean']['output'];
};

/** Artist credit from MusicBrainz search result. */
export type CorrectionArtistCredit = {
  __typename?: 'CorrectionArtistCredit';
  /** Artist MusicBrainz ID */
  mbid: Scalars['String']['output'];
  /** Artist name as credited */
  name: Scalars['String']['output'];
};

/** Complete preview of all changes between current album and MusicBrainz source. */
export type CorrectionPreview = {
  __typename?: 'CorrectionPreview';
  /** Album ID being corrected */
  albumId: Scalars['String']['output'];
  /** Album title for display */
  albumTitle: Scalars['String']['output'];
  /** Album updatedAt for optimistic locking */
  albumUpdatedAt: Scalars['DateTime']['output'];
  /** Artist credit comparison */
  artistDiff: ArtistCreditDiff;
  /** Cover art comparison */
  coverArt: CoverArtDiff;
  /** Field-by-field diffs (as JSON for complex union types) */
  fieldDiffs: Scalars['JSON']['output'];
  /** Full MusicBrainz release data (for tracks) */
  mbReleaseData?: Maybe<MbReleaseData>;
  /** Selected MusicBrainz search result */
  sourceResult: ScoredSearchResult;
  /** Summary of all changes */
  summary: PreviewSummary;
  /** Track listing comparison */
  trackDiffs: Array<TrackDiff>;
  /** Track summary statistics */
  trackSummary: TrackListSummary;
};

/** Input for correction preview operation. */
export type CorrectionPreviewInput = {
  /** Album ID to preview corrections for */
  albumId: Scalars['UUID']['input'];
  /** Selected release group MBID from search results (or Discogs master ID for Discogs source) */
  releaseGroupMbid: Scalars['String']['input'];
  /** Data source (default: MUSICBRAINZ) */
  source?: InputMaybe<CorrectionSource>;
};

/** Scoring metadata for correction search response. */
export type CorrectionScoringInfo = {
  __typename?: 'CorrectionScoringInfo';
  /** Number of results below threshold */
  lowConfidenceCount: Scalars['Int']['output'];
  /** Strategy used for scoring */
  strategy: ScoringStrategy;
  /** Low-confidence threshold used */
  threshold: Scalars['Float']['output'];
};

/** Input for correction search operation. */
export type CorrectionSearchInput = {
  /** Album ID to search corrections for */
  albumId: Scalars['UUID']['input'];
  /** Override album title for search */
  albumTitle?: InputMaybe<Scalars['String']['input']>;
  /** Override artist name for search */
  artistName?: InputMaybe<Scalars['String']['input']>;
  /** Direct Discogs master ID lookup (bypasses text search) */
  discogsId?: InputMaybe<Scalars['String']['input']>;
  /** Maximum results to return (default 10) */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Threshold below which results are flagged as low-confidence (0-1) */
  lowConfidenceThreshold?: InputMaybe<Scalars['Float']['input']>;
  /** Offset for pagination */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Direct MusicBrainz release group ID lookup (bypasses text search) */
  releaseGroupMbid?: InputMaybe<Scalars['String']['input']>;
  /** Data source to search (default: MUSICBRAINZ) */
  source?: InputMaybe<CorrectionSource>;
  /** Scoring strategy to use */
  strategy?: InputMaybe<ScoringStrategy>;
  /** Optional year filter */
  yearFilter?: InputMaybe<Scalars['Int']['input']>;
};

/** Query information for correction search. */
export type CorrectionSearchQuery = {
  __typename?: 'CorrectionSearchQuery';
  albumTitle?: Maybe<Scalars['String']['output']>;
  artistName?: Maybe<Scalars['String']['output']>;
  yearFilter?: Maybe<Scalars['Int']['output']>;
};

/** Response from correction search operation. */
export type CorrectionSearchResponse = {
  __typename?: 'CorrectionSearchResponse';
  /** Whether more results are available */
  hasMore: Scalars['Boolean']['output'];
  /** The query that was executed */
  query: CorrectionSearchQuery;
  /** Grouped search results (deduplicated by release group) */
  results: Array<GroupedSearchResult>;
  /** Scoring metadata */
  scoring: CorrectionScoringInfo;
  /** Total number of unique release groups */
  totalGroups: Scalars['Int']['output'];
};

/** Source for correction data. */
export enum CorrectionSource {
  /** Discogs database */
  Discogs = 'DISCOGS',
  /** MusicBrainz database */
  Musicbrainz = 'MUSICBRAINZ',
}

/** Cover art handling options for correction application. */
export enum CoverArtChoice {
  /** Remove cover art entirely */
  Clear = 'CLEAR',
  /** Preserve existing cover art */
  KeepCurrent = 'KEEP_CURRENT',
  /** Replace current cover with source cover art */
  UseSource = 'USE_SOURCE',
}

/** Cover art comparison data. */
export type CoverArtDiff = {
  __typename?: 'CoverArtDiff';
  changeType: ChangeType;
  currentUrl?: Maybe<Scalars['String']['output']>;
  sourceUrl?: Maybe<Scalars['String']['output']>;
};

export type CreateCollectionPayload = {
  __typename?: 'CreateCollectionPayload';
  id: Scalars['String']['output'];
};

export type CreateRecommendationPayload = {
  __typename?: 'CreateRecommendationPayload';
  id: Scalars['String']['output'];
};

/**
 * Input for creating a recommendation with optional inline album creation.
 * For each album, provide EITHER the ID (for existing) OR album data (to create).
 */
export type CreateRecommendationWithAlbumsInput = {
  /** Create basis album with this data (mutually exclusive with basisAlbumId) */
  basisAlbumData?: InputMaybe<AlbumInput>;
  /** Existing basis album ID (mutually exclusive with basisAlbumData) */
  basisAlbumId?: InputMaybe<Scalars['UUID']['input']>;
  /** Create recommended album with this data (mutually exclusive with recommendedAlbumId) */
  recommendedAlbumData?: InputMaybe<AlbumInput>;
  /** Existing recommended album ID (mutually exclusive with recommendedAlbumData) */
  recommendedAlbumId?: InputMaybe<Scalars['UUID']['input']>;
  /** Recommendation score (1-10) */
  score: Scalars['Int']['input'];
};

/** Curated challenge entry for admin management */
export type CuratedChallengeEntry = {
  __typename?: 'CuratedChallengeEntry';
  album: Album;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  pinnedDate?: Maybe<Scalars['DateTime']['output']>;
  sequence: Scalars['Int']['output'];
};

/** Daily challenge info - does NOT include the answer album */
export type DailyChallengeInfo = {
  __typename?: 'DailyChallengeInfo';
  avgAttempts?: Maybe<Scalars['Float']['output']>;
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  date: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  /** Challenge album cover image URL (safe to expose - doesn't reveal the answer) */
  imageUrl?: Maybe<Scalars['String']['output']>;
  maxAttempts: Scalars['Int']['output'];
  /** User's session for this challenge (null if not started or not authenticated) */
  mySession?: Maybe<UncoverSessionInfo>;
  totalPlays: Scalars['Int']['output'];
  totalWins: Scalars['Int']['output'];
};

export enum DataQuality {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
}

export enum DataSource {
  Discogs = 'DISCOGS',
  Local = 'LOCAL',
  Musicbrainz = 'MUSICBRAINZ',
}

export type DatabaseStats = {
  __typename?: 'DatabaseStats';
  albumsNeedingEnrichment: Scalars['Int']['output'];
  artistsNeedingEnrichment: Scalars['Int']['output'];
  averageDataQuality: Scalars['Float']['output'];
  failedEnrichments: Scalars['Int']['output'];
  recentlyEnriched: Scalars['Int']['output'];
  totalAlbums: Scalars['Int']['output'];
  totalArtists: Scalars['Int']['output'];
  totalTracks: Scalars['Int']['output'];
};

/** Per-component change classification for date diff. */
export type DateComponentChanges = {
  __typename?: 'DateComponentChanges';
  day: ChangeType;
  month: ChangeType;
  year: ChangeType;
};

/**
 * Date components for partial date comparison.
 * Handles YYYY, YYYY-MM, and YYYY-MM-DD formats.
 */
export type DateComponents = {
  __typename?: 'DateComponents';
  day?: Maybe<Scalars['Int']['output']>;
  month?: Maybe<Scalars['Int']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

/** Diff for release date field with component-level granularity. */
export type DateDiff = {
  __typename?: 'DateDiff';
  /** Overall change classification */
  changeType: ChangeType;
  /** Per-component change classification */
  componentChanges: DateComponentChanges;
  /** Current date components */
  current?: Maybe<DateComponents>;
  /** Always 'releaseDate' */
  field: Scalars['String']['output'];
  /** Source date components */
  source?: Maybe<DateComponents>;
};

export type DeezerPlaylistImportResult = {
  __typename?: 'DeezerPlaylistImportResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  playlistName?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeezerPlaylistPreview = {
  __typename?: 'DeezerPlaylistPreview';
  albums: Array<DeezerPreviewAlbum>;
  creator: Scalars['String']['output'];
  deezerUrl: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  playlistId: Scalars['String']['output'];
  stats: PlaylistPreviewStats;
  trackCount: Scalars['Int']['output'];
};

export type DeezerPreviewAlbum = {
  __typename?: 'DeezerPreviewAlbum';
  albumType: Scalars['String']['output'];
  artist: Scalars['String']['output'];
  coverUrl?: Maybe<Scalars['String']['output']>;
  deezerId: Scalars['String']['output'];
  title: Scalars['String']['output'];
  totalTracks: Scalars['Int']['output'];
  year?: Maybe<Scalars['String']['output']>;
};

export type DeleteAlbumPayload = {
  __typename?: 'DeleteAlbumPayload';
  deletedId?: Maybe<Scalars['UUID']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteArtistPayload = {
  __typename?: 'DeleteArtistPayload';
  deletedId?: Maybe<Scalars['UUID']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteUserPayload = {
  __typename?: 'DeleteUserPayload';
  deletedId?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export enum EnrichmentEntityType {
  Album = 'ALBUM',
  Artist = 'ARTIST',
  Track = 'TRACK',
}

export type EnrichmentFieldDiff = {
  __typename?: 'EnrichmentFieldDiff';
  currentValue?: Maybe<Scalars['String']['output']>;
  field: Scalars['String']['output'];
  newValue?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
};

export enum EnrichmentPriority {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
}

export type EnrichmentResult = {
  __typename?: 'EnrichmentResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type EnrichmentStats = {
  __typename?: 'EnrichmentStats';
  averageDurationMs: Scalars['Float']['output'];
  failedCount: Scalars['Int']['output'];
  noDataCount: Scalars['Int']['output'];
  skippedCount: Scalars['Int']['output'];
  sourceStats: Array<SourceStat>;
  successCount: Scalars['Int']['output'];
  totalAttempts: Scalars['Int']['output'];
};

export enum EnrichmentStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  InProgress = 'IN_PROGRESS',
  Pending = 'PENDING',
}

export enum EnrichmentType {
  Album = 'ALBUM',
  Artist = 'ARTIST',
}

export type ErrorMetric = {
  __typename?: 'ErrorMetric';
  count: Scalars['Int']['output'];
  error: Scalars['String']['output'];
  lastOccurrence: Scalars['DateTime']['output'];
};

/** Selection state for external ID fields. */
export type ExternalIdSelectionsInput = {
  /** Discogs release ID */
  discogsId?: InputMaybe<Scalars['Boolean']['input']>;
  /** MusicBrainz release ID */
  musicbrainzId?: InputMaybe<Scalars['Boolean']['input']>;
  /** Spotify album ID */
  spotifyId?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Complete field selection state for correction application. */
export type FieldSelectionsInput = {
  /** Per-artist selection state (key: artist MBID) */
  artists?: InputMaybe<Array<SelectionEntry>>;
  /** Cover art handling choice */
  coverArt?: InputMaybe<CoverArtChoice>;
  /** External ID field selections */
  externalIds?: InputMaybe<ExternalIdSelectionsInput>;
  /** Core metadata field selections */
  metadata?: InputMaybe<MetadataSelectionsInput>;
  /** Per-track selection state (key: "disc-track", e.g., "1-3") */
  tracks?: InputMaybe<Array<SelectionEntry>>;
};

export type FollowUserPayload = {
  __typename?: 'FollowUserPayload';
  createdAt: Scalars['DateTime']['output'];
  followedId: Scalars['String']['output'];
  followerId: Scalars['String']['output'];
  id: Scalars['String']['output'];
};

export type GamePoolStats = {
  __typename?: 'GamePoolStats';
  eligibleCount: Scalars['Int']['output'];
  excludedCount: Scalars['Int']['output'];
  neutralCount: Scalars['Int']['output'];
  totalWithCoverArt: Scalars['Int']['output'];
};

/**
 * A group of related search results (same release group MBID).
 * Groups releases like "OK Computer" regular vs deluxe editions.
 */
export type GroupedSearchResult = {
  __typename?: 'GroupedSearchResult';
  /** Alternate versions (deluxe, remaster, etc.) */
  alternateVersions: Array<ScoredSearchResult>;
  /** Highest score among all versions (for sorting groups) */
  bestScore: Scalars['Float']['output'];
  /** Primary result (best version to display) */
  primaryResult: ScoredSearchResult;
  /** The release group MBID (shared by all versions) */
  releaseGroupMbid: Scalars['String']['output'];
  /** Total number of versions in this group */
  versionCount: Scalars['Int']['output'];
};

/** Result of submitting a guess or skipping */
export type GuessResult = {
  __typename?: 'GuessResult';
  /** Only populated when gameOver is true - the correct answer */
  correctAlbum?: Maybe<UncoverGuessAlbumInfo>;
  gameOver: Scalars['Boolean']['output'];
  guess: UncoverGuessInfo;
  session: UncoverSessionInfo;
};

export type HealthComponents = {
  __typename?: 'HealthComponents';
  memory: ComponentHealth;
  queue: ComponentHealth;
  redis: ComponentHealth;
  spotify: ComponentHealth;
  worker: ComponentHealth;
};

export type HealthMetrics = {
  __typename?: 'HealthMetrics';
  activeJobs: Scalars['Int']['output'];
  avgProcessingTime: Scalars['Float']['output'];
  completedJobs: Scalars['Int']['output'];
  errorRate: Scalars['Float']['output'];
  failedJobs: Scalars['Int']['output'];
  queueDepth: Scalars['Int']['output'];
};

export enum HealthStatus {
  Degraded = 'DEGRADED',
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY',
}

export type JobRecord = {
  __typename?: 'JobRecord';
  attempts: Scalars['Int']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  data?: Maybe<Scalars['JSON']['output']>;
  duration?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  result?: Maybe<Scalars['JSON']['output']>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: JobStatus;
  type: Scalars['String']['output'];
};

export enum JobStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Delayed = 'DELAYED',
  Failed = 'FAILED',
  Waiting = 'WAITING',
}

export type JobStatusUpdate = {
  __typename?: 'JobStatusUpdate';
  /** Admin: Add an album to the curated challenge list */
  addCuratedChallenge: CuratedChallengeEntry;
  jobId: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  /** Admin: Pin a curated challenge to a specific date */
  pinCuratedChallenge: CuratedChallengeEntry;
  progress?: Maybe<Scalars['Float']['output']>;
  /** Admin: Remove an album from the curated challenge list */
  removeCuratedChallenge: Scalars['Boolean']['output'];
  status: JobStatus;
  timestamp: Scalars['DateTime']['output'];
  type: Scalars['String']['output'];
  /** Admin: Unpin a curated challenge (remove date override) */
  unpinCuratedChallenge: CuratedChallengeEntry;
};

export type JobStatusUpdateAddCuratedChallengeArgs = {
  albumId: Scalars['UUID']['input'];
  pinnedDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type JobStatusUpdatePinCuratedChallengeArgs = {
  date: Scalars['DateTime']['input'];
  id: Scalars['UUID']['input'];
};

export type JobStatusUpdateRemoveCuratedChallengeArgs = {
  id: Scalars['UUID']['input'];
};

export type JobStatusUpdateUnpinCuratedChallengeArgs = {
  id: Scalars['UUID']['input'];
};

export type LlamaLog = {
  __typename?: 'LlamaLog';
  apiCallCount: Scalars['Int']['output'];
  category: LlamaLogCategory;
  children?: Maybe<Array<LlamaLog>>;
  createdAt: Scalars['DateTime']['output'];
  dataQualityAfter?: Maybe<DataQuality>;
  dataQualityBefore?: Maybe<DataQuality>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  entityId?: Maybe<Scalars['UUID']['output']>;
  entityType?: Maybe<EnrichmentEntityType>;
  errorCode?: Maybe<Scalars['String']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  fieldsEnriched: Array<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  operation: Scalars['String']['output'];
  parentJobId?: Maybe<Scalars['String']['output']>;
  previewData?: Maybe<Scalars['JSON']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  retryCount: Scalars['Int']['output'];
  rootJobId?: Maybe<Scalars['String']['output']>;
  sources: Array<Scalars['String']['output']>;
  status: LlamaLogStatus;
  triggeredBy?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['String']['output']>;
};

export enum LlamaLogCategory {
  Cached = 'CACHED',
  Corrected = 'CORRECTED',
  Created = 'CREATED',
  Enriched = 'ENRICHED',
  Failed = 'FAILED',
  Linked = 'LINKED',
  UserAction = 'USER_ACTION',
}

export type LlamaLogChainResponse = {
  __typename?: 'LlamaLogChainResponse';
  cursor?: Maybe<Scalars['String']['output']>;
  hasMore: Scalars['Boolean']['output'];
  logs: Array<LlamaLog>;
  totalCount: Scalars['Int']['output'];
};

export enum LlamaLogStatus {
  Failed = 'FAILED',
  NoDataAvailable = 'NO_DATA_AVAILABLE',
  PartialSuccess = 'PARTIAL_SUCCESS',
  Preview = 'PREVIEW',
  Skipped = 'SKIPPED',
  Success = 'SUCCESS',
}

/** MusicBrainz artist data within artist credit. */
export type MbArtist = {
  __typename?: 'MBArtist';
  /** Disambiguation */
  disambiguation?: Maybe<Scalars['String']['output']>;
  /** Artist MBID */
  id: Scalars['String']['output'];
  /** Artist name */
  name: Scalars['String']['output'];
  /** Sort name */
  sortName?: Maybe<Scalars['String']['output']>;
};

/** MusicBrainz artist credit entry. */
export type MbArtistCredit = {
  __typename?: 'MBArtistCredit';
  /** Artist data */
  artist: MbArtist;
  /** Join phrase (e.g., ' & ', ' feat. ') */
  joinphrase?: Maybe<Scalars['String']['output']>;
  /** Artist name as credited */
  name: Scalars['String']['output'];
};

/** MusicBrainz medium (disc/vinyl/CD) data. */
export type MbMedium = {
  __typename?: 'MBMedium';
  /** Format (CD, Vinyl, Digital, etc.) */
  format?: Maybe<Scalars['String']['output']>;
  /** Medium position (1-based) */
  position: Scalars['Int']['output'];
  /** Number of tracks on this medium */
  trackCount: Scalars['Int']['output'];
  /** Track listing */
  tracks: Array<MbMediumTrack>;
};

/** MusicBrainz medium track wrapper. */
export type MbMediumTrack = {
  __typename?: 'MBMediumTrack';
  /** Track position within medium */
  position: Scalars['Int']['output'];
  /** Recording data */
  recording: MbRecording;
};

/** MusicBrainz recording (track) data. */
export type MbRecording = {
  __typename?: 'MBRecording';
  /** Recording MBID */
  id: Scalars['String']['output'];
  /** Duration in milliseconds */
  length?: Maybe<Scalars['Int']['output']>;
  /** Track position within medium */
  position: Scalars['Int']['output'];
  /** Track title */
  title: Scalars['String']['output'];
};

/**
 * MusicBrainz release data (full release, not just release group).
 * Fetched separately for track listing comparison.
 */
export type MbReleaseData = {
  __typename?: 'MBReleaseData';
  /** Artist credits */
  artistCredit: Array<MbArtistCredit>;
  /** Barcode */
  barcode?: Maybe<Scalars['String']['output']>;
  /** Country of release */
  country?: Maybe<Scalars['String']['output']>;
  /** Release date (YYYY, YYYY-MM, or YYYY-MM-DD) */
  date?: Maybe<Scalars['String']['output']>;
  /** Release MBID (not release group) */
  id: Scalars['String']['output'];
  /** Media (discs/vinyls/etc.) */
  media: Array<MbMedium>;
  /** Album title */
  title: Scalars['String']['output'];
};

/**
 * Input for applying a manual correction (no external MBID required).
 * Admin directly edits album fields without selecting a MusicBrainz source.
 */
export type ManualCorrectionApplyInput = {
  /** Album ID to apply correction to */
  albumId: Scalars['UUID']['input'];
  /** Artist names to set */
  artists: Array<Scalars['String']['input']>;
  /** Discogs master/release ID */
  discogsId?: InputMaybe<Scalars['String']['input']>;
  /** Expected album updatedAt timestamp for optimistic locking */
  expectedUpdatedAt: Scalars['DateTime']['input'];
  /** MusicBrainz release group UUID */
  musicbrainzId?: InputMaybe<Scalars['String']['input']>;
  /** Release date (YYYY, YYYY-MM, or YYYY-MM-DD format) */
  releaseDate?: InputMaybe<Scalars['String']['input']>;
  /** Release type (Album, EP, Single, etc.) */
  releaseType?: InputMaybe<Scalars['String']['input']>;
  /** Spotify album ID */
  spotifyId?: InputMaybe<Scalars['String']['input']>;
  /** Title to set (required) */
  title: Scalars['String']['input'];
};

/** Selection state for metadata fields. */
export type MetadataSelectionsInput = {
  /** Barcode / UPC */
  barcode?: InputMaybe<Scalars['Boolean']['input']>;
  /** Record label */
  label?: InputMaybe<Scalars['Boolean']['input']>;
  /** Release country code */
  releaseCountry?: InputMaybe<Scalars['Boolean']['input']>;
  /** Release date */
  releaseDate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Release type (Album, EP, Single, etc.) */
  releaseType?: InputMaybe<Scalars['Boolean']['input']>;
  /** Album title */
  title?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addAlbum: Album;
  addAlbumToCollection: AddAlbumToCollectionPayload;
  /**
   * Add album to collection with optional inline album creation.
   * Use albumId for existing albums or albumData to create new album atomically.
   * Provides proper provenance chain for LlamaLog tracking.
   */
  addAlbumToCollectionWithCreate: AddAlbumToCollectionPayload;
  /**
   * Admin: Add album to game queue in one shot.
   * Sets gameStatus to ELIGIBLE and adds to curated rotation atomically.
   */
  addAlbumToQueue: AddAlbumToQueueResult;
  addArtist: Artist;
  /** Admin: Add an album to the curated challenge list */
  addCuratedChallenge: CuratedChallengeEntry;
  adminUpdateUserShowTour: AdminUpdateUserSettingsPayload;
  /** Apply selected corrections from a preview to an artist */
  artistCorrectionApply: ArtistCorrectionApplyResult;
  batchEnrichment: BatchEnrichmentResult;
  cleanQueue: Scalars['Boolean']['output'];
  clearFailedJobs: Scalars['Boolean']['output'];
  /** Apply selected corrections from a preview to an album */
  correctionApply: CorrectionApplyResult;
  createCollection: CreateCollectionPayload;
  /**
   * Create a recommendation. Supports two modes:
   * 1. Legacy: Pass basisAlbumId + recommendedAlbumId (existing albums)
   * 2. New: Pass input with optional inline album creation
   */
  createRecommendation: CreateRecommendationPayload;
  createTrack: Track;
  deleteAlbum: DeleteAlbumPayload;
  deleteArtist: DeleteArtistPayload;
  deleteCollection: Scalars['Boolean']['output'];
  deleteRecommendation: Scalars['Boolean']['output'];
  deleteTrack: Scalars['Boolean']['output'];
  dismissUserSuggestion: Scalars['Boolean']['output'];
  followUser: FollowUserPayload;
  hardDeleteUser: DeleteUserPayload;
  /**
   * Admin: Import albums from a Deezer playlist. Enqueues a BullMQ job.
   * No auth required — Deezer's public API is free and unlimited.
   * Albums land with gameStatus: NONE for review.
   */
  importDeezerPlaylist: DeezerPlaylistImportResult;
  /** Apply manual corrections to an album (no external source) */
  manualCorrectionApply: CorrectionApplyResult;
  pauseQueue: Scalars['Boolean']['output'];
  /** Admin: Pin a curated challenge to a specific date */
  pinCuratedChallenge: CuratedChallengeEntry;
  previewAlbumEnrichment: PreviewEnrichmentResult;
  previewArtistEnrichment: PreviewEnrichmentResult;
  removeAlbumFromCollection: Scalars['Boolean']['output'];
  /** Admin: Remove an album from the curated challenge list */
  removeCuratedChallenge: Scalars['Boolean']['output'];
  reorderCollectionAlbums: ReorderCollectionAlbumsPayload;
  resetAlbumEnrichment: Album;
  resetArtistEnrichment: Artist;
  /**
   * Reset today's daily session (admin only).
   * Deletes the session and its guesses so the admin can replay.
   */
  resetDailySession: Scalars['Boolean']['output'];
  resetOnboardingStatus: OnboardingStatus;
  restoreUser: RestoreUserPayload;
  resumeQueue: Scalars['Boolean']['output'];
  retryAllFailed: Scalars['Int']['output'];
  retryJob: Scalars['Boolean']['output'];
  rollbackSyncJob: RollbackSyncJobResult;
  /** Skip current guess - counts as wrong guess (requires auth). */
  skipGuess: GuessResult;
  softDeleteUser: DeleteUserPayload;
  /**
   * Start an archive session for a specific date (not today).
   * Used for playing past puzzles.
   */
  startArchiveSession: StartSessionResult;
  /**
   * Start a new session for today's challenge (requires auth).
   * Returns existing session if already started.
   */
  startUncoverSession: StartSessionResult;
  /** Submit a guess for the current session (requires auth). */
  submitGuess: GuessResult;
  triggerAlbumEnrichment: EnrichmentResult;
  triggerArtistEnrichment: EnrichmentResult;
  triggerSpotifySync: SpotifySyncResult;
  unfollowUser: Scalars['Boolean']['output'];
  /** Admin: Unpin a curated challenge (remove date override) */
  unpinCuratedChallenge: CuratedChallengeEntry;
  updateAlbum: Album;
  updateAlbumDataQuality: Album;
  updateAlbumGameStatus: UpdateAlbumGameStatusResult;
  updateAlertThresholds: AlertThresholds;
  updateArtistDataQuality: Artist;
  updateCollection: UpdateCollectionPayload;
  updateCollectionAlbum: UpdateCollectionAlbumPayload;
  updateDashboardLayout: UserSettings;
  updateOnboardingStatus: OnboardingStatus;
  updateProfile: UpdateProfilePayload;
  updateRecommendation: UpdateRecommendationPayload;
  updateTrack: Track;
  updateUserRole: UpdateUserRolePayload;
  updateUserSettings: UserSettings;
};

export type MutationAddAlbumArgs = {
  input: AlbumInput;
};

export type MutationAddAlbumToCollectionArgs = {
  collectionId: Scalars['String']['input'];
  input: CollectionAlbumInput;
};

export type MutationAddAlbumToCollectionWithCreateArgs = {
  input: AddAlbumToCollectionWithCreateInput;
};

export type MutationAddAlbumToQueueArgs = {
  albumId: Scalars['UUID']['input'];
};

export type MutationAddArtistArgs = {
  input: ArtistInput;
};

export type MutationAddCuratedChallengeArgs = {
  albumId: Scalars['UUID']['input'];
  pinnedDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type MutationAdminUpdateUserShowTourArgs = {
  showOnboardingTour: Scalars['Boolean']['input'];
  userId: Scalars['String']['input'];
};

export type MutationArtistCorrectionApplyArgs = {
  input: ArtistCorrectionApplyInput;
};

export type MutationBatchEnrichmentArgs = {
  ids: Array<Scalars['UUID']['input']>;
  priority?: InputMaybe<EnrichmentPriority>;
  type: EnrichmentType;
};

export type MutationCleanQueueArgs = {
  olderThan?: InputMaybe<Scalars['Int']['input']>;
};

export type MutationCorrectionApplyArgs = {
  input: CorrectionApplyInput;
};

export type MutationCreateCollectionArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type MutationCreateRecommendationArgs = {
  basisAlbumId?: InputMaybe<Scalars['UUID']['input']>;
  input?: InputMaybe<CreateRecommendationWithAlbumsInput>;
  recommendedAlbumId?: InputMaybe<Scalars['UUID']['input']>;
  score?: InputMaybe<Scalars['Int']['input']>;
};

export type MutationCreateTrackArgs = {
  input: TrackInput;
};

export type MutationDeleteAlbumArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationDeleteArtistArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationDeleteCollectionArgs = {
  id: Scalars['String']['input'];
};

export type MutationDeleteRecommendationArgs = {
  id: Scalars['String']['input'];
};

export type MutationDeleteTrackArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationDismissUserSuggestionArgs = {
  userId: Scalars['String']['input'];
};

export type MutationFollowUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationHardDeleteUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationImportDeezerPlaylistArgs = {
  playlistId: Scalars['String']['input'];
};

export type MutationManualCorrectionApplyArgs = {
  input: ManualCorrectionApplyInput;
};

export type MutationPinCuratedChallengeArgs = {
  date: Scalars['DateTime']['input'];
  id: Scalars['UUID']['input'];
};

export type MutationPreviewAlbumEnrichmentArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationPreviewArtistEnrichmentArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationRemoveAlbumFromCollectionArgs = {
  albumId: Scalars['UUID']['input'];
  collectionId: Scalars['String']['input'];
};

export type MutationRemoveCuratedChallengeArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationReorderCollectionAlbumsArgs = {
  albumIds: Array<Scalars['UUID']['input']>;
  collectionId: Scalars['String']['input'];
};

export type MutationResetAlbumEnrichmentArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationResetArtistEnrichmentArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationRestoreUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationRetryJobArgs = {
  jobId: Scalars['String']['input'];
};

export type MutationRollbackSyncJobArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  syncJobId: Scalars['UUID']['input'];
};

export type MutationSkipGuessArgs = {
  mode?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['UUID']['input'];
};

export type MutationSoftDeleteUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationStartArchiveSessionArgs = {
  date: Scalars['DateTime']['input'];
};

export type MutationSubmitGuessArgs = {
  albumId: Scalars['UUID']['input'];
  mode?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['UUID']['input'];
};

export type MutationTriggerAlbumEnrichmentArgs = {
  force?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['UUID']['input'];
  priority?: InputMaybe<EnrichmentPriority>;
};

export type MutationTriggerArtistEnrichmentArgs = {
  force?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['UUID']['input'];
  priority?: InputMaybe<EnrichmentPriority>;
};

export type MutationTriggerSpotifySyncArgs = {
  type: SpotifySyncType;
};

export type MutationUnfollowUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationUnpinCuratedChallengeArgs = {
  id: Scalars['UUID']['input'];
};

export type MutationUpdateAlbumArgs = {
  id: Scalars['UUID']['input'];
  input: AlbumInput;
};

export type MutationUpdateAlbumDataQualityArgs = {
  dataQuality: DataQuality;
  id: Scalars['UUID']['input'];
};

export type MutationUpdateAlbumGameStatusArgs = {
  input: UpdateAlbumGameStatusInput;
};

export type MutationUpdateAlertThresholdsArgs = {
  input: AlertThresholdsInput;
};

export type MutationUpdateArtistDataQualityArgs = {
  dataQuality: DataQuality;
  id: Scalars['UUID']['input'];
};

export type MutationUpdateCollectionArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type MutationUpdateCollectionAlbumArgs = {
  id: Scalars['String']['input'];
  input: CollectionAlbumInput;
};

export type MutationUpdateDashboardLayoutArgs = {
  layout: Scalars['JSON']['input'];
};

export type MutationUpdateOnboardingStatusArgs = {
  hasCompletedTour: Scalars['Boolean']['input'];
};

export type MutationUpdateProfileArgs = {
  bio?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type MutationUpdateRecommendationArgs = {
  id: Scalars['String']['input'];
  score: Scalars['Int']['input'];
};

export type MutationUpdateTrackArgs = {
  id: Scalars['UUID']['input'];
  input: UpdateTrackInput;
};

export type MutationUpdateUserRoleArgs = {
  role: UserRole;
  userId: Scalars['String']['input'];
};

export type MutationUpdateUserSettingsArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
  profileVisibility?: InputMaybe<Scalars['String']['input']>;
  showCollectionAddsInFeed?: InputMaybe<Scalars['Boolean']['input']>;
  showCollections?: InputMaybe<Scalars['Boolean']['input']>;
  showListenLaterInFeed?: InputMaybe<Scalars['Boolean']['input']>;
  showOnboardingTour?: InputMaybe<Scalars['Boolean']['input']>;
  showRecentActivity?: InputMaybe<Scalars['Boolean']['input']>;
  theme?: InputMaybe<Scalars['String']['input']>;
};

export type OnboardingStatus = {
  __typename?: 'OnboardingStatus';
  hasCompletedTour: Scalars['Boolean']['output'];
  isNewUser: Scalars['Boolean']['output'];
  profileUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type OtherAlbumInfo = {
  __typename?: 'OtherAlbumInfo';
  artist: Scalars['String']['output'];
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  year?: Maybe<Scalars['String']['output']>;
};

export type PaginationInfo = {
  __typename?: 'PaginationInfo';
  hasMore: Scalars['Boolean']['output'];
  page: Scalars['Int']['output'];
  perPage: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type PlaylistPreviewStats = {
  __typename?: 'PlaylistPreviewStats';
  albumsAfterFilter: Scalars['Int']['output'];
  compilationsFiltered: Scalars['Int']['output'];
  singlesFiltered: Scalars['Int']['output'];
  totalTracks: Scalars['Int']['output'];
  uniqueAlbums: Scalars['Int']['output'];
};

export type PreviewEnrichmentResult = {
  __typename?: 'PreviewEnrichmentResult';
  fieldsToUpdate: Array<EnrichmentFieldDiff>;
  llamaLogId: Scalars['UUID']['output'];
  matchScore?: Maybe<Scalars['Float']['output']>;
  matchedEntity?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  rawData?: Maybe<Scalars['JSON']['output']>;
  sources: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Summary of all changes in a preview. */
export type PreviewSummary = {
  __typename?: 'PreviewSummary';
  /** Number of fields added */
  addedFields: Scalars['Int']['output'];
  /** Number of fields that changed */
  changedFields: Scalars['Int']['output'];
  /** Number of conflict fields */
  conflictFields: Scalars['Int']['output'];
  /** Whether track listing has changes */
  hasTrackChanges: Scalars['Boolean']['output'];
  /** Number of fields modified */
  modifiedFields: Scalars['Int']['output'];
  /** Total fields compared */
  totalFields: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  activeJobs: Array<JobRecord>;
  album?: Maybe<Album>;
  albumByMusicBrainzId?: Maybe<Album>;
  albumRecommendations: Array<Album>;
  albumTracks: Array<Track>;
  albumsByGameStatus: Array<Album>;
  albumsByJobId: Array<Album>;
  artist?: Maybe<Artist>;
  artistByMusicBrainzId?: Maybe<Artist>;
  /** Generate a preview of changes between artist and selected MusicBrainz or Discogs artist */
  artistCorrectionPreview: ArtistCorrectionPreview;
  /** Search MusicBrainz or Discogs for artist correction candidates */
  artistCorrectionSearch: ArtistCorrectionSearchResponse;
  artistDiscography: CategorizedDiscography;
  artistRecommendations: ArtistRecommendationsConnection;
  collection?: Maybe<Collection>;
  /** Generate a preview of changes between album and selected MusicBrainz release */
  correctionPreview: CorrectionPreview;
  /** Search MusicBrainz for correction candidates for an album */
  correctionSearch: CorrectionSearchResponse;
  /** Admin: Get count of curated challenges */
  curatedChallengeCount: Scalars['Int']['output'];
  /** Admin: Get curated challenge list (ordered) */
  curatedChallenges: Array<CuratedChallengeEntry>;
  /**
   * Get the daily challenge for a date (defaults to today).
   * Does NOT expose the answer album - that would spoil the game!
   */
  dailyChallenge: DailyChallengeInfo;
  databaseStats: DatabaseStats;
  enrichmentStats: EnrichmentStats;
  failedJobs: Array<JobRecord>;
  followingActivity: Array<Recommendation>;
  gamePoolStats: GamePoolStats;
  getAlbumRecommendations: AlbumRecommendationsResponse;
  health: Scalars['String']['output'];
  isFollowing: Scalars['Boolean']['output'];
  jobHistory: Array<JobRecord>;
  llamaLogChain: LlamaLogChainResponse;
  llamaLogs: Array<LlamaLog>;
  mutualConnections: Array<User>;
  /**
   * Get user's archive stats (separate from daily stats).
   * Returns null if no archive games played.
   */
  myArchiveStats?: Maybe<UncoverArchiveStats>;
  myCollectionAlbums: Array<CollectionAlbum>;
  myCollections: Array<Collection>;
  myRecommendations: RecommendationFeed;
  mySettings?: Maybe<UserSettings>;
  /**
   * Get user's session history for calendar display (ARCHIVE-02).
   * Optional date filters for efficient month-by-month loading.
   */
  myUncoverSessions: Array<UncoverSessionHistory>;
  /** Get current user's Uncover game stats (requires auth) */
  myUncoverStats?: Maybe<UncoverPlayerStats>;
  onboardingStatus: OnboardingStatus;
  /**
   * Preview a Deezer playlist's albums (read-only, no DB writes).
   * No auth required — Deezer's public API is free and unlimited.
   */
  previewDeezerPlaylist: DeezerPlaylistPreview;
  publicCollections: Array<Collection>;
  queueMetrics: QueueMetrics;
  queueStatus: QueueStatus;
  recommendation?: Maybe<Recommendation>;
  recommendationFeed: RecommendationFeed;
  search: SearchResults;
  searchAlbums: Array<Album>;
  searchArtists: Array<Artist>;
  searchTracks: Array<Track>;
  socialFeed: ActivityFeed;
  spotifyTrending: SpotifyTrendingData;
  suggestedGameAlbums: Array<Album>;
  syncJob?: Maybe<SyncJob>;
  syncJobByJobId?: Maybe<SyncJob>;
  syncJobs: SyncJobsConnection;
  systemHealth: SystemHealth;
  topRecommendedAlbums: Array<TopRecommendedAlbum>;
  topRecommendedArtists: Array<TopRecommendedArtist>;
  track?: Maybe<Track>;
  trackRecommendations: Array<Track>;
  trendingAlbums: Array<Album>;
  trendingArtists: Array<Artist>;
  /** Admin: Preview upcoming challenges for the next N days */
  upcomingChallenges: Array<UpcomingChallenge>;
  user?: Maybe<User>;
  userCollections: Array<Collection>;
  userFollowers: Array<User>;
  userFollowing: Array<User>;
  userStats: UserStats;
  userSuggestions: Array<User>;
  users: Array<User>;
  usersCount: Scalars['Int']['output'];
};

export type QueryAlbumArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryAlbumByMusicBrainzIdArgs = {
  musicbrainzId: Scalars['String']['input'];
};

export type QueryAlbumRecommendationsArgs = {
  input: RecommendationInput;
};

export type QueryAlbumTracksArgs = {
  albumId: Scalars['UUID']['input'];
};

export type QueryAlbumsByGameStatusArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status: AlbumGameStatus;
};

export type QueryAlbumsByJobIdArgs = {
  jobId: Scalars['String']['input'];
};

export type QueryArtistArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryArtistByMusicBrainzIdArgs = {
  musicbrainzId: Scalars['UUID']['input'];
};

export type QueryArtistCorrectionPreviewArgs = {
  artistId: Scalars['UUID']['input'];
  source?: InputMaybe<CorrectionSource>;
  sourceArtistId: Scalars['String']['input'];
};

export type QueryArtistCorrectionSearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  source?: InputMaybe<CorrectionSource>;
};

export type QueryArtistDiscographyArgs = {
  id: Scalars['String']['input'];
  source: DataSource;
};

export type QueryArtistRecommendationsArgs = {
  artistId: Scalars['ID']['input'];
  filter?: InputMaybe<AlbumRole>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ArtistRecommendationSort>;
};

export type QueryCollectionArgs = {
  id: Scalars['String']['input'];
};

export type QueryCorrectionPreviewArgs = {
  input: CorrectionPreviewInput;
};

export type QueryCorrectionSearchArgs = {
  input: CorrectionSearchInput;
};

export type QueryCuratedChallengesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryDailyChallengeArgs = {
  date?: InputMaybe<Scalars['DateTime']['input']>;
};

export type QueryEnrichmentStatsArgs = {
  entityType?: InputMaybe<EnrichmentEntityType>;
  timeRange?: InputMaybe<TimeRangeInput>;
};

export type QueryFailedJobsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryFollowingActivityArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryGetAlbumRecommendationsArgs = {
  albumId: Scalars['UUID']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Scalars['String']['input']>;
};

export type QueryIsFollowingArgs = {
  userId: Scalars['String']['input'];
};

export type QueryJobHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<JobStatus>;
};

export type QueryLlamaLogChainArgs = {
  categories?: InputMaybe<Array<LlamaLogCategory>>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  entityId: Scalars['UUID']['input'];
  entityType: EnrichmentEntityType;
  limit?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type QueryLlamaLogsArgs = {
  category?: InputMaybe<Array<LlamaLogCategory>>;
  entityId?: InputMaybe<Scalars['UUID']['input']>;
  entityType?: InputMaybe<EnrichmentEntityType>;
  includeChildren?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  parentJobId?: InputMaybe<Scalars['String']['input']>;
  parentOnly?: InputMaybe<Scalars['Boolean']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sources?: InputMaybe<Array<Scalars['String']['input']>>;
  status?: InputMaybe<LlamaLogStatus>;
};

export type QueryMutualConnectionsArgs = {
  userId: Scalars['String']['input'];
};

export type QueryMyRecommendationsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<RecommendationSort>;
};

export type QueryMyUncoverSessionsArgs = {
  fromDate?: InputMaybe<Scalars['DateTime']['input']>;
  toDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type QueryPreviewDeezerPlaylistArgs = {
  playlistId: Scalars['String']['input'];
};

export type QueryPublicCollectionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryQueueMetricsArgs = {
  timeRange?: InputMaybe<TimeRange>;
};

export type QueryRecommendationArgs = {
  id: Scalars['String']['input'];
};

export type QueryRecommendationFeedArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QuerySearchArgs = {
  input: SearchInput;
};

export type QuerySearchAlbumsArgs = {
  dataQuality?: InputMaybe<Scalars['String']['input']>;
  enrichmentStatus?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  needsEnrichment?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
};

export type QuerySearchArtistsArgs = {
  dataQuality?: InputMaybe<Scalars['String']['input']>;
  enrichmentStatus?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  needsEnrichment?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
};

export type QuerySearchTracksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};

export type QuerySocialFeedArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<ActivityType>;
};

export type QuerySuggestedGameAlbumsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  syncSource?: InputMaybe<Scalars['String']['input']>;
};

export type QuerySyncJobArgs = {
  id: Scalars['UUID']['input'];
};

export type QuerySyncJobByJobIdArgs = {
  jobId: Scalars['String']['input'];
};

export type QuerySyncJobsArgs = {
  input?: InputMaybe<SyncJobsInput>;
};

export type QueryTopRecommendedAlbumsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryTopRecommendedArtistsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryTrackArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryTrackRecommendationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  trackId: Scalars['UUID']['input'];
};

export type QueryTrendingAlbumsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryTrendingArtistsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryUpcomingChallengesArgs = {
  days: Scalars['Int']['input'];
};

export type QueryUserArgs = {
  id: Scalars['String']['input'];
};

export type QueryUserCollectionsArgs = {
  userId: Scalars['String']['input'];
};

export type QueryUserFollowersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['String']['input'];
};

export type QueryUserFollowingArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['String']['input'];
};

export type QueryUserStatsArgs = {
  userId: Scalars['String']['input'];
};

export type QueryUserSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryUsersArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  hasActivity?: InputMaybe<Scalars['Boolean']['input']>;
  lastActiveAfter?: InputMaybe<Scalars['DateTime']['input']>;
  lastActiveBefore?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  role?: InputMaybe<UserRole>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<UserSortField>;
  sortOrder?: InputMaybe<SortOrder>;
};

export type QueryUsersCountArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  hasActivity?: InputMaybe<Scalars['Boolean']['input']>;
  lastActiveAfter?: InputMaybe<Scalars['DateTime']['input']>;
  lastActiveBefore?: InputMaybe<Scalars['DateTime']['input']>;
  role?: InputMaybe<UserRole>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type QueueMetrics = {
  __typename?: 'QueueMetrics';
  avgProcessingTime: Scalars['Float']['output'];
  errorRate: Scalars['Float']['output'];
  jobsFailed: Scalars['Int']['output'];
  jobsProcessed: Scalars['Int']['output'];
  successRate: Scalars['Float']['output'];
  throughput: ThroughputMetrics;
  timeRange: TimeRange;
  topErrors: Array<ErrorMetric>;
};

export type QueueStats = {
  __typename?: 'QueueStats';
  active: Scalars['Int']['output'];
  completed: Scalars['Int']['output'];
  delayed: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  paused: Scalars['Int']['output'];
  waiting: Scalars['Int']['output'];
};

export type QueueStatus = {
  __typename?: 'QueueStatus';
  isPaused: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  rateLimitInfo: RateLimitInfo;
  stats: QueueStats;
  workers: Array<WorkerInfo>;
};

export type RateLimitInfo = {
  __typename?: 'RateLimitInfo';
  currentWindowRequests: Scalars['Int']['output'];
  maxRequestsPerSecond: Scalars['Int']['output'];
  windowResetTime: Scalars['DateTime']['output'];
};

export type Recommendation = {
  __typename?: 'Recommendation';
  basisAlbum: Album;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  normalizedScore: Scalars['Float']['output'];
  recommendedAlbum: Album;
  score: Scalars['Int']['output'];
  similarity?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  user: User;
};

export type RecommendationFeed = {
  __typename?: 'RecommendationFeed';
  cursor?: Maybe<Scalars['String']['output']>;
  hasMore: Scalars['Boolean']['output'];
  recommendations: Array<Recommendation>;
};

export type RecommendationInput = {
  albumId: Scalars['UUID']['input'];
  includeExplicit?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export enum RecommendationSort {
  DateAsc = 'DATE_ASC',
  DateDesc = 'DATE_DESC',
  PopularityDesc = 'POPULARITY_DESC',
  ScoreAsc = 'SCORE_ASC',
  ScoreDesc = 'SCORE_DESC',
}

export type ReorderCollectionAlbumsPayload = {
  __typename?: 'ReorderCollectionAlbumsPayload';
  ids: Array<Scalars['String']['output']>;
};

export type RestoreUserPayload = {
  __typename?: 'RestoreUserPayload';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type RollbackSyncJobResult = {
  __typename?: 'RollbackSyncJobResult';
  albumsDeleted: Scalars['Int']['output'];
  artistsDeleted: Scalars['Int']['output'];
  dryRun: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  syncJobId: Scalars['UUID']['output'];
};

/** Score breakdown showing component scores for search result scoring. */
export type ScoreBreakdown = {
  __typename?: 'ScoreBreakdown';
  /** Artist match score (strategy-specific range) */
  artistScore: Scalars['Float']['output'];
  /** For tiered strategy: confidence level */
  confidenceTier?: Maybe<ConfidenceTier>;
  /** MusicBrainz search score component */
  mbScore?: Maybe<Scalars['Float']['output']>;
  /** Title match score (strategy-specific range) */
  titleScore: Scalars['Float']['output'];
  /** Year/date score (strategy-specific range) */
  yearScore: Scalars['Float']['output'];
};

/** A search result with scoring applied. */
export type ScoredSearchResult = {
  __typename?: 'ScoredSearchResult';
  /** Primary artist credits */
  artistCredits: Array<CorrectionArtistCredit>;
  /** Component score breakdown */
  breakdown: ScoreBreakdown;
  /** Cover Art Archive thumbnail URL (250px) */
  coverArtUrl?: Maybe<Scalars['String']['output']>;
  /** Disambiguation (e.g., "deluxe edition") */
  disambiguation?: Maybe<Scalars['String']['output']>;
  /** Raw display score (0-1 or 0-100 depending on strategy) */
  displayScore: Scalars['Float']['output'];
  /** First release date (YYYY or YYYY-MM-DD) */
  firstReleaseDate?: Maybe<Scalars['String']['output']>;
  /** True if score is below low-confidence threshold */
  isLowConfidence: Scalars['Boolean']['output'];
  /** MusicBrainz search score (0-100) */
  mbScore: Scalars['Int']['output'];
  /** Normalized score 0-1 for sorting */
  normalizedScore: Scalars['Float']['output'];
  /** Formatted primary artist name for display */
  primaryArtistName: Scalars['String']['output'];
  /** Primary type (Album, EP, Single, etc.) */
  primaryType?: Maybe<Scalars['String']['output']>;
  /** Release group MusicBrainz ID */
  releaseGroupMbid: Scalars['String']['output'];
  /** Which strategy produced this score */
  scoringStrategy: ScoringStrategy;
  /** Secondary types (Compilation, Live, Remix, etc.) */
  secondaryTypes?: Maybe<Array<Scalars['String']['output']>>;
  /** Source indicator */
  source: Scalars['String']['output'];
  /** Album title */
  title: Scalars['String']['output'];
};

/** Available scoring strategies for correction search results. */
export enum ScoringStrategy {
  /** 0-1 scale using string-similarity */
  Normalized = 'NORMALIZED',
  /** High/medium/low confidence levels */
  Tiered = 'TIERED',
  /** 0-100 with multiple signals */
  Weighted = 'WEIGHTED',
}

export type SearchInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  searchMode?: InputMaybe<SearchMode>;
  type?: InputMaybe<SearchType>;
};

export enum SearchMode {
  ExternalOnly = 'EXTERNAL_ONLY',
  LocalAndExternal = 'LOCAL_AND_EXTERNAL',
  LocalOnly = 'LOCAL_ONLY',
}

export type SearchResult = Album | Artist | Track;

export type SearchResults = {
  __typename?: 'SearchResults';
  albums: Array<UnifiedRelease>;
  artists: Array<Artist>;
  currentCount: Scalars['Int']['output'];
  hasMore: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
  tracks: Array<Track>;
  users: Array<User>;
};

export enum SearchType {
  Album = 'ALBUM',
  All = 'ALL',
  Artist = 'ARTIST',
  Track = 'TRACK',
  User = 'USER',
}

/** Key-value pair for Map-like selections. */
export type SelectionEntry = {
  /** Unique key (artist MBID or track position like "1-3") */
  key: Scalars['String']['input'];
  /** Whether to apply this change */
  selected: Scalars['Boolean']['input'];
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

export type SourceStat = {
  __typename?: 'SourceStat';
  attempts: Scalars['Int']['output'];
  source: Scalars['String']['output'];
  successRate: Scalars['Float']['output'];
};

export type SpotifyAlbum = {
  __typename?: 'SpotifyAlbum';
  artistIds: Array<Scalars['String']['output']>;
  artists: Scalars['String']['output'];
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  releaseDate: Scalars['String']['output'];
  spotifyUrl: Scalars['String']['output'];
  totalTracks: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type SpotifyArtist = {
  __typename?: 'SpotifyArtist';
  followers: Scalars['Int']['output'];
  genres: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  popularity: Scalars['Int']['output'];
  spotifyUrl: Scalars['String']['output'];
};

export type SpotifyPlaylist = {
  __typename?: 'SpotifyPlaylist';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  spotifyUrl: Scalars['String']['output'];
  tracksTotal: Scalars['Int']['output'];
};

export type SpotifyPopularArtists = {
  __typename?: 'SpotifyPopularArtists';
  artists: Array<SpotifyArtist>;
  searchTerm: Scalars['String']['output'];
};

export type SpotifySyncResult = {
  __typename?: 'SpotifySyncResult';
  jobId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  stats?: Maybe<SpotifySyncStats>;
  success: Scalars['Boolean']['output'];
};

export type SpotifySyncStats = {
  __typename?: 'SpotifySyncStats';
  albumsCreated: Scalars['Int']['output'];
  albumsQueued: Scalars['Int']['output'];
  albumsUpdated: Scalars['Int']['output'];
  enrichmentJobsQueued: Scalars['Int']['output'];
};

export enum SpotifySyncType {
  Both = 'BOTH',
  FeaturedPlaylists = 'FEATURED_PLAYLISTS',
  NewReleases = 'NEW_RELEASES',
}

export type SpotifyTopChart = {
  __typename?: 'SpotifyTopChart';
  playlistId: Scalars['String']['output'];
  playlistImage?: Maybe<Scalars['String']['output']>;
  playlistName: Scalars['String']['output'];
  tracks: Array<SpotifyTrack>;
};

export type SpotifyTrack = {
  __typename?: 'SpotifyTrack';
  album?: Maybe<Scalars['String']['output']>;
  albumId?: Maybe<Scalars['String']['output']>;
  artistIds?: Maybe<Array<Scalars['String']['output']>>;
  artists: Scalars['String']['output'];
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  popularity?: Maybe<Scalars['Int']['output']>;
};

export type SpotifyTrendingData = {
  __typename?: 'SpotifyTrendingData';
  expires?: Maybe<Scalars['DateTime']['output']>;
  featuredPlaylists: Array<SpotifyPlaylist>;
  lastUpdated?: Maybe<Scalars['DateTime']['output']>;
  needsSync: Scalars['Boolean']['output'];
  newReleases: Array<SpotifyAlbum>;
  popularArtists: Array<SpotifyPopularArtists>;
  topCharts: Array<SpotifyTopChart>;
};

/** Result of starting a new session */
export type StartSessionResult = {
  __typename?: 'StartSessionResult';
  challengeId: Scalars['UUID']['output'];
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  imageUrl: Scalars['String']['output'];
  session: UncoverSessionInfo;
};

export type Subscription = {
  __typename?: 'Subscription';
  alertStream: Alert;
  jobStatusUpdates: JobStatusUpdate;
  metricsStream: QueueMetrics;
  queueStatusUpdates: QueueStatus;
  systemHealthUpdates: SystemHealth;
};

export type SubscriptionJobStatusUpdatesArgs = {
  jobId?: InputMaybe<Scalars['String']['input']>;
};

export type SubscriptionMetricsStreamArgs = {
  interval?: InputMaybe<Scalars['Int']['input']>;
};

export type SyncJob = {
  __typename?: 'SyncJob';
  albums: Array<Album>;
  albumsCreated: Scalars['Int']['output'];
  albumsSkipped: Scalars['Int']['output'];
  albumsUpdated: Scalars['Int']['output'];
  artistsCreated: Scalars['Int']['output'];
  artistsUpdated: Scalars['Int']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  durationMs?: Maybe<Scalars['Int']['output']>;
  errorCode?: Maybe<Scalars['String']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  jobId: Scalars['String']['output'];
  jobType: SyncJobType;
  metadata?: Maybe<Scalars['JSON']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: SyncJobStatus;
  triggeredBy?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type SyncJobAlbumsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export enum SyncJobStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
}

export enum SyncJobType {
  DiscogsSync = 'DISCOGS_SYNC',
  EnrichmentBatch = 'ENRICHMENT_BATCH',
  MusicbrainzNewReleases = 'MUSICBRAINZ_NEW_RELEASES',
  MusicbrainzSync = 'MUSICBRAINZ_SYNC',
  SpotifyFeaturedPlaylists = 'SPOTIFY_FEATURED_PLAYLISTS',
  SpotifyNewReleases = 'SPOTIFY_NEW_RELEASES',
}

export type SyncJobsConnection = {
  __typename?: 'SyncJobsConnection';
  hasMore: Scalars['Boolean']['output'];
  jobs: Array<SyncJob>;
  totalCount: Scalars['Int']['output'];
};

export type SyncJobsInput = {
  jobType?: InputMaybe<SyncJobType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  startedAfter?: InputMaybe<Scalars['DateTime']['input']>;
  startedBefore?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<SyncJobStatus>;
};

export type SystemHealth = {
  __typename?: 'SystemHealth';
  alerts: Array<Scalars['String']['output']>;
  components: HealthComponents;
  metrics: HealthMetrics;
  status: HealthStatus;
  timestamp: Scalars['DateTime']['output'];
  uptime: Scalars['Float']['output'];
};

/** Diff for a text field (title, disambiguation, etc.) */
export type TextDiff = {
  __typename?: 'TextDiff';
  /** Change classification */
  changeType: ChangeType;
  /** Current value in database */
  currentValue?: Maybe<Scalars['String']['output']>;
  /** Field name (e.g., 'title', 'disambiguation') */
  field: Scalars['String']['output'];
  /** Character-level diff parts (only for MODIFIED/CONFLICT) */
  parts?: Maybe<Array<TextDiffPart>>;
  /** Value from MusicBrainz source */
  sourceValue?: Maybe<Scalars['String']['output']>;
};

/**
 * Character-level diff part for text comparison.
 * Used to highlight exact changes within text fields.
 */
export type TextDiffPart = {
  __typename?: 'TextDiffPart';
  /** True if this part was added in the source */
  added?: Maybe<Scalars['Boolean']['output']>;
  /** True if this part was removed (exists in current but not source) */
  removed?: Maybe<Scalars['Boolean']['output']>;
  /** The text content of this part */
  value: Scalars['String']['output'];
};

export type ThroughputMetrics = {
  __typename?: 'ThroughputMetrics';
  jobsPerHour: Scalars['Float']['output'];
  jobsPerMinute: Scalars['Float']['output'];
  peakJobsPerMinute: Scalars['Float']['output'];
};

export enum TimeRange {
  LastDay = 'LAST_DAY',
  LastHour = 'LAST_HOUR',
  LastMonth = 'LAST_MONTH',
  LastWeek = 'LAST_WEEK',
}

export type TimeRangeInput = {
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
};

export type TopRecommendedAlbum = {
  __typename?: 'TopRecommendedAlbum';
  album: Album;
  asBasisCount: Scalars['Int']['output'];
  asTargetCount: Scalars['Int']['output'];
  averageScore: Scalars['Float']['output'];
  recommendationCount: Scalars['Int']['output'];
};

export type TopRecommendedArtist = {
  __typename?: 'TopRecommendedArtist';
  albumsInRecommendations: Scalars['Int']['output'];
  artist: Artist;
  averageScore: Scalars['Float']['output'];
  recommendationCount: Scalars['Int']['output'];
};

export type Track = {
  __typename?: 'Track';
  album?: Maybe<Album>;
  albumId?: Maybe<Scalars['UUID']['output']>;
  artists: Array<ArtistCredit>;
  audioFeatures?: Maybe<AudioFeatures>;
  createdAt: Scalars['DateTime']['output'];
  discNumber: Scalars['Int']['output'];
  discogsId?: Maybe<Scalars['String']['output']>;
  duration?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  explicit: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  isrc?: Maybe<Scalars['String']['output']>;
  latestLlamaLog?: Maybe<LlamaLog>;
  llamaLogs: Array<LlamaLog>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  popularity?: Maybe<Scalars['Float']['output']>;
  previewUrl?: Maybe<Scalars['String']['output']>;
  searchArtistName?: Maybe<Scalars['String']['output']>;
  searchCoverArtUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  trackNumber: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TrackLlamaLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

/** Current track data from database. */
export type TrackData = {
  __typename?: 'TrackData';
  durationMs?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  trackNumber: Scalars['Int']['output'];
};

/**
 * Diff for a single track in the track listing.
 * Position-based comparison (disc + track number).
 */
export type TrackDiff = {
  __typename?: 'TrackDiff';
  /** Track change classification */
  changeType: Scalars['String']['output'];
  /** Current track data (null if ADDED in source) */
  current?: Maybe<TrackData>;
  /** Disc number (1-based) */
  discNumber: Scalars['Int']['output'];
  /** Duration difference in milliseconds (absolute value) */
  durationDelta?: Maybe<Scalars['Int']['output']>;
  /** Track position (1-based) */
  position: Scalars['Int']['output'];
  /** Source track from MusicBrainz (null if REMOVED from current) */
  source?: Maybe<TrackSourceData>;
  /** Title diff parts (only for MODIFIED) */
  titleDiff?: Maybe<Array<TextDiffPart>>;
  /** Database track ID (for selection) */
  trackId?: Maybe<Scalars['String']['output']>;
};

export type TrackInput = {
  albumId: Scalars['UUID']['input'];
  artists: Array<ArtistTrackInput>;
  discNumber?: InputMaybe<Scalars['Int']['input']>;
  discogsId?: InputMaybe<Scalars['String']['input']>;
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  explicit?: InputMaybe<Scalars['Boolean']['input']>;
  isrc?: InputMaybe<Scalars['String']['input']>;
  musicbrainzId?: InputMaybe<Scalars['UUID']['input']>;
  previewUrl?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  trackNumber: Scalars['Int']['input'];
};

/** Summary statistics for track listing comparison. */
export type TrackListSummary = {
  __typename?: 'TrackListSummary';
  /** Number of tracks added in source */
  added: Scalars['Int']['output'];
  /** Number of matching tracks (same position, same title) */
  matching: Scalars['Int']['output'];
  /** Number of modified tracks (same position, different title/duration) */
  modified: Scalars['Int']['output'];
  /** Number of tracks removed (exist in current but not source) */
  removed: Scalars['Int']['output'];
  /** Total tracks in current album */
  totalCurrent: Scalars['Int']['output'];
  /** Total tracks in source data */
  totalSource: Scalars['Int']['output'];
};

/** Source track data from MusicBrainz. */
export type TrackSourceData = {
  __typename?: 'TrackSourceData';
  durationMs?: Maybe<Scalars['Int']['output']>;
  mbid?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/**
 * Archive game statistics (separate from daily stats).
 * Archive games don't affect streaks.
 */
export type UncoverArchiveStats = {
  __typename?: 'UncoverArchiveStats';
  gamesPlayed: Scalars['Int']['output'];
  gamesWon: Scalars['Int']['output'];
  id: Scalars['UUID']['output'];
  totalAttempts: Scalars['Int']['output'];
  /** Win count by attempt number (index 0 = 1-guess wins, etc.) */
  winDistribution: Array<Scalars['Int']['output']>;
  /** Computed: gamesWon / gamesPlayed (0 if no games) */
  winRate: Scalars['Float']['output'];
};

/** Album info for guess display (minimal, safe to expose) */
export type UncoverGuessAlbumInfo = {
  __typename?: 'UncoverGuessAlbumInfo';
  artistName: Scalars['String']['output'];
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  title: Scalars['String']['output'];
};

/** Individual guess within a session */
export type UncoverGuessInfo = {
  __typename?: 'UncoverGuessInfo';
  guessNumber: Scalars['Int']['output'];
  guessedAlbum?: Maybe<UncoverGuessAlbumInfo>;
  guessedAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  isCorrect: Scalars['Boolean']['output'];
  isSkipped: Scalars['Boolean']['output'];
};

/**
 * Player statistics for Uncover daily challenge game.
 * Tracks games played, win rate, streaks, and guess distribution.
 */
export type UncoverPlayerStats = {
  __typename?: 'UncoverPlayerStats';
  currentStreak: Scalars['Int']['output'];
  gamesPlayed: Scalars['Int']['output'];
  gamesWon: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lastPlayedDate?: Maybe<Scalars['DateTime']['output']>;
  maxStreak: Scalars['Int']['output'];
  totalAttempts: Scalars['Int']['output'];
  /** Win count by attempt number (index 0 = 1-guess wins, etc.) */
  winDistribution: Array<Scalars['Int']['output']>;
  /** Computed: gamesWon / gamesPlayed (0 if no games) */
  winRate: Scalars['Float']['output'];
};

/**
 * Session history entry for calendar display.
 * Shows which days were played and won/lost.
 */
export type UncoverSessionHistory = {
  __typename?: 'UncoverSessionHistory';
  attemptCount: Scalars['Int']['output'];
  challengeDate: Scalars['DateTime']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  won: Scalars['Boolean']['output'];
};

/** User's session info for a daily challenge */
export type UncoverSessionInfo = {
  __typename?: 'UncoverSessionInfo';
  attemptCount: Scalars['Int']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  guesses: Array<UncoverGuessInfo>;
  id: Scalars['UUID']['output'];
  startedAt: Scalars['DateTime']['output'];
  status: UncoverSessionStatus;
  won: Scalars['Boolean']['output'];
};

export enum UncoverSessionStatus {
  InProgress = 'IN_PROGRESS',
  Lost = 'LOST',
  Won = 'WON',
}

export type UnifiedRelease = {
  __typename?: 'UnifiedRelease';
  artistCredits?: Maybe<Array<ArtistCredit>>;
  artistName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  primaryType?: Maybe<Scalars['String']['output']>;
  releaseDate?: Maybe<Scalars['DateTime']['output']>;
  secondaryTypes?: Maybe<Array<Scalars['String']['output']>>;
  source: DataSource;
  title: Scalars['String']['output'];
  trackCount?: Maybe<Scalars['Int']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

/** Upcoming challenge preview for admin */
export type UpcomingChallenge = {
  __typename?: 'UpcomingChallenge';
  album?: Maybe<Album>;
  date: Scalars['DateTime']['output'];
  daysSinceEpoch: Scalars['Int']['output'];
  isPinned: Scalars['Boolean']['output'];
  sequence: Scalars['Int']['output'];
};

export type UpdateAlbumGameStatusInput = {
  albumId: Scalars['UUID']['input'];
  gameStatus: AlbumGameStatus;
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAlbumGameStatusResult = {
  __typename?: 'UpdateAlbumGameStatusResult';
  album?: Maybe<Album>;
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type UpdateCollectionAlbumPayload = {
  __typename?: 'UpdateCollectionAlbumPayload';
  id: Scalars['String']['output'];
};

export type UpdateCollectionPayload = {
  __typename?: 'UpdateCollectionPayload';
  id: Scalars['String']['output'];
};

export type UpdateProfilePayload = {
  __typename?: 'UpdateProfilePayload';
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type UpdateRecommendationPayload = {
  __typename?: 'UpdateRecommendationPayload';
  id: Scalars['String']['output'];
};

export type UpdateTrackInput = {
  discNumber?: InputMaybe<Scalars['Int']['input']>;
  discogsId?: InputMaybe<Scalars['String']['input']>;
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  explicit?: InputMaybe<Scalars['Boolean']['input']>;
  isrc?: InputMaybe<Scalars['String']['input']>;
  musicbrainzId?: InputMaybe<Scalars['UUID']['input']>;
  previewUrl?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  trackNumber?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateUserRolePayload = {
  __typename?: 'UpdateUserRolePayload';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type User = {
  __typename?: 'User';
  _count?: Maybe<UserCount>;
  bio?: Maybe<Scalars['String']['output']>;
  collections: Array<Collection>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deletedBy?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  emailVerified?: Maybe<Scalars['DateTime']['output']>;
  followers: Array<UserFollow>;
  followersCount: Scalars['Int']['output'];
  following: Array<UserFollow>;
  followingCount: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  isFollowing?: Maybe<Scalars['Boolean']['output']>;
  lastActive?: Maybe<Scalars['DateTime']['output']>;
  mutualFollowers: Array<User>;
  profileUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  recommendations: Array<Recommendation>;
  recommendationsCount: Scalars['Int']['output'];
  role: UserRole;
  settings?: Maybe<UserSettings>;
  updatedAt: Scalars['DateTime']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type UserCount = {
  __typename?: 'UserCount';
  collections: Scalars['Int']['output'];
  recommendations: Scalars['Int']['output'];
};

export type UserFollow = {
  __typename?: 'UserFollow';
  createdAt: Scalars['DateTime']['output'];
  followed: User;
  follower: User;
  id: Scalars['String']['output'];
};

export enum UserRole {
  Admin = 'ADMIN',
  Moderator = 'MODERATOR',
  Owner = 'OWNER',
  User = 'USER',
}

export type UserSettings = {
  __typename?: 'UserSettings';
  autoplayPreviews: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  dashboardLayout?: Maybe<Scalars['JSON']['output']>;
  defaultCollectionView: Scalars['String']['output'];
  emailNotifications: Scalars['Boolean']['output'];
  followAlerts: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  language: Scalars['String']['output'];
  profileVisibility: Scalars['String']['output'];
  recommendationAlerts: Scalars['Boolean']['output'];
  showCollectionAddsInFeed: Scalars['Boolean']['output'];
  showCollections: Scalars['Boolean']['output'];
  showListenLaterInFeed: Scalars['Boolean']['output'];
  showOnboardingTour: Scalars['Boolean']['output'];
  showRecentActivity: Scalars['Boolean']['output'];
  theme: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

export enum UserSortField {
  CollectionsCount = 'COLLECTIONS_COUNT',
  CreatedAt = 'CREATED_AT',
  Email = 'EMAIL',
  FollowersCount = 'FOLLOWERS_COUNT',
  LastActive = 'LAST_ACTIVE',
  Name = 'NAME',
  RecommendationsCount = 'RECOMMENDATIONS_COUNT',
}

export type UserStats = {
  __typename?: 'UserStats';
  averageRecommendationScore?: Maybe<Scalars['Float']['output']>;
  collectionsCount: Scalars['Int']['output'];
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  joinedAt: Scalars['DateTime']['output'];
  recommendationsCount: Scalars['Int']['output'];
  topGenres: Array<Scalars['String']['output']>;
  totalAlbumsInCollections: Scalars['Int']['output'];
  userId: Scalars['String']['output'];
};

export type WorkerInfo = {
  __typename?: 'WorkerInfo';
  activeJobCount: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  isPaused: Scalars['Boolean']['output'];
  isRunning: Scalars['Boolean']['output'];
};

export type AdminUpdateUserShowTourMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  showOnboardingTour: Scalars['Boolean']['input'];
}>;

export type AdminUpdateUserShowTourMutation = {
  __typename?: 'Mutation';
  adminUpdateUserShowTour: {
    __typename?: 'AdminUpdateUserSettingsPayload';
    success: boolean;
    userId: string;
    showOnboardingTour?: boolean | null;
    message?: string | null;
  };
};

export type ApplyCorrectionMutationVariables = Exact<{
  input: CorrectionApplyInput;
}>;

export type ApplyCorrectionMutation = {
  __typename?: 'Mutation';
  correctionApply: {
    __typename?: 'CorrectionApplyResult';
    success: boolean;
    code?: ApplyErrorCode | null;
    message?: string | null;
    context?: any | null;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      releaseDate?: Date | null;
      releaseType?: string | null;
      barcode?: string | null;
      label?: string | null;
      musicbrainzId?: string | null;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      dataQuality?: DataQuality | null;
      updatedAt: Date;
      tracks: Array<{
        __typename?: 'Track';
        id: string;
        title: string;
        durationMs?: number | null;
        trackNumber: number;
        discNumber: number;
        isrc?: string | null;
        musicbrainzId?: string | null;
      }>;
      artists: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: {
          __typename?: 'Artist';
          id: string;
          name: string;
          musicbrainzId?: string | null;
          imageUrl?: string | null;
        };
      }>;
    } | null;
    changes?: {
      __typename?: 'AppliedChanges';
      metadata: Array<string>;
      externalIds: Array<string>;
      coverArt: boolean;
      dataQualityBefore: DataQuality;
      dataQualityAfter: DataQuality;
      artists: {
        __typename?: 'AppliedArtistChanges';
        added: Array<string>;
        removed: Array<string>;
      };
      tracks: {
        __typename?: 'AppliedTrackChanges';
        added: number;
        modified: number;
        removed: number;
      };
    } | null;
  };
};

export type CreateCollectionMutationVariables = Exact<{
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type CreateCollectionMutation = {
  __typename?: 'Mutation';
  createCollection: { __typename?: 'CreateCollectionPayload'; id: string };
};

export type DeleteCollectionMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;

export type DeleteCollectionMutation = {
  __typename?: 'Mutation';
  deleteCollection: boolean;
};

export type SoftDeleteUserMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type SoftDeleteUserMutation = {
  __typename?: 'Mutation';
  softDeleteUser: {
    __typename?: 'DeleteUserPayload';
    success: boolean;
    message?: string | null;
    deletedId?: string | null;
  };
};

export type HardDeleteUserMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type HardDeleteUserMutation = {
  __typename?: 'Mutation';
  hardDeleteUser: {
    __typename?: 'DeleteUserPayload';
    success: boolean;
    message?: string | null;
    deletedId?: string | null;
  };
};

export type RestoreUserMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type RestoreUserMutation = {
  __typename?: 'Mutation';
  restoreUser: {
    __typename?: 'RestoreUserPayload';
    success: boolean;
    message?: string | null;
    user?: {
      __typename?: 'User';
      id: string;
      username?: string | null;
      email?: string | null;
      deletedAt?: Date | null;
      deletedBy?: string | null;
    } | null;
  };
};

export type FollowUserMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type FollowUserMutation = {
  __typename?: 'Mutation';
  followUser: {
    __typename?: 'FollowUserPayload';
    id: string;
    followerId: string;
    followedId: string;
    createdAt: Date;
  };
};

export type UnfollowUserMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type UnfollowUserMutation = {
  __typename?: 'Mutation';
  unfollowUser: boolean;
};

export type CheckFollowStatusQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type CheckFollowStatusQuery = {
  __typename?: 'Query';
  user?: {
    __typename?: 'User';
    id: string;
    isFollowing?: boolean | null;
  } | null;
};

export type ManualCorrectionApplyMutationVariables = Exact<{
  input: ManualCorrectionApplyInput;
}>;

export type ManualCorrectionApplyMutation = {
  __typename?: 'Mutation';
  manualCorrectionApply: {
    __typename?: 'CorrectionApplyResult';
    success: boolean;
    code?: ApplyErrorCode | null;
    message?: string | null;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      releaseDate?: Date | null;
      releaseType?: string | null;
      musicbrainzId?: string | null;
      dataQuality?: DataQuality | null;
      updatedAt: Date;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    } | null;
  };
};

export type RemoveAlbumFromCollectionMutationVariables = Exact<{
  collectionId: Scalars['String']['input'];
  albumId: Scalars['UUID']['input'];
}>;

export type RemoveAlbumFromCollectionMutation = {
  __typename?: 'Mutation';
  removeAlbumFromCollection: boolean;
};

export type ReorderCollectionAlbumsMutationVariables = Exact<{
  collectionId: Scalars['String']['input'];
  albumIds: Array<Scalars['UUID']['input']> | Scalars['UUID']['input'];
}>;

export type ReorderCollectionAlbumsMutation = {
  __typename?: 'Mutation';
  reorderCollectionAlbums: {
    __typename?: 'ReorderCollectionAlbumsPayload';
    ids: Array<string>;
  };
};

export type UpdateCollectionMutationVariables = Exact<{
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type UpdateCollectionMutation = {
  __typename?: 'Mutation';
  updateCollection: { __typename?: 'UpdateCollectionPayload'; id: string };
};

export type UpdateProfileMutationVariables = Exact<{
  username?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
}>;

export type UpdateProfileMutation = {
  __typename?: 'Mutation';
  updateProfile: {
    __typename?: 'UpdateProfilePayload';
    id: string;
    username?: string | null;
    bio?: string | null;
  };
};

export type UpdateUserSettingsMutationVariables = Exact<{
  theme?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  profileVisibility?: InputMaybe<Scalars['String']['input']>;
  showRecentActivity?: InputMaybe<Scalars['Boolean']['input']>;
  showCollections?: InputMaybe<Scalars['Boolean']['input']>;
  showListenLaterInFeed?: InputMaybe<Scalars['Boolean']['input']>;
  showCollectionAddsInFeed?: InputMaybe<Scalars['Boolean']['input']>;
  showOnboardingTour?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type UpdateUserSettingsMutation = {
  __typename?: 'Mutation';
  updateUserSettings: {
    __typename?: 'UserSettings';
    id: string;
    userId: string;
    theme: string;
    language: string;
    profileVisibility: string;
    showRecentActivity: boolean;
    showCollections: boolean;
    showListenLaterInFeed: boolean;
    showCollectionAddsInFeed: boolean;
    showOnboardingTour: boolean;
    emailNotifications: boolean;
    recommendationAlerts: boolean;
    followAlerts: boolean;
    defaultCollectionView: string;
    autoplayPreviews: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type AddAlbumToQueueMutationVariables = Exact<{
  albumId: Scalars['UUID']['input'];
}>;

export type AddAlbumToQueueMutation = {
  __typename?: 'Mutation';
  addAlbumToQueue: {
    __typename?: 'AddAlbumToQueueResult';
    success: boolean;
    message?: string | null;
    error?: string | null;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      gameStatus: AlbumGameStatus;
    } | null;
    curatedChallenge?: {
      __typename?: 'CuratedChallengeEntry';
      id: string;
      sequence: number;
    } | null;
  };
};

export type DeleteAlbumMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type DeleteAlbumMutation = {
  __typename?: 'Mutation';
  deleteAlbum: {
    __typename?: 'DeleteAlbumPayload';
    success: boolean;
    message?: string | null;
    deletedId?: string | null;
  };
};

export type GetAdminUsersQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<UserRole>;
  sortBy?: InputMaybe<UserSortField>;
  sortOrder?: InputMaybe<SortOrder>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  lastActiveAfter?: InputMaybe<Scalars['DateTime']['input']>;
  lastActiveBefore?: InputMaybe<Scalars['DateTime']['input']>;
  hasActivity?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type GetAdminUsersQuery = {
  __typename?: 'Query';
  totalCount: number;
  users: Array<{
    __typename?: 'User';
    id: string;
    username?: string | null;
    email?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
    bio?: string | null;
    role: UserRole;
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
    profileUpdatedAt?: Date | null;
    lastActive?: Date | null;
    deletedAt?: Date | null;
    deletedBy?: string | null;
    createdAt: Date;
    collections: Array<{ __typename?: 'Collection'; id: string; name: string }>;
    settings?: {
      __typename?: 'UserSettings';
      showOnboardingTour: boolean;
    } | null;
    _count?: {
      __typename?: 'UserCount';
      collections: number;
      recommendations: number;
    } | null;
  }>;
};

export type AddAlbumMutationVariables = Exact<{
  input: AlbumInput;
}>;

export type AddAlbumMutation = {
  __typename?: 'Mutation';
  addAlbum: {
    __typename?: 'Album';
    id: string;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    musicbrainzId?: string | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  };
};

export type GetAlbumDetailsAdminQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type GetAlbumDetailsAdminQuery = {
  __typename?: 'Query';
  album?: {
    __typename?: 'Album';
    id: string;
    musicbrainzId?: string | null;
    discogsId?: string | null;
    title: string;
    releaseDate?: Date | null;
    releaseType?: string | null;
    genres?: Array<string> | null;
    trackCount?: number | null;
    durationMs?: number | null;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    barcode?: string | null;
    label?: string | null;
    catalogNumber?: string | null;
    createdAt: Date;
    updatedAt: Date;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
    needsEnrichment: boolean;
    duration?: string | null;
    averageRating?: number | null;
    inCollectionsCount: number;
    recommendationScore?: number | null;
    latestLlamaLog?: {
      __typename?: 'LlamaLog';
      id: string;
      status: LlamaLogStatus;
      sources: Array<string>;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      createdAt: Date;
    } | null;
    llamaLogs: Array<{
      __typename?: 'LlamaLog';
      id: string;
      operation: string;
      sources: Array<string>;
      status: LlamaLogStatus;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      durationMs?: number | null;
      createdAt: Date;
    }>;
    artists: Array<{
      __typename?: 'ArtistCredit';
      role: string;
      position: number;
      artist: {
        __typename?: 'Artist';
        id: string;
        name: string;
        musicbrainzId?: string | null;
        imageUrl?: string | null;
      };
    }>;
    tracks: Array<{
      __typename?: 'Track';
      id: string;
      musicbrainzId?: string | null;
      isrc?: string | null;
      title: string;
      trackNumber: number;
      discNumber: number;
      durationMs?: number | null;
      explicit: boolean;
      previewUrl?: string | null;
      createdAt: Date;
      updatedAt: Date;
      duration?: string | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    }>;
  } | null;
};

export type AlbumByMusicBrainzIdQueryVariables = Exact<{
  musicbrainzId: Scalars['String']['input'];
}>;

export type AlbumByMusicBrainzIdQuery = {
  __typename?: 'Query';
  albumByMusicBrainzId?: {
    __typename?: 'Album';
    id: string;
    musicbrainzId?: string | null;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
    needsEnrichment: boolean;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  } | null;
};

export type MyArchiveStatsQueryVariables = Exact<{ [key: string]: never }>;

export type MyArchiveStatsQuery = {
  __typename?: 'Query';
  myArchiveStats?: {
    __typename?: 'UncoverArchiveStats';
    id: string;
    gamesPlayed: number;
    gamesWon: number;
    totalAttempts: number;
    winDistribution: Array<number>;
    winRate: number;
  } | null;
};

export type MyUncoverSessionsQueryVariables = Exact<{
  fromDate?: InputMaybe<Scalars['DateTime']['input']>;
  toDate?: InputMaybe<Scalars['DateTime']['input']>;
}>;

export type MyUncoverSessionsQuery = {
  __typename?: 'Query';
  myUncoverSessions: Array<{
    __typename?: 'UncoverSessionHistory';
    id: string;
    challengeDate: Date;
    won: boolean;
    attemptCount: number;
    completedAt?: Date | null;
  }>;
};

export type StartArchiveSessionMutationVariables = Exact<{
  date: Scalars['DateTime']['input'];
}>;

export type StartArchiveSessionMutation = {
  __typename?: 'Mutation';
  startArchiveSession: {
    __typename?: 'StartSessionResult';
    challengeId: string;
    imageUrl: string;
    cloudflareImageId?: string | null;
    session: {
      __typename?: 'UncoverSessionInfo';
      id: string;
      status: UncoverSessionStatus;
      attemptCount: number;
      won: boolean;
      startedAt: Date;
      completedAt?: Date | null;
      guesses: Array<{
        __typename?: 'UncoverGuessInfo';
        id: string;
        guessNumber: number;
        isSkipped: boolean;
        isCorrect: boolean;
        guessedAt: Date;
        guessedAlbum?: {
          __typename?: 'UncoverGuessAlbumInfo';
          id: string;
          title: string;
          cloudflareImageId?: string | null;
          artistName: string;
        } | null;
      }>;
    };
  };
};

export type GetArtistByMusicBrainzIdQueryVariables = Exact<{
  musicbrainzId: Scalars['UUID']['input'];
}>;

export type GetArtistByMusicBrainzIdQuery = {
  __typename?: 'Query';
  artistByMusicBrainzId?: {
    __typename?: 'Artist';
    id: string;
    musicbrainzId?: string | null;
    name: string;
    imageUrl?: string | null;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
    needsEnrichment: boolean;
  } | null;
};

export type SearchArtistCorrectionCandidatesQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  source?: InputMaybe<CorrectionSource>;
}>;

export type SearchArtistCorrectionCandidatesQuery = {
  __typename?: 'Query';
  artistCorrectionSearch: {
    __typename?: 'ArtistCorrectionSearchResponse';
    hasMore: boolean;
    query: string;
    results: Array<{
      __typename?: 'ArtistCorrectionSearchResult';
      artistMbid: string;
      name: string;
      sortName: string;
      disambiguation?: string | null;
      type?: string | null;
      country?: string | null;
      area?: string | null;
      beginDate?: string | null;
      endDate?: string | null;
      ended?: boolean | null;
      gender?: string | null;
      mbScore: number;
      source?: string | null;
      topReleases?: Array<{
        __typename?: 'ArtistTopRelease';
        title: string;
        year?: string | null;
        type?: string | null;
      }> | null;
    }>;
  };
};

export type GetArtistCorrectionPreviewQueryVariables = Exact<{
  artistId: Scalars['UUID']['input'];
  sourceArtistId: Scalars['String']['input'];
  source?: InputMaybe<CorrectionSource>;
}>;

export type GetArtistCorrectionPreviewQuery = {
  __typename?: 'Query';
  artistCorrectionPreview: {
    __typename?: 'ArtistCorrectionPreview';
    mbArtistData?: any | null;
    albumCount: number;
    source: CorrectionSource;
    currentArtist: {
      __typename?: 'Artist';
      id: string;
      name: string;
      musicbrainzId?: string | null;
      discogsId?: string | null;
      countryCode?: string | null;
      formedYear?: number | null;
      biography?: string | null;
      dataQuality?: DataQuality | null;
      updatedAt: Date;
    };
    fieldDiffs: Array<{
      __typename?: 'ArtistFieldDiff';
      field: string;
      changeType: ChangeType;
      current?: string | null;
      source?: string | null;
    }>;
    summary: {
      __typename?: 'ArtistPreviewSummary';
      totalFields: number;
      changedFields: number;
      addedFields: number;
      modifiedFields: number;
    };
  };
};

export type ApplyArtistCorrectionMutationVariables = Exact<{
  input: ArtistCorrectionApplyInput;
}>;

export type ApplyArtistCorrectionMutation = {
  __typename?: 'Mutation';
  artistCorrectionApply: {
    __typename?: 'ArtistCorrectionApplyResult';
    success: boolean;
    affectedAlbumCount?: number | null;
    code?: ApplyErrorCode | null;
    message?: string | null;
    artist?: {
      __typename?: 'Artist';
      id: string;
      name: string;
      musicbrainzId?: string | null;
      discogsId?: string | null;
      countryCode?: string | null;
      formedYear?: number | null;
      dataQuality?: DataQuality | null;
      enrichmentStatus?: EnrichmentStatus | null;
      updatedAt: Date;
    } | null;
    changes?: {
      __typename?: 'ArtistAppliedChanges';
      metadata: Array<string>;
      externalIds: Array<string>;
      affectedAlbumCount: number;
      dataQualityBefore: DataQuality;
      dataQualityAfter: DataQuality;
    } | null;
  };
};

export type GetArtistDiscographyQueryVariables = Exact<{
  id: Scalars['String']['input'];
  source: DataSource;
}>;

export type GetArtistDiscographyQuery = {
  __typename?: 'Query';
  artistDiscography: {
    __typename?: 'CategorizedDiscography';
    albums: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    eps: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    singles: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    compilations: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    liveAlbums: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    remixes: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    soundtracks: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    other: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
  };
};

export type GetArtistRecommendationsQueryVariables = Exact<{
  artistId: Scalars['ID']['input'];
  filter?: InputMaybe<AlbumRole>;
  sort?: InputMaybe<ArtistRecommendationSort>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetArtistRecommendationsQuery = {
  __typename?: 'Query';
  artistRecommendations: {
    __typename?: 'ArtistRecommendationsConnection';
    totalCount: number;
    hasMore: boolean;
    recommendations: Array<{
      __typename?: 'ArtistRecommendation';
      id: string;
      score: number;
      description?: string | null;
      createdAt: Date;
      albumRole: AlbumRole;
      isOwnRecommendation: boolean;
      basisAlbum: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        releaseDate?: Date | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
      recommendedAlbum: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        releaseDate?: Date | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
      user: {
        __typename?: 'User';
        id: string;
        username?: string | null;
        image?: string | null;
      };
    }>;
  };
};

export type AddArtistMutationVariables = Exact<{
  input: ArtistInput;
}>;

export type AddArtistMutation = {
  __typename?: 'Mutation';
  addArtist: {
    __typename?: 'Artist';
    id: string;
    name: string;
    musicbrainzId?: string | null;
    imageUrl?: string | null;
    countryCode?: string | null;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
  };
};

export type DeleteArtistMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type DeleteArtistMutation = {
  __typename?: 'Mutation';
  deleteArtist: {
    __typename?: 'DeleteArtistPayload';
    success: boolean;
    message?: string | null;
    deletedId?: string | null;
  };
};

export type AddAlbumToCollectionWithCreateMutationVariables = Exact<{
  input: AddAlbumToCollectionWithCreateInput;
}>;

export type AddAlbumToCollectionWithCreateMutation = {
  __typename?: 'Mutation';
  addAlbumToCollectionWithCreate: {
    __typename?: 'AddAlbumToCollectionPayload';
    id: string;
  };
};

export type GetCorrectionPreviewQueryVariables = Exact<{
  input: CorrectionPreviewInput;
}>;

export type GetCorrectionPreviewQuery = {
  __typename?: 'Query';
  correctionPreview: {
    __typename?: 'CorrectionPreview';
    albumId: string;
    albumTitle: string;
    albumUpdatedAt: Date;
    fieldDiffs: any;
    sourceResult: {
      __typename?: 'ScoredSearchResult';
      releaseGroupMbid: string;
      title: string;
      disambiguation?: string | null;
      primaryArtistName: string;
      firstReleaseDate?: string | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      mbScore: number;
      coverArtUrl?: string | null;
      source: string;
      normalizedScore: number;
      displayScore: number;
      isLowConfidence: boolean;
      artistCredits: Array<{
        __typename?: 'CorrectionArtistCredit';
        mbid: string;
        name: string;
      }>;
      breakdown: {
        __typename?: 'ScoreBreakdown';
        titleScore: number;
        artistScore: number;
        yearScore: number;
        mbScore?: number | null;
        confidenceTier?: ConfidenceTier | null;
      };
    };
    mbReleaseData?: {
      __typename?: 'MBReleaseData';
      id: string;
      title: string;
      date?: string | null;
      country?: string | null;
      barcode?: string | null;
      media: Array<{
        __typename?: 'MBMedium';
        position: number;
        format?: string | null;
        trackCount: number;
        tracks: Array<{
          __typename?: 'MBMediumTrack';
          position: number;
          recording: {
            __typename?: 'MBRecording';
            id: string;
            title: string;
            length?: number | null;
            position: number;
          };
        }>;
      }>;
      artistCredit: Array<{
        __typename?: 'MBArtistCredit';
        name: string;
        joinphrase?: string | null;
        artist: {
          __typename?: 'MBArtist';
          id: string;
          name: string;
          sortName?: string | null;
          disambiguation?: string | null;
        };
      }>;
    } | null;
    artistDiff: {
      __typename?: 'ArtistCreditDiff';
      changeType: ChangeType;
      currentDisplay: string;
      sourceDisplay: string;
      current: Array<{
        __typename?: 'CorrectionArtistCredit';
        mbid: string;
        name: string;
      }>;
      source: Array<{
        __typename?: 'CorrectionArtistCredit';
        mbid: string;
        name: string;
      }>;
      nameDiff?: Array<{
        __typename?: 'TextDiffPart';
        value: string;
        added?: boolean | null;
        removed?: boolean | null;
      }> | null;
    };
    trackDiffs: Array<{
      __typename?: 'TrackDiff';
      position: number;
      discNumber: number;
      changeType: string;
      durationDelta?: number | null;
      trackId?: string | null;
      current?: {
        __typename?: 'TrackData';
        title: string;
        durationMs?: number | null;
        trackNumber: number;
      } | null;
      source?: {
        __typename?: 'TrackSourceData';
        title: string;
        durationMs?: number | null;
        mbid?: string | null;
      } | null;
      titleDiff?: Array<{
        __typename?: 'TextDiffPart';
        value: string;
        added?: boolean | null;
        removed?: boolean | null;
      }> | null;
    }>;
    trackSummary: {
      __typename?: 'TrackListSummary';
      totalCurrent: number;
      totalSource: number;
      matching: number;
      modified: number;
      added: number;
      removed: number;
    };
    coverArt: {
      __typename?: 'CoverArtDiff';
      changeType: ChangeType;
      currentUrl?: string | null;
      sourceUrl?: string | null;
    };
    summary: {
      __typename?: 'PreviewSummary';
      totalFields: number;
      changedFields: number;
      addedFields: number;
      modifiedFields: number;
      conflictFields: number;
      hasTrackChanges: boolean;
    };
  };
};

export type SearchCorrectionCandidatesQueryVariables = Exact<{
  input: CorrectionSearchInput;
}>;

export type SearchCorrectionCandidatesQuery = {
  __typename?: 'Query';
  correctionSearch: {
    __typename?: 'CorrectionSearchResponse';
    totalGroups: number;
    hasMore: boolean;
    results: Array<{
      __typename?: 'GroupedSearchResult';
      releaseGroupMbid: string;
      versionCount: number;
      bestScore: number;
      primaryResult: {
        __typename?: 'ScoredSearchResult';
        releaseGroupMbid: string;
        title: string;
        disambiguation?: string | null;
        primaryArtistName: string;
        firstReleaseDate?: string | null;
        primaryType?: string | null;
        secondaryTypes?: Array<string> | null;
        mbScore: number;
        coverArtUrl?: string | null;
        source: string;
        normalizedScore: number;
        displayScore: number;
        isLowConfidence: boolean;
        artistCredits: Array<{
          __typename?: 'CorrectionArtistCredit';
          mbid: string;
          name: string;
        }>;
        breakdown: {
          __typename?: 'ScoreBreakdown';
          titleScore: number;
          artistScore: number;
          yearScore: number;
          mbScore?: number | null;
          confidenceTier?: ConfidenceTier | null;
        };
      };
      alternateVersions: Array<{
        __typename?: 'ScoredSearchResult';
        releaseGroupMbid: string;
        title: string;
        disambiguation?: string | null;
        primaryArtistName: string;
        firstReleaseDate?: string | null;
        primaryType?: string | null;
        secondaryTypes?: Array<string> | null;
        mbScore: number;
        coverArtUrl?: string | null;
        source: string;
        normalizedScore: number;
        displayScore: number;
        isLowConfidence: boolean;
        artistCredits: Array<{
          __typename?: 'CorrectionArtistCredit';
          mbid: string;
          name: string;
        }>;
        breakdown: {
          __typename?: 'ScoreBreakdown';
          titleScore: number;
          artistScore: number;
          yearScore: number;
          mbScore?: number | null;
          confidenceTier?: ConfidenceTier | null;
        };
      }>;
    }>;
    query: {
      __typename?: 'CorrectionSearchQuery';
      albumTitle?: string | null;
      artistName?: string | null;
      yearFilter?: number | null;
    };
    scoring: {
      __typename?: 'CorrectionScoringInfo';
      strategy: ScoringStrategy;
      threshold: number;
      lowConfidenceCount: number;
    };
  };
};

export type DailyChallengeQueryVariables = Exact<{
  date?: InputMaybe<Scalars['DateTime']['input']>;
}>;

export type DailyChallengeQuery = {
  __typename?: 'Query';
  dailyChallenge: {
    __typename?: 'DailyChallengeInfo';
    id: string;
    date: Date;
    maxAttempts: number;
    totalPlays: number;
    totalWins: number;
    avgAttempts?: number | null;
    imageUrl?: string | null;
    cloudflareImageId?: string | null;
    mySession?: {
      __typename?: 'UncoverSessionInfo';
      id: string;
      status: UncoverSessionStatus;
      attemptCount: number;
      won: boolean;
      startedAt: Date;
      completedAt?: Date | null;
    } | null;
  };
};

export type CuratedChallengesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type CuratedChallengesQuery = {
  __typename?: 'Query';
  curatedChallenges: Array<{
    __typename?: 'CuratedChallengeEntry';
    id: string;
    sequence: number;
    pinnedDate?: Date | null;
    createdAt: Date;
    album: {
      __typename?: 'Album';
      id: string;
      title: string;
      cloudflareImageId?: string | null;
      releaseDate?: Date | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    };
  }>;
};

export type CuratedChallengeCountQueryVariables = Exact<{
  [key: string]: never;
}>;

export type CuratedChallengeCountQuery = {
  __typename?: 'Query';
  curatedChallengeCount: number;
};

export type UpcomingChallengesQueryVariables = Exact<{
  days: Scalars['Int']['input'];
}>;

export type UpcomingChallengesQuery = {
  __typename?: 'Query';
  upcomingChallenges: Array<{
    __typename?: 'UpcomingChallenge';
    date: Date;
    daysSinceEpoch: number;
    sequence: number;
    isPinned: boolean;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      cloudflareImageId?: string | null;
      releaseDate?: Date | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    } | null;
  }>;
};

export type AddCuratedChallengeMutationVariables = Exact<{
  albumId: Scalars['UUID']['input'];
  pinnedDate?: InputMaybe<Scalars['DateTime']['input']>;
}>;

export type AddCuratedChallengeMutation = {
  __typename?: 'Mutation';
  addCuratedChallenge: {
    __typename?: 'CuratedChallengeEntry';
    id: string;
    sequence: number;
    pinnedDate?: Date | null;
    album: { __typename?: 'Album'; id: string; title: string };
  };
};

export type RemoveCuratedChallengeMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type RemoveCuratedChallengeMutation = {
  __typename?: 'Mutation';
  removeCuratedChallenge: boolean;
};

export type PinCuratedChallengeMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  date: Scalars['DateTime']['input'];
}>;

export type PinCuratedChallengeMutation = {
  __typename?: 'Mutation';
  pinCuratedChallenge: {
    __typename?: 'CuratedChallengeEntry';
    id: string;
    sequence: number;
    pinnedDate?: Date | null;
    album: { __typename?: 'Album'; id: string; title: string };
  };
};

export type UnpinCuratedChallengeMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type UnpinCuratedChallengeMutation = {
  __typename?: 'Mutation';
  unpinCuratedChallenge: {
    __typename?: 'CuratedChallengeEntry';
    id: string;
    sequence: number;
    pinnedDate?: Date | null;
    album: { __typename?: 'Album'; id: string; title: string };
  };
};

export type GetLlamaLogsQueryVariables = Exact<{
  entityType?: InputMaybe<EnrichmentEntityType>;
  entityId?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<LlamaLogStatus>;
  category?: InputMaybe<Array<LlamaLogCategory> | LlamaLogCategory>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  parentOnly?: InputMaybe<Scalars['Boolean']['input']>;
  parentJobId?: InputMaybe<Scalars['String']['input']>;
  includeChildren?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type GetLlamaLogsQuery = {
  __typename?: 'Query';
  llamaLogs: Array<{
    __typename?: 'LlamaLog';
    id: string;
    entityType?: EnrichmentEntityType | null;
    entityId?: string | null;
    operation: string;
    sources: Array<string>;
    status: LlamaLogStatus;
    category: LlamaLogCategory;
    reason?: string | null;
    fieldsEnriched: Array<string>;
    dataQualityBefore?: DataQuality | null;
    dataQualityAfter?: DataQuality | null;
    errorMessage?: string | null;
    errorCode?: string | null;
    durationMs?: number | null;
    apiCallCount: number;
    metadata?: any | null;
    createdAt: Date;
    jobId?: string | null;
    parentJobId?: string | null;
  }>;
};

export type GetLlamaLogsWithChildrenQueryVariables = Exact<{
  entityType?: InputMaybe<EnrichmentEntityType>;
  entityId?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<LlamaLogStatus>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetLlamaLogsWithChildrenQuery = {
  __typename?: 'Query';
  llamaLogs: Array<{
    __typename?: 'LlamaLog';
    id: string;
    entityType?: EnrichmentEntityType | null;
    entityId?: string | null;
    operation: string;
    sources: Array<string>;
    status: LlamaLogStatus;
    category: LlamaLogCategory;
    reason?: string | null;
    fieldsEnriched: Array<string>;
    dataQualityBefore?: DataQuality | null;
    dataQualityAfter?: DataQuality | null;
    errorMessage?: string | null;
    errorCode?: string | null;
    durationMs?: number | null;
    apiCallCount: number;
    metadata?: any | null;
    createdAt: Date;
    jobId?: string | null;
    parentJobId?: string | null;
    children?: Array<{
      __typename?: 'LlamaLog';
      id: string;
      entityType?: EnrichmentEntityType | null;
      entityId?: string | null;
      operation: string;
      sources: Array<string>;
      status: LlamaLogStatus;
      category: LlamaLogCategory;
      reason?: string | null;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      errorCode?: string | null;
      durationMs?: number | null;
      apiCallCount: number;
      createdAt: Date;
      jobId?: string | null;
      parentJobId?: string | null;
    }> | null;
  }>;
};

export type GetEnrichmentStatsQueryVariables = Exact<{
  entityType?: InputMaybe<EnrichmentEntityType>;
  timeRange?: InputMaybe<TimeRangeInput>;
}>;

export type GetEnrichmentStatsQuery = {
  __typename?: 'Query';
  enrichmentStats: {
    __typename?: 'EnrichmentStats';
    totalAttempts: number;
    successCount: number;
    failedCount: number;
    noDataCount: number;
    skippedCount: number;
    averageDurationMs: number;
    sourceStats: Array<{
      __typename?: 'SourceStat';
      source: string;
      attempts: number;
      successRate: number;
    }>;
  };
};

export type TriggerAlbumEnrichmentMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  priority?: InputMaybe<EnrichmentPriority>;
  force?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type TriggerAlbumEnrichmentMutation = {
  __typename?: 'Mutation';
  triggerAlbumEnrichment: {
    __typename?: 'EnrichmentResult';
    success: boolean;
    jobId?: string | null;
    message: string;
  };
};

export type TriggerArtistEnrichmentMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  priority?: InputMaybe<EnrichmentPriority>;
  force?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type TriggerArtistEnrichmentMutation = {
  __typename?: 'Mutation';
  triggerArtistEnrichment: {
    __typename?: 'EnrichmentResult';
    success: boolean;
    jobId?: string | null;
    message: string;
  };
};

export type BatchEnrichmentMutationVariables = Exact<{
  ids: Array<Scalars['UUID']['input']> | Scalars['UUID']['input'];
  type: EnrichmentType;
  priority?: InputMaybe<EnrichmentPriority>;
}>;

export type BatchEnrichmentMutation = {
  __typename?: 'Mutation';
  batchEnrichment: {
    __typename?: 'BatchEnrichmentResult';
    success: boolean;
    jobsQueued: number;
    message: string;
  };
};

export type PreviewAlbumEnrichmentMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type PreviewAlbumEnrichmentMutation = {
  __typename?: 'Mutation';
  previewAlbumEnrichment: {
    __typename?: 'PreviewEnrichmentResult';
    success: boolean;
    message?: string | null;
    matchScore?: number | null;
    matchedEntity?: string | null;
    sources: Array<string>;
    llamaLogId: string;
    rawData?: any | null;
    fieldsToUpdate: Array<{
      __typename?: 'EnrichmentFieldDiff';
      field: string;
      currentValue?: string | null;
      newValue?: string | null;
      source: string;
    }>;
  };
};

export type PreviewArtistEnrichmentMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type PreviewArtistEnrichmentMutation = {
  __typename?: 'Mutation';
  previewArtistEnrichment: {
    __typename?: 'PreviewEnrichmentResult';
    success: boolean;
    message?: string | null;
    matchScore?: number | null;
    matchedEntity?: string | null;
    sources: Array<string>;
    llamaLogId: string;
    rawData?: any | null;
    fieldsToUpdate: Array<{
      __typename?: 'EnrichmentFieldDiff';
      field: string;
      currentValue?: string | null;
      newValue?: string | null;
      source: string;
    }>;
  };
};

export type GamePoolStatsQueryVariables = Exact<{ [key: string]: never }>;

export type GamePoolStatsQuery = {
  __typename?: 'Query';
  gamePoolStats: {
    __typename?: 'GamePoolStats';
    eligibleCount: number;
    excludedCount: number;
    neutralCount: number;
    totalWithCoverArt: number;
  };
};

export type AlbumsByGameStatusQueryVariables = Exact<{
  status: AlbumGameStatus;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;

export type AlbumsByGameStatusQuery = {
  __typename?: 'Query';
  albumsByGameStatus: Array<{
    __typename?: 'Album';
    id: string;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    gameStatus: AlbumGameStatus;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type SuggestedGameAlbumsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  syncSource?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;

export type SuggestedGameAlbumsQuery = {
  __typename?: 'Query';
  suggestedGameAlbums: Array<{
    __typename?: 'Album';
    id: string;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    gameStatus: AlbumGameStatus;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type UpdateAlbumGameStatusMutationVariables = Exact<{
  input: UpdateAlbumGameStatusInput;
}>;

export type UpdateAlbumGameStatusMutation = {
  __typename?: 'Mutation';
  updateAlbumGameStatus: {
    __typename?: 'UpdateAlbumGameStatusResult';
    success: boolean;
    error?: string | null;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      gameStatus: AlbumGameStatus;
    } | null;
  };
};

export type GetAlbumRecommendationsQueryVariables = Exact<{
  albumId: Scalars['UUID']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetAlbumRecommendationsQuery = {
  __typename?: 'Query';
  getAlbumRecommendations: {
    __typename?: 'AlbumRecommendationsResponse';
    recommendations: Array<{
      __typename?: 'AlbumRecommendation';
      id: string;
      score: number;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
      albumRole: string;
      otherAlbum: {
        __typename?: 'OtherAlbumInfo';
        id: string;
        title: string;
        artist: string;
        imageUrl?: string | null;
        cloudflareImageId?: string | null;
        year?: string | null;
      };
      user: {
        __typename?: 'User';
        id: string;
        username?: string | null;
        image?: string | null;
      };
    }>;
    pagination: {
      __typename?: 'PaginationInfo';
      page: number;
      perPage: number;
      total: number;
      hasMore: boolean;
    };
  };
};

export type GetArtistDetailsQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type GetArtistDetailsQuery = {
  __typename?: 'Query';
  artist?: {
    __typename?: 'Artist';
    id: string;
    musicbrainzId?: string | null;
    discogsId?: string | null;
    name: string;
    biography?: string | null;
    formedYear?: number | null;
    countryCode?: string | null;
    imageUrl?: string | null;
    cloudflareImageId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
    albumCount: number;
    trackCount: number;
    popularity?: number | null;
    needsEnrichment: boolean;
    listeners?: number | null;
    latestLlamaLog?: {
      __typename?: 'LlamaLog';
      id: string;
      status: LlamaLogStatus;
      sources: Array<string>;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      createdAt: Date;
    } | null;
    llamaLogs: Array<{
      __typename?: 'LlamaLog';
      id: string;
      operation: string;
      sources: Array<string>;
      status: LlamaLogStatus;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      durationMs?: number | null;
      createdAt: Date;
    }>;
    albums: Array<{
      __typename?: 'Album';
      id: string;
      title: string;
      releaseDate?: Date | null;
      releaseType?: string | null;
      coverArtUrl?: string | null;
      trackCount?: number | null;
      duration?: string | null;
      averageRating?: number | null;
    }>;
    tracks: Array<{
      __typename?: 'Track';
      id: string;
      title: string;
      trackNumber: number;
      duration?: string | null;
      explicit: boolean;
      album?: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
      } | null;
    }>;
  } | null;
};

export type GetCollectionQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;

export type GetCollectionQuery = {
  __typename?: 'Query';
  collection?: {
    __typename?: 'Collection';
    id: string;
    name: string;
    description?: string | null;
    isPublic: boolean;
    albums: Array<{
      __typename?: 'CollectionAlbum';
      id: string;
      personalRating?: number | null;
      personalNotes?: string | null;
      position: number;
      addedAt: Date;
      album: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
        releaseDate?: Date | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
    }>;
  } | null;
};

export type GetMyCollectionAlbumsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetMyCollectionAlbumsQuery = {
  __typename?: 'Query';
  myCollectionAlbums: Array<{
    __typename?: 'CollectionAlbum';
    id: string;
    position: number;
    personalRating?: number | null;
    personalNotes?: string | null;
    addedAt: Date;
    album: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      releaseDate?: Date | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    };
    collection: { __typename?: 'Collection'; id: string; name: string };
  }>;
};

export type GetMyCollectionsQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyCollectionsQuery = {
  __typename?: 'Query';
  myCollections: Array<{
    __typename?: 'Collection';
    id: string;
    name: string;
    albumCount: number;
    albums: Array<{
      __typename?: 'CollectionAlbum';
      id: string;
      album: {
        __typename?: 'Album';
        id: string;
        title: string;
        releaseDate?: Date | null;
        coverArtUrl?: string | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
    }>;
  }>;
};

export type GetUserCollectionListQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type GetUserCollectionListQuery = {
  __typename?: 'Query';
  user?: {
    __typename?: 'User';
    id: string;
    collections: Array<{
      __typename?: 'Collection';
      id: string;
      name: string;
      description?: string | null;
      isPublic: boolean;
      updatedAt: Date;
      albumCount: number;
    }>;
  } | null;
};

export type GetUserCollectionsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type GetUserCollectionsQuery = {
  __typename?: 'Query';
  user?: {
    __typename?: 'User';
    id: string;
    collections: Array<{
      __typename?: 'Collection';
      id: string;
      name: string;
      description?: string | null;
      isPublic: boolean;
      albums: Array<{
        __typename?: 'CollectionAlbum';
        id: string;
        personalRating?: number | null;
        personalNotes?: string | null;
        position: number;
        addedAt: Date;
        album: {
          __typename?: 'Album';
          id: string;
          title: string;
          coverArtUrl?: string | null;
          cloudflareImageId?: string | null;
          releaseDate?: Date | null;
          artists: Array<{
            __typename?: 'ArtistCredit';
            artist: { __typename?: 'Artist'; id: string; name: string };
          }>;
        };
      }>;
    }>;
  } | null;
};

export type GetUserProfileQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type GetUserProfileQuery = {
  __typename?: 'Query';
  user?: {
    __typename?: 'User';
    id: string;
    username?: string | null;
    email?: string | null;
    image?: string | null;
    bio?: string | null;
    role: UserRole;
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
    isFollowing?: boolean | null;
    settings?: {
      __typename?: 'UserSettings';
      profileVisibility: string;
    } | null;
  } | null;
};

export type ImportDeezerPlaylistMutationVariables = Exact<{
  playlistId: Scalars['String']['input'];
}>;

export type ImportDeezerPlaylistMutation = {
  __typename?: 'Mutation';
  importDeezerPlaylist: {
    __typename?: 'DeezerPlaylistImportResult';
    success: boolean;
    message?: string | null;
    jobId?: string | null;
    playlistName?: string | null;
  };
};

export type AlbumsByJobIdQueryVariables = Exact<{
  jobId: Scalars['String']['input'];
}>;

export type AlbumsByJobIdQuery = {
  __typename?: 'Query';
  albumsByJobId: Array<{
    __typename?: 'Album';
    id: string;
    title: string;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    releaseDate?: Date | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type GetLatestReleasesQueryVariables = Exact<{
  source?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetLatestReleasesQuery = {
  __typename?: 'Query';
  searchAlbums: Array<{
    __typename?: 'Album';
    id: string;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    createdAt: Date;
    artists: Array<{
      __typename?: 'ArtistCredit';
      position: number;
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type GetLlamaLogChainQueryVariables = Exact<{
  entityType: EnrichmentEntityType;
  entityId: Scalars['UUID']['input'];
  categories?: InputMaybe<Array<LlamaLogCategory> | LlamaLogCategory>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;

export type GetLlamaLogChainQuery = {
  __typename?: 'Query';
  llamaLogChain: {
    __typename?: 'LlamaLogChainResponse';
    totalCount: number;
    cursor?: string | null;
    hasMore: boolean;
    logs: Array<{
      __typename?: 'LlamaLog';
      id: string;
      entityType?: EnrichmentEntityType | null;
      entityId?: string | null;
      operation: string;
      sources: Array<string>;
      status: LlamaLogStatus;
      category: LlamaLogCategory;
      reason?: string | null;
      fieldsEnriched: Array<string>;
      dataQualityBefore?: DataQuality | null;
      dataQualityAfter?: DataQuality | null;
      errorMessage?: string | null;
      errorCode?: string | null;
      durationMs?: number | null;
      apiCallCount: number;
      metadata?: any | null;
      createdAt: Date;
      jobId?: string | null;
      parentJobId?: string | null;
      rootJobId?: string | null;
    }>;
  };
};

export type GetMySettingsQueryVariables = Exact<{ [key: string]: never }>;

export type GetMySettingsQuery = {
  __typename?: 'Query';
  mySettings?: {
    __typename?: 'UserSettings';
    id: string;
    userId: string;
    theme: string;
    language: string;
    profileVisibility: string;
    showRecentActivity: boolean;
    showCollections: boolean;
    showListenLaterInFeed: boolean;
    showCollectionAddsInFeed: boolean;
    showOnboardingTour: boolean;
    emailNotifications: boolean;
    recommendationAlerts: boolean;
    followAlerts: boolean;
    defaultCollectionView: string;
    autoplayPreviews: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export type PreviewDeezerPlaylistQueryVariables = Exact<{
  playlistId: Scalars['String']['input'];
}>;

export type PreviewDeezerPlaylistQuery = {
  __typename?: 'Query';
  previewDeezerPlaylist: {
    __typename?: 'DeezerPlaylistPreview';
    playlistId: string;
    name: string;
    description?: string | null;
    creator: string;
    image?: string | null;
    trackCount: number;
    deezerUrl: string;
    albums: Array<{
      __typename?: 'DeezerPreviewAlbum';
      deezerId: string;
      title: string;
      artist: string;
      year?: string | null;
      coverUrl?: string | null;
      totalTracks: number;
      albumType: string;
    }>;
    stats: {
      __typename?: 'PlaylistPreviewStats';
      totalTracks: number;
      uniqueAlbums: number;
      albumsAfterFilter: number;
      singlesFiltered: number;
      compilationsFiltered: number;
    };
  };
};

export type RecommendationFieldsFragment = {
  __typename?: 'Recommendation';
  id: string;
  score: number;
  createdAt: Date;
  user: {
    __typename?: 'User';
    id: string;
    username?: string | null;
    image?: string | null;
  };
  basisAlbum: {
    __typename?: 'Album';
    id: string;
    title: string;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  };
  recommendedAlbum: {
    __typename?: 'Album';
    id: string;
    title: string;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  };
};

export type GetRecommendationFeedQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetRecommendationFeedQuery = {
  __typename?: 'Query';
  recommendationFeed: {
    __typename?: 'RecommendationFeed';
    cursor?: string | null;
    hasMore: boolean;
    recommendations: Array<{
      __typename?: 'Recommendation';
      id: string;
      score: number;
      createdAt: Date;
      user: {
        __typename?: 'User';
        id: string;
        username?: string | null;
        image?: string | null;
      };
      basisAlbum: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
      recommendedAlbum: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
    }>;
  };
};

export type GetMyRecommendationsQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<RecommendationSort>;
}>;

export type GetMyRecommendationsQuery = {
  __typename?: 'Query';
  myRecommendations: {
    __typename?: 'RecommendationFeed';
    cursor?: string | null;
    hasMore: boolean;
    recommendations: Array<{
      __typename?: 'Recommendation';
      id: string;
      score: number;
      createdAt: Date;
      user: {
        __typename?: 'User';
        id: string;
        username?: string | null;
        image?: string | null;
      };
      basisAlbum: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
      recommendedAlbum: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      };
    }>;
  };
};

export type CreateRecommendationMutationVariables = Exact<{
  basisAlbumId: Scalars['UUID']['input'];
  recommendedAlbumId: Scalars['UUID']['input'];
  score: Scalars['Int']['input'];
}>;

export type CreateRecommendationMutation = {
  __typename?: 'Mutation';
  createRecommendation: {
    __typename?: 'CreateRecommendationPayload';
    id: string;
  };
};

export type CreateRecommendationWithAlbumsMutationVariables = Exact<{
  input: CreateRecommendationWithAlbumsInput;
}>;

export type CreateRecommendationWithAlbumsMutation = {
  __typename?: 'Mutation';
  createRecommendation: {
    __typename?: 'CreateRecommendationPayload';
    id: string;
  };
};

export type UpdateRecommendationMutationVariables = Exact<{
  id: Scalars['String']['input'];
  score: Scalars['Int']['input'];
}>;

export type UpdateRecommendationMutation = {
  __typename?: 'Mutation';
  updateRecommendation: {
    __typename?: 'UpdateRecommendationPayload';
    id: string;
  };
};

export type DeleteRecommendationMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;

export type DeleteRecommendationMutation = {
  __typename?: 'Mutation';
  deleteRecommendation: boolean;
};

export type GetRecommendationQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;

export type GetRecommendationQuery = {
  __typename?: 'Query';
  recommendation?: {
    __typename?: 'Recommendation';
    id: string;
    score: number;
    createdAt: Date;
    user: {
      __typename?: 'User';
      id: string;
      username?: string | null;
      image?: string | null;
    };
    basisAlbum: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    };
    recommendedAlbum: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    };
  } | null;
};

export type ResetAlbumEnrichmentMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type ResetAlbumEnrichmentMutation = {
  __typename?: 'Mutation';
  resetAlbumEnrichment: {
    __typename?: 'Album';
    id: string;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
  };
};

export type ResetArtistEnrichmentMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type ResetArtistEnrichmentMutation = {
  __typename?: 'Mutation';
  resetArtistEnrichment: {
    __typename?: 'Artist';
    id: string;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
  };
};

export type SearchQueryVariables = Exact<{
  input: SearchInput;
}>;

export type SearchQuery = {
  __typename?: 'Query';
  search: {
    __typename?: 'SearchResults';
    total: number;
    hasMore: boolean;
    currentCount: number;
    albums: Array<{
      __typename?: 'UnifiedRelease';
      id: string;
      source: DataSource;
      title: string;
      releaseDate?: Date | null;
      primaryType?: string | null;
      secondaryTypes?: Array<string> | null;
      imageUrl?: string | null;
      artistName?: string | null;
      trackCount?: number | null;
      year?: number | null;
      artistCredits?: Array<{
        __typename?: 'ArtistCredit';
        role: string;
        position: number;
        artist: { __typename?: 'Artist'; id: string; name: string };
      }> | null;
    }>;
    artists: Array<{
      __typename?: 'Artist';
      id: string;
      musicbrainzId?: string | null;
      name: string;
      imageUrl?: string | null;
      cloudflareImageId?: string | null;
    }>;
    tracks: Array<{
      __typename?: 'Track';
      id: string;
      albumId?: string | null;
      musicbrainzId?: string | null;
      title: string;
      durationMs?: number | null;
      trackNumber: number;
      searchCoverArtUrl?: string | null;
      searchArtistName?: string | null;
      album?: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
      } | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    }>;
    users: Array<{
      __typename?: 'User';
      id: string;
      username?: string | null;
      image?: string | null;
      bio?: string | null;
      followersCount: number;
      followingCount: number;
      recommendationsCount: number;
    }>;
  };
};

export type SearchAlbumsQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type SearchAlbumsQuery = {
  __typename?: 'Query';
  searchAlbums: Array<{
    __typename?: 'Album';
    id: string;
    musicbrainzId?: string | null;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type SearchArtistsQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type SearchArtistsQuery = {
  __typename?: 'Query';
  searchArtists: Array<{
    __typename?: 'Artist';
    id: string;
    musicbrainzId?: string | null;
    name: string;
    imageUrl?: string | null;
    cloudflareImageId?: string | null;
  }>;
};

export type SearchTracksQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type SearchTracksQuery = {
  __typename?: 'Query';
  searchTracks: Array<{
    __typename?: 'Track';
    id: string;
    albumId?: string | null;
    musicbrainzId?: string | null;
    title: string;
    durationMs?: number | null;
    trackNumber: number;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
    } | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type SearchAlbumsAdminQueryVariables = Exact<{
  query?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  dataQuality?: InputMaybe<Scalars['String']['input']>;
  enrichmentStatus?: InputMaybe<Scalars['String']['input']>;
  needsEnrichment?: InputMaybe<Scalars['Boolean']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type SearchAlbumsAdminQuery = {
  __typename?: 'Query';
  searchAlbums: Array<{
    __typename?: 'Album';
    id: string;
    musicbrainzId?: string | null;
    spotifyId?: string | null;
    title: string;
    releaseDate?: Date | null;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
    needsEnrichment: boolean;
    trackCount?: number | null;
    label?: string | null;
    barcode?: string | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      role: string;
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type SearchArtistsAdminQueryVariables = Exact<{
  query?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  dataQuality?: InputMaybe<Scalars['String']['input']>;
  enrichmentStatus?: InputMaybe<Scalars['String']['input']>;
  needsEnrichment?: InputMaybe<Scalars['Boolean']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type SearchArtistsAdminQuery = {
  __typename?: 'Query';
  searchArtists: Array<{
    __typename?: 'Artist';
    id: string;
    musicbrainzId?: string | null;
    spotifyId?: string | null;
    name: string;
    imageUrl?: string | null;
    cloudflareImageId?: string | null;
    dataQuality?: DataQuality | null;
    enrichmentStatus?: EnrichmentStatus | null;
    lastEnriched?: Date | null;
    needsEnrichment: boolean;
    albumCount: number;
    trackCount: number;
    formedYear?: number | null;
    countryCode?: string | null;
  }>;
};

export type SearchTracksAdminQueryVariables = Exact<{
  query: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type SearchTracksAdminQuery = {
  __typename?: 'Query';
  searchTracks: Array<{
    __typename?: 'Track';
    id: string;
    albumId?: string | null;
    musicbrainzId?: string | null;
    title: string;
    trackNumber: number;
    discNumber: number;
    durationMs?: number | null;
    isrc?: string | null;
    album?: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
    } | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      role: string;
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  }>;
};

export type GetDatabaseStatsQueryVariables = Exact<{ [key: string]: never }>;

export type GetDatabaseStatsQuery = {
  __typename?: 'Query';
  databaseStats: {
    __typename?: 'DatabaseStats';
    totalAlbums: number;
    totalArtists: number;
    totalTracks: number;
    albumsNeedingEnrichment: number;
    artistsNeedingEnrichment: number;
    recentlyEnriched: number;
    failedEnrichments: number;
    averageDataQuality: number;
  };
};

export type ActivityFieldsFragment = {
  __typename?: 'Activity';
  id: string;
  type: ActivityType;
  createdAt: Date;
  actor: {
    __typename?: 'User';
    id: string;
    username?: string | null;
    image?: string | null;
  };
  targetUser?: {
    __typename?: 'User';
    id: string;
    username?: string | null;
    image?: string | null;
  } | null;
  album?: {
    __typename?: 'Album';
    id: string;
    title: string;
    coverArtUrl?: string | null;
    cloudflareImageId?: string | null;
    artists: Array<{
      __typename?: 'ArtistCredit';
      artist: { __typename?: 'Artist'; id: string; name: string };
    }>;
  } | null;
  recommendation?: {
    __typename?: 'Recommendation';
    id: string;
    score: number;
  } | null;
  collection?: { __typename?: 'Collection'; id: string; name: string } | null;
  metadata?: {
    __typename?: 'ActivityMetadata';
    score?: number | null;
    collectionName?: string | null;
    personalRating?: number | null;
    position?: number | null;
    basisAlbum?: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    } | null;
  } | null;
};

export type GetSocialFeedQueryVariables = Exact<{
  type?: InputMaybe<ActivityType>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetSocialFeedQuery = {
  __typename?: 'Query';
  socialFeed: {
    __typename?: 'ActivityFeed';
    cursor?: string | null;
    hasMore: boolean;
    activities: Array<{
      __typename?: 'Activity';
      id: string;
      type: ActivityType;
      createdAt: Date;
      actor: {
        __typename?: 'User';
        id: string;
        username?: string | null;
        image?: string | null;
      };
      targetUser?: {
        __typename?: 'User';
        id: string;
        username?: string | null;
        image?: string | null;
      } | null;
      album?: {
        __typename?: 'Album';
        id: string;
        title: string;
        coverArtUrl?: string | null;
        cloudflareImageId?: string | null;
        artists: Array<{
          __typename?: 'ArtistCredit';
          artist: { __typename?: 'Artist'; id: string; name: string };
        }>;
      } | null;
      recommendation?: {
        __typename?: 'Recommendation';
        id: string;
        score: number;
      } | null;
      collection?: {
        __typename?: 'Collection';
        id: string;
        name: string;
      } | null;
      metadata?: {
        __typename?: 'ActivityMetadata';
        score?: number | null;
        collectionName?: string | null;
        personalRating?: number | null;
        position?: number | null;
        basisAlbum?: {
          __typename?: 'Album';
          id: string;
          title: string;
          coverArtUrl?: string | null;
          cloudflareImageId?: string | null;
          artists: Array<{
            __typename?: 'ArtistCredit';
            artist: { __typename?: 'Artist'; id: string; name: string };
          }>;
        } | null;
      } | null;
    }>;
  };
};

export type GetSyncJobsQueryVariables = Exact<{
  input?: InputMaybe<SyncJobsInput>;
}>;

export type GetSyncJobsQuery = {
  __typename?: 'Query';
  syncJobs: {
    __typename?: 'SyncJobsConnection';
    totalCount: number;
    hasMore: boolean;
    jobs: Array<{
      __typename?: 'SyncJob';
      id: string;
      jobId: string;
      jobType: SyncJobType;
      status: SyncJobStatus;
      startedAt: Date;
      completedAt?: Date | null;
      durationMs?: number | null;
      albumsCreated: number;
      albumsUpdated: number;
      albumsSkipped: number;
      artistsCreated: number;
      artistsUpdated: number;
      errorMessage?: string | null;
      errorCode?: string | null;
      metadata?: any | null;
      triggeredBy?: string | null;
      createdAt: Date;
    }>;
  };
};

export type GetSyncJobQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;

export type GetSyncJobQuery = {
  __typename?: 'Query';
  syncJob?: {
    __typename?: 'SyncJob';
    id: string;
    jobId: string;
    jobType: SyncJobType;
    status: SyncJobStatus;
    startedAt: Date;
    completedAt?: Date | null;
    durationMs?: number | null;
    albumsCreated: number;
    albumsUpdated: number;
    albumsSkipped: number;
    artistsCreated: number;
    artistsUpdated: number;
    errorMessage?: string | null;
    errorCode?: string | null;
    metadata?: any | null;
    triggeredBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
    albums: Array<{
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      releaseDate?: Date | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    }>;
  } | null;
};

export type GetSyncJobByJobIdQueryVariables = Exact<{
  jobId: Scalars['String']['input'];
}>;

export type GetSyncJobByJobIdQuery = {
  __typename?: 'Query';
  syncJobByJobId?: {
    __typename?: 'SyncJob';
    id: string;
    jobId: string;
    jobType: SyncJobType;
    status: SyncJobStatus;
    startedAt: Date;
    completedAt?: Date | null;
    durationMs?: number | null;
    albumsCreated: number;
    albumsUpdated: number;
    albumsSkipped: number;
    artistsCreated: number;
    artistsUpdated: number;
    errorMessage?: string | null;
    metadata?: any | null;
    triggeredBy?: string | null;
  } | null;
};

export type RollbackSyncJobMutationVariables = Exact<{
  syncJobId: Scalars['UUID']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type RollbackSyncJobMutation = {
  __typename?: 'Mutation';
  rollbackSyncJob: {
    __typename?: 'RollbackSyncJobResult';
    success: boolean;
    syncJobId: string;
    albumsDeleted: number;
    artistsDeleted: number;
    message: string;
    dryRun: boolean;
  };
};

export type GetTopRecommendedAlbumsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetTopRecommendedAlbumsQuery = {
  __typename?: 'Query';
  topRecommendedAlbums: Array<{
    __typename?: 'TopRecommendedAlbum';
    recommendationCount: number;
    asBasisCount: number;
    asTargetCount: number;
    averageScore: number;
    album: {
      __typename?: 'Album';
      id: string;
      title: string;
      coverArtUrl?: string | null;
      cloudflareImageId?: string | null;
      releaseDate?: Date | null;
      artists: Array<{
        __typename?: 'ArtistCredit';
        artist: { __typename?: 'Artist'; id: string; name: string };
      }>;
    };
  }>;
};

export type GetTopRecommendedArtistsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetTopRecommendedArtistsQuery = {
  __typename?: 'Query';
  topRecommendedArtists: Array<{
    __typename?: 'TopRecommendedArtist';
    recommendationCount: number;
    albumsInRecommendations: number;
    averageScore: number;
    artist: {
      __typename?: 'Artist';
      id: string;
      name: string;
      imageUrl?: string | null;
      cloudflareImageId?: string | null;
    };
  }>;
};

export type UncoverGuessAlbumFieldsFragment = {
  __typename?: 'UncoverGuessAlbumInfo';
  id: string;
  title: string;
  cloudflareImageId?: string | null;
  artistName: string;
};

export type UncoverGuessFieldsFragment = {
  __typename?: 'UncoverGuessInfo';
  id: string;
  guessNumber: number;
  isSkipped: boolean;
  isCorrect: boolean;
  guessedAt: Date;
  guessedAlbum?: {
    __typename?: 'UncoverGuessAlbumInfo';
    id: string;
    title: string;
    cloudflareImageId?: string | null;
    artistName: string;
  } | null;
};

export type UncoverSessionFieldsFragment = {
  __typename?: 'UncoverSessionInfo';
  id: string;
  status: UncoverSessionStatus;
  attemptCount: number;
  won: boolean;
  startedAt: Date;
  completedAt?: Date | null;
  guesses: Array<{
    __typename?: 'UncoverGuessInfo';
    id: string;
    guessNumber: number;
    isSkipped: boolean;
    isCorrect: boolean;
    guessedAt: Date;
    guessedAlbum?: {
      __typename?: 'UncoverGuessAlbumInfo';
      id: string;
      title: string;
      cloudflareImageId?: string | null;
      artistName: string;
    } | null;
  }>;
};

export type StartUncoverSessionMutationVariables = Exact<{
  [key: string]: never;
}>;

export type StartUncoverSessionMutation = {
  __typename?: 'Mutation';
  startUncoverSession: {
    __typename?: 'StartSessionResult';
    challengeId: string;
    imageUrl: string;
    cloudflareImageId?: string | null;
    session: {
      __typename?: 'UncoverSessionInfo';
      id: string;
      status: UncoverSessionStatus;
      attemptCount: number;
      won: boolean;
      startedAt: Date;
      completedAt?: Date | null;
      guesses: Array<{
        __typename?: 'UncoverGuessInfo';
        id: string;
        guessNumber: number;
        isSkipped: boolean;
        isCorrect: boolean;
        guessedAt: Date;
        guessedAlbum?: {
          __typename?: 'UncoverGuessAlbumInfo';
          id: string;
          title: string;
          cloudflareImageId?: string | null;
          artistName: string;
        } | null;
      }>;
    };
  };
};

export type SubmitGuessMutationVariables = Exact<{
  sessionId: Scalars['UUID']['input'];
  albumId: Scalars['UUID']['input'];
}>;

export type SubmitGuessMutation = {
  __typename?: 'Mutation';
  submitGuess: {
    __typename?: 'GuessResult';
    gameOver: boolean;
    guess: {
      __typename?: 'UncoverGuessInfo';
      id: string;
      guessNumber: number;
      isSkipped: boolean;
      isCorrect: boolean;
      guessedAt: Date;
      guessedAlbum?: {
        __typename?: 'UncoverGuessAlbumInfo';
        id: string;
        title: string;
        cloudflareImageId?: string | null;
        artistName: string;
      } | null;
    };
    session: {
      __typename?: 'UncoverSessionInfo';
      id: string;
      status: UncoverSessionStatus;
      attemptCount: number;
      won: boolean;
      startedAt: Date;
      completedAt?: Date | null;
      guesses: Array<{
        __typename?: 'UncoverGuessInfo';
        id: string;
        guessNumber: number;
        isSkipped: boolean;
        isCorrect: boolean;
        guessedAt: Date;
        guessedAlbum?: {
          __typename?: 'UncoverGuessAlbumInfo';
          id: string;
          title: string;
          cloudflareImageId?: string | null;
          artistName: string;
        } | null;
      }>;
    };
    correctAlbum?: {
      __typename?: 'UncoverGuessAlbumInfo';
      id: string;
      title: string;
      cloudflareImageId?: string | null;
      artistName: string;
    } | null;
  };
};

export type SkipGuessMutationVariables = Exact<{
  sessionId: Scalars['UUID']['input'];
}>;

export type SkipGuessMutation = {
  __typename?: 'Mutation';
  skipGuess: {
    __typename?: 'GuessResult';
    gameOver: boolean;
    guess: {
      __typename?: 'UncoverGuessInfo';
      id: string;
      guessNumber: number;
      isSkipped: boolean;
      isCorrect: boolean;
      guessedAt: Date;
      guessedAlbum?: {
        __typename?: 'UncoverGuessAlbumInfo';
        id: string;
        title: string;
        cloudflareImageId?: string | null;
        artistName: string;
      } | null;
    };
    session: {
      __typename?: 'UncoverSessionInfo';
      id: string;
      status: UncoverSessionStatus;
      attemptCount: number;
      won: boolean;
      startedAt: Date;
      completedAt?: Date | null;
      guesses: Array<{
        __typename?: 'UncoverGuessInfo';
        id: string;
        guessNumber: number;
        isSkipped: boolean;
        isCorrect: boolean;
        guessedAt: Date;
        guessedAlbum?: {
          __typename?: 'UncoverGuessAlbumInfo';
          id: string;
          title: string;
          cloudflareImageId?: string | null;
          artistName: string;
        } | null;
      }>;
    };
    correctAlbum?: {
      __typename?: 'UncoverGuessAlbumInfo';
      id: string;
      title: string;
      cloudflareImageId?: string | null;
      artistName: string;
    } | null;
  };
};

export type ResetDailySessionMutationVariables = Exact<{
  [key: string]: never;
}>;

export type ResetDailySessionMutation = {
  __typename?: 'Mutation';
  resetDailySession: boolean;
};

export type MyUncoverStatsQueryVariables = Exact<{ [key: string]: never }>;

export type MyUncoverStatsQuery = {
  __typename?: 'Query';
  myUncoverStats?: {
    __typename?: 'UncoverPlayerStats';
    id: string;
    gamesPlayed: number;
    gamesWon: number;
    totalAttempts: number;
    currentStreak: number;
    maxStreak: number;
    lastPlayedDate?: Date | null;
    winDistribution: Array<number>;
    winRate: number;
  } | null;
};

export type UpdateAlbumDataQualityMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  dataQuality: DataQuality;
}>;

export type UpdateAlbumDataQualityMutation = {
  __typename?: 'Mutation';
  updateAlbumDataQuality: {
    __typename?: 'Album';
    id: string;
    dataQuality?: DataQuality | null;
  };
};

export type UpdateArtistDataQualityMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  dataQuality: DataQuality;
}>;

export type UpdateArtistDataQualityMutation = {
  __typename?: 'Mutation';
  updateArtistDataQuality: {
    __typename?: 'Artist';
    id: string;
    dataQuality?: DataQuality | null;
  };
};

export type UpdateUserRoleMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  role: UserRole;
}>;

export type UpdateUserRoleMutation = {
  __typename?: 'Mutation';
  updateUserRole: {
    __typename?: 'UpdateUserRolePayload';
    success: boolean;
    message?: string | null;
    user?: {
      __typename?: 'User';
      id: string;
      role: UserRole;
      username?: string | null;
      email?: string | null;
    } | null;
  };
};

export const RecommendationFieldsFragmentDoc = `
    fragment RecommendationFields on Recommendation {
  id
  score
  createdAt
  user {
    id
    username
    image
  }
  basisAlbum {
    id
    title
    coverArtUrl
    cloudflareImageId
    artists {
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
    cloudflareImageId
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;
export const ActivityFieldsFragmentDoc = `
    fragment ActivityFields on Activity {
  id
  type
  createdAt
  actor {
    id
    username
    image
  }
  targetUser {
    id
    username
    image
  }
  album {
    id
    title
    coverArtUrl
    cloudflareImageId
    artists {
      artist {
        id
        name
      }
    }
  }
  recommendation {
    id
    score
  }
  collection {
    id
    name
  }
  metadata {
    score
    basisAlbum {
      id
      title
      coverArtUrl
      cloudflareImageId
      artists {
        artist {
          id
          name
        }
      }
    }
    collectionName
    personalRating
    position
  }
}
    `;
export const UncoverGuessAlbumFieldsFragmentDoc = `
    fragment UncoverGuessAlbumFields on UncoverGuessAlbumInfo {
  id
  title
  cloudflareImageId
  artistName
}
    `;
export const UncoverGuessFieldsFragmentDoc = `
    fragment UncoverGuessFields on UncoverGuessInfo {
  id
  guessNumber
  guessedAlbum {
    ...UncoverGuessAlbumFields
  }
  isSkipped
  isCorrect
  guessedAt
}
    ${UncoverGuessAlbumFieldsFragmentDoc}`;
export const UncoverSessionFieldsFragmentDoc = `
    fragment UncoverSessionFields on UncoverSessionInfo {
  id
  status
  attemptCount
  won
  startedAt
  completedAt
  guesses {
    ...UncoverGuessFields
  }
}
    ${UncoverGuessFieldsFragmentDoc}`;
export const AdminUpdateUserShowTourDocument = `
    mutation AdminUpdateUserShowTour($userId: String!, $showOnboardingTour: Boolean!) {
  adminUpdateUserShowTour(
    userId: $userId
    showOnboardingTour: $showOnboardingTour
  ) {
    success
    userId
    showOnboardingTour
    message
  }
}
    `;

export const useAdminUpdateUserShowTourMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    AdminUpdateUserShowTourMutation,
    TError,
    AdminUpdateUserShowTourMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AdminUpdateUserShowTourMutation,
    TError,
    AdminUpdateUserShowTourMutationVariables,
    TContext
  >({
    mutationKey: ['AdminUpdateUserShowTour'],
    mutationFn: (variables?: AdminUpdateUserShowTourMutationVariables) =>
      fetcher<
        AdminUpdateUserShowTourMutation,
        AdminUpdateUserShowTourMutationVariables
      >(AdminUpdateUserShowTourDocument, variables)(),
    ...options,
  });
};

useAdminUpdateUserShowTourMutation.getKey = () => ['AdminUpdateUserShowTour'];

export const ApplyCorrectionDocument = `
    mutation ApplyCorrection($input: CorrectionApplyInput!) {
  correctionApply(input: $input) {
    success
    album {
      id
      title
      releaseDate
      releaseType
      barcode
      label
      musicbrainzId
      coverArtUrl
      cloudflareImageId
      dataQuality
      updatedAt
      tracks {
        id
        title
        durationMs
        trackNumber
        discNumber
        isrc
        musicbrainzId
      }
      artists {
        artist {
          id
          name
          musicbrainzId
          imageUrl
        }
        role
        position
      }
    }
    changes {
      metadata
      artists {
        added
        removed
      }
      tracks {
        added
        modified
        removed
      }
      externalIds
      coverArt
      dataQualityBefore
      dataQualityAfter
    }
    code
    message
    context
  }
}
    `;

export const useApplyCorrectionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ApplyCorrectionMutation,
    TError,
    ApplyCorrectionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ApplyCorrectionMutation,
    TError,
    ApplyCorrectionMutationVariables,
    TContext
  >({
    mutationKey: ['ApplyCorrection'],
    mutationFn: (variables?: ApplyCorrectionMutationVariables) =>
      fetcher<ApplyCorrectionMutation, ApplyCorrectionMutationVariables>(
        ApplyCorrectionDocument,
        variables
      )(),
    ...options,
  });
};

useApplyCorrectionMutation.getKey = () => ['ApplyCorrection'];

export const CreateCollectionDocument = `
    mutation CreateCollection($name: String!, $description: String, $isPublic: Boolean) {
  createCollection(name: $name, description: $description, isPublic: $isPublic) {
    id
  }
}
    `;

export const useCreateCollectionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    CreateCollectionMutation,
    TError,
    CreateCollectionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateCollectionMutation,
    TError,
    CreateCollectionMutationVariables,
    TContext
  >({
    mutationKey: ['CreateCollection'],
    mutationFn: (variables?: CreateCollectionMutationVariables) =>
      fetcher<CreateCollectionMutation, CreateCollectionMutationVariables>(
        CreateCollectionDocument,
        variables
      )(),
    ...options,
  });
};

useCreateCollectionMutation.getKey = () => ['CreateCollection'];

export const DeleteCollectionDocument = `
    mutation DeleteCollection($id: String!) {
  deleteCollection(id: $id)
}
    `;

export const useDeleteCollectionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    DeleteCollectionMutation,
    TError,
    DeleteCollectionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteCollectionMutation,
    TError,
    DeleteCollectionMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteCollection'],
    mutationFn: (variables?: DeleteCollectionMutationVariables) =>
      fetcher<DeleteCollectionMutation, DeleteCollectionMutationVariables>(
        DeleteCollectionDocument,
        variables
      )(),
    ...options,
  });
};

useDeleteCollectionMutation.getKey = () => ['DeleteCollection'];

export const SoftDeleteUserDocument = `
    mutation SoftDeleteUser($userId: String!) {
  softDeleteUser(userId: $userId) {
    success
    message
    deletedId
  }
}
    `;

export const useSoftDeleteUserMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    SoftDeleteUserMutation,
    TError,
    SoftDeleteUserMutationVariables,
    TContext
  >
) => {
  return useMutation<
    SoftDeleteUserMutation,
    TError,
    SoftDeleteUserMutationVariables,
    TContext
  >({
    mutationKey: ['SoftDeleteUser'],
    mutationFn: (variables?: SoftDeleteUserMutationVariables) =>
      fetcher<SoftDeleteUserMutation, SoftDeleteUserMutationVariables>(
        SoftDeleteUserDocument,
        variables
      )(),
    ...options,
  });
};

useSoftDeleteUserMutation.getKey = () => ['SoftDeleteUser'];

export const HardDeleteUserDocument = `
    mutation HardDeleteUser($userId: String!) {
  hardDeleteUser(userId: $userId) {
    success
    message
    deletedId
  }
}
    `;

export const useHardDeleteUserMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    HardDeleteUserMutation,
    TError,
    HardDeleteUserMutationVariables,
    TContext
  >
) => {
  return useMutation<
    HardDeleteUserMutation,
    TError,
    HardDeleteUserMutationVariables,
    TContext
  >({
    mutationKey: ['HardDeleteUser'],
    mutationFn: (variables?: HardDeleteUserMutationVariables) =>
      fetcher<HardDeleteUserMutation, HardDeleteUserMutationVariables>(
        HardDeleteUserDocument,
        variables
      )(),
    ...options,
  });
};

useHardDeleteUserMutation.getKey = () => ['HardDeleteUser'];

export const RestoreUserDocument = `
    mutation RestoreUser($userId: String!) {
  restoreUser(userId: $userId) {
    success
    message
    user {
      id
      username
      email
      deletedAt
      deletedBy
    }
  }
}
    `;

export const useRestoreUserMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    RestoreUserMutation,
    TError,
    RestoreUserMutationVariables,
    TContext
  >
) => {
  return useMutation<
    RestoreUserMutation,
    TError,
    RestoreUserMutationVariables,
    TContext
  >({
    mutationKey: ['RestoreUser'],
    mutationFn: (variables?: RestoreUserMutationVariables) =>
      fetcher<RestoreUserMutation, RestoreUserMutationVariables>(
        RestoreUserDocument,
        variables
      )(),
    ...options,
  });
};

useRestoreUserMutation.getKey = () => ['RestoreUser'];

export const FollowUserDocument = `
    mutation FollowUser($userId: String!) {
  followUser(userId: $userId) {
    id
    followerId
    followedId
    createdAt
  }
}
    `;

export const useFollowUserMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    FollowUserMutation,
    TError,
    FollowUserMutationVariables,
    TContext
  >
) => {
  return useMutation<
    FollowUserMutation,
    TError,
    FollowUserMutationVariables,
    TContext
  >({
    mutationKey: ['FollowUser'],
    mutationFn: (variables?: FollowUserMutationVariables) =>
      fetcher<FollowUserMutation, FollowUserMutationVariables>(
        FollowUserDocument,
        variables
      )(),
    ...options,
  });
};

useFollowUserMutation.getKey = () => ['FollowUser'];

export const UnfollowUserDocument = `
    mutation UnfollowUser($userId: String!) {
  unfollowUser(userId: $userId)
}
    `;

export const useUnfollowUserMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    UnfollowUserMutation,
    TError,
    UnfollowUserMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UnfollowUserMutation,
    TError,
    UnfollowUserMutationVariables,
    TContext
  >({
    mutationKey: ['UnfollowUser'],
    mutationFn: (variables?: UnfollowUserMutationVariables) =>
      fetcher<UnfollowUserMutation, UnfollowUserMutationVariables>(
        UnfollowUserDocument,
        variables
      )(),
    ...options,
  });
};

useUnfollowUserMutation.getKey = () => ['UnfollowUser'];

export const CheckFollowStatusDocument = `
    query CheckFollowStatus($userId: String!) {
  user(id: $userId) {
    id
    isFollowing
  }
}
    `;

export const useCheckFollowStatusQuery = <
  TData = CheckFollowStatusQuery,
  TError = unknown,
>(
  variables: CheckFollowStatusQueryVariables,
  options?: Omit<
    UseQueryOptions<CheckFollowStatusQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      CheckFollowStatusQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<CheckFollowStatusQuery, TError, TData>({
    queryKey: ['CheckFollowStatus', variables],
    queryFn: fetcher<CheckFollowStatusQuery, CheckFollowStatusQueryVariables>(
      CheckFollowStatusDocument,
      variables
    ),
    ...options,
  });
};

useCheckFollowStatusQuery.getKey = (
  variables: CheckFollowStatusQueryVariables
) => ['CheckFollowStatus', variables];

export const useInfiniteCheckFollowStatusQuery = <
  TData = InfiniteData<CheckFollowStatusQuery>,
  TError = unknown,
>(
  variables: CheckFollowStatusQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<CheckFollowStatusQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      CheckFollowStatusQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<CheckFollowStatusQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['CheckFollowStatus.infinite', variables],
        queryFn: metaData =>
          fetcher<CheckFollowStatusQuery, CheckFollowStatusQueryVariables>(
            CheckFollowStatusDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteCheckFollowStatusQuery.getKey = (
  variables: CheckFollowStatusQueryVariables
) => ['CheckFollowStatus.infinite', variables];

export const ManualCorrectionApplyDocument = `
    mutation ManualCorrectionApply($input: ManualCorrectionApplyInput!) {
  manualCorrectionApply(input: $input) {
    success
    album {
      id
      title
      releaseDate
      releaseType
      musicbrainzId
      artists {
        artist {
          id
          name
        }
      }
      dataQuality
      updatedAt
    }
    code
    message
  }
}
    `;

export const useManualCorrectionApplyMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ManualCorrectionApplyMutation,
    TError,
    ManualCorrectionApplyMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ManualCorrectionApplyMutation,
    TError,
    ManualCorrectionApplyMutationVariables,
    TContext
  >({
    mutationKey: ['ManualCorrectionApply'],
    mutationFn: (variables?: ManualCorrectionApplyMutationVariables) =>
      fetcher<
        ManualCorrectionApplyMutation,
        ManualCorrectionApplyMutationVariables
      >(ManualCorrectionApplyDocument, variables)(),
    ...options,
  });
};

useManualCorrectionApplyMutation.getKey = () => ['ManualCorrectionApply'];

export const RemoveAlbumFromCollectionDocument = `
    mutation RemoveAlbumFromCollection($collectionId: String!, $albumId: UUID!) {
  removeAlbumFromCollection(collectionId: $collectionId, albumId: $albumId)
}
    `;

export const useRemoveAlbumFromCollectionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    RemoveAlbumFromCollectionMutation,
    TError,
    RemoveAlbumFromCollectionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    RemoveAlbumFromCollectionMutation,
    TError,
    RemoveAlbumFromCollectionMutationVariables,
    TContext
  >({
    mutationKey: ['RemoveAlbumFromCollection'],
    mutationFn: (variables?: RemoveAlbumFromCollectionMutationVariables) =>
      fetcher<
        RemoveAlbumFromCollectionMutation,
        RemoveAlbumFromCollectionMutationVariables
      >(RemoveAlbumFromCollectionDocument, variables)(),
    ...options,
  });
};

useRemoveAlbumFromCollectionMutation.getKey = () => [
  'RemoveAlbumFromCollection',
];

export const ReorderCollectionAlbumsDocument = `
    mutation ReorderCollectionAlbums($collectionId: String!, $albumIds: [UUID!]!) {
  reorderCollectionAlbums(collectionId: $collectionId, albumIds: $albumIds) {
    ids
  }
}
    `;

export const useReorderCollectionAlbumsMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ReorderCollectionAlbumsMutation,
    TError,
    ReorderCollectionAlbumsMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ReorderCollectionAlbumsMutation,
    TError,
    ReorderCollectionAlbumsMutationVariables,
    TContext
  >({
    mutationKey: ['ReorderCollectionAlbums'],
    mutationFn: (variables?: ReorderCollectionAlbumsMutationVariables) =>
      fetcher<
        ReorderCollectionAlbumsMutation,
        ReorderCollectionAlbumsMutationVariables
      >(ReorderCollectionAlbumsDocument, variables)(),
    ...options,
  });
};

useReorderCollectionAlbumsMutation.getKey = () => ['ReorderCollectionAlbums'];

export const UpdateCollectionDocument = `
    mutation UpdateCollection($id: String!, $name: String, $description: String, $isPublic: Boolean) {
  updateCollection(
    id: $id
    name: $name
    description: $description
    isPublic: $isPublic
  ) {
    id
  }
}
    `;

export const useUpdateCollectionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateCollectionMutation,
    TError,
    UpdateCollectionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateCollectionMutation,
    TError,
    UpdateCollectionMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateCollection'],
    mutationFn: (variables?: UpdateCollectionMutationVariables) =>
      fetcher<UpdateCollectionMutation, UpdateCollectionMutationVariables>(
        UpdateCollectionDocument,
        variables
      )(),
    ...options,
  });
};

useUpdateCollectionMutation.getKey = () => ['UpdateCollection'];

export const UpdateProfileDocument = `
    mutation UpdateProfile($username: String, $bio: String) {
  updateProfile(username: $username, bio: $bio) {
    id
    username
    bio
  }
}
    `;

export const useUpdateProfileMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    UpdateProfileMutation,
    TError,
    UpdateProfileMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateProfileMutation,
    TError,
    UpdateProfileMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateProfile'],
    mutationFn: (variables?: UpdateProfileMutationVariables) =>
      fetcher<UpdateProfileMutation, UpdateProfileMutationVariables>(
        UpdateProfileDocument,
        variables
      )(),
    ...options,
  });
};

useUpdateProfileMutation.getKey = () => ['UpdateProfile'];

export const UpdateUserSettingsDocument = `
    mutation UpdateUserSettings($theme: String, $language: String, $profileVisibility: String, $showRecentActivity: Boolean, $showCollections: Boolean, $showListenLaterInFeed: Boolean, $showCollectionAddsInFeed: Boolean, $showOnboardingTour: Boolean) {
  updateUserSettings(
    theme: $theme
    language: $language
    profileVisibility: $profileVisibility
    showRecentActivity: $showRecentActivity
    showCollections: $showCollections
    showListenLaterInFeed: $showListenLaterInFeed
    showCollectionAddsInFeed: $showCollectionAddsInFeed
    showOnboardingTour: $showOnboardingTour
  ) {
    id
    userId
    theme
    language
    profileVisibility
    showRecentActivity
    showCollections
    showListenLaterInFeed
    showCollectionAddsInFeed
    showOnboardingTour
    emailNotifications
    recommendationAlerts
    followAlerts
    defaultCollectionView
    autoplayPreviews
    createdAt
    updatedAt
  }
}
    `;

export const useUpdateUserSettingsMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateUserSettingsMutation,
    TError,
    UpdateUserSettingsMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateUserSettingsMutation,
    TError,
    UpdateUserSettingsMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateUserSettings'],
    mutationFn: (variables?: UpdateUserSettingsMutationVariables) =>
      fetcher<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>(
        UpdateUserSettingsDocument,
        variables
      )(),
    ...options,
  });
};

useUpdateUserSettingsMutation.getKey = () => ['UpdateUserSettings'];

export const AddAlbumToQueueDocument = `
    mutation AddAlbumToQueue($albumId: UUID!) {
  addAlbumToQueue(albumId: $albumId) {
    success
    message
    error
    album {
      id
      title
      gameStatus
    }
    curatedChallenge {
      id
      sequence
    }
  }
}
    `;

export const useAddAlbumToQueueMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    AddAlbumToQueueMutation,
    TError,
    AddAlbumToQueueMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddAlbumToQueueMutation,
    TError,
    AddAlbumToQueueMutationVariables,
    TContext
  >({
    mutationKey: ['AddAlbumToQueue'],
    mutationFn: (variables?: AddAlbumToQueueMutationVariables) =>
      fetcher<AddAlbumToQueueMutation, AddAlbumToQueueMutationVariables>(
        AddAlbumToQueueDocument,
        variables
      )(),
    ...options,
  });
};

useAddAlbumToQueueMutation.getKey = () => ['AddAlbumToQueue'];

export const DeleteAlbumDocument = `
    mutation DeleteAlbum($id: UUID!) {
  deleteAlbum(id: $id) {
    success
    message
    deletedId
  }
}
    `;

export const useDeleteAlbumMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    DeleteAlbumMutation,
    TError,
    DeleteAlbumMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteAlbumMutation,
    TError,
    DeleteAlbumMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteAlbum'],
    mutationFn: (variables?: DeleteAlbumMutationVariables) =>
      fetcher<DeleteAlbumMutation, DeleteAlbumMutationVariables>(
        DeleteAlbumDocument,
        variables
      )(),
    ...options,
  });
};

useDeleteAlbumMutation.getKey = () => ['DeleteAlbum'];

export const GetAdminUsersDocument = `
    query GetAdminUsers($offset: Int = 0, $limit: Int = 20, $search: String, $role: UserRole, $sortBy: UserSortField = CREATED_AT, $sortOrder: SortOrder = DESC, $createdAfter: DateTime, $createdBefore: DateTime, $lastActiveAfter: DateTime, $lastActiveBefore: DateTime, $hasActivity: Boolean) {
  users(
    offset: $offset
    limit: $limit
    search: $search
    role: $role
    sortBy: $sortBy
    sortOrder: $sortOrder
    createdAfter: $createdAfter
    createdBefore: $createdBefore
    lastActiveAfter: $lastActiveAfter
    lastActiveBefore: $lastActiveBefore
    hasActivity: $hasActivity
  ) {
    id
    username
    email
    image
    emailVerified
    bio
    role
    followersCount
    followingCount
    recommendationsCount
    profileUpdatedAt
    lastActive
    deletedAt
    deletedBy
    createdAt
    collections {
      id
      name
    }
    settings {
      showOnboardingTour
    }
    _count {
      collections
      recommendations
    }
  }
  totalCount: usersCount(
    search: $search
    role: $role
    createdAfter: $createdAfter
    createdBefore: $createdBefore
    lastActiveAfter: $lastActiveAfter
    lastActiveBefore: $lastActiveBefore
    hasActivity: $hasActivity
  )
}
    `;

export const useGetAdminUsersQuery = <
  TData = GetAdminUsersQuery,
  TError = unknown,
>(
  variables?: GetAdminUsersQueryVariables,
  options?: Omit<
    UseQueryOptions<GetAdminUsersQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetAdminUsersQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetAdminUsersQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetAdminUsers']
        : ['GetAdminUsers', variables],
    queryFn: fetcher<GetAdminUsersQuery, GetAdminUsersQueryVariables>(
      GetAdminUsersDocument,
      variables
    ),
    ...options,
  });
};

useGetAdminUsersQuery.getKey = (variables?: GetAdminUsersQueryVariables) =>
  variables === undefined ? ['GetAdminUsers'] : ['GetAdminUsers', variables];

export const useInfiniteGetAdminUsersQuery = <
  TData = InfiniteData<GetAdminUsersQuery>,
  TError = unknown,
>(
  variables: GetAdminUsersQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetAdminUsersQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetAdminUsersQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetAdminUsersQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetAdminUsers.infinite']
            : ['GetAdminUsers.infinite', variables],
        queryFn: metaData =>
          fetcher<GetAdminUsersQuery, GetAdminUsersQueryVariables>(
            GetAdminUsersDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetAdminUsersQuery.getKey = (
  variables?: GetAdminUsersQueryVariables
) =>
  variables === undefined
    ? ['GetAdminUsers.infinite']
    : ['GetAdminUsers.infinite', variables];

export const AddAlbumDocument = `
    mutation AddAlbum($input: AlbumInput!) {
  addAlbum(input: $input) {
    id
    title
    releaseDate
    coverArtUrl
    musicbrainzId
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useAddAlbumMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    AddAlbumMutation,
    TError,
    AddAlbumMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddAlbumMutation,
    TError,
    AddAlbumMutationVariables,
    TContext
  >({
    mutationKey: ['AddAlbum'],
    mutationFn: (variables?: AddAlbumMutationVariables) =>
      fetcher<AddAlbumMutation, AddAlbumMutationVariables>(
        AddAlbumDocument,
        variables
      )(),
    ...options,
  });
};

useAddAlbumMutation.getKey = () => ['AddAlbum'];

export const GetAlbumDetailsAdminDocument = `
    query GetAlbumDetailsAdmin($id: UUID!) {
  album(id: $id) {
    id
    musicbrainzId
    discogsId
    title
    releaseDate
    releaseType
    genres
    trackCount
    durationMs
    coverArtUrl
    cloudflareImageId
    barcode
    label
    catalogNumber
    createdAt
    updatedAt
    dataQuality
    enrichmentStatus
    lastEnriched
    needsEnrichment
    duration
    averageRating
    inCollectionsCount
    recommendationScore
    latestLlamaLog {
      id
      status
      sources
      fieldsEnriched
      errorMessage
      createdAt
    }
    llamaLogs(limit: 5) {
      id
      operation
      sources
      status
      fieldsEnriched
      errorMessage
      durationMs
      createdAt
    }
    artists {
      artist {
        id
        name
        musicbrainzId
        imageUrl
      }
      role
      position
    }
    tracks {
      id
      musicbrainzId
      isrc
      title
      trackNumber
      discNumber
      durationMs
      explicit
      previewUrl
      createdAt
      updatedAt
      duration
      artists {
        artist {
          id
          name
        }
        role
      }
    }
  }
}
    `;

export const useGetAlbumDetailsAdminQuery = <
  TData = GetAlbumDetailsAdminQuery,
  TError = unknown,
>(
  variables: GetAlbumDetailsAdminQueryVariables,
  options?: Omit<
    UseQueryOptions<GetAlbumDetailsAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetAlbumDetailsAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetAlbumDetailsAdminQuery, TError, TData>({
    queryKey: ['GetAlbumDetailsAdmin', variables],
    queryFn: fetcher<
      GetAlbumDetailsAdminQuery,
      GetAlbumDetailsAdminQueryVariables
    >(GetAlbumDetailsAdminDocument, variables),
    ...options,
  });
};

useGetAlbumDetailsAdminQuery.getKey = (
  variables: GetAlbumDetailsAdminQueryVariables
) => ['GetAlbumDetailsAdmin', variables];

export const useInfiniteGetAlbumDetailsAdminQuery = <
  TData = InfiniteData<GetAlbumDetailsAdminQuery>,
  TError = unknown,
>(
  variables: GetAlbumDetailsAdminQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetAlbumDetailsAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetAlbumDetailsAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetAlbumDetailsAdminQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetAlbumDetailsAdmin.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetAlbumDetailsAdminQuery,
            GetAlbumDetailsAdminQueryVariables
          >(GetAlbumDetailsAdminDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetAlbumDetailsAdminQuery.getKey = (
  variables: GetAlbumDetailsAdminQueryVariables
) => ['GetAlbumDetailsAdmin.infinite', variables];

export const AlbumByMusicBrainzIdDocument = `
    query AlbumByMusicBrainzId($musicbrainzId: String!) {
  albumByMusicBrainzId(musicbrainzId: $musicbrainzId) {
    id
    musicbrainzId
    title
    releaseDate
    coverArtUrl
    dataQuality
    enrichmentStatus
    lastEnriched
    needsEnrichment
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useAlbumByMusicBrainzIdQuery = <
  TData = AlbumByMusicBrainzIdQuery,
  TError = unknown,
>(
  variables: AlbumByMusicBrainzIdQueryVariables,
  options?: Omit<
    UseQueryOptions<AlbumByMusicBrainzIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      AlbumByMusicBrainzIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<AlbumByMusicBrainzIdQuery, TError, TData>({
    queryKey: ['AlbumByMusicBrainzId', variables],
    queryFn: fetcher<
      AlbumByMusicBrainzIdQuery,
      AlbumByMusicBrainzIdQueryVariables
    >(AlbumByMusicBrainzIdDocument, variables),
    ...options,
  });
};

useAlbumByMusicBrainzIdQuery.getKey = (
  variables: AlbumByMusicBrainzIdQueryVariables
) => ['AlbumByMusicBrainzId', variables];

export const useInfiniteAlbumByMusicBrainzIdQuery = <
  TData = InfiniteData<AlbumByMusicBrainzIdQuery>,
  TError = unknown,
>(
  variables: AlbumByMusicBrainzIdQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<AlbumByMusicBrainzIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      AlbumByMusicBrainzIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<AlbumByMusicBrainzIdQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'AlbumByMusicBrainzId.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            AlbumByMusicBrainzIdQuery,
            AlbumByMusicBrainzIdQueryVariables
          >(AlbumByMusicBrainzIdDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteAlbumByMusicBrainzIdQuery.getKey = (
  variables: AlbumByMusicBrainzIdQueryVariables
) => ['AlbumByMusicBrainzId.infinite', variables];

export const MyArchiveStatsDocument = `
    query MyArchiveStats {
  myArchiveStats {
    id
    gamesPlayed
    gamesWon
    totalAttempts
    winDistribution
    winRate
  }
}
    `;

export const useMyArchiveStatsQuery = <
  TData = MyArchiveStatsQuery,
  TError = unknown,
>(
  variables?: MyArchiveStatsQueryVariables,
  options?: Omit<
    UseQueryOptions<MyArchiveStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<MyArchiveStatsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<MyArchiveStatsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['MyArchiveStats']
        : ['MyArchiveStats', variables],
    queryFn: fetcher<MyArchiveStatsQuery, MyArchiveStatsQueryVariables>(
      MyArchiveStatsDocument,
      variables
    ),
    ...options,
  });
};

useMyArchiveStatsQuery.getKey = (variables?: MyArchiveStatsQueryVariables) =>
  variables === undefined ? ['MyArchiveStats'] : ['MyArchiveStats', variables];

export const useInfiniteMyArchiveStatsQuery = <
  TData = InfiniteData<MyArchiveStatsQuery>,
  TError = unknown,
>(
  variables: MyArchiveStatsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<MyArchiveStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      MyArchiveStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<MyArchiveStatsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['MyArchiveStats.infinite']
            : ['MyArchiveStats.infinite', variables],
        queryFn: metaData =>
          fetcher<MyArchiveStatsQuery, MyArchiveStatsQueryVariables>(
            MyArchiveStatsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteMyArchiveStatsQuery.getKey = (
  variables?: MyArchiveStatsQueryVariables
) =>
  variables === undefined
    ? ['MyArchiveStats.infinite']
    : ['MyArchiveStats.infinite', variables];

export const MyUncoverSessionsDocument = `
    query MyUncoverSessions($fromDate: DateTime, $toDate: DateTime) {
  myUncoverSessions(fromDate: $fromDate, toDate: $toDate) {
    id
    challengeDate
    won
    attemptCount
    completedAt
  }
}
    `;

export const useMyUncoverSessionsQuery = <
  TData = MyUncoverSessionsQuery,
  TError = unknown,
>(
  variables?: MyUncoverSessionsQueryVariables,
  options?: Omit<
    UseQueryOptions<MyUncoverSessionsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      MyUncoverSessionsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<MyUncoverSessionsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['MyUncoverSessions']
        : ['MyUncoverSessions', variables],
    queryFn: fetcher<MyUncoverSessionsQuery, MyUncoverSessionsQueryVariables>(
      MyUncoverSessionsDocument,
      variables
    ),
    ...options,
  });
};

useMyUncoverSessionsQuery.getKey = (
  variables?: MyUncoverSessionsQueryVariables
) =>
  variables === undefined
    ? ['MyUncoverSessions']
    : ['MyUncoverSessions', variables];

export const useInfiniteMyUncoverSessionsQuery = <
  TData = InfiniteData<MyUncoverSessionsQuery>,
  TError = unknown,
>(
  variables: MyUncoverSessionsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<MyUncoverSessionsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      MyUncoverSessionsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<MyUncoverSessionsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['MyUncoverSessions.infinite']
            : ['MyUncoverSessions.infinite', variables],
        queryFn: metaData =>
          fetcher<MyUncoverSessionsQuery, MyUncoverSessionsQueryVariables>(
            MyUncoverSessionsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteMyUncoverSessionsQuery.getKey = (
  variables?: MyUncoverSessionsQueryVariables
) =>
  variables === undefined
    ? ['MyUncoverSessions.infinite']
    : ['MyUncoverSessions.infinite', variables];

export const StartArchiveSessionDocument = `
    mutation StartArchiveSession($date: DateTime!) {
  startArchiveSession(date: $date) {
    session {
      id
      status
      attemptCount
      won
      startedAt
      completedAt
      guesses {
        id
        guessNumber
        guessedAlbum {
          id
          title
          cloudflareImageId
          artistName
        }
        isSkipped
        isCorrect
        guessedAt
      }
    }
    challengeId
    imageUrl
    cloudflareImageId
  }
}
    `;

export const useStartArchiveSessionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    StartArchiveSessionMutation,
    TError,
    StartArchiveSessionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    StartArchiveSessionMutation,
    TError,
    StartArchiveSessionMutationVariables,
    TContext
  >({
    mutationKey: ['StartArchiveSession'],
    mutationFn: (variables?: StartArchiveSessionMutationVariables) =>
      fetcher<
        StartArchiveSessionMutation,
        StartArchiveSessionMutationVariables
      >(StartArchiveSessionDocument, variables)(),
    ...options,
  });
};

useStartArchiveSessionMutation.getKey = () => ['StartArchiveSession'];

export const GetArtistByMusicBrainzIdDocument = `
    query GetArtistByMusicBrainzId($musicbrainzId: UUID!) {
  artistByMusicBrainzId(musicbrainzId: $musicbrainzId) {
    id
    musicbrainzId
    name
    imageUrl
    dataQuality
    enrichmentStatus
    lastEnriched
    needsEnrichment
  }
}
    `;

export const useGetArtistByMusicBrainzIdQuery = <
  TData = GetArtistByMusicBrainzIdQuery,
  TError = unknown,
>(
  variables: GetArtistByMusicBrainzIdQueryVariables,
  options?: Omit<
    UseQueryOptions<GetArtistByMusicBrainzIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetArtistByMusicBrainzIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetArtistByMusicBrainzIdQuery, TError, TData>({
    queryKey: ['GetArtistByMusicBrainzId', variables],
    queryFn: fetcher<
      GetArtistByMusicBrainzIdQuery,
      GetArtistByMusicBrainzIdQueryVariables
    >(GetArtistByMusicBrainzIdDocument, variables),
    ...options,
  });
};

useGetArtistByMusicBrainzIdQuery.getKey = (
  variables: GetArtistByMusicBrainzIdQueryVariables
) => ['GetArtistByMusicBrainzId', variables];

export const useInfiniteGetArtistByMusicBrainzIdQuery = <
  TData = InfiniteData<GetArtistByMusicBrainzIdQuery>,
  TError = unknown,
>(
  variables: GetArtistByMusicBrainzIdQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetArtistByMusicBrainzIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetArtistByMusicBrainzIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetArtistByMusicBrainzIdQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetArtistByMusicBrainzId.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetArtistByMusicBrainzIdQuery,
            GetArtistByMusicBrainzIdQueryVariables
          >(GetArtistByMusicBrainzIdDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetArtistByMusicBrainzIdQuery.getKey = (
  variables: GetArtistByMusicBrainzIdQueryVariables
) => ['GetArtistByMusicBrainzId.infinite', variables];

export const SearchArtistCorrectionCandidatesDocument = `
    query SearchArtistCorrectionCandidates($query: String!, $limit: Int, $source: CorrectionSource) {
  artistCorrectionSearch(query: $query, limit: $limit, source: $source) {
    results {
      artistMbid
      name
      sortName
      disambiguation
      type
      country
      area
      beginDate
      endDate
      ended
      gender
      mbScore
      topReleases {
        title
        year
        type
      }
      source
    }
    hasMore
    query
  }
}
    `;

export const useSearchArtistCorrectionCandidatesQuery = <
  TData = SearchArtistCorrectionCandidatesQuery,
  TError = unknown,
>(
  variables: SearchArtistCorrectionCandidatesQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchArtistCorrectionCandidatesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      SearchArtistCorrectionCandidatesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<SearchArtistCorrectionCandidatesQuery, TError, TData>({
    queryKey: ['SearchArtistCorrectionCandidates', variables],
    queryFn: fetcher<
      SearchArtistCorrectionCandidatesQuery,
      SearchArtistCorrectionCandidatesQueryVariables
    >(SearchArtistCorrectionCandidatesDocument, variables),
    ...options,
  });
};

useSearchArtistCorrectionCandidatesQuery.getKey = (
  variables: SearchArtistCorrectionCandidatesQueryVariables
) => ['SearchArtistCorrectionCandidates', variables];

export const useInfiniteSearchArtistCorrectionCandidatesQuery = <
  TData = InfiniteData<SearchArtistCorrectionCandidatesQuery>,
  TError = unknown,
>(
  variables: SearchArtistCorrectionCandidatesQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<
      SearchArtistCorrectionCandidatesQuery,
      TError,
      TData
    >,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchArtistCorrectionCandidatesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchArtistCorrectionCandidatesQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'SearchArtistCorrectionCandidates.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            SearchArtistCorrectionCandidatesQuery,
            SearchArtistCorrectionCandidatesQueryVariables
          >(SearchArtistCorrectionCandidatesDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchArtistCorrectionCandidatesQuery.getKey = (
  variables: SearchArtistCorrectionCandidatesQueryVariables
) => ['SearchArtistCorrectionCandidates.infinite', variables];

export const GetArtistCorrectionPreviewDocument = `
    query GetArtistCorrectionPreview($artistId: UUID!, $sourceArtistId: String!, $source: CorrectionSource) {
  artistCorrectionPreview(
    artistId: $artistId
    sourceArtistId: $sourceArtistId
    source: $source
  ) {
    currentArtist {
      id
      name
      musicbrainzId
      discogsId
      countryCode
      formedYear
      biography
      dataQuality
      updatedAt
    }
    mbArtistData
    fieldDiffs {
      field
      changeType
      current
      source
    }
    albumCount
    summary {
      totalFields
      changedFields
      addedFields
      modifiedFields
    }
    source
  }
}
    `;

export const useGetArtistCorrectionPreviewQuery = <
  TData = GetArtistCorrectionPreviewQuery,
  TError = unknown,
>(
  variables: GetArtistCorrectionPreviewQueryVariables,
  options?: Omit<
    UseQueryOptions<GetArtistCorrectionPreviewQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetArtistCorrectionPreviewQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetArtistCorrectionPreviewQuery, TError, TData>({
    queryKey: ['GetArtistCorrectionPreview', variables],
    queryFn: fetcher<
      GetArtistCorrectionPreviewQuery,
      GetArtistCorrectionPreviewQueryVariables
    >(GetArtistCorrectionPreviewDocument, variables),
    ...options,
  });
};

useGetArtistCorrectionPreviewQuery.getKey = (
  variables: GetArtistCorrectionPreviewQueryVariables
) => ['GetArtistCorrectionPreview', variables];

export const useInfiniteGetArtistCorrectionPreviewQuery = <
  TData = InfiniteData<GetArtistCorrectionPreviewQuery>,
  TError = unknown,
>(
  variables: GetArtistCorrectionPreviewQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetArtistCorrectionPreviewQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetArtistCorrectionPreviewQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetArtistCorrectionPreviewQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetArtistCorrectionPreview.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetArtistCorrectionPreviewQuery,
            GetArtistCorrectionPreviewQueryVariables
          >(GetArtistCorrectionPreviewDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetArtistCorrectionPreviewQuery.getKey = (
  variables: GetArtistCorrectionPreviewQueryVariables
) => ['GetArtistCorrectionPreview.infinite', variables];

export const ApplyArtistCorrectionDocument = `
    mutation ApplyArtistCorrection($input: ArtistCorrectionApplyInput!) {
  artistCorrectionApply(input: $input) {
    success
    artist {
      id
      name
      musicbrainzId
      discogsId
      countryCode
      formedYear
      dataQuality
      enrichmentStatus
      updatedAt
    }
    changes {
      metadata
      externalIds
      affectedAlbumCount
      dataQualityBefore
      dataQualityAfter
    }
    affectedAlbumCount
    code
    message
  }
}
    `;

export const useApplyArtistCorrectionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ApplyArtistCorrectionMutation,
    TError,
    ApplyArtistCorrectionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ApplyArtistCorrectionMutation,
    TError,
    ApplyArtistCorrectionMutationVariables,
    TContext
  >({
    mutationKey: ['ApplyArtistCorrection'],
    mutationFn: (variables?: ApplyArtistCorrectionMutationVariables) =>
      fetcher<
        ApplyArtistCorrectionMutation,
        ApplyArtistCorrectionMutationVariables
      >(ApplyArtistCorrectionDocument, variables)(),
    ...options,
  });
};

useApplyArtistCorrectionMutation.getKey = () => ['ApplyArtistCorrection'];

export const GetArtistDiscographyDocument = `
    query GetArtistDiscography($id: String!, $source: DataSource!) {
  artistDiscography(id: $id, source: $source) {
    albums {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    eps {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    singles {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    compilations {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    liveAlbums {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    remixes {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    soundtracks {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    other {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
  }
}
    `;

export const useGetArtistDiscographyQuery = <
  TData = GetArtistDiscographyQuery,
  TError = unknown,
>(
  variables: GetArtistDiscographyQueryVariables,
  options?: Omit<
    UseQueryOptions<GetArtistDiscographyQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetArtistDiscographyQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetArtistDiscographyQuery, TError, TData>({
    queryKey: ['GetArtistDiscography', variables],
    queryFn: fetcher<
      GetArtistDiscographyQuery,
      GetArtistDiscographyQueryVariables
    >(GetArtistDiscographyDocument, variables),
    ...options,
  });
};

useGetArtistDiscographyQuery.getKey = (
  variables: GetArtistDiscographyQueryVariables
) => ['GetArtistDiscography', variables];

export const useInfiniteGetArtistDiscographyQuery = <
  TData = InfiniteData<GetArtistDiscographyQuery>,
  TError = unknown,
>(
  variables: GetArtistDiscographyQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetArtistDiscographyQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetArtistDiscographyQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetArtistDiscographyQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetArtistDiscography.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetArtistDiscographyQuery,
            GetArtistDiscographyQueryVariables
          >(GetArtistDiscographyDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetArtistDiscographyQuery.getKey = (
  variables: GetArtistDiscographyQueryVariables
) => ['GetArtistDiscography.infinite', variables];

export const GetArtistRecommendationsDocument = `
    query GetArtistRecommendations($artistId: ID!, $filter: AlbumRole, $sort: ArtistRecommendationSort, $limit: Int, $offset: Int) {
  artistRecommendations(
    artistId: $artistId
    filter: $filter
    sort: $sort
    limit: $limit
    offset: $offset
  ) {
    recommendations {
      id
      score
      description
      createdAt
      albumRole
      isOwnRecommendation
      basisAlbum {
        id
        title
        coverArtUrl
        releaseDate
        artists {
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
        releaseDate
        artists {
          artist {
            id
            name
          }
        }
      }
      user {
        id
        username
        image
      }
    }
    totalCount
    hasMore
  }
}
    `;

export const useGetArtistRecommendationsQuery = <
  TData = GetArtistRecommendationsQuery,
  TError = unknown,
>(
  variables: GetArtistRecommendationsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetArtistRecommendationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetArtistRecommendationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetArtistRecommendationsQuery, TError, TData>({
    queryKey: ['GetArtistRecommendations', variables],
    queryFn: fetcher<
      GetArtistRecommendationsQuery,
      GetArtistRecommendationsQueryVariables
    >(GetArtistRecommendationsDocument, variables),
    ...options,
  });
};

useGetArtistRecommendationsQuery.getKey = (
  variables: GetArtistRecommendationsQueryVariables
) => ['GetArtistRecommendations', variables];

export const useInfiniteGetArtistRecommendationsQuery = <
  TData = InfiniteData<GetArtistRecommendationsQuery>,
  TError = unknown,
>(
  variables: GetArtistRecommendationsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetArtistRecommendationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetArtistRecommendationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetArtistRecommendationsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetArtistRecommendations.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetArtistRecommendationsQuery,
            GetArtistRecommendationsQueryVariables
          >(GetArtistRecommendationsDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetArtistRecommendationsQuery.getKey = (
  variables: GetArtistRecommendationsQueryVariables
) => ['GetArtistRecommendations.infinite', variables];

export const AddArtistDocument = `
    mutation AddArtist($input: ArtistInput!) {
  addArtist(input: $input) {
    id
    name
    musicbrainzId
    imageUrl
    countryCode
    dataQuality
    enrichmentStatus
    lastEnriched
  }
}
    `;

export const useAddArtistMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    AddArtistMutation,
    TError,
    AddArtistMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddArtistMutation,
    TError,
    AddArtistMutationVariables,
    TContext
  >({
    mutationKey: ['AddArtist'],
    mutationFn: (variables?: AddArtistMutationVariables) =>
      fetcher<AddArtistMutation, AddArtistMutationVariables>(
        AddArtistDocument,
        variables
      )(),
    ...options,
  });
};

useAddArtistMutation.getKey = () => ['AddArtist'];

export const DeleteArtistDocument = `
    mutation DeleteArtist($id: UUID!) {
  deleteArtist(id: $id) {
    success
    message
    deletedId
  }
}
    `;

export const useDeleteArtistMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    DeleteArtistMutation,
    TError,
    DeleteArtistMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteArtistMutation,
    TError,
    DeleteArtistMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteArtist'],
    mutationFn: (variables?: DeleteArtistMutationVariables) =>
      fetcher<DeleteArtistMutation, DeleteArtistMutationVariables>(
        DeleteArtistDocument,
        variables
      )(),
    ...options,
  });
};

useDeleteArtistMutation.getKey = () => ['DeleteArtist'];

export const AddAlbumToCollectionWithCreateDocument = `
    mutation AddAlbumToCollectionWithCreate($input: AddAlbumToCollectionWithCreateInput!) {
  addAlbumToCollectionWithCreate(input: $input) {
    id
  }
}
    `;

export const useAddAlbumToCollectionWithCreateMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    AddAlbumToCollectionWithCreateMutation,
    TError,
    AddAlbumToCollectionWithCreateMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddAlbumToCollectionWithCreateMutation,
    TError,
    AddAlbumToCollectionWithCreateMutationVariables,
    TContext
  >({
    mutationKey: ['AddAlbumToCollectionWithCreate'],
    mutationFn: (variables?: AddAlbumToCollectionWithCreateMutationVariables) =>
      fetcher<
        AddAlbumToCollectionWithCreateMutation,
        AddAlbumToCollectionWithCreateMutationVariables
      >(AddAlbumToCollectionWithCreateDocument, variables)(),
    ...options,
  });
};

useAddAlbumToCollectionWithCreateMutation.getKey = () => [
  'AddAlbumToCollectionWithCreate',
];

export const GetCorrectionPreviewDocument = `
    query GetCorrectionPreview($input: CorrectionPreviewInput!) {
  correctionPreview(input: $input) {
    albumId
    albumTitle
    albumUpdatedAt
    sourceResult {
      releaseGroupMbid
      title
      disambiguation
      artistCredits {
        mbid
        name
      }
      primaryArtistName
      firstReleaseDate
      primaryType
      secondaryTypes
      mbScore
      coverArtUrl
      source
      normalizedScore
      displayScore
      breakdown {
        titleScore
        artistScore
        yearScore
        mbScore
        confidenceTier
      }
      isLowConfidence
    }
    mbReleaseData {
      id
      title
      date
      country
      barcode
      media {
        position
        format
        trackCount
        tracks {
          position
          recording {
            id
            title
            length
            position
          }
        }
      }
      artistCredit {
        name
        joinphrase
        artist {
          id
          name
          sortName
          disambiguation
        }
      }
    }
    fieldDiffs
    artistDiff {
      changeType
      current {
        mbid
        name
      }
      source {
        mbid
        name
      }
      currentDisplay
      sourceDisplay
      nameDiff {
        value
        added
        removed
      }
    }
    trackDiffs {
      position
      discNumber
      changeType
      current {
        title
        durationMs
        trackNumber
      }
      source {
        title
        durationMs
        mbid
      }
      titleDiff {
        value
        added
        removed
      }
      durationDelta
      trackId
    }
    trackSummary {
      totalCurrent
      totalSource
      matching
      modified
      added
      removed
    }
    coverArt {
      changeType
      currentUrl
      sourceUrl
    }
    summary {
      totalFields
      changedFields
      addedFields
      modifiedFields
      conflictFields
      hasTrackChanges
    }
  }
}
    `;

export const useGetCorrectionPreviewQuery = <
  TData = GetCorrectionPreviewQuery,
  TError = unknown,
>(
  variables: GetCorrectionPreviewQueryVariables,
  options?: Omit<
    UseQueryOptions<GetCorrectionPreviewQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetCorrectionPreviewQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetCorrectionPreviewQuery, TError, TData>({
    queryKey: ['GetCorrectionPreview', variables],
    queryFn: fetcher<
      GetCorrectionPreviewQuery,
      GetCorrectionPreviewQueryVariables
    >(GetCorrectionPreviewDocument, variables),
    ...options,
  });
};

useGetCorrectionPreviewQuery.getKey = (
  variables: GetCorrectionPreviewQueryVariables
) => ['GetCorrectionPreview', variables];

export const useInfiniteGetCorrectionPreviewQuery = <
  TData = InfiniteData<GetCorrectionPreviewQuery>,
  TError = unknown,
>(
  variables: GetCorrectionPreviewQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetCorrectionPreviewQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetCorrectionPreviewQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetCorrectionPreviewQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetCorrectionPreview.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetCorrectionPreviewQuery,
            GetCorrectionPreviewQueryVariables
          >(GetCorrectionPreviewDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetCorrectionPreviewQuery.getKey = (
  variables: GetCorrectionPreviewQueryVariables
) => ['GetCorrectionPreview.infinite', variables];

export const SearchCorrectionCandidatesDocument = `
    query SearchCorrectionCandidates($input: CorrectionSearchInput!) {
  correctionSearch(input: $input) {
    results {
      releaseGroupMbid
      primaryResult {
        releaseGroupMbid
        title
        disambiguation
        artistCredits {
          mbid
          name
        }
        primaryArtistName
        firstReleaseDate
        primaryType
        secondaryTypes
        mbScore
        coverArtUrl
        source
        normalizedScore
        displayScore
        breakdown {
          titleScore
          artistScore
          yearScore
          mbScore
          confidenceTier
        }
        isLowConfidence
      }
      alternateVersions {
        releaseGroupMbid
        title
        disambiguation
        artistCredits {
          mbid
          name
        }
        primaryArtistName
        firstReleaseDate
        primaryType
        secondaryTypes
        mbScore
        coverArtUrl
        source
        normalizedScore
        displayScore
        breakdown {
          titleScore
          artistScore
          yearScore
          mbScore
          confidenceTier
        }
        isLowConfidence
      }
      versionCount
      bestScore
    }
    totalGroups
    hasMore
    query {
      albumTitle
      artistName
      yearFilter
    }
    scoring {
      strategy
      threshold
      lowConfidenceCount
    }
  }
}
    `;

export const useSearchCorrectionCandidatesQuery = <
  TData = SearchCorrectionCandidatesQuery,
  TError = unknown,
>(
  variables: SearchCorrectionCandidatesQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchCorrectionCandidatesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      SearchCorrectionCandidatesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<SearchCorrectionCandidatesQuery, TError, TData>({
    queryKey: ['SearchCorrectionCandidates', variables],
    queryFn: fetcher<
      SearchCorrectionCandidatesQuery,
      SearchCorrectionCandidatesQueryVariables
    >(SearchCorrectionCandidatesDocument, variables),
    ...options,
  });
};

useSearchCorrectionCandidatesQuery.getKey = (
  variables: SearchCorrectionCandidatesQueryVariables
) => ['SearchCorrectionCandidates', variables];

export const useInfiniteSearchCorrectionCandidatesQuery = <
  TData = InfiniteData<SearchCorrectionCandidatesQuery>,
  TError = unknown,
>(
  variables: SearchCorrectionCandidatesQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchCorrectionCandidatesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchCorrectionCandidatesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchCorrectionCandidatesQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'SearchCorrectionCandidates.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            SearchCorrectionCandidatesQuery,
            SearchCorrectionCandidatesQueryVariables
          >(SearchCorrectionCandidatesDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchCorrectionCandidatesQuery.getKey = (
  variables: SearchCorrectionCandidatesQueryVariables
) => ['SearchCorrectionCandidates.infinite', variables];

export const DailyChallengeDocument = `
    query DailyChallenge($date: DateTime) {
  dailyChallenge(date: $date) {
    id
    date
    maxAttempts
    totalPlays
    totalWins
    avgAttempts
    imageUrl
    cloudflareImageId
    mySession {
      id
      status
      attemptCount
      won
      startedAt
      completedAt
    }
  }
}
    `;

export const useDailyChallengeQuery = <
  TData = DailyChallengeQuery,
  TError = unknown,
>(
  variables?: DailyChallengeQueryVariables,
  options?: Omit<
    UseQueryOptions<DailyChallengeQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<DailyChallengeQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<DailyChallengeQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['DailyChallenge']
        : ['DailyChallenge', variables],
    queryFn: fetcher<DailyChallengeQuery, DailyChallengeQueryVariables>(
      DailyChallengeDocument,
      variables
    ),
    ...options,
  });
};

useDailyChallengeQuery.getKey = (variables?: DailyChallengeQueryVariables) =>
  variables === undefined ? ['DailyChallenge'] : ['DailyChallenge', variables];

export const useInfiniteDailyChallengeQuery = <
  TData = InfiniteData<DailyChallengeQuery>,
  TError = unknown,
>(
  variables: DailyChallengeQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<DailyChallengeQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      DailyChallengeQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<DailyChallengeQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['DailyChallenge.infinite']
            : ['DailyChallenge.infinite', variables],
        queryFn: metaData =>
          fetcher<DailyChallengeQuery, DailyChallengeQueryVariables>(
            DailyChallengeDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteDailyChallengeQuery.getKey = (
  variables?: DailyChallengeQueryVariables
) =>
  variables === undefined
    ? ['DailyChallenge.infinite']
    : ['DailyChallenge.infinite', variables];

export const CuratedChallengesDocument = `
    query CuratedChallenges($limit: Int, $offset: Int) {
  curatedChallenges(limit: $limit, offset: $offset) {
    id
    sequence
    pinnedDate
    createdAt
    album {
      id
      title
      cloudflareImageId
      releaseDate
      artists {
        artist {
          id
          name
        }
      }
    }
  }
}
    `;

export const useCuratedChallengesQuery = <
  TData = CuratedChallengesQuery,
  TError = unknown,
>(
  variables?: CuratedChallengesQueryVariables,
  options?: Omit<
    UseQueryOptions<CuratedChallengesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      CuratedChallengesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<CuratedChallengesQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['CuratedChallenges']
        : ['CuratedChallenges', variables],
    queryFn: fetcher<CuratedChallengesQuery, CuratedChallengesQueryVariables>(
      CuratedChallengesDocument,
      variables
    ),
    ...options,
  });
};

useCuratedChallengesQuery.getKey = (
  variables?: CuratedChallengesQueryVariables
) =>
  variables === undefined
    ? ['CuratedChallenges']
    : ['CuratedChallenges', variables];

export const useInfiniteCuratedChallengesQuery = <
  TData = InfiniteData<CuratedChallengesQuery>,
  TError = unknown,
>(
  variables: CuratedChallengesQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<CuratedChallengesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      CuratedChallengesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<CuratedChallengesQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['CuratedChallenges.infinite']
            : ['CuratedChallenges.infinite', variables],
        queryFn: metaData =>
          fetcher<CuratedChallengesQuery, CuratedChallengesQueryVariables>(
            CuratedChallengesDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteCuratedChallengesQuery.getKey = (
  variables?: CuratedChallengesQueryVariables
) =>
  variables === undefined
    ? ['CuratedChallenges.infinite']
    : ['CuratedChallenges.infinite', variables];

export const CuratedChallengeCountDocument = `
    query CuratedChallengeCount {
  curatedChallengeCount
}
    `;

export const useCuratedChallengeCountQuery = <
  TData = CuratedChallengeCountQuery,
  TError = unknown,
>(
  variables?: CuratedChallengeCountQueryVariables,
  options?: Omit<
    UseQueryOptions<CuratedChallengeCountQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      CuratedChallengeCountQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<CuratedChallengeCountQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['CuratedChallengeCount']
        : ['CuratedChallengeCount', variables],
    queryFn: fetcher<
      CuratedChallengeCountQuery,
      CuratedChallengeCountQueryVariables
    >(CuratedChallengeCountDocument, variables),
    ...options,
  });
};

useCuratedChallengeCountQuery.getKey = (
  variables?: CuratedChallengeCountQueryVariables
) =>
  variables === undefined
    ? ['CuratedChallengeCount']
    : ['CuratedChallengeCount', variables];

export const useInfiniteCuratedChallengeCountQuery = <
  TData = InfiniteData<CuratedChallengeCountQuery>,
  TError = unknown,
>(
  variables: CuratedChallengeCountQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<CuratedChallengeCountQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      CuratedChallengeCountQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<CuratedChallengeCountQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['CuratedChallengeCount.infinite']
            : ['CuratedChallengeCount.infinite', variables],
        queryFn: metaData =>
          fetcher<
            CuratedChallengeCountQuery,
            CuratedChallengeCountQueryVariables
          >(CuratedChallengeCountDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteCuratedChallengeCountQuery.getKey = (
  variables?: CuratedChallengeCountQueryVariables
) =>
  variables === undefined
    ? ['CuratedChallengeCount.infinite']
    : ['CuratedChallengeCount.infinite', variables];

export const UpcomingChallengesDocument = `
    query UpcomingChallenges($days: Int!) {
  upcomingChallenges(days: $days) {
    date
    daysSinceEpoch
    sequence
    isPinned
    album {
      id
      title
      cloudflareImageId
      releaseDate
      artists {
        artist {
          id
          name
        }
      }
    }
  }
}
    `;

export const useUpcomingChallengesQuery = <
  TData = UpcomingChallengesQuery,
  TError = unknown,
>(
  variables: UpcomingChallengesQueryVariables,
  options?: Omit<
    UseQueryOptions<UpcomingChallengesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      UpcomingChallengesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<UpcomingChallengesQuery, TError, TData>({
    queryKey: ['UpcomingChallenges', variables],
    queryFn: fetcher<UpcomingChallengesQuery, UpcomingChallengesQueryVariables>(
      UpcomingChallengesDocument,
      variables
    ),
    ...options,
  });
};

useUpcomingChallengesQuery.getKey = (
  variables: UpcomingChallengesQueryVariables
) => ['UpcomingChallenges', variables];

export const useInfiniteUpcomingChallengesQuery = <
  TData = InfiniteData<UpcomingChallengesQuery>,
  TError = unknown,
>(
  variables: UpcomingChallengesQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<UpcomingChallengesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      UpcomingChallengesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<UpcomingChallengesQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['UpcomingChallenges.infinite', variables],
        queryFn: metaData =>
          fetcher<UpcomingChallengesQuery, UpcomingChallengesQueryVariables>(
            UpcomingChallengesDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteUpcomingChallengesQuery.getKey = (
  variables: UpcomingChallengesQueryVariables
) => ['UpcomingChallenges.infinite', variables];

export const AddCuratedChallengeDocument = `
    mutation AddCuratedChallenge($albumId: UUID!, $pinnedDate: DateTime) {
  addCuratedChallenge(albumId: $albumId, pinnedDate: $pinnedDate) {
    id
    sequence
    pinnedDate
    album {
      id
      title
    }
  }
}
    `;

export const useAddCuratedChallengeMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    AddCuratedChallengeMutation,
    TError,
    AddCuratedChallengeMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddCuratedChallengeMutation,
    TError,
    AddCuratedChallengeMutationVariables,
    TContext
  >({
    mutationKey: ['AddCuratedChallenge'],
    mutationFn: (variables?: AddCuratedChallengeMutationVariables) =>
      fetcher<
        AddCuratedChallengeMutation,
        AddCuratedChallengeMutationVariables
      >(AddCuratedChallengeDocument, variables)(),
    ...options,
  });
};

useAddCuratedChallengeMutation.getKey = () => ['AddCuratedChallenge'];

export const RemoveCuratedChallengeDocument = `
    mutation RemoveCuratedChallenge($id: UUID!) {
  removeCuratedChallenge(id: $id)
}
    `;

export const useRemoveCuratedChallengeMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    RemoveCuratedChallengeMutation,
    TError,
    RemoveCuratedChallengeMutationVariables,
    TContext
  >
) => {
  return useMutation<
    RemoveCuratedChallengeMutation,
    TError,
    RemoveCuratedChallengeMutationVariables,
    TContext
  >({
    mutationKey: ['RemoveCuratedChallenge'],
    mutationFn: (variables?: RemoveCuratedChallengeMutationVariables) =>
      fetcher<
        RemoveCuratedChallengeMutation,
        RemoveCuratedChallengeMutationVariables
      >(RemoveCuratedChallengeDocument, variables)(),
    ...options,
  });
};

useRemoveCuratedChallengeMutation.getKey = () => ['RemoveCuratedChallenge'];

export const PinCuratedChallengeDocument = `
    mutation PinCuratedChallenge($id: UUID!, $date: DateTime!) {
  pinCuratedChallenge(id: $id, date: $date) {
    id
    sequence
    pinnedDate
    album {
      id
      title
    }
  }
}
    `;

export const usePinCuratedChallengeMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    PinCuratedChallengeMutation,
    TError,
    PinCuratedChallengeMutationVariables,
    TContext
  >
) => {
  return useMutation<
    PinCuratedChallengeMutation,
    TError,
    PinCuratedChallengeMutationVariables,
    TContext
  >({
    mutationKey: ['PinCuratedChallenge'],
    mutationFn: (variables?: PinCuratedChallengeMutationVariables) =>
      fetcher<
        PinCuratedChallengeMutation,
        PinCuratedChallengeMutationVariables
      >(PinCuratedChallengeDocument, variables)(),
    ...options,
  });
};

usePinCuratedChallengeMutation.getKey = () => ['PinCuratedChallenge'];

export const UnpinCuratedChallengeDocument = `
    mutation UnpinCuratedChallenge($id: UUID!) {
  unpinCuratedChallenge(id: $id) {
    id
    sequence
    pinnedDate
    album {
      id
      title
    }
  }
}
    `;

export const useUnpinCuratedChallengeMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UnpinCuratedChallengeMutation,
    TError,
    UnpinCuratedChallengeMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UnpinCuratedChallengeMutation,
    TError,
    UnpinCuratedChallengeMutationVariables,
    TContext
  >({
    mutationKey: ['UnpinCuratedChallenge'],
    mutationFn: (variables?: UnpinCuratedChallengeMutationVariables) =>
      fetcher<
        UnpinCuratedChallengeMutation,
        UnpinCuratedChallengeMutationVariables
      >(UnpinCuratedChallengeDocument, variables)(),
    ...options,
  });
};

useUnpinCuratedChallengeMutation.getKey = () => ['UnpinCuratedChallenge'];

export const GetLlamaLogsDocument = `
    query GetLlamaLogs($entityType: EnrichmentEntityType, $entityId: UUID, $status: LlamaLogStatus, $category: [LlamaLogCategory!], $skip: Int, $limit: Int, $parentOnly: Boolean, $parentJobId: String, $includeChildren: Boolean) {
  llamaLogs(
    entityType: $entityType
    entityId: $entityId
    status: $status
    category: $category
    skip: $skip
    limit: $limit
    parentOnly: $parentOnly
    parentJobId: $parentJobId
    includeChildren: $includeChildren
  ) {
    id
    entityType
    entityId
    operation
    sources
    status
    category
    reason
    fieldsEnriched
    dataQualityBefore
    dataQualityAfter
    errorMessage
    errorCode
    durationMs
    apiCallCount
    metadata
    createdAt
    jobId
    parentJobId
  }
}
    `;

export const useGetLlamaLogsQuery = <
  TData = GetLlamaLogsQuery,
  TError = unknown,
>(
  variables?: GetLlamaLogsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetLlamaLogsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetLlamaLogsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetLlamaLogsQuery, TError, TData>({
    queryKey:
      variables === undefined ? ['GetLlamaLogs'] : ['GetLlamaLogs', variables],
    queryFn: fetcher<GetLlamaLogsQuery, GetLlamaLogsQueryVariables>(
      GetLlamaLogsDocument,
      variables
    ),
    ...options,
  });
};

useGetLlamaLogsQuery.getKey = (variables?: GetLlamaLogsQueryVariables) =>
  variables === undefined ? ['GetLlamaLogs'] : ['GetLlamaLogs', variables];

export const useInfiniteGetLlamaLogsQuery = <
  TData = InfiniteData<GetLlamaLogsQuery>,
  TError = unknown,
>(
  variables: GetLlamaLogsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetLlamaLogsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetLlamaLogsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetLlamaLogsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetLlamaLogs.infinite']
            : ['GetLlamaLogs.infinite', variables],
        queryFn: metaData =>
          fetcher<GetLlamaLogsQuery, GetLlamaLogsQueryVariables>(
            GetLlamaLogsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetLlamaLogsQuery.getKey = (
  variables?: GetLlamaLogsQueryVariables
) =>
  variables === undefined
    ? ['GetLlamaLogs.infinite']
    : ['GetLlamaLogs.infinite', variables];

export const GetLlamaLogsWithChildrenDocument = `
    query GetLlamaLogsWithChildren($entityType: EnrichmentEntityType, $entityId: UUID, $status: LlamaLogStatus, $skip: Int, $limit: Int) {
  llamaLogs(
    entityType: $entityType
    entityId: $entityId
    status: $status
    skip: $skip
    limit: $limit
    includeChildren: true
  ) {
    id
    entityType
    entityId
    operation
    sources
    status
    category
    reason
    fieldsEnriched
    dataQualityBefore
    dataQualityAfter
    errorMessage
    errorCode
    durationMs
    apiCallCount
    metadata
    createdAt
    jobId
    parentJobId
    children {
      id
      entityType
      entityId
      operation
      sources
      status
      category
      reason
      fieldsEnriched
      errorMessage
      errorCode
      durationMs
      apiCallCount
      createdAt
      jobId
      parentJobId
    }
  }
}
    `;

export const useGetLlamaLogsWithChildrenQuery = <
  TData = GetLlamaLogsWithChildrenQuery,
  TError = unknown,
>(
  variables?: GetLlamaLogsWithChildrenQueryVariables,
  options?: Omit<
    UseQueryOptions<GetLlamaLogsWithChildrenQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetLlamaLogsWithChildrenQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetLlamaLogsWithChildrenQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetLlamaLogsWithChildren']
        : ['GetLlamaLogsWithChildren', variables],
    queryFn: fetcher<
      GetLlamaLogsWithChildrenQuery,
      GetLlamaLogsWithChildrenQueryVariables
    >(GetLlamaLogsWithChildrenDocument, variables),
    ...options,
  });
};

useGetLlamaLogsWithChildrenQuery.getKey = (
  variables?: GetLlamaLogsWithChildrenQueryVariables
) =>
  variables === undefined
    ? ['GetLlamaLogsWithChildren']
    : ['GetLlamaLogsWithChildren', variables];

export const useInfiniteGetLlamaLogsWithChildrenQuery = <
  TData = InfiniteData<GetLlamaLogsWithChildrenQuery>,
  TError = unknown,
>(
  variables: GetLlamaLogsWithChildrenQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetLlamaLogsWithChildrenQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetLlamaLogsWithChildrenQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetLlamaLogsWithChildrenQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetLlamaLogsWithChildren.infinite']
            : ['GetLlamaLogsWithChildren.infinite', variables],
        queryFn: metaData =>
          fetcher<
            GetLlamaLogsWithChildrenQuery,
            GetLlamaLogsWithChildrenQueryVariables
          >(GetLlamaLogsWithChildrenDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetLlamaLogsWithChildrenQuery.getKey = (
  variables?: GetLlamaLogsWithChildrenQueryVariables
) =>
  variables === undefined
    ? ['GetLlamaLogsWithChildren.infinite']
    : ['GetLlamaLogsWithChildren.infinite', variables];

export const GetEnrichmentStatsDocument = `
    query GetEnrichmentStats($entityType: EnrichmentEntityType, $timeRange: TimeRangeInput) {
  enrichmentStats(entityType: $entityType, timeRange: $timeRange) {
    totalAttempts
    successCount
    failedCount
    noDataCount
    skippedCount
    averageDurationMs
    sourceStats {
      source
      attempts
      successRate
    }
  }
}
    `;

export const useGetEnrichmentStatsQuery = <
  TData = GetEnrichmentStatsQuery,
  TError = unknown,
>(
  variables?: GetEnrichmentStatsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetEnrichmentStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetEnrichmentStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetEnrichmentStatsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetEnrichmentStats']
        : ['GetEnrichmentStats', variables],
    queryFn: fetcher<GetEnrichmentStatsQuery, GetEnrichmentStatsQueryVariables>(
      GetEnrichmentStatsDocument,
      variables
    ),
    ...options,
  });
};

useGetEnrichmentStatsQuery.getKey = (
  variables?: GetEnrichmentStatsQueryVariables
) =>
  variables === undefined
    ? ['GetEnrichmentStats']
    : ['GetEnrichmentStats', variables];

export const useInfiniteGetEnrichmentStatsQuery = <
  TData = InfiniteData<GetEnrichmentStatsQuery>,
  TError = unknown,
>(
  variables: GetEnrichmentStatsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetEnrichmentStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetEnrichmentStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetEnrichmentStatsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetEnrichmentStats.infinite']
            : ['GetEnrichmentStats.infinite', variables],
        queryFn: metaData =>
          fetcher<GetEnrichmentStatsQuery, GetEnrichmentStatsQueryVariables>(
            GetEnrichmentStatsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetEnrichmentStatsQuery.getKey = (
  variables?: GetEnrichmentStatsQueryVariables
) =>
  variables === undefined
    ? ['GetEnrichmentStats.infinite']
    : ['GetEnrichmentStats.infinite', variables];

export const TriggerAlbumEnrichmentDocument = `
    mutation TriggerAlbumEnrichment($id: UUID!, $priority: EnrichmentPriority, $force: Boolean) {
  triggerAlbumEnrichment(id: $id, priority: $priority, force: $force) {
    success
    jobId
    message
  }
}
    `;

export const useTriggerAlbumEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    TriggerAlbumEnrichmentMutation,
    TError,
    TriggerAlbumEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    TriggerAlbumEnrichmentMutation,
    TError,
    TriggerAlbumEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['TriggerAlbumEnrichment'],
    mutationFn: (variables?: TriggerAlbumEnrichmentMutationVariables) =>
      fetcher<
        TriggerAlbumEnrichmentMutation,
        TriggerAlbumEnrichmentMutationVariables
      >(TriggerAlbumEnrichmentDocument, variables)(),
    ...options,
  });
};

useTriggerAlbumEnrichmentMutation.getKey = () => ['TriggerAlbumEnrichment'];

export const TriggerArtistEnrichmentDocument = `
    mutation TriggerArtistEnrichment($id: UUID!, $priority: EnrichmentPriority, $force: Boolean) {
  triggerArtistEnrichment(id: $id, priority: $priority, force: $force) {
    success
    jobId
    message
  }
}
    `;

export const useTriggerArtistEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    TriggerArtistEnrichmentMutation,
    TError,
    TriggerArtistEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    TriggerArtistEnrichmentMutation,
    TError,
    TriggerArtistEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['TriggerArtistEnrichment'],
    mutationFn: (variables?: TriggerArtistEnrichmentMutationVariables) =>
      fetcher<
        TriggerArtistEnrichmentMutation,
        TriggerArtistEnrichmentMutationVariables
      >(TriggerArtistEnrichmentDocument, variables)(),
    ...options,
  });
};

useTriggerArtistEnrichmentMutation.getKey = () => ['TriggerArtistEnrichment'];

export const BatchEnrichmentDocument = `
    mutation BatchEnrichment($ids: [UUID!]!, $type: EnrichmentType!, $priority: EnrichmentPriority) {
  batchEnrichment(ids: $ids, type: $type, priority: $priority) {
    success
    jobsQueued
    message
  }
}
    `;

export const useBatchEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    BatchEnrichmentMutation,
    TError,
    BatchEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    BatchEnrichmentMutation,
    TError,
    BatchEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['BatchEnrichment'],
    mutationFn: (variables?: BatchEnrichmentMutationVariables) =>
      fetcher<BatchEnrichmentMutation, BatchEnrichmentMutationVariables>(
        BatchEnrichmentDocument,
        variables
      )(),
    ...options,
  });
};

useBatchEnrichmentMutation.getKey = () => ['BatchEnrichment'];

export const PreviewAlbumEnrichmentDocument = `
    mutation PreviewAlbumEnrichment($id: UUID!) {
  previewAlbumEnrichment(id: $id) {
    success
    message
    matchScore
    matchedEntity
    sources
    fieldsToUpdate {
      field
      currentValue
      newValue
      source
    }
    llamaLogId
    rawData
  }
}
    `;

export const usePreviewAlbumEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    PreviewAlbumEnrichmentMutation,
    TError,
    PreviewAlbumEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    PreviewAlbumEnrichmentMutation,
    TError,
    PreviewAlbumEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['PreviewAlbumEnrichment'],
    mutationFn: (variables?: PreviewAlbumEnrichmentMutationVariables) =>
      fetcher<
        PreviewAlbumEnrichmentMutation,
        PreviewAlbumEnrichmentMutationVariables
      >(PreviewAlbumEnrichmentDocument, variables)(),
    ...options,
  });
};

usePreviewAlbumEnrichmentMutation.getKey = () => ['PreviewAlbumEnrichment'];

export const PreviewArtistEnrichmentDocument = `
    mutation PreviewArtistEnrichment($id: UUID!) {
  previewArtistEnrichment(id: $id) {
    success
    message
    matchScore
    matchedEntity
    sources
    fieldsToUpdate {
      field
      currentValue
      newValue
      source
    }
    llamaLogId
    rawData
  }
}
    `;

export const usePreviewArtistEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    PreviewArtistEnrichmentMutation,
    TError,
    PreviewArtistEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    PreviewArtistEnrichmentMutation,
    TError,
    PreviewArtistEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['PreviewArtistEnrichment'],
    mutationFn: (variables?: PreviewArtistEnrichmentMutationVariables) =>
      fetcher<
        PreviewArtistEnrichmentMutation,
        PreviewArtistEnrichmentMutationVariables
      >(PreviewArtistEnrichmentDocument, variables)(),
    ...options,
  });
};

usePreviewArtistEnrichmentMutation.getKey = () => ['PreviewArtistEnrichment'];

export const GamePoolStatsDocument = `
    query GamePoolStats {
  gamePoolStats {
    eligibleCount
    excludedCount
    neutralCount
    totalWithCoverArt
  }
}
    `;

export const useGamePoolStatsQuery = <
  TData = GamePoolStatsQuery,
  TError = unknown,
>(
  variables?: GamePoolStatsQueryVariables,
  options?: Omit<
    UseQueryOptions<GamePoolStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GamePoolStatsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GamePoolStatsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GamePoolStats']
        : ['GamePoolStats', variables],
    queryFn: fetcher<GamePoolStatsQuery, GamePoolStatsQueryVariables>(
      GamePoolStatsDocument,
      variables
    ),
    ...options,
  });
};

useGamePoolStatsQuery.getKey = (variables?: GamePoolStatsQueryVariables) =>
  variables === undefined ? ['GamePoolStats'] : ['GamePoolStats', variables];

export const useInfiniteGamePoolStatsQuery = <
  TData = InfiniteData<GamePoolStatsQuery>,
  TError = unknown,
>(
  variables: GamePoolStatsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GamePoolStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GamePoolStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GamePoolStatsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GamePoolStats.infinite']
            : ['GamePoolStats.infinite', variables],
        queryFn: metaData =>
          fetcher<GamePoolStatsQuery, GamePoolStatsQueryVariables>(
            GamePoolStatsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGamePoolStatsQuery.getKey = (
  variables?: GamePoolStatsQueryVariables
) =>
  variables === undefined
    ? ['GamePoolStats.infinite']
    : ['GamePoolStats.infinite', variables];

export const AlbumsByGameStatusDocument = `
    query AlbumsByGameStatus($status: AlbumGameStatus!, $limit: Int, $offset: Int) {
  albumsByGameStatus(status: $status, limit: $limit, offset: $offset) {
    id
    title
    releaseDate
    coverArtUrl
    cloudflareImageId
    gameStatus
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useAlbumsByGameStatusQuery = <
  TData = AlbumsByGameStatusQuery,
  TError = unknown,
>(
  variables: AlbumsByGameStatusQueryVariables,
  options?: Omit<
    UseQueryOptions<AlbumsByGameStatusQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      AlbumsByGameStatusQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<AlbumsByGameStatusQuery, TError, TData>({
    queryKey: ['AlbumsByGameStatus', variables],
    queryFn: fetcher<AlbumsByGameStatusQuery, AlbumsByGameStatusQueryVariables>(
      AlbumsByGameStatusDocument,
      variables
    ),
    ...options,
  });
};

useAlbumsByGameStatusQuery.getKey = (
  variables: AlbumsByGameStatusQueryVariables
) => ['AlbumsByGameStatus', variables];

export const useInfiniteAlbumsByGameStatusQuery = <
  TData = InfiniteData<AlbumsByGameStatusQuery>,
  TError = unknown,
>(
  variables: AlbumsByGameStatusQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<AlbumsByGameStatusQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      AlbumsByGameStatusQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<AlbumsByGameStatusQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['AlbumsByGameStatus.infinite', variables],
        queryFn: metaData =>
          fetcher<AlbumsByGameStatusQuery, AlbumsByGameStatusQueryVariables>(
            AlbumsByGameStatusDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteAlbumsByGameStatusQuery.getKey = (
  variables: AlbumsByGameStatusQueryVariables
) => ['AlbumsByGameStatus.infinite', variables];

export const SuggestedGameAlbumsDocument = `
    query SuggestedGameAlbums($limit: Int, $offset: Int, $syncSource: String, $search: String) {
  suggestedGameAlbums(
    limit: $limit
    offset: $offset
    syncSource: $syncSource
    search: $search
  ) {
    id
    title
    releaseDate
    coverArtUrl
    cloudflareImageId
    gameStatus
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useSuggestedGameAlbumsQuery = <
  TData = SuggestedGameAlbumsQuery,
  TError = unknown,
>(
  variables?: SuggestedGameAlbumsQueryVariables,
  options?: Omit<
    UseQueryOptions<SuggestedGameAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      SuggestedGameAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<SuggestedGameAlbumsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['SuggestedGameAlbums']
        : ['SuggestedGameAlbums', variables],
    queryFn: fetcher<
      SuggestedGameAlbumsQuery,
      SuggestedGameAlbumsQueryVariables
    >(SuggestedGameAlbumsDocument, variables),
    ...options,
  });
};

useSuggestedGameAlbumsQuery.getKey = (
  variables?: SuggestedGameAlbumsQueryVariables
) =>
  variables === undefined
    ? ['SuggestedGameAlbums']
    : ['SuggestedGameAlbums', variables];

export const useInfiniteSuggestedGameAlbumsQuery = <
  TData = InfiniteData<SuggestedGameAlbumsQuery>,
  TError = unknown,
>(
  variables: SuggestedGameAlbumsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SuggestedGameAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SuggestedGameAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SuggestedGameAlbumsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['SuggestedGameAlbums.infinite']
            : ['SuggestedGameAlbums.infinite', variables],
        queryFn: metaData =>
          fetcher<SuggestedGameAlbumsQuery, SuggestedGameAlbumsQueryVariables>(
            SuggestedGameAlbumsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSuggestedGameAlbumsQuery.getKey = (
  variables?: SuggestedGameAlbumsQueryVariables
) =>
  variables === undefined
    ? ['SuggestedGameAlbums.infinite']
    : ['SuggestedGameAlbums.infinite', variables];

export const UpdateAlbumGameStatusDocument = `
    mutation UpdateAlbumGameStatus($input: UpdateAlbumGameStatusInput!) {
  updateAlbumGameStatus(input: $input) {
    success
    error
    album {
      id
      title
      gameStatus
    }
  }
}
    `;

export const useUpdateAlbumGameStatusMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateAlbumGameStatusMutation,
    TError,
    UpdateAlbumGameStatusMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateAlbumGameStatusMutation,
    TError,
    UpdateAlbumGameStatusMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateAlbumGameStatus'],
    mutationFn: (variables?: UpdateAlbumGameStatusMutationVariables) =>
      fetcher<
        UpdateAlbumGameStatusMutation,
        UpdateAlbumGameStatusMutationVariables
      >(UpdateAlbumGameStatusDocument, variables)(),
    ...options,
  });
};

useUpdateAlbumGameStatusMutation.getKey = () => ['UpdateAlbumGameStatus'];

export const GetAlbumRecommendationsDocument = `
    query GetAlbumRecommendations($albumId: UUID!, $filter: String, $sort: String, $skip: Int, $limit: Int) {
  getAlbumRecommendations(
    albumId: $albumId
    filter: $filter
    sort: $sort
    skip: $skip
    limit: $limit
  ) {
    recommendations {
      id
      score
      createdAt
      updatedAt
      userId
      albumRole
      otherAlbum {
        id
        title
        artist
        imageUrl
        cloudflareImageId
        year
      }
      user {
        id
        username
        image
      }
    }
    pagination {
      page
      perPage
      total
      hasMore
    }
  }
}
    `;

export const useGetAlbumRecommendationsQuery = <
  TData = GetAlbumRecommendationsQuery,
  TError = unknown,
>(
  variables: GetAlbumRecommendationsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetAlbumRecommendationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetAlbumRecommendationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetAlbumRecommendationsQuery, TError, TData>({
    queryKey: ['GetAlbumRecommendations', variables],
    queryFn: fetcher<
      GetAlbumRecommendationsQuery,
      GetAlbumRecommendationsQueryVariables
    >(GetAlbumRecommendationsDocument, variables),
    ...options,
  });
};

useGetAlbumRecommendationsQuery.getKey = (
  variables: GetAlbumRecommendationsQueryVariables
) => ['GetAlbumRecommendations', variables];

export const useInfiniteGetAlbumRecommendationsQuery = <
  TData = InfiniteData<GetAlbumRecommendationsQuery>,
  TError = unknown,
>(
  variables: GetAlbumRecommendationsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetAlbumRecommendationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetAlbumRecommendationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetAlbumRecommendationsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetAlbumRecommendations.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetAlbumRecommendationsQuery,
            GetAlbumRecommendationsQueryVariables
          >(GetAlbumRecommendationsDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetAlbumRecommendationsQuery.getKey = (
  variables: GetAlbumRecommendationsQueryVariables
) => ['GetAlbumRecommendations.infinite', variables];

export const GetArtistDetailsDocument = `
    query GetArtistDetails($id: UUID!) {
  artist(id: $id) {
    id
    musicbrainzId
    discogsId
    name
    biography
    formedYear
    countryCode
    imageUrl
    cloudflareImageId
    createdAt
    updatedAt
    dataQuality
    enrichmentStatus
    lastEnriched
    albumCount
    trackCount
    popularity
    needsEnrichment
    listeners
    latestLlamaLog {
      id
      status
      sources
      fieldsEnriched
      errorMessage
      createdAt
    }
    llamaLogs(limit: 5) {
      id
      operation
      sources
      status
      fieldsEnriched
      errorMessage
      durationMs
      createdAt
    }
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

export const useGetArtistDetailsQuery = <
  TData = GetArtistDetailsQuery,
  TError = unknown,
>(
  variables: GetArtistDetailsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetArtistDetailsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetArtistDetailsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetArtistDetailsQuery, TError, TData>({
    queryKey: ['GetArtistDetails', variables],
    queryFn: fetcher<GetArtistDetailsQuery, GetArtistDetailsQueryVariables>(
      GetArtistDetailsDocument,
      variables
    ),
    ...options,
  });
};

useGetArtistDetailsQuery.getKey = (
  variables: GetArtistDetailsQueryVariables
) => ['GetArtistDetails', variables];

export const useInfiniteGetArtistDetailsQuery = <
  TData = InfiniteData<GetArtistDetailsQuery>,
  TError = unknown,
>(
  variables: GetArtistDetailsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetArtistDetailsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetArtistDetailsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetArtistDetailsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetArtistDetails.infinite', variables],
        queryFn: metaData =>
          fetcher<GetArtistDetailsQuery, GetArtistDetailsQueryVariables>(
            GetArtistDetailsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetArtistDetailsQuery.getKey = (
  variables: GetArtistDetailsQueryVariables
) => ['GetArtistDetails.infinite', variables];

export const GetCollectionDocument = `
    query GetCollection($id: String!) {
  collection(id: $id) {
    id
    name
    description
    isPublic
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
        cloudflareImageId
        releaseDate
        artists {
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

export const useGetCollectionQuery = <
  TData = GetCollectionQuery,
  TError = unknown,
>(
  variables: GetCollectionQueryVariables,
  options?: Omit<
    UseQueryOptions<GetCollectionQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetCollectionQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetCollectionQuery, TError, TData>({
    queryKey: ['GetCollection', variables],
    queryFn: fetcher<GetCollectionQuery, GetCollectionQueryVariables>(
      GetCollectionDocument,
      variables
    ),
    ...options,
  });
};

useGetCollectionQuery.getKey = (variables: GetCollectionQueryVariables) => [
  'GetCollection',
  variables,
];

export const useInfiniteGetCollectionQuery = <
  TData = InfiniteData<GetCollectionQuery>,
  TError = unknown,
>(
  variables: GetCollectionQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetCollectionQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetCollectionQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetCollectionQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetCollection.infinite', variables],
        queryFn: metaData =>
          fetcher<GetCollectionQuery, GetCollectionQueryVariables>(
            GetCollectionDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetCollectionQuery.getKey = (
  variables: GetCollectionQueryVariables
) => ['GetCollection.infinite', variables];

export const GetMyCollectionAlbumsDocument = `
    query GetMyCollectionAlbums {
  myCollectionAlbums {
    id
    position
    personalRating
    personalNotes
    addedAt
    album {
      id
      title
      coverArtUrl
      releaseDate
      artists {
        artist {
          id
          name
        }
      }
    }
    collection {
      id
      name
    }
  }
}
    `;

export const useGetMyCollectionAlbumsQuery = <
  TData = GetMyCollectionAlbumsQuery,
  TError = unknown,
>(
  variables?: GetMyCollectionAlbumsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetMyCollectionAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetMyCollectionAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetMyCollectionAlbumsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetMyCollectionAlbums']
        : ['GetMyCollectionAlbums', variables],
    queryFn: fetcher<
      GetMyCollectionAlbumsQuery,
      GetMyCollectionAlbumsQueryVariables
    >(GetMyCollectionAlbumsDocument, variables),
    ...options,
  });
};

useGetMyCollectionAlbumsQuery.getKey = (
  variables?: GetMyCollectionAlbumsQueryVariables
) =>
  variables === undefined
    ? ['GetMyCollectionAlbums']
    : ['GetMyCollectionAlbums', variables];

export const useInfiniteGetMyCollectionAlbumsQuery = <
  TData = InfiniteData<GetMyCollectionAlbumsQuery>,
  TError = unknown,
>(
  variables: GetMyCollectionAlbumsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetMyCollectionAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetMyCollectionAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetMyCollectionAlbumsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetMyCollectionAlbums.infinite']
            : ['GetMyCollectionAlbums.infinite', variables],
        queryFn: metaData =>
          fetcher<
            GetMyCollectionAlbumsQuery,
            GetMyCollectionAlbumsQueryVariables
          >(GetMyCollectionAlbumsDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetMyCollectionAlbumsQuery.getKey = (
  variables?: GetMyCollectionAlbumsQueryVariables
) =>
  variables === undefined
    ? ['GetMyCollectionAlbums.infinite']
    : ['GetMyCollectionAlbums.infinite', variables];

export const GetMyCollectionsDocument = `
    query GetMyCollections {
  myCollections {
    id
    name
    albumCount
    albums {
      id
      album {
        id
        title
        releaseDate
        coverArtUrl
        artists {
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

export const useGetMyCollectionsQuery = <
  TData = GetMyCollectionsQuery,
  TError = unknown,
>(
  variables?: GetMyCollectionsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetMyCollectionsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetMyCollectionsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetMyCollectionsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetMyCollections']
        : ['GetMyCollections', variables],
    queryFn: fetcher<GetMyCollectionsQuery, GetMyCollectionsQueryVariables>(
      GetMyCollectionsDocument,
      variables
    ),
    ...options,
  });
};

useGetMyCollectionsQuery.getKey = (
  variables?: GetMyCollectionsQueryVariables
) =>
  variables === undefined
    ? ['GetMyCollections']
    : ['GetMyCollections', variables];

export const useInfiniteGetMyCollectionsQuery = <
  TData = InfiniteData<GetMyCollectionsQuery>,
  TError = unknown,
>(
  variables: GetMyCollectionsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetMyCollectionsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetMyCollectionsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetMyCollectionsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetMyCollections.infinite']
            : ['GetMyCollections.infinite', variables],
        queryFn: metaData =>
          fetcher<GetMyCollectionsQuery, GetMyCollectionsQueryVariables>(
            GetMyCollectionsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetMyCollectionsQuery.getKey = (
  variables?: GetMyCollectionsQueryVariables
) =>
  variables === undefined
    ? ['GetMyCollections.infinite']
    : ['GetMyCollections.infinite', variables];

export const GetUserCollectionListDocument = `
    query GetUserCollectionList($userId: String!) {
  user(id: $userId) {
    id
    collections {
      id
      name
      description
      isPublic
      updatedAt
      albumCount
    }
  }
}
    `;

export const useGetUserCollectionListQuery = <
  TData = GetUserCollectionListQuery,
  TError = unknown,
>(
  variables: GetUserCollectionListQueryVariables,
  options?: Omit<
    UseQueryOptions<GetUserCollectionListQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetUserCollectionListQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetUserCollectionListQuery, TError, TData>({
    queryKey: ['GetUserCollectionList', variables],
    queryFn: fetcher<
      GetUserCollectionListQuery,
      GetUserCollectionListQueryVariables
    >(GetUserCollectionListDocument, variables),
    ...options,
  });
};

useGetUserCollectionListQuery.getKey = (
  variables: GetUserCollectionListQueryVariables
) => ['GetUserCollectionList', variables];

export const useInfiniteGetUserCollectionListQuery = <
  TData = InfiniteData<GetUserCollectionListQuery>,
  TError = unknown,
>(
  variables: GetUserCollectionListQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetUserCollectionListQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetUserCollectionListQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetUserCollectionListQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'GetUserCollectionList.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            GetUserCollectionListQuery,
            GetUserCollectionListQueryVariables
          >(GetUserCollectionListDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetUserCollectionListQuery.getKey = (
  variables: GetUserCollectionListQueryVariables
) => ['GetUserCollectionList.infinite', variables];

export const GetUserCollectionsDocument = `
    query GetUserCollections($userId: String!) {
  user(id: $userId) {
    id
    collections {
      id
      name
      description
      isPublic
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
          cloudflareImageId
          releaseDate
          artists {
            artist {
              id
              name
            }
          }
        }
      }
    }
  }
}
    `;

export const useGetUserCollectionsQuery = <
  TData = GetUserCollectionsQuery,
  TError = unknown,
>(
  variables: GetUserCollectionsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetUserCollectionsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetUserCollectionsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetUserCollectionsQuery, TError, TData>({
    queryKey: ['GetUserCollections', variables],
    queryFn: fetcher<GetUserCollectionsQuery, GetUserCollectionsQueryVariables>(
      GetUserCollectionsDocument,
      variables
    ),
    ...options,
  });
};

useGetUserCollectionsQuery.getKey = (
  variables: GetUserCollectionsQueryVariables
) => ['GetUserCollections', variables];

export const useInfiniteGetUserCollectionsQuery = <
  TData = InfiniteData<GetUserCollectionsQuery>,
  TError = unknown,
>(
  variables: GetUserCollectionsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetUserCollectionsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetUserCollectionsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetUserCollectionsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetUserCollections.infinite', variables],
        queryFn: metaData =>
          fetcher<GetUserCollectionsQuery, GetUserCollectionsQueryVariables>(
            GetUserCollectionsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetUserCollectionsQuery.getKey = (
  variables: GetUserCollectionsQueryVariables
) => ['GetUserCollections.infinite', variables];

export const GetUserProfileDocument = `
    query GetUserProfile($userId: String!) {
  user(id: $userId) {
    id
    username
    email
    image
    bio
    role
    followersCount
    followingCount
    recommendationsCount
    isFollowing
    settings {
      profileVisibility
    }
  }
}
    `;

export const useGetUserProfileQuery = <
  TData = GetUserProfileQuery,
  TError = unknown,
>(
  variables: GetUserProfileQueryVariables,
  options?: Omit<
    UseQueryOptions<GetUserProfileQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetUserProfileQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetUserProfileQuery, TError, TData>({
    queryKey: ['GetUserProfile', variables],
    queryFn: fetcher<GetUserProfileQuery, GetUserProfileQueryVariables>(
      GetUserProfileDocument,
      variables
    ),
    ...options,
  });
};

useGetUserProfileQuery.getKey = (variables: GetUserProfileQueryVariables) => [
  'GetUserProfile',
  variables,
];

export const useInfiniteGetUserProfileQuery = <
  TData = InfiniteData<GetUserProfileQuery>,
  TError = unknown,
>(
  variables: GetUserProfileQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetUserProfileQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetUserProfileQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetUserProfileQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetUserProfile.infinite', variables],
        queryFn: metaData =>
          fetcher<GetUserProfileQuery, GetUserProfileQueryVariables>(
            GetUserProfileDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetUserProfileQuery.getKey = (
  variables: GetUserProfileQueryVariables
) => ['GetUserProfile.infinite', variables];

export const ImportDeezerPlaylistDocument = `
    mutation ImportDeezerPlaylist($playlistId: String!) {
  importDeezerPlaylist(playlistId: $playlistId) {
    success
    message
    jobId
    playlistName
  }
}
    `;

export const useImportDeezerPlaylistMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ImportDeezerPlaylistMutation,
    TError,
    ImportDeezerPlaylistMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ImportDeezerPlaylistMutation,
    TError,
    ImportDeezerPlaylistMutationVariables,
    TContext
  >({
    mutationKey: ['ImportDeezerPlaylist'],
    mutationFn: (variables?: ImportDeezerPlaylistMutationVariables) =>
      fetcher<
        ImportDeezerPlaylistMutation,
        ImportDeezerPlaylistMutationVariables
      >(ImportDeezerPlaylistDocument, variables)(),
    ...options,
  });
};

useImportDeezerPlaylistMutation.getKey = () => ['ImportDeezerPlaylist'];

export const AlbumsByJobIdDocument = `
    query AlbumsByJobId($jobId: String!) {
  albumsByJobId(jobId: $jobId) {
    id
    title
    coverArtUrl
    cloudflareImageId
    releaseDate
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useAlbumsByJobIdQuery = <
  TData = AlbumsByJobIdQuery,
  TError = unknown,
>(
  variables: AlbumsByJobIdQueryVariables,
  options?: Omit<
    UseQueryOptions<AlbumsByJobIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<AlbumsByJobIdQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<AlbumsByJobIdQuery, TError, TData>({
    queryKey: ['AlbumsByJobId', variables],
    queryFn: fetcher<AlbumsByJobIdQuery, AlbumsByJobIdQueryVariables>(
      AlbumsByJobIdDocument,
      variables
    ),
    ...options,
  });
};

useAlbumsByJobIdQuery.getKey = (variables: AlbumsByJobIdQueryVariables) => [
  'AlbumsByJobId',
  variables,
];

export const useInfiniteAlbumsByJobIdQuery = <
  TData = InfiniteData<AlbumsByJobIdQuery>,
  TError = unknown,
>(
  variables: AlbumsByJobIdQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<AlbumsByJobIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      AlbumsByJobIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<AlbumsByJobIdQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['AlbumsByJobId.infinite', variables],
        queryFn: metaData =>
          fetcher<AlbumsByJobIdQuery, AlbumsByJobIdQueryVariables>(
            AlbumsByJobIdDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteAlbumsByJobIdQuery.getKey = (
  variables: AlbumsByJobIdQueryVariables
) => ['AlbumsByJobId.infinite', variables];

export const GetLatestReleasesDocument = `
    query GetLatestReleases($source: String = "SPOTIFY", $sortBy: String = "createdAt", $sortOrder: String = "desc", $limit: Int = 200) {
  searchAlbums(
    source: $source
    sortBy: $sortBy
    sortOrder: $sortOrder
    limit: $limit
  ) {
    id
    title
    releaseDate
    coverArtUrl
    createdAt
    artists {
      artist {
        id
        name
      }
      position
    }
  }
}
    `;

export const useGetLatestReleasesQuery = <
  TData = GetLatestReleasesQuery,
  TError = unknown,
>(
  variables?: GetLatestReleasesQueryVariables,
  options?: Omit<
    UseQueryOptions<GetLatestReleasesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetLatestReleasesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetLatestReleasesQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetLatestReleases']
        : ['GetLatestReleases', variables],
    queryFn: fetcher<GetLatestReleasesQuery, GetLatestReleasesQueryVariables>(
      GetLatestReleasesDocument,
      variables
    ),
    ...options,
  });
};

useGetLatestReleasesQuery.getKey = (
  variables?: GetLatestReleasesQueryVariables
) =>
  variables === undefined
    ? ['GetLatestReleases']
    : ['GetLatestReleases', variables];

export const useInfiniteGetLatestReleasesQuery = <
  TData = InfiniteData<GetLatestReleasesQuery>,
  TError = unknown,
>(
  variables: GetLatestReleasesQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetLatestReleasesQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetLatestReleasesQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetLatestReleasesQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetLatestReleases.infinite']
            : ['GetLatestReleases.infinite', variables],
        queryFn: metaData =>
          fetcher<GetLatestReleasesQuery, GetLatestReleasesQueryVariables>(
            GetLatestReleasesDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetLatestReleasesQuery.getKey = (
  variables?: GetLatestReleasesQueryVariables
) =>
  variables === undefined
    ? ['GetLatestReleases.infinite']
    : ['GetLatestReleases.infinite', variables];

export const GetLlamaLogChainDocument = `
    query GetLlamaLogChain($entityType: EnrichmentEntityType!, $entityId: UUID!, $categories: [LlamaLogCategory!], $startDate: DateTime, $endDate: DateTime, $limit: Int = 20, $cursor: String) {
  llamaLogChain(
    entityType: $entityType
    entityId: $entityId
    categories: $categories
    startDate: $startDate
    endDate: $endDate
    limit: $limit
    cursor: $cursor
  ) {
    logs {
      id
      entityType
      entityId
      operation
      sources
      status
      category
      reason
      fieldsEnriched
      dataQualityBefore
      dataQualityAfter
      errorMessage
      errorCode
      durationMs
      apiCallCount
      metadata
      createdAt
      jobId
      parentJobId
      rootJobId
    }
    totalCount
    cursor
    hasMore
  }
}
    `;

export const useGetLlamaLogChainQuery = <
  TData = GetLlamaLogChainQuery,
  TError = unknown,
>(
  variables: GetLlamaLogChainQueryVariables,
  options?: Omit<
    UseQueryOptions<GetLlamaLogChainQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetLlamaLogChainQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetLlamaLogChainQuery, TError, TData>({
    queryKey: ['GetLlamaLogChain', variables],
    queryFn: fetcher<GetLlamaLogChainQuery, GetLlamaLogChainQueryVariables>(
      GetLlamaLogChainDocument,
      variables
    ),
    ...options,
  });
};

useGetLlamaLogChainQuery.getKey = (
  variables: GetLlamaLogChainQueryVariables
) => ['GetLlamaLogChain', variables];

export const useInfiniteGetLlamaLogChainQuery = <
  TData = InfiniteData<GetLlamaLogChainQuery>,
  TError = unknown,
>(
  variables: GetLlamaLogChainQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetLlamaLogChainQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetLlamaLogChainQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetLlamaLogChainQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetLlamaLogChain.infinite', variables],
        queryFn: metaData =>
          fetcher<GetLlamaLogChainQuery, GetLlamaLogChainQueryVariables>(
            GetLlamaLogChainDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetLlamaLogChainQuery.getKey = (
  variables: GetLlamaLogChainQueryVariables
) => ['GetLlamaLogChain.infinite', variables];

export const GetMySettingsDocument = `
    query GetMySettings {
  mySettings {
    id
    userId
    theme
    language
    profileVisibility
    showRecentActivity
    showCollections
    showListenLaterInFeed
    showCollectionAddsInFeed
    showOnboardingTour
    emailNotifications
    recommendationAlerts
    followAlerts
    defaultCollectionView
    autoplayPreviews
    createdAt
    updatedAt
  }
}
    `;

export const useGetMySettingsQuery = <
  TData = GetMySettingsQuery,
  TError = unknown,
>(
  variables?: GetMySettingsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetMySettingsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetMySettingsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetMySettingsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetMySettings']
        : ['GetMySettings', variables],
    queryFn: fetcher<GetMySettingsQuery, GetMySettingsQueryVariables>(
      GetMySettingsDocument,
      variables
    ),
    ...options,
  });
};

useGetMySettingsQuery.getKey = (variables?: GetMySettingsQueryVariables) =>
  variables === undefined ? ['GetMySettings'] : ['GetMySettings', variables];

export const useInfiniteGetMySettingsQuery = <
  TData = InfiniteData<GetMySettingsQuery>,
  TError = unknown,
>(
  variables: GetMySettingsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetMySettingsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetMySettingsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetMySettingsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetMySettings.infinite']
            : ['GetMySettings.infinite', variables],
        queryFn: metaData =>
          fetcher<GetMySettingsQuery, GetMySettingsQueryVariables>(
            GetMySettingsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetMySettingsQuery.getKey = (
  variables?: GetMySettingsQueryVariables
) =>
  variables === undefined
    ? ['GetMySettings.infinite']
    : ['GetMySettings.infinite', variables];

export const PreviewDeezerPlaylistDocument = `
    query PreviewDeezerPlaylist($playlistId: String!) {
  previewDeezerPlaylist(playlistId: $playlistId) {
    playlistId
    name
    description
    creator
    image
    trackCount
    deezerUrl
    albums {
      deezerId
      title
      artist
      year
      coverUrl
      totalTracks
      albumType
    }
    stats {
      totalTracks
      uniqueAlbums
      albumsAfterFilter
      singlesFiltered
      compilationsFiltered
    }
  }
}
    `;

export const usePreviewDeezerPlaylistQuery = <
  TData = PreviewDeezerPlaylistQuery,
  TError = unknown,
>(
  variables: PreviewDeezerPlaylistQueryVariables,
  options?: Omit<
    UseQueryOptions<PreviewDeezerPlaylistQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      PreviewDeezerPlaylistQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<PreviewDeezerPlaylistQuery, TError, TData>({
    queryKey: ['PreviewDeezerPlaylist', variables],
    queryFn: fetcher<
      PreviewDeezerPlaylistQuery,
      PreviewDeezerPlaylistQueryVariables
    >(PreviewDeezerPlaylistDocument, variables),
    ...options,
  });
};

usePreviewDeezerPlaylistQuery.getKey = (
  variables: PreviewDeezerPlaylistQueryVariables
) => ['PreviewDeezerPlaylist', variables];

export const useInfinitePreviewDeezerPlaylistQuery = <
  TData = InfiniteData<PreviewDeezerPlaylistQuery>,
  TError = unknown,
>(
  variables: PreviewDeezerPlaylistQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<PreviewDeezerPlaylistQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      PreviewDeezerPlaylistQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<PreviewDeezerPlaylistQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? [
          'PreviewDeezerPlaylist.infinite',
          variables,
        ],
        queryFn: metaData =>
          fetcher<
            PreviewDeezerPlaylistQuery,
            PreviewDeezerPlaylistQueryVariables
          >(PreviewDeezerPlaylistDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfinitePreviewDeezerPlaylistQuery.getKey = (
  variables: PreviewDeezerPlaylistQueryVariables
) => ['PreviewDeezerPlaylist.infinite', variables];

export const GetRecommendationFeedDocument = `
    query GetRecommendationFeed($cursor: String, $limit: Int) {
  recommendationFeed(cursor: $cursor, limit: $limit) {
    recommendations {
      ...RecommendationFields
    }
    cursor
    hasMore
  }
}
    ${RecommendationFieldsFragmentDoc}`;

export const useGetRecommendationFeedQuery = <
  TData = GetRecommendationFeedQuery,
  TError = unknown,
>(
  variables?: GetRecommendationFeedQueryVariables,
  options?: Omit<
    UseQueryOptions<GetRecommendationFeedQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetRecommendationFeedQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetRecommendationFeedQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetRecommendationFeed']
        : ['GetRecommendationFeed', variables],
    queryFn: fetcher<
      GetRecommendationFeedQuery,
      GetRecommendationFeedQueryVariables
    >(GetRecommendationFeedDocument, variables),
    ...options,
  });
};

useGetRecommendationFeedQuery.getKey = (
  variables?: GetRecommendationFeedQueryVariables
) =>
  variables === undefined
    ? ['GetRecommendationFeed']
    : ['GetRecommendationFeed', variables];

export const useInfiniteGetRecommendationFeedQuery = <
  TData = InfiniteData<GetRecommendationFeedQuery>,
  TError = unknown,
>(
  variables: GetRecommendationFeedQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetRecommendationFeedQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetRecommendationFeedQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetRecommendationFeedQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetRecommendationFeed.infinite']
            : ['GetRecommendationFeed.infinite', variables],
        queryFn: metaData =>
          fetcher<
            GetRecommendationFeedQuery,
            GetRecommendationFeedQueryVariables
          >(GetRecommendationFeedDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetRecommendationFeedQuery.getKey = (
  variables?: GetRecommendationFeedQueryVariables
) =>
  variables === undefined
    ? ['GetRecommendationFeed.infinite']
    : ['GetRecommendationFeed.infinite', variables];

export const GetMyRecommendationsDocument = `
    query GetMyRecommendations($cursor: String, $limit: Int, $sort: RecommendationSort) {
  myRecommendations(cursor: $cursor, limit: $limit, sort: $sort) {
    recommendations {
      ...RecommendationFields
    }
    cursor
    hasMore
  }
}
    ${RecommendationFieldsFragmentDoc}`;

export const useGetMyRecommendationsQuery = <
  TData = GetMyRecommendationsQuery,
  TError = unknown,
>(
  variables?: GetMyRecommendationsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetMyRecommendationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetMyRecommendationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetMyRecommendationsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetMyRecommendations']
        : ['GetMyRecommendations', variables],
    queryFn: fetcher<
      GetMyRecommendationsQuery,
      GetMyRecommendationsQueryVariables
    >(GetMyRecommendationsDocument, variables),
    ...options,
  });
};

useGetMyRecommendationsQuery.getKey = (
  variables?: GetMyRecommendationsQueryVariables
) =>
  variables === undefined
    ? ['GetMyRecommendations']
    : ['GetMyRecommendations', variables];

export const useInfiniteGetMyRecommendationsQuery = <
  TData = InfiniteData<GetMyRecommendationsQuery>,
  TError = unknown,
>(
  variables: GetMyRecommendationsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetMyRecommendationsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetMyRecommendationsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetMyRecommendationsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetMyRecommendations.infinite']
            : ['GetMyRecommendations.infinite', variables],
        queryFn: metaData =>
          fetcher<
            GetMyRecommendationsQuery,
            GetMyRecommendationsQueryVariables
          >(GetMyRecommendationsDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetMyRecommendationsQuery.getKey = (
  variables?: GetMyRecommendationsQueryVariables
) =>
  variables === undefined
    ? ['GetMyRecommendations.infinite']
    : ['GetMyRecommendations.infinite', variables];

export const CreateRecommendationDocument = `
    mutation CreateRecommendation($basisAlbumId: UUID!, $recommendedAlbumId: UUID!, $score: Int!) {
  createRecommendation(
    basisAlbumId: $basisAlbumId
    recommendedAlbumId: $recommendedAlbumId
    score: $score
  ) {
    id
  }
}
    `;

export const useCreateRecommendationMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    CreateRecommendationMutation,
    TError,
    CreateRecommendationMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateRecommendationMutation,
    TError,
    CreateRecommendationMutationVariables,
    TContext
  >({
    mutationKey: ['CreateRecommendation'],
    mutationFn: (variables?: CreateRecommendationMutationVariables) =>
      fetcher<
        CreateRecommendationMutation,
        CreateRecommendationMutationVariables
      >(CreateRecommendationDocument, variables)(),
    ...options,
  });
};

useCreateRecommendationMutation.getKey = () => ['CreateRecommendation'];

export const CreateRecommendationWithAlbumsDocument = `
    mutation CreateRecommendationWithAlbums($input: CreateRecommendationWithAlbumsInput!) {
  createRecommendation(input: $input) {
    id
  }
}
    `;

export const useCreateRecommendationWithAlbumsMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    CreateRecommendationWithAlbumsMutation,
    TError,
    CreateRecommendationWithAlbumsMutationVariables,
    TContext
  >
) => {
  return useMutation<
    CreateRecommendationWithAlbumsMutation,
    TError,
    CreateRecommendationWithAlbumsMutationVariables,
    TContext
  >({
    mutationKey: ['CreateRecommendationWithAlbums'],
    mutationFn: (variables?: CreateRecommendationWithAlbumsMutationVariables) =>
      fetcher<
        CreateRecommendationWithAlbumsMutation,
        CreateRecommendationWithAlbumsMutationVariables
      >(CreateRecommendationWithAlbumsDocument, variables)(),
    ...options,
  });
};

useCreateRecommendationWithAlbumsMutation.getKey = () => [
  'CreateRecommendationWithAlbums',
];

export const UpdateRecommendationDocument = `
    mutation UpdateRecommendation($id: String!, $score: Int!) {
  updateRecommendation(id: $id, score: $score) {
    id
  }
}
    `;

export const useUpdateRecommendationMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateRecommendationMutation,
    TError,
    UpdateRecommendationMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateRecommendationMutation,
    TError,
    UpdateRecommendationMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateRecommendation'],
    mutationFn: (variables?: UpdateRecommendationMutationVariables) =>
      fetcher<
        UpdateRecommendationMutation,
        UpdateRecommendationMutationVariables
      >(UpdateRecommendationDocument, variables)(),
    ...options,
  });
};

useUpdateRecommendationMutation.getKey = () => ['UpdateRecommendation'];

export const DeleteRecommendationDocument = `
    mutation DeleteRecommendation($id: String!) {
  deleteRecommendation(id: $id)
}
    `;

export const useDeleteRecommendationMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    DeleteRecommendationMutation,
    TError,
    DeleteRecommendationMutationVariables,
    TContext
  >
) => {
  return useMutation<
    DeleteRecommendationMutation,
    TError,
    DeleteRecommendationMutationVariables,
    TContext
  >({
    mutationKey: ['DeleteRecommendation'],
    mutationFn: (variables?: DeleteRecommendationMutationVariables) =>
      fetcher<
        DeleteRecommendationMutation,
        DeleteRecommendationMutationVariables
      >(DeleteRecommendationDocument, variables)(),
    ...options,
  });
};

useDeleteRecommendationMutation.getKey = () => ['DeleteRecommendation'];

export const GetRecommendationDocument = `
    query GetRecommendation($id: String!) {
  recommendation(id: $id) {
    ...RecommendationFields
  }
}
    ${RecommendationFieldsFragmentDoc}`;

export const useGetRecommendationQuery = <
  TData = GetRecommendationQuery,
  TError = unknown,
>(
  variables: GetRecommendationQueryVariables,
  options?: Omit<
    UseQueryOptions<GetRecommendationQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetRecommendationQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetRecommendationQuery, TError, TData>({
    queryKey: ['GetRecommendation', variables],
    queryFn: fetcher<GetRecommendationQuery, GetRecommendationQueryVariables>(
      GetRecommendationDocument,
      variables
    ),
    ...options,
  });
};

useGetRecommendationQuery.getKey = (
  variables: GetRecommendationQueryVariables
) => ['GetRecommendation', variables];

export const useInfiniteGetRecommendationQuery = <
  TData = InfiniteData<GetRecommendationQuery>,
  TError = unknown,
>(
  variables: GetRecommendationQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetRecommendationQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetRecommendationQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetRecommendationQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetRecommendation.infinite', variables],
        queryFn: metaData =>
          fetcher<GetRecommendationQuery, GetRecommendationQueryVariables>(
            GetRecommendationDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetRecommendationQuery.getKey = (
  variables: GetRecommendationQueryVariables
) => ['GetRecommendation.infinite', variables];

export const ResetAlbumEnrichmentDocument = `
    mutation ResetAlbumEnrichment($id: UUID!) {
  resetAlbumEnrichment(id: $id) {
    id
    enrichmentStatus
    lastEnriched
  }
}
    `;

export const useResetAlbumEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ResetAlbumEnrichmentMutation,
    TError,
    ResetAlbumEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ResetAlbumEnrichmentMutation,
    TError,
    ResetAlbumEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['ResetAlbumEnrichment'],
    mutationFn: (variables?: ResetAlbumEnrichmentMutationVariables) =>
      fetcher<
        ResetAlbumEnrichmentMutation,
        ResetAlbumEnrichmentMutationVariables
      >(ResetAlbumEnrichmentDocument, variables)(),
    ...options,
  });
};

useResetAlbumEnrichmentMutation.getKey = () => ['ResetAlbumEnrichment'];

export const ResetArtistEnrichmentDocument = `
    mutation ResetArtistEnrichment($id: UUID!) {
  resetArtistEnrichment(id: $id) {
    id
    enrichmentStatus
    lastEnriched
  }
}
    `;

export const useResetArtistEnrichmentMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ResetArtistEnrichmentMutation,
    TError,
    ResetArtistEnrichmentMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ResetArtistEnrichmentMutation,
    TError,
    ResetArtistEnrichmentMutationVariables,
    TContext
  >({
    mutationKey: ['ResetArtistEnrichment'],
    mutationFn: (variables?: ResetArtistEnrichmentMutationVariables) =>
      fetcher<
        ResetArtistEnrichmentMutation,
        ResetArtistEnrichmentMutationVariables
      >(ResetArtistEnrichmentDocument, variables)(),
    ...options,
  });
};

useResetArtistEnrichmentMutation.getKey = () => ['ResetArtistEnrichment'];

export const SearchDocument = `
    query Search($input: SearchInput!) {
  search(input: $input) {
    total
    hasMore
    currentCount
    albums {
      id
      source
      title
      releaseDate
      primaryType
      secondaryTypes
      imageUrl
      artistName
      artistCredits {
        artist {
          id
          name
        }
        role
        position
      }
      trackCount
      year
    }
    artists {
      id
      musicbrainzId
      name
      imageUrl
      cloudflareImageId
    }
    tracks {
      id
      albumId
      musicbrainzId
      title
      durationMs
      trackNumber
      searchCoverArtUrl
      searchArtistName
      album {
        id
        title
        coverArtUrl
        cloudflareImageId
      }
      artists {
        artist {
          id
          name
        }
      }
    }
    users {
      id
      username
      image
      bio
      followersCount
      followingCount
      recommendationsCount
    }
  }
}
    `;

export const useSearchQuery = <TData = SearchQuery, TError = unknown>(
  variables: SearchQueryVariables,
  options?: Omit<UseQueryOptions<SearchQuery, TError, TData>, 'queryKey'> & {
    queryKey?: UseQueryOptions<SearchQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<SearchQuery, TError, TData>({
    queryKey: ['Search', variables],
    queryFn: fetcher<SearchQuery, SearchQueryVariables>(
      SearchDocument,
      variables
    ),
    ...options,
  });
};

useSearchQuery.getKey = (variables: SearchQueryVariables) => [
  'Search',
  variables,
];

export const useInfiniteSearchQuery = <
  TData = InfiniteData<SearchQuery>,
  TError = unknown,
>(
  variables: SearchQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<SearchQuery, TError, TData>['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['Search.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchQuery, SearchQueryVariables>(SearchDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchQuery.getKey = (variables: SearchQueryVariables) => [
  'Search.infinite',
  variables,
];

export const SearchAlbumsDocument = `
    query SearchAlbums($query: String!, $limit: Int) {
  searchAlbums(query: $query, limit: $limit) {
    id
    musicbrainzId
    title
    releaseDate
    coverArtUrl
    cloudflareImageId
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useSearchAlbumsQuery = <
  TData = SearchAlbumsQuery,
  TError = unknown,
>(
  variables: SearchAlbumsQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<SearchAlbumsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<SearchAlbumsQuery, TError, TData>({
    queryKey: ['SearchAlbums', variables],
    queryFn: fetcher<SearchAlbumsQuery, SearchAlbumsQueryVariables>(
      SearchAlbumsDocument,
      variables
    ),
    ...options,
  });
};

useSearchAlbumsQuery.getKey = (variables: SearchAlbumsQueryVariables) => [
  'SearchAlbums',
  variables,
];

export const useInfiniteSearchAlbumsQuery = <
  TData = InfiniteData<SearchAlbumsQuery>,
  TError = unknown,
>(
  variables: SearchAlbumsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchAlbumsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['SearchAlbums.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchAlbumsQuery, SearchAlbumsQueryVariables>(
            SearchAlbumsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchAlbumsQuery.getKey = (
  variables: SearchAlbumsQueryVariables
) => ['SearchAlbums.infinite', variables];

export const SearchArtistsDocument = `
    query SearchArtists($query: String!, $limit: Int) {
  searchArtists(query: $query, limit: $limit) {
    id
    musicbrainzId
    name
    imageUrl
    cloudflareImageId
  }
}
    `;

export const useSearchArtistsQuery = <
  TData = SearchArtistsQuery,
  TError = unknown,
>(
  variables: SearchArtistsQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchArtistsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<SearchArtistsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<SearchArtistsQuery, TError, TData>({
    queryKey: ['SearchArtists', variables],
    queryFn: fetcher<SearchArtistsQuery, SearchArtistsQueryVariables>(
      SearchArtistsDocument,
      variables
    ),
    ...options,
  });
};

useSearchArtistsQuery.getKey = (variables: SearchArtistsQueryVariables) => [
  'SearchArtists',
  variables,
];

export const useInfiniteSearchArtistsQuery = <
  TData = InfiniteData<SearchArtistsQuery>,
  TError = unknown,
>(
  variables: SearchArtistsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchArtistsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchArtistsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchArtistsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['SearchArtists.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchArtistsQuery, SearchArtistsQueryVariables>(
            SearchArtistsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchArtistsQuery.getKey = (
  variables: SearchArtistsQueryVariables
) => ['SearchArtists.infinite', variables];

export const SearchTracksDocument = `
    query SearchTracks($query: String!, $limit: Int) {
  searchTracks(query: $query, limit: $limit) {
    id
    albumId
    musicbrainzId
    title
    durationMs
    trackNumber
    album {
      id
      title
      coverArtUrl
      cloudflareImageId
    }
    artists {
      artist {
        id
        name
      }
    }
  }
}
    `;

export const useSearchTracksQuery = <
  TData = SearchTracksQuery,
  TError = unknown,
>(
  variables: SearchTracksQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchTracksQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<SearchTracksQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<SearchTracksQuery, TError, TData>({
    queryKey: ['SearchTracks', variables],
    queryFn: fetcher<SearchTracksQuery, SearchTracksQueryVariables>(
      SearchTracksDocument,
      variables
    ),
    ...options,
  });
};

useSearchTracksQuery.getKey = (variables: SearchTracksQueryVariables) => [
  'SearchTracks',
  variables,
];

export const useInfiniteSearchTracksQuery = <
  TData = InfiniteData<SearchTracksQuery>,
  TError = unknown,
>(
  variables: SearchTracksQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchTracksQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchTracksQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchTracksQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['SearchTracks.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchTracksQuery, SearchTracksQueryVariables>(
            SearchTracksDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchTracksQuery.getKey = (
  variables: SearchTracksQueryVariables
) => ['SearchTracks.infinite', variables];

export const SearchAlbumsAdminDocument = `
    query SearchAlbumsAdmin($query: String, $id: UUID, $dataQuality: String, $enrichmentStatus: String, $needsEnrichment: Boolean, $source: String, $sortBy: String, $sortOrder: String, $skip: Int, $limit: Int) {
  searchAlbums(
    query: $query
    id: $id
    dataQuality: $dataQuality
    enrichmentStatus: $enrichmentStatus
    needsEnrichment: $needsEnrichment
    source: $source
    sortBy: $sortBy
    sortOrder: $sortOrder
    skip: $skip
    limit: $limit
  ) {
    id
    musicbrainzId
    spotifyId
    title
    releaseDate
    coverArtUrl
    cloudflareImageId
    dataQuality
    enrichmentStatus
    lastEnriched
    needsEnrichment
    trackCount
    label
    barcode
    artists {
      artist {
        id
        name
      }
      role
    }
  }
}
    `;

export const useSearchAlbumsAdminQuery = <
  TData = SearchAlbumsAdminQuery,
  TError = unknown,
>(
  variables?: SearchAlbumsAdminQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchAlbumsAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      SearchAlbumsAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<SearchAlbumsAdminQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['SearchAlbumsAdmin']
        : ['SearchAlbumsAdmin', variables],
    queryFn: fetcher<SearchAlbumsAdminQuery, SearchAlbumsAdminQueryVariables>(
      SearchAlbumsAdminDocument,
      variables
    ),
    ...options,
  });
};

useSearchAlbumsAdminQuery.getKey = (
  variables?: SearchAlbumsAdminQueryVariables
) =>
  variables === undefined
    ? ['SearchAlbumsAdmin']
    : ['SearchAlbumsAdmin', variables];

export const useInfiniteSearchAlbumsAdminQuery = <
  TData = InfiniteData<SearchAlbumsAdminQuery>,
  TError = unknown,
>(
  variables: SearchAlbumsAdminQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchAlbumsAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchAlbumsAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchAlbumsAdminQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['SearchAlbumsAdmin.infinite']
            : ['SearchAlbumsAdmin.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchAlbumsAdminQuery, SearchAlbumsAdminQueryVariables>(
            SearchAlbumsAdminDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchAlbumsAdminQuery.getKey = (
  variables?: SearchAlbumsAdminQueryVariables
) =>
  variables === undefined
    ? ['SearchAlbumsAdmin.infinite']
    : ['SearchAlbumsAdmin.infinite', variables];

export const SearchArtistsAdminDocument = `
    query SearchArtistsAdmin($query: String, $id: UUID, $dataQuality: String, $enrichmentStatus: String, $needsEnrichment: Boolean, $sortBy: String, $sortOrder: String, $skip: Int, $limit: Int) {
  searchArtists(
    query: $query
    id: $id
    dataQuality: $dataQuality
    enrichmentStatus: $enrichmentStatus
    needsEnrichment: $needsEnrichment
    sortBy: $sortBy
    sortOrder: $sortOrder
    skip: $skip
    limit: $limit
  ) {
    id
    musicbrainzId
    spotifyId
    name
    imageUrl
    cloudflareImageId
    dataQuality
    enrichmentStatus
    lastEnriched
    needsEnrichment
    albumCount
    trackCount
    formedYear
    countryCode
  }
}
    `;

export const useSearchArtistsAdminQuery = <
  TData = SearchArtistsAdminQuery,
  TError = unknown,
>(
  variables?: SearchArtistsAdminQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchArtistsAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      SearchArtistsAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<SearchArtistsAdminQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['SearchArtistsAdmin']
        : ['SearchArtistsAdmin', variables],
    queryFn: fetcher<SearchArtistsAdminQuery, SearchArtistsAdminQueryVariables>(
      SearchArtistsAdminDocument,
      variables
    ),
    ...options,
  });
};

useSearchArtistsAdminQuery.getKey = (
  variables?: SearchArtistsAdminQueryVariables
) =>
  variables === undefined
    ? ['SearchArtistsAdmin']
    : ['SearchArtistsAdmin', variables];

export const useInfiniteSearchArtistsAdminQuery = <
  TData = InfiniteData<SearchArtistsAdminQuery>,
  TError = unknown,
>(
  variables: SearchArtistsAdminQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchArtistsAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchArtistsAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchArtistsAdminQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['SearchArtistsAdmin.infinite']
            : ['SearchArtistsAdmin.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchArtistsAdminQuery, SearchArtistsAdminQueryVariables>(
            SearchArtistsAdminDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchArtistsAdminQuery.getKey = (
  variables?: SearchArtistsAdminQueryVariables
) =>
  variables === undefined
    ? ['SearchArtistsAdmin.infinite']
    : ['SearchArtistsAdmin.infinite', variables];

export const SearchTracksAdminDocument = `
    query SearchTracksAdmin($query: String!, $skip: Int, $limit: Int) {
  searchTracks(query: $query, skip: $skip, limit: $limit) {
    id
    albumId
    musicbrainzId
    title
    trackNumber
    discNumber
    durationMs
    isrc
    album {
      id
      title
      coverArtUrl
      cloudflareImageId
    }
    artists {
      artist {
        id
        name
      }
      role
    }
  }
}
    `;

export const useSearchTracksAdminQuery = <
  TData = SearchTracksAdminQuery,
  TError = unknown,
>(
  variables: SearchTracksAdminQueryVariables,
  options?: Omit<
    UseQueryOptions<SearchTracksAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      SearchTracksAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<SearchTracksAdminQuery, TError, TData>({
    queryKey: ['SearchTracksAdmin', variables],
    queryFn: fetcher<SearchTracksAdminQuery, SearchTracksAdminQueryVariables>(
      SearchTracksAdminDocument,
      variables
    ),
    ...options,
  });
};

useSearchTracksAdminQuery.getKey = (
  variables: SearchTracksAdminQueryVariables
) => ['SearchTracksAdmin', variables];

export const useInfiniteSearchTracksAdminQuery = <
  TData = InfiniteData<SearchTracksAdminQuery>,
  TError = unknown,
>(
  variables: SearchTracksAdminQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<SearchTracksAdminQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      SearchTracksAdminQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<SearchTracksAdminQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['SearchTracksAdmin.infinite', variables],
        queryFn: metaData =>
          fetcher<SearchTracksAdminQuery, SearchTracksAdminQueryVariables>(
            SearchTracksAdminDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteSearchTracksAdminQuery.getKey = (
  variables: SearchTracksAdminQueryVariables
) => ['SearchTracksAdmin.infinite', variables];

export const GetDatabaseStatsDocument = `
    query GetDatabaseStats {
  databaseStats {
    totalAlbums
    totalArtists
    totalTracks
    albumsNeedingEnrichment
    artistsNeedingEnrichment
    recentlyEnriched
    failedEnrichments
    averageDataQuality
  }
}
    `;

export const useGetDatabaseStatsQuery = <
  TData = GetDatabaseStatsQuery,
  TError = unknown,
>(
  variables?: GetDatabaseStatsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetDatabaseStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetDatabaseStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetDatabaseStatsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetDatabaseStats']
        : ['GetDatabaseStats', variables],
    queryFn: fetcher<GetDatabaseStatsQuery, GetDatabaseStatsQueryVariables>(
      GetDatabaseStatsDocument,
      variables
    ),
    ...options,
  });
};

useGetDatabaseStatsQuery.getKey = (
  variables?: GetDatabaseStatsQueryVariables
) =>
  variables === undefined
    ? ['GetDatabaseStats']
    : ['GetDatabaseStats', variables];

export const useInfiniteGetDatabaseStatsQuery = <
  TData = InfiniteData<GetDatabaseStatsQuery>,
  TError = unknown,
>(
  variables: GetDatabaseStatsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetDatabaseStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetDatabaseStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetDatabaseStatsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetDatabaseStats.infinite']
            : ['GetDatabaseStats.infinite', variables],
        queryFn: metaData =>
          fetcher<GetDatabaseStatsQuery, GetDatabaseStatsQueryVariables>(
            GetDatabaseStatsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetDatabaseStatsQuery.getKey = (
  variables?: GetDatabaseStatsQueryVariables
) =>
  variables === undefined
    ? ['GetDatabaseStats.infinite']
    : ['GetDatabaseStats.infinite', variables];

export const GetSocialFeedDocument = `
    query GetSocialFeed($type: ActivityType, $cursor: String, $limit: Int = 20) {
  socialFeed(type: $type, cursor: $cursor, limit: $limit) {
    activities {
      ...ActivityFields
    }
    cursor
    hasMore
  }
}
    ${ActivityFieldsFragmentDoc}`;

export const useGetSocialFeedQuery = <
  TData = GetSocialFeedQuery,
  TError = unknown,
>(
  variables?: GetSocialFeedQueryVariables,
  options?: Omit<
    UseQueryOptions<GetSocialFeedQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetSocialFeedQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetSocialFeedQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetSocialFeed']
        : ['GetSocialFeed', variables],
    queryFn: fetcher<GetSocialFeedQuery, GetSocialFeedQueryVariables>(
      GetSocialFeedDocument,
      variables
    ),
    ...options,
  });
};

useGetSocialFeedQuery.getKey = (variables?: GetSocialFeedQueryVariables) =>
  variables === undefined ? ['GetSocialFeed'] : ['GetSocialFeed', variables];

export const useInfiniteGetSocialFeedQuery = <
  TData = InfiniteData<GetSocialFeedQuery>,
  TError = unknown,
>(
  variables: GetSocialFeedQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetSocialFeedQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetSocialFeedQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetSocialFeedQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetSocialFeed.infinite']
            : ['GetSocialFeed.infinite', variables],
        queryFn: metaData =>
          fetcher<GetSocialFeedQuery, GetSocialFeedQueryVariables>(
            GetSocialFeedDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetSocialFeedQuery.getKey = (
  variables?: GetSocialFeedQueryVariables
) =>
  variables === undefined
    ? ['GetSocialFeed.infinite']
    : ['GetSocialFeed.infinite', variables];

export const GetSyncJobsDocument = `
    query GetSyncJobs($input: SyncJobsInput) {
  syncJobs(input: $input) {
    jobs {
      id
      jobId
      jobType
      status
      startedAt
      completedAt
      durationMs
      albumsCreated
      albumsUpdated
      albumsSkipped
      artistsCreated
      artistsUpdated
      errorMessage
      errorCode
      metadata
      triggeredBy
      createdAt
    }
    totalCount
    hasMore
  }
}
    `;

export const useGetSyncJobsQuery = <TData = GetSyncJobsQuery, TError = unknown>(
  variables?: GetSyncJobsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetSyncJobsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<GetSyncJobsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<GetSyncJobsQuery, TError, TData>({
    queryKey:
      variables === undefined ? ['GetSyncJobs'] : ['GetSyncJobs', variables],
    queryFn: fetcher<GetSyncJobsQuery, GetSyncJobsQueryVariables>(
      GetSyncJobsDocument,
      variables
    ),
    ...options,
  });
};

useGetSyncJobsQuery.getKey = (variables?: GetSyncJobsQueryVariables) =>
  variables === undefined ? ['GetSyncJobs'] : ['GetSyncJobs', variables];

export const useInfiniteGetSyncJobsQuery = <
  TData = InfiniteData<GetSyncJobsQuery>,
  TError = unknown,
>(
  variables: GetSyncJobsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetSyncJobsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetSyncJobsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetSyncJobsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetSyncJobs.infinite']
            : ['GetSyncJobs.infinite', variables],
        queryFn: metaData =>
          fetcher<GetSyncJobsQuery, GetSyncJobsQueryVariables>(
            GetSyncJobsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetSyncJobsQuery.getKey = (variables?: GetSyncJobsQueryVariables) =>
  variables === undefined
    ? ['GetSyncJobs.infinite']
    : ['GetSyncJobs.infinite', variables];

export const GetSyncJobDocument = `
    query GetSyncJob($id: UUID!) {
  syncJob(id: $id) {
    id
    jobId
    jobType
    status
    startedAt
    completedAt
    durationMs
    albumsCreated
    albumsUpdated
    albumsSkipped
    artistsCreated
    artistsUpdated
    errorMessage
    errorCode
    metadata
    triggeredBy
    createdAt
    updatedAt
    albums(limit: 100) {
      id
      title
      coverArtUrl
      releaseDate
      artists {
        artist {
          id
          name
        }
      }
    }
  }
}
    `;

export const useGetSyncJobQuery = <TData = GetSyncJobQuery, TError = unknown>(
  variables: GetSyncJobQueryVariables,
  options?: Omit<
    UseQueryOptions<GetSyncJobQuery, TError, TData>,
    'queryKey'
  > & { queryKey?: UseQueryOptions<GetSyncJobQuery, TError, TData>['queryKey'] }
) => {
  return useQuery<GetSyncJobQuery, TError, TData>({
    queryKey: ['GetSyncJob', variables],
    queryFn: fetcher<GetSyncJobQuery, GetSyncJobQueryVariables>(
      GetSyncJobDocument,
      variables
    ),
    ...options,
  });
};

useGetSyncJobQuery.getKey = (variables: GetSyncJobQueryVariables) => [
  'GetSyncJob',
  variables,
];

export const useInfiniteGetSyncJobQuery = <
  TData = InfiniteData<GetSyncJobQuery>,
  TError = unknown,
>(
  variables: GetSyncJobQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetSyncJobQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetSyncJobQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetSyncJobQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetSyncJob.infinite', variables],
        queryFn: metaData =>
          fetcher<GetSyncJobQuery, GetSyncJobQueryVariables>(
            GetSyncJobDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetSyncJobQuery.getKey = (variables: GetSyncJobQueryVariables) => [
  'GetSyncJob.infinite',
  variables,
];

export const GetSyncJobByJobIdDocument = `
    query GetSyncJobByJobId($jobId: String!) {
  syncJobByJobId(jobId: $jobId) {
    id
    jobId
    jobType
    status
    startedAt
    completedAt
    durationMs
    albumsCreated
    albumsUpdated
    albumsSkipped
    artistsCreated
    artistsUpdated
    errorMessage
    metadata
    triggeredBy
  }
}
    `;

export const useGetSyncJobByJobIdQuery = <
  TData = GetSyncJobByJobIdQuery,
  TError = unknown,
>(
  variables: GetSyncJobByJobIdQueryVariables,
  options?: Omit<
    UseQueryOptions<GetSyncJobByJobIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetSyncJobByJobIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetSyncJobByJobIdQuery, TError, TData>({
    queryKey: ['GetSyncJobByJobId', variables],
    queryFn: fetcher<GetSyncJobByJobIdQuery, GetSyncJobByJobIdQueryVariables>(
      GetSyncJobByJobIdDocument,
      variables
    ),
    ...options,
  });
};

useGetSyncJobByJobIdQuery.getKey = (
  variables: GetSyncJobByJobIdQueryVariables
) => ['GetSyncJobByJobId', variables];

export const useInfiniteGetSyncJobByJobIdQuery = <
  TData = InfiniteData<GetSyncJobByJobIdQuery>,
  TError = unknown,
>(
  variables: GetSyncJobByJobIdQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetSyncJobByJobIdQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetSyncJobByJobIdQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetSyncJobByJobIdQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey: optionsQueryKey ?? ['GetSyncJobByJobId.infinite', variables],
        queryFn: metaData =>
          fetcher<GetSyncJobByJobIdQuery, GetSyncJobByJobIdQueryVariables>(
            GetSyncJobByJobIdDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetSyncJobByJobIdQuery.getKey = (
  variables: GetSyncJobByJobIdQueryVariables
) => ['GetSyncJobByJobId.infinite', variables];

export const RollbackSyncJobDocument = `
    mutation RollbackSyncJob($syncJobId: UUID!, $dryRun: Boolean = true) {
  rollbackSyncJob(syncJobId: $syncJobId, dryRun: $dryRun) {
    success
    syncJobId
    albumsDeleted
    artistsDeleted
    message
    dryRun
  }
}
    `;

export const useRollbackSyncJobMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    RollbackSyncJobMutation,
    TError,
    RollbackSyncJobMutationVariables,
    TContext
  >
) => {
  return useMutation<
    RollbackSyncJobMutation,
    TError,
    RollbackSyncJobMutationVariables,
    TContext
  >({
    mutationKey: ['RollbackSyncJob'],
    mutationFn: (variables?: RollbackSyncJobMutationVariables) =>
      fetcher<RollbackSyncJobMutation, RollbackSyncJobMutationVariables>(
        RollbackSyncJobDocument,
        variables
      )(),
    ...options,
  });
};

useRollbackSyncJobMutation.getKey = () => ['RollbackSyncJob'];

export const GetTopRecommendedAlbumsDocument = `
    query GetTopRecommendedAlbums($limit: Int) {
  topRecommendedAlbums(limit: $limit) {
    album {
      id
      title
      coverArtUrl
      cloudflareImageId
      releaseDate
      artists {
        artist {
          id
          name
        }
      }
    }
    recommendationCount
    asBasisCount
    asTargetCount
    averageScore
  }
}
    `;

export const useGetTopRecommendedAlbumsQuery = <
  TData = GetTopRecommendedAlbumsQuery,
  TError = unknown,
>(
  variables?: GetTopRecommendedAlbumsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetTopRecommendedAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetTopRecommendedAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetTopRecommendedAlbumsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetTopRecommendedAlbums']
        : ['GetTopRecommendedAlbums', variables],
    queryFn: fetcher<
      GetTopRecommendedAlbumsQuery,
      GetTopRecommendedAlbumsQueryVariables
    >(GetTopRecommendedAlbumsDocument, variables),
    ...options,
  });
};

useGetTopRecommendedAlbumsQuery.getKey = (
  variables?: GetTopRecommendedAlbumsQueryVariables
) =>
  variables === undefined
    ? ['GetTopRecommendedAlbums']
    : ['GetTopRecommendedAlbums', variables];

export const useInfiniteGetTopRecommendedAlbumsQuery = <
  TData = InfiniteData<GetTopRecommendedAlbumsQuery>,
  TError = unknown,
>(
  variables: GetTopRecommendedAlbumsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetTopRecommendedAlbumsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetTopRecommendedAlbumsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetTopRecommendedAlbumsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetTopRecommendedAlbums.infinite']
            : ['GetTopRecommendedAlbums.infinite', variables],
        queryFn: metaData =>
          fetcher<
            GetTopRecommendedAlbumsQuery,
            GetTopRecommendedAlbumsQueryVariables
          >(GetTopRecommendedAlbumsDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetTopRecommendedAlbumsQuery.getKey = (
  variables?: GetTopRecommendedAlbumsQueryVariables
) =>
  variables === undefined
    ? ['GetTopRecommendedAlbums.infinite']
    : ['GetTopRecommendedAlbums.infinite', variables];

export const GetTopRecommendedArtistsDocument = `
    query GetTopRecommendedArtists($limit: Int) {
  topRecommendedArtists(limit: $limit) {
    artist {
      id
      name
      imageUrl
      cloudflareImageId
    }
    recommendationCount
    albumsInRecommendations
    averageScore
  }
}
    `;

export const useGetTopRecommendedArtistsQuery = <
  TData = GetTopRecommendedArtistsQuery,
  TError = unknown,
>(
  variables?: GetTopRecommendedArtistsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetTopRecommendedArtistsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetTopRecommendedArtistsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetTopRecommendedArtistsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetTopRecommendedArtists']
        : ['GetTopRecommendedArtists', variables],
    queryFn: fetcher<
      GetTopRecommendedArtistsQuery,
      GetTopRecommendedArtistsQueryVariables
    >(GetTopRecommendedArtistsDocument, variables),
    ...options,
  });
};

useGetTopRecommendedArtistsQuery.getKey = (
  variables?: GetTopRecommendedArtistsQueryVariables
) =>
  variables === undefined
    ? ['GetTopRecommendedArtists']
    : ['GetTopRecommendedArtists', variables];

export const useInfiniteGetTopRecommendedArtistsQuery = <
  TData = InfiniteData<GetTopRecommendedArtistsQuery>,
  TError = unknown,
>(
  variables: GetTopRecommendedArtistsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetTopRecommendedArtistsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetTopRecommendedArtistsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetTopRecommendedArtistsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetTopRecommendedArtists.infinite']
            : ['GetTopRecommendedArtists.infinite', variables],
        queryFn: metaData =>
          fetcher<
            GetTopRecommendedArtistsQuery,
            GetTopRecommendedArtistsQueryVariables
          >(GetTopRecommendedArtistsDocument, {
            ...variables,
            ...(metaData.pageParam ?? {}),
          })(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetTopRecommendedArtistsQuery.getKey = (
  variables?: GetTopRecommendedArtistsQueryVariables
) =>
  variables === undefined
    ? ['GetTopRecommendedArtists.infinite']
    : ['GetTopRecommendedArtists.infinite', variables];

export const StartUncoverSessionDocument = `
    mutation StartUncoverSession {
  startUncoverSession {
    session {
      ...UncoverSessionFields
    }
    challengeId
    imageUrl
    cloudflareImageId
  }
}
    ${UncoverSessionFieldsFragmentDoc}`;

export const useStartUncoverSessionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    StartUncoverSessionMutation,
    TError,
    StartUncoverSessionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    StartUncoverSessionMutation,
    TError,
    StartUncoverSessionMutationVariables,
    TContext
  >({
    mutationKey: ['StartUncoverSession'],
    mutationFn: (variables?: StartUncoverSessionMutationVariables) =>
      fetcher<
        StartUncoverSessionMutation,
        StartUncoverSessionMutationVariables
      >(StartUncoverSessionDocument, variables)(),
    ...options,
  });
};

useStartUncoverSessionMutation.getKey = () => ['StartUncoverSession'];

export const SubmitGuessDocument = `
    mutation SubmitGuess($sessionId: UUID!, $albumId: UUID!) {
  submitGuess(sessionId: $sessionId, albumId: $albumId) {
    guess {
      ...UncoverGuessFields
    }
    session {
      ...UncoverSessionFields
    }
    gameOver
    correctAlbum {
      ...UncoverGuessAlbumFields
    }
  }
}
    ${UncoverGuessFieldsFragmentDoc}
${UncoverSessionFieldsFragmentDoc}
${UncoverGuessAlbumFieldsFragmentDoc}`;

export const useSubmitGuessMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    SubmitGuessMutation,
    TError,
    SubmitGuessMutationVariables,
    TContext
  >
) => {
  return useMutation<
    SubmitGuessMutation,
    TError,
    SubmitGuessMutationVariables,
    TContext
  >({
    mutationKey: ['SubmitGuess'],
    mutationFn: (variables?: SubmitGuessMutationVariables) =>
      fetcher<SubmitGuessMutation, SubmitGuessMutationVariables>(
        SubmitGuessDocument,
        variables
      )(),
    ...options,
  });
};

useSubmitGuessMutation.getKey = () => ['SubmitGuess'];

export const SkipGuessDocument = `
    mutation SkipGuess($sessionId: UUID!) {
  skipGuess(sessionId: $sessionId) {
    guess {
      ...UncoverGuessFields
    }
    session {
      ...UncoverSessionFields
    }
    gameOver
    correctAlbum {
      ...UncoverGuessAlbumFields
    }
  }
}
    ${UncoverGuessFieldsFragmentDoc}
${UncoverSessionFieldsFragmentDoc}
${UncoverGuessAlbumFieldsFragmentDoc}`;

export const useSkipGuessMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    SkipGuessMutation,
    TError,
    SkipGuessMutationVariables,
    TContext
  >
) => {
  return useMutation<
    SkipGuessMutation,
    TError,
    SkipGuessMutationVariables,
    TContext
  >({
    mutationKey: ['SkipGuess'],
    mutationFn: (variables?: SkipGuessMutationVariables) =>
      fetcher<SkipGuessMutation, SkipGuessMutationVariables>(
        SkipGuessDocument,
        variables
      )(),
    ...options,
  });
};

useSkipGuessMutation.getKey = () => ['SkipGuess'];

export const ResetDailySessionDocument = `
    mutation ResetDailySession {
  resetDailySession
}
    `;

export const useResetDailySessionMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    ResetDailySessionMutation,
    TError,
    ResetDailySessionMutationVariables,
    TContext
  >
) => {
  return useMutation<
    ResetDailySessionMutation,
    TError,
    ResetDailySessionMutationVariables,
    TContext
  >({
    mutationKey: ['ResetDailySession'],
    mutationFn: (variables?: ResetDailySessionMutationVariables) =>
      fetcher<ResetDailySessionMutation, ResetDailySessionMutationVariables>(
        ResetDailySessionDocument,
        variables
      )(),
    ...options,
  });
};

useResetDailySessionMutation.getKey = () => ['ResetDailySession'];

export const MyUncoverStatsDocument = `
    query MyUncoverStats {
  myUncoverStats {
    id
    gamesPlayed
    gamesWon
    totalAttempts
    currentStreak
    maxStreak
    lastPlayedDate
    winDistribution
    winRate
  }
}
    `;

export const useMyUncoverStatsQuery = <
  TData = MyUncoverStatsQuery,
  TError = unknown,
>(
  variables?: MyUncoverStatsQueryVariables,
  options?: Omit<
    UseQueryOptions<MyUncoverStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<MyUncoverStatsQuery, TError, TData>['queryKey'];
  }
) => {
  return useQuery<MyUncoverStatsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['MyUncoverStats']
        : ['MyUncoverStats', variables],
    queryFn: fetcher<MyUncoverStatsQuery, MyUncoverStatsQueryVariables>(
      MyUncoverStatsDocument,
      variables
    ),
    ...options,
  });
};

useMyUncoverStatsQuery.getKey = (variables?: MyUncoverStatsQueryVariables) =>
  variables === undefined ? ['MyUncoverStats'] : ['MyUncoverStats', variables];

export const useInfiniteMyUncoverStatsQuery = <
  TData = InfiniteData<MyUncoverStatsQuery>,
  TError = unknown,
>(
  variables: MyUncoverStatsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<MyUncoverStatsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      MyUncoverStatsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<MyUncoverStatsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['MyUncoverStats.infinite']
            : ['MyUncoverStats.infinite', variables],
        queryFn: metaData =>
          fetcher<MyUncoverStatsQuery, MyUncoverStatsQueryVariables>(
            MyUncoverStatsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteMyUncoverStatsQuery.getKey = (
  variables?: MyUncoverStatsQueryVariables
) =>
  variables === undefined
    ? ['MyUncoverStats.infinite']
    : ['MyUncoverStats.infinite', variables];

export const UpdateAlbumDataQualityDocument = `
    mutation UpdateAlbumDataQuality($id: UUID!, $dataQuality: DataQuality!) {
  updateAlbumDataQuality(id: $id, dataQuality: $dataQuality) {
    id
    dataQuality
  }
}
    `;

export const useUpdateAlbumDataQualityMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateAlbumDataQualityMutation,
    TError,
    UpdateAlbumDataQualityMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateAlbumDataQualityMutation,
    TError,
    UpdateAlbumDataQualityMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateAlbumDataQuality'],
    mutationFn: (variables?: UpdateAlbumDataQualityMutationVariables) =>
      fetcher<
        UpdateAlbumDataQualityMutation,
        UpdateAlbumDataQualityMutationVariables
      >(UpdateAlbumDataQualityDocument, variables)(),
    ...options,
  });
};

useUpdateAlbumDataQualityMutation.getKey = () => ['UpdateAlbumDataQuality'];

export const UpdateArtistDataQualityDocument = `
    mutation UpdateArtistDataQuality($id: UUID!, $dataQuality: DataQuality!) {
  updateArtistDataQuality(id: $id, dataQuality: $dataQuality) {
    id
    dataQuality
  }
}
    `;

export const useUpdateArtistDataQualityMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    UpdateArtistDataQualityMutation,
    TError,
    UpdateArtistDataQualityMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateArtistDataQualityMutation,
    TError,
    UpdateArtistDataQualityMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateArtistDataQuality'],
    mutationFn: (variables?: UpdateArtistDataQualityMutationVariables) =>
      fetcher<
        UpdateArtistDataQualityMutation,
        UpdateArtistDataQualityMutationVariables
      >(UpdateArtistDataQualityDocument, variables)(),
    ...options,
  });
};

useUpdateArtistDataQualityMutation.getKey = () => ['UpdateArtistDataQuality'];

export const UpdateUserRoleDocument = `
    mutation UpdateUserRole($userId: String!, $role: UserRole!) {
  updateUserRole(userId: $userId, role: $role) {
    success
    message
    user {
      id
      role
      username
      email
    }
  }
}
    `;

export const useUpdateUserRoleMutation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<
    UpdateUserRoleMutation,
    TError,
    UpdateUserRoleMutationVariables,
    TContext
  >
) => {
  return useMutation<
    UpdateUserRoleMutation,
    TError,
    UpdateUserRoleMutationVariables,
    TContext
  >({
    mutationKey: ['UpdateUserRole'],
    mutationFn: (variables?: UpdateUserRoleMutationVariables) =>
      fetcher<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>(
        UpdateUserRoleDocument,
        variables
      )(),
    ...options,
  });
};

useUpdateUserRoleMutation.getKey = () => ['UpdateUserRole'];
