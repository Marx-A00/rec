import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql';
import { GraphQLContext } from '@/lib/graphql/context';
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
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: any; output: any };
  JSON: { input: any; output: any };
  UUID: { input: any; output: any };
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
  addArtist: Artist;
  /** Admin: Add an album to the curated challenge list */
  addCuratedChallenge: CuratedChallengeEntry;
  addToListenLater: CollectionAlbum;
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
  ensureListenLaterCollection: Collection;
  followUser: FollowUserPayload;
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
  removeFromListenLater: Scalars['Boolean']['output'];
  reorderCollectionAlbums: ReorderCollectionAlbumsPayload;
  resetAlbumEnrichment: Album;
  resetArtistEnrichment: Artist;
  /**
   * Reset today's daily session (admin only).
   * Deletes the session and its guesses so the admin can replay.
   */
  resetDailySession: Scalars['Boolean']['output'];
  resetOnboardingStatus: OnboardingStatus;
  resumeQueue: Scalars['Boolean']['output'];
  retryAllFailed: Scalars['Int']['output'];
  retryJob: Scalars['Boolean']['output'];
  rollbackSyncJob: RollbackSyncJobResult;
  /** Skip current guess - counts as wrong guess (requires auth). */
  skipGuess: GuessResult;
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

export type MutationAddArtistArgs = {
  input: ArtistInput;
};

export type MutationAddCuratedChallengeArgs = {
  albumId: Scalars['UUID']['input'];
  pinnedDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type MutationAddToListenLaterArgs = {
  albumData?: InputMaybe<AlbumInput>;
  albumId: Scalars['UUID']['input'];
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

export type MutationRemoveFromListenLaterArgs = {
  albumId: Scalars['UUID']['input'];
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

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >;
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {},
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> =
  ResolversObject<{
    SearchResult: Album | Artist | Track;
  }>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Activity: ResolverTypeWrapper<Activity>;
  ActivityFeed: ResolverTypeWrapper<ActivityFeed>;
  ActivityMetadata: ResolverTypeWrapper<ActivityMetadata>;
  ActivityType: ActivityType;
  AddAlbumToCollectionPayload: ResolverTypeWrapper<AddAlbumToCollectionPayload>;
  AddAlbumToCollectionWithCreateInput: AddAlbumToCollectionWithCreateInput;
  AdminUpdateUserSettingsPayload: ResolverTypeWrapper<AdminUpdateUserSettingsPayload>;
  Album: ResolverTypeWrapper<Album>;
  AlbumGameStatus: AlbumGameStatus;
  AlbumInput: AlbumInput;
  AlbumRecommendation: ResolverTypeWrapper<AlbumRecommendation>;
  AlbumRecommendationsResponse: ResolverTypeWrapper<AlbumRecommendationsResponse>;
  AlbumRole: AlbumRole;
  Alert: ResolverTypeWrapper<Alert>;
  AlertLevel: AlertLevel;
  AlertThresholds: ResolverTypeWrapper<AlertThresholds>;
  AlertThresholdsInput: AlertThresholdsInput;
  AlertType: AlertType;
  AppliedArtistChanges: ResolverTypeWrapper<AppliedArtistChanges>;
  AppliedChanges: ResolverTypeWrapper<AppliedChanges>;
  AppliedTrackChanges: ResolverTypeWrapper<AppliedTrackChanges>;
  ApplyErrorCode: ApplyErrorCode;
  ArrayDiff: ResolverTypeWrapper<ArrayDiff>;
  Artist: ResolverTypeWrapper<Artist>;
  ArtistAlbumInput: ArtistAlbumInput;
  ArtistAppliedChanges: ResolverTypeWrapper<ArtistAppliedChanges>;
  ArtistCorrectionApplyInput: ArtistCorrectionApplyInput;
  ArtistCorrectionApplyResult: ResolverTypeWrapper<ArtistCorrectionApplyResult>;
  ArtistCorrectionPreview: ResolverTypeWrapper<ArtistCorrectionPreview>;
  ArtistCorrectionSearchResponse: ResolverTypeWrapper<ArtistCorrectionSearchResponse>;
  ArtistCorrectionSearchResult: ResolverTypeWrapper<ArtistCorrectionSearchResult>;
  ArtistCredit: ResolverTypeWrapper<ArtistCredit>;
  ArtistCreditDiff: ResolverTypeWrapper<ArtistCreditDiff>;
  ArtistExternalIdSelectionsInput: ArtistExternalIdSelectionsInput;
  ArtistFieldDiff: ResolverTypeWrapper<ArtistFieldDiff>;
  ArtistFieldSelectionsInput: ArtistFieldSelectionsInput;
  ArtistInput: ArtistInput;
  ArtistMetadataSelectionsInput: ArtistMetadataSelectionsInput;
  ArtistPreviewSummary: ResolverTypeWrapper<ArtistPreviewSummary>;
  ArtistRecommendation: ResolverTypeWrapper<ArtistRecommendation>;
  ArtistRecommendationSort: ArtistRecommendationSort;
  ArtistRecommendationsConnection: ResolverTypeWrapper<ArtistRecommendationsConnection>;
  ArtistTopRelease: ResolverTypeWrapper<ArtistTopRelease>;
  ArtistTrackInput: ArtistTrackInput;
  AudioFeatures: ResolverTypeWrapper<AudioFeatures>;
  BatchEnrichmentResult: ResolverTypeWrapper<BatchEnrichmentResult>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CategorizedDiscography: ResolverTypeWrapper<CategorizedDiscography>;
  ChangeType: ChangeType;
  Collection: ResolverTypeWrapper<Collection>;
  CollectionAlbum: ResolverTypeWrapper<CollectionAlbum>;
  CollectionAlbumInput: CollectionAlbumInput;
  CollectionSort: CollectionSort;
  ComponentHealth: ResolverTypeWrapper<ComponentHealth>;
  ConfidenceTier: ConfidenceTier;
  CorrectionApplyError: ResolverTypeWrapper<CorrectionApplyError>;
  CorrectionApplyInput: CorrectionApplyInput;
  CorrectionApplyResult: ResolverTypeWrapper<CorrectionApplyResult>;
  CorrectionApplySuccess: ResolverTypeWrapper<CorrectionApplySuccess>;
  CorrectionArtistCredit: ResolverTypeWrapper<CorrectionArtistCredit>;
  CorrectionPreview: ResolverTypeWrapper<CorrectionPreview>;
  CorrectionPreviewInput: CorrectionPreviewInput;
  CorrectionScoringInfo: ResolverTypeWrapper<CorrectionScoringInfo>;
  CorrectionSearchInput: CorrectionSearchInput;
  CorrectionSearchQuery: ResolverTypeWrapper<CorrectionSearchQuery>;
  CorrectionSearchResponse: ResolverTypeWrapper<CorrectionSearchResponse>;
  CorrectionSource: CorrectionSource;
  CoverArtChoice: CoverArtChoice;
  CoverArtDiff: ResolverTypeWrapper<CoverArtDiff>;
  CreateCollectionPayload: ResolverTypeWrapper<CreateCollectionPayload>;
  CreateRecommendationPayload: ResolverTypeWrapper<CreateRecommendationPayload>;
  CreateRecommendationWithAlbumsInput: CreateRecommendationWithAlbumsInput;
  CuratedChallengeEntry: ResolverTypeWrapper<CuratedChallengeEntry>;
  DailyChallengeInfo: ResolverTypeWrapper<DailyChallengeInfo>;
  DataQuality: DataQuality;
  DataSource: DataSource;
  DatabaseStats: ResolverTypeWrapper<DatabaseStats>;
  DateComponentChanges: ResolverTypeWrapper<DateComponentChanges>;
  DateComponents: ResolverTypeWrapper<DateComponents>;
  DateDiff: ResolverTypeWrapper<DateDiff>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteAlbumPayload: ResolverTypeWrapper<DeleteAlbumPayload>;
  DeleteArtistPayload: ResolverTypeWrapper<DeleteArtistPayload>;
  EnrichmentEntityType: EnrichmentEntityType;
  EnrichmentFieldDiff: ResolverTypeWrapper<EnrichmentFieldDiff>;
  EnrichmentPriority: EnrichmentPriority;
  EnrichmentResult: ResolverTypeWrapper<EnrichmentResult>;
  EnrichmentStats: ResolverTypeWrapper<EnrichmentStats>;
  EnrichmentStatus: EnrichmentStatus;
  EnrichmentType: EnrichmentType;
  ErrorMetric: ResolverTypeWrapper<ErrorMetric>;
  ExternalIdSelectionsInput: ExternalIdSelectionsInput;
  FieldSelectionsInput: FieldSelectionsInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FollowUserPayload: ResolverTypeWrapper<FollowUserPayload>;
  GamePoolStats: ResolverTypeWrapper<GamePoolStats>;
  GroupedSearchResult: ResolverTypeWrapper<GroupedSearchResult>;
  GuessResult: ResolverTypeWrapper<GuessResult>;
  HealthComponents: ResolverTypeWrapper<HealthComponents>;
  HealthMetrics: ResolverTypeWrapper<HealthMetrics>;
  HealthStatus: HealthStatus;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JobRecord: ResolverTypeWrapper<JobRecord>;
  JobStatus: JobStatus;
  JobStatusUpdate: ResolverTypeWrapper<JobStatusUpdate>;
  LlamaLog: ResolverTypeWrapper<LlamaLog>;
  LlamaLogCategory: LlamaLogCategory;
  LlamaLogChainResponse: ResolverTypeWrapper<LlamaLogChainResponse>;
  LlamaLogStatus: LlamaLogStatus;
  MBArtist: ResolverTypeWrapper<MbArtist>;
  MBArtistCredit: ResolverTypeWrapper<MbArtistCredit>;
  MBMedium: ResolverTypeWrapper<MbMedium>;
  MBMediumTrack: ResolverTypeWrapper<MbMediumTrack>;
  MBRecording: ResolverTypeWrapper<MbRecording>;
  MBReleaseData: ResolverTypeWrapper<MbReleaseData>;
  ManualCorrectionApplyInput: ManualCorrectionApplyInput;
  MetadataSelectionsInput: MetadataSelectionsInput;
  Mutation: ResolverTypeWrapper<{}>;
  OnboardingStatus: ResolverTypeWrapper<OnboardingStatus>;
  OtherAlbumInfo: ResolverTypeWrapper<OtherAlbumInfo>;
  PaginationInfo: ResolverTypeWrapper<PaginationInfo>;
  PreviewEnrichmentResult: ResolverTypeWrapper<PreviewEnrichmentResult>;
  PreviewSummary: ResolverTypeWrapper<PreviewSummary>;
  Query: ResolverTypeWrapper<{}>;
  QueueMetrics: ResolverTypeWrapper<QueueMetrics>;
  QueueStats: ResolverTypeWrapper<QueueStats>;
  QueueStatus: ResolverTypeWrapper<QueueStatus>;
  RateLimitInfo: ResolverTypeWrapper<RateLimitInfo>;
  Recommendation: ResolverTypeWrapper<Recommendation>;
  RecommendationFeed: ResolverTypeWrapper<RecommendationFeed>;
  RecommendationInput: RecommendationInput;
  RecommendationSort: RecommendationSort;
  ReorderCollectionAlbumsPayload: ResolverTypeWrapper<ReorderCollectionAlbumsPayload>;
  RollbackSyncJobResult: ResolverTypeWrapper<RollbackSyncJobResult>;
  ScoreBreakdown: ResolverTypeWrapper<ScoreBreakdown>;
  ScoredSearchResult: ResolverTypeWrapper<ScoredSearchResult>;
  ScoringStrategy: ScoringStrategy;
  SearchInput: SearchInput;
  SearchMode: SearchMode;
  SearchResult: ResolverTypeWrapper<
    ResolversUnionTypes<ResolversTypes>['SearchResult']
  >;
  SearchResults: ResolverTypeWrapper<SearchResults>;
  SearchType: SearchType;
  SelectionEntry: SelectionEntry;
  SortOrder: SortOrder;
  SourceStat: ResolverTypeWrapper<SourceStat>;
  SpotifyAlbum: ResolverTypeWrapper<SpotifyAlbum>;
  SpotifyArtist: ResolverTypeWrapper<SpotifyArtist>;
  SpotifyPlaylist: ResolverTypeWrapper<SpotifyPlaylist>;
  SpotifyPopularArtists: ResolverTypeWrapper<SpotifyPopularArtists>;
  SpotifySyncResult: ResolverTypeWrapper<SpotifySyncResult>;
  SpotifySyncStats: ResolverTypeWrapper<SpotifySyncStats>;
  SpotifySyncType: SpotifySyncType;
  SpotifyTopChart: ResolverTypeWrapper<SpotifyTopChart>;
  SpotifyTrack: ResolverTypeWrapper<SpotifyTrack>;
  SpotifyTrendingData: ResolverTypeWrapper<SpotifyTrendingData>;
  StartSessionResult: ResolverTypeWrapper<StartSessionResult>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  SyncJob: ResolverTypeWrapper<SyncJob>;
  SyncJobStatus: SyncJobStatus;
  SyncJobType: SyncJobType;
  SyncJobsConnection: ResolverTypeWrapper<SyncJobsConnection>;
  SyncJobsInput: SyncJobsInput;
  SystemHealth: ResolverTypeWrapper<SystemHealth>;
  TextDiff: ResolverTypeWrapper<TextDiff>;
  TextDiffPart: ResolverTypeWrapper<TextDiffPart>;
  ThroughputMetrics: ResolverTypeWrapper<ThroughputMetrics>;
  TimeRange: TimeRange;
  TimeRangeInput: TimeRangeInput;
  TopRecommendedAlbum: ResolverTypeWrapper<TopRecommendedAlbum>;
  TopRecommendedArtist: ResolverTypeWrapper<TopRecommendedArtist>;
  Track: ResolverTypeWrapper<Track>;
  TrackData: ResolverTypeWrapper<TrackData>;
  TrackDiff: ResolverTypeWrapper<TrackDiff>;
  TrackInput: TrackInput;
  TrackListSummary: ResolverTypeWrapper<TrackListSummary>;
  TrackSourceData: ResolverTypeWrapper<TrackSourceData>;
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
  UncoverArchiveStats: ResolverTypeWrapper<UncoverArchiveStats>;
  UncoverGuessAlbumInfo: ResolverTypeWrapper<UncoverGuessAlbumInfo>;
  UncoverGuessInfo: ResolverTypeWrapper<UncoverGuessInfo>;
  UncoverPlayerStats: ResolverTypeWrapper<UncoverPlayerStats>;
  UncoverSessionHistory: ResolverTypeWrapper<UncoverSessionHistory>;
  UncoverSessionInfo: ResolverTypeWrapper<UncoverSessionInfo>;
  UncoverSessionStatus: UncoverSessionStatus;
  UnifiedRelease: ResolverTypeWrapper<UnifiedRelease>;
  UpcomingChallenge: ResolverTypeWrapper<UpcomingChallenge>;
  UpdateAlbumGameStatusInput: UpdateAlbumGameStatusInput;
  UpdateAlbumGameStatusResult: ResolverTypeWrapper<UpdateAlbumGameStatusResult>;
  UpdateCollectionAlbumPayload: ResolverTypeWrapper<UpdateCollectionAlbumPayload>;
  UpdateCollectionPayload: ResolverTypeWrapper<UpdateCollectionPayload>;
  UpdateProfilePayload: ResolverTypeWrapper<UpdateProfilePayload>;
  UpdateRecommendationPayload: ResolverTypeWrapper<UpdateRecommendationPayload>;
  UpdateTrackInput: UpdateTrackInput;
  UpdateUserRolePayload: ResolverTypeWrapper<UpdateUserRolePayload>;
  User: ResolverTypeWrapper<User>;
  UserCount: ResolverTypeWrapper<UserCount>;
  UserFollow: ResolverTypeWrapper<UserFollow>;
  UserRole: UserRole;
  UserSettings: ResolverTypeWrapper<UserSettings>;
  UserSortField: UserSortField;
  UserStats: ResolverTypeWrapper<UserStats>;
  WorkerInfo: ResolverTypeWrapper<WorkerInfo>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Activity: Activity;
  ActivityFeed: ActivityFeed;
  ActivityMetadata: ActivityMetadata;
  AddAlbumToCollectionPayload: AddAlbumToCollectionPayload;
  AddAlbumToCollectionWithCreateInput: AddAlbumToCollectionWithCreateInput;
  AdminUpdateUserSettingsPayload: AdminUpdateUserSettingsPayload;
  Album: Album;
  AlbumInput: AlbumInput;
  AlbumRecommendation: AlbumRecommendation;
  AlbumRecommendationsResponse: AlbumRecommendationsResponse;
  Alert: Alert;
  AlertThresholds: AlertThresholds;
  AlertThresholdsInput: AlertThresholdsInput;
  AppliedArtistChanges: AppliedArtistChanges;
  AppliedChanges: AppliedChanges;
  AppliedTrackChanges: AppliedTrackChanges;
  ArrayDiff: ArrayDiff;
  Artist: Artist;
  ArtistAlbumInput: ArtistAlbumInput;
  ArtistAppliedChanges: ArtistAppliedChanges;
  ArtistCorrectionApplyInput: ArtistCorrectionApplyInput;
  ArtistCorrectionApplyResult: ArtistCorrectionApplyResult;
  ArtistCorrectionPreview: ArtistCorrectionPreview;
  ArtistCorrectionSearchResponse: ArtistCorrectionSearchResponse;
  ArtistCorrectionSearchResult: ArtistCorrectionSearchResult;
  ArtistCredit: ArtistCredit;
  ArtistCreditDiff: ArtistCreditDiff;
  ArtistExternalIdSelectionsInput: ArtistExternalIdSelectionsInput;
  ArtistFieldDiff: ArtistFieldDiff;
  ArtistFieldSelectionsInput: ArtistFieldSelectionsInput;
  ArtistInput: ArtistInput;
  ArtistMetadataSelectionsInput: ArtistMetadataSelectionsInput;
  ArtistPreviewSummary: ArtistPreviewSummary;
  ArtistRecommendation: ArtistRecommendation;
  ArtistRecommendationsConnection: ArtistRecommendationsConnection;
  ArtistTopRelease: ArtistTopRelease;
  ArtistTrackInput: ArtistTrackInput;
  AudioFeatures: AudioFeatures;
  BatchEnrichmentResult: BatchEnrichmentResult;
  Boolean: Scalars['Boolean']['output'];
  CategorizedDiscography: CategorizedDiscography;
  Collection: Collection;
  CollectionAlbum: CollectionAlbum;
  CollectionAlbumInput: CollectionAlbumInput;
  ComponentHealth: ComponentHealth;
  CorrectionApplyError: CorrectionApplyError;
  CorrectionApplyInput: CorrectionApplyInput;
  CorrectionApplyResult: CorrectionApplyResult;
  CorrectionApplySuccess: CorrectionApplySuccess;
  CorrectionArtistCredit: CorrectionArtistCredit;
  CorrectionPreview: CorrectionPreview;
  CorrectionPreviewInput: CorrectionPreviewInput;
  CorrectionScoringInfo: CorrectionScoringInfo;
  CorrectionSearchInput: CorrectionSearchInput;
  CorrectionSearchQuery: CorrectionSearchQuery;
  CorrectionSearchResponse: CorrectionSearchResponse;
  CoverArtDiff: CoverArtDiff;
  CreateCollectionPayload: CreateCollectionPayload;
  CreateRecommendationPayload: CreateRecommendationPayload;
  CreateRecommendationWithAlbumsInput: CreateRecommendationWithAlbumsInput;
  CuratedChallengeEntry: CuratedChallengeEntry;
  DailyChallengeInfo: DailyChallengeInfo;
  DatabaseStats: DatabaseStats;
  DateComponentChanges: DateComponentChanges;
  DateComponents: DateComponents;
  DateDiff: DateDiff;
  DateTime: Scalars['DateTime']['output'];
  DeleteAlbumPayload: DeleteAlbumPayload;
  DeleteArtistPayload: DeleteArtistPayload;
  EnrichmentFieldDiff: EnrichmentFieldDiff;
  EnrichmentResult: EnrichmentResult;
  EnrichmentStats: EnrichmentStats;
  ErrorMetric: ErrorMetric;
  ExternalIdSelectionsInput: ExternalIdSelectionsInput;
  FieldSelectionsInput: FieldSelectionsInput;
  Float: Scalars['Float']['output'];
  FollowUserPayload: FollowUserPayload;
  GamePoolStats: GamePoolStats;
  GroupedSearchResult: GroupedSearchResult;
  GuessResult: GuessResult;
  HealthComponents: HealthComponents;
  HealthMetrics: HealthMetrics;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  JobRecord: JobRecord;
  JobStatusUpdate: JobStatusUpdate;
  LlamaLog: LlamaLog;
  LlamaLogChainResponse: LlamaLogChainResponse;
  MBArtist: MbArtist;
  MBArtistCredit: MbArtistCredit;
  MBMedium: MbMedium;
  MBMediumTrack: MbMediumTrack;
  MBRecording: MbRecording;
  MBReleaseData: MbReleaseData;
  ManualCorrectionApplyInput: ManualCorrectionApplyInput;
  MetadataSelectionsInput: MetadataSelectionsInput;
  Mutation: {};
  OnboardingStatus: OnboardingStatus;
  OtherAlbumInfo: OtherAlbumInfo;
  PaginationInfo: PaginationInfo;
  PreviewEnrichmentResult: PreviewEnrichmentResult;
  PreviewSummary: PreviewSummary;
  Query: {};
  QueueMetrics: QueueMetrics;
  QueueStats: QueueStats;
  QueueStatus: QueueStatus;
  RateLimitInfo: RateLimitInfo;
  Recommendation: Recommendation;
  RecommendationFeed: RecommendationFeed;
  RecommendationInput: RecommendationInput;
  ReorderCollectionAlbumsPayload: ReorderCollectionAlbumsPayload;
  RollbackSyncJobResult: RollbackSyncJobResult;
  ScoreBreakdown: ScoreBreakdown;
  ScoredSearchResult: ScoredSearchResult;
  SearchInput: SearchInput;
  SearchResult: ResolversUnionTypes<ResolversParentTypes>['SearchResult'];
  SearchResults: SearchResults;
  SelectionEntry: SelectionEntry;
  SourceStat: SourceStat;
  SpotifyAlbum: SpotifyAlbum;
  SpotifyArtist: SpotifyArtist;
  SpotifyPlaylist: SpotifyPlaylist;
  SpotifyPopularArtists: SpotifyPopularArtists;
  SpotifySyncResult: SpotifySyncResult;
  SpotifySyncStats: SpotifySyncStats;
  SpotifyTopChart: SpotifyTopChart;
  SpotifyTrack: SpotifyTrack;
  SpotifyTrendingData: SpotifyTrendingData;
  StartSessionResult: StartSessionResult;
  String: Scalars['String']['output'];
  Subscription: {};
  SyncJob: SyncJob;
  SyncJobsConnection: SyncJobsConnection;
  SyncJobsInput: SyncJobsInput;
  SystemHealth: SystemHealth;
  TextDiff: TextDiff;
  TextDiffPart: TextDiffPart;
  ThroughputMetrics: ThroughputMetrics;
  TimeRangeInput: TimeRangeInput;
  TopRecommendedAlbum: TopRecommendedAlbum;
  TopRecommendedArtist: TopRecommendedArtist;
  Track: Track;
  TrackData: TrackData;
  TrackDiff: TrackDiff;
  TrackInput: TrackInput;
  TrackListSummary: TrackListSummary;
  TrackSourceData: TrackSourceData;
  UUID: Scalars['UUID']['output'];
  UncoverArchiveStats: UncoverArchiveStats;
  UncoverGuessAlbumInfo: UncoverGuessAlbumInfo;
  UncoverGuessInfo: UncoverGuessInfo;
  UncoverPlayerStats: UncoverPlayerStats;
  UncoverSessionHistory: UncoverSessionHistory;
  UncoverSessionInfo: UncoverSessionInfo;
  UnifiedRelease: UnifiedRelease;
  UpcomingChallenge: UpcomingChallenge;
  UpdateAlbumGameStatusInput: UpdateAlbumGameStatusInput;
  UpdateAlbumGameStatusResult: UpdateAlbumGameStatusResult;
  UpdateCollectionAlbumPayload: UpdateCollectionAlbumPayload;
  UpdateCollectionPayload: UpdateCollectionPayload;
  UpdateProfilePayload: UpdateProfilePayload;
  UpdateRecommendationPayload: UpdateRecommendationPayload;
  UpdateTrackInput: UpdateTrackInput;
  UpdateUserRolePayload: UpdateUserRolePayload;
  User: User;
  UserCount: UserCount;
  UserFollow: UserFollow;
  UserSettings: UserSettings;
  UserStats: UserStats;
  WorkerInfo: WorkerInfo;
}>;

export type ActivityResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Activity'] = ResolversParentTypes['Activity'],
> = ResolversObject<{
  actor?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  album?: Resolver<Maybe<ResolversTypes['Album']>, ParentType, ContextType>;
  collection?: Resolver<
    Maybe<ResolversTypes['Collection']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metadata?: Resolver<
    Maybe<ResolversTypes['ActivityMetadata']>,
    ParentType,
    ContextType
  >;
  recommendation?: Resolver<
    Maybe<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType
  >;
  targetUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ActivityFeedResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ActivityFeed'] = ResolversParentTypes['ActivityFeed'],
> = ResolversObject<{
  activities?: Resolver<
    Array<ResolversTypes['Activity']>,
    ParentType,
    ContextType
  >;
  cursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ActivityMetadataResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ActivityMetadata'] = ResolversParentTypes['ActivityMetadata'],
> = ResolversObject<{
  basisAlbum?: Resolver<
    Maybe<ResolversTypes['Album']>,
    ParentType,
    ContextType
  >;
  collectionName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  personalRating?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  position?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AddAlbumToCollectionPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AddAlbumToCollectionPayload'] = ResolversParentTypes['AddAlbumToCollectionPayload'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AdminUpdateUserSettingsPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AdminUpdateUserSettingsPayload'] = ResolversParentTypes['AdminUpdateUserSettingsPayload'],
> = ResolversObject<{
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  showOnboardingTour?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AlbumResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Album'] = ResolversParentTypes['Album'],
> = ResolversObject<{
  artists?: Resolver<
    Array<ResolversTypes['ArtistCredit']>,
    ParentType,
    ContextType
  >;
  averageRating?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  barcode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  basisRecommendations?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType
  >;
  catalogNumber?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  cloudflareImageId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  collectionAlbums?: Resolver<
    Array<ResolversTypes['CollectionAlbum']>,
    ParentType,
    ContextType
  >;
  coverArtUrl?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dataQuality?: Resolver<
    Maybe<ResolversTypes['DataQuality']>,
    ParentType,
    ContextType
  >;
  discogsId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  duration?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  enrichmentStatus?: Resolver<
    Maybe<ResolversTypes['EnrichmentStatus']>,
    ParentType,
    ContextType
  >;
  gameStatus?: Resolver<
    ResolversTypes['AlbumGameStatus'],
    ParentType,
    ContextType
  >;
  genres?: Resolver<
    Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  inCollectionsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastEnriched?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  latestLlamaLog?: Resolver<
    Maybe<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType
  >;
  llamaLogs?: Resolver<
    Array<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType,
    Partial<AlbumLlamaLogsArgs>
  >;
  musicbrainzId?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  needsEnrichment?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  recommendationScore?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  releaseDate?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  releaseType?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  spotifyId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  targetRecommendations?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType
  >;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trackCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AlbumRecommendationResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AlbumRecommendation'] = ResolversParentTypes['AlbumRecommendation'],
> = ResolversObject<{
  albumRole?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  otherAlbum?: Resolver<
    ResolversTypes['OtherAlbumInfo'],
    ParentType,
    ContextType
  >;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AlbumRecommendationsResponseResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AlbumRecommendationsResponse'] = ResolversParentTypes['AlbumRecommendationsResponse'],
> = ResolversObject<{
  pagination?: Resolver<
    ResolversTypes['PaginationInfo'],
    ParentType,
    ContextType
  >;
  recommendations?: Resolver<
    Array<ResolversTypes['AlbumRecommendation']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AlertResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Alert'] = ResolversParentTypes['Alert'],
> = ResolversObject<{
  details?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['AlertLevel'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AlertType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AlertThresholdsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AlertThresholds'] = ResolversParentTypes['AlertThresholds'],
> = ResolversObject<{
  avgProcessingTimeMs?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  errorRatePercent?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  memoryUsageMB?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  queueDepth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppliedArtistChangesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AppliedArtistChanges'] = ResolversParentTypes['AppliedArtistChanges'],
> = ResolversObject<{
  added?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  removed?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppliedChangesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AppliedChanges'] = ResolversParentTypes['AppliedChanges'],
> = ResolversObject<{
  artists?: Resolver<
    ResolversTypes['AppliedArtistChanges'],
    ParentType,
    ContextType
  >;
  coverArt?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  dataQualityAfter?: Resolver<
    ResolversTypes['DataQuality'],
    ParentType,
    ContextType
  >;
  dataQualityBefore?: Resolver<
    ResolversTypes['DataQuality'],
    ParentType,
    ContextType
  >;
  externalIds?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  metadata?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  tracks?: Resolver<
    ResolversTypes['AppliedTrackChanges'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppliedTrackChangesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AppliedTrackChanges'] = ResolversParentTypes['AppliedTrackChanges'],
> = ResolversObject<{
  added?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modified?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  removed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArrayDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArrayDiff'] = ResolversParentTypes['ArrayDiff'],
> = ResolversObject<{
  added?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  changeType?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  currentItems?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  removed?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  sourceItems?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  unchanged?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Artist'] = ResolversParentTypes['Artist'],
> = ResolversObject<{
  albumCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  albums?: Resolver<Array<ResolversTypes['Album']>, ParentType, ContextType>;
  biography?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  cloudflareImageId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  countryCode?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dataQuality?: Resolver<
    Maybe<ResolversTypes['DataQuality']>,
    ParentType,
    ContextType
  >;
  discogsId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  enrichmentStatus?: Resolver<
    Maybe<ResolversTypes['EnrichmentStatus']>,
    ParentType,
    ContextType
  >;
  formedYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastEnriched?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  latestLlamaLog?: Resolver<
    Maybe<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType
  >;
  listeners?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  llamaLogs?: Resolver<
    Array<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType,
    Partial<ArtistLlamaLogsArgs>
  >;
  musicbrainzId?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  needsEnrichment?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  popularity?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  spotifyId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  trackCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistAppliedChangesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistAppliedChanges'] = ResolversParentTypes['ArtistAppliedChanges'],
> = ResolversObject<{
  affectedAlbumCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dataQualityAfter?: Resolver<
    ResolversTypes['DataQuality'],
    ParentType,
    ContextType
  >;
  dataQualityBefore?: Resolver<
    ResolversTypes['DataQuality'],
    ParentType,
    ContextType
  >;
  externalIds?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  metadata?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistCorrectionApplyResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistCorrectionApplyResult'] = ResolversParentTypes['ArtistCorrectionApplyResult'],
> = ResolversObject<{
  affectedAlbumCount?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  artist?: Resolver<Maybe<ResolversTypes['Artist']>, ParentType, ContextType>;
  changes?: Resolver<
    Maybe<ResolversTypes['ArtistAppliedChanges']>,
    ParentType,
    ContextType
  >;
  code?: Resolver<
    Maybe<ResolversTypes['ApplyErrorCode']>,
    ParentType,
    ContextType
  >;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistCorrectionPreviewResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistCorrectionPreview'] = ResolversParentTypes['ArtistCorrectionPreview'],
> = ResolversObject<{
  albumCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  currentArtist?: Resolver<ResolversTypes['Artist'], ParentType, ContextType>;
  fieldDiffs?: Resolver<
    Array<ResolversTypes['ArtistFieldDiff']>,
    ParentType,
    ContextType
  >;
  mbArtistData?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType
  >;
  source?: Resolver<
    ResolversTypes['CorrectionSource'],
    ParentType,
    ContextType
  >;
  summary?: Resolver<
    ResolversTypes['ArtistPreviewSummary'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistCorrectionSearchResponseResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistCorrectionSearchResponse'] = ResolversParentTypes['ArtistCorrectionSearchResponse'],
> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  query?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  results?: Resolver<
    Array<ResolversTypes['ArtistCorrectionSearchResult']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistCorrectionSearchResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistCorrectionSearchResult'] = ResolversParentTypes['ArtistCorrectionSearchResult'],
> = ResolversObject<{
  area?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  artistMbid?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  beginDate?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  disambiguation?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  endDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ended?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  gender?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mbScore?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  topReleases?: Resolver<
    Maybe<Array<ResolversTypes['ArtistTopRelease']>>,
    ParentType,
    ContextType
  >;
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistCreditResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistCredit'] = ResolversParentTypes['ArtistCredit'],
> = ResolversObject<{
  artist?: Resolver<ResolversTypes['Artist'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistCreditDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistCreditDiff'] = ResolversParentTypes['ArtistCreditDiff'],
> = ResolversObject<{
  changeType?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  current?: Resolver<
    Array<ResolversTypes['CorrectionArtistCredit']>,
    ParentType,
    ContextType
  >;
  currentDisplay?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameDiff?: Resolver<
    Maybe<Array<ResolversTypes['TextDiffPart']>>,
    ParentType,
    ContextType
  >;
  source?: Resolver<
    Array<ResolversTypes['CorrectionArtistCredit']>,
    ParentType,
    ContextType
  >;
  sourceDisplay?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistFieldDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistFieldDiff'] = ResolversParentTypes['ArtistFieldDiff'],
> = ResolversObject<{
  changeType?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  current?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistPreviewSummaryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistPreviewSummary'] = ResolversParentTypes['ArtistPreviewSummary'],
> = ResolversObject<{
  addedFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  changedFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modifiedFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistRecommendationResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistRecommendation'] = ResolversParentTypes['ArtistRecommendation'],
> = ResolversObject<{
  albumRole?: Resolver<ResolversTypes['AlbumRole'], ParentType, ContextType>;
  basisAlbum?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isOwnRecommendation?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  recommendedAlbum?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistRecommendationsConnectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistRecommendationsConnection'] = ResolversParentTypes['ArtistRecommendationsConnection'],
> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recommendations?: Resolver<
    Array<ResolversTypes['ArtistRecommendation']>,
    ParentType,
    ContextType
  >;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ArtistTopReleaseResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ArtistTopRelease'] = ResolversParentTypes['ArtistTopRelease'],
> = ResolversObject<{
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AudioFeaturesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['AudioFeatures'] = ResolversParentTypes['AudioFeatures'],
> = ResolversObject<{
  acousticness?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  danceability?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  energy?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  instrumentalness?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  key?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  liveness?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  loudness?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  mode?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  speechiness?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  tempo?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  timeSignature?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  valence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BatchEnrichmentResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['BatchEnrichmentResult'] = ResolversParentTypes['BatchEnrichmentResult'],
> = ResolversObject<{
  jobsQueued?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategorizedDiscographyResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CategorizedDiscography'] = ResolversParentTypes['CategorizedDiscography'],
> = ResolversObject<{
  albums?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  compilations?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  eps?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  liveAlbums?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  other?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  remixes?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  singles?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  soundtracks?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Collection'] = ResolversParentTypes['Collection'],
> = ResolversObject<{
  albumCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  albums?: Resolver<
    Array<ResolversTypes['CollectionAlbum']>,
    ParentType,
    ContextType
  >;
  averageRating?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalDuration?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionAlbumResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CollectionAlbum'] = ResolversParentTypes['CollectionAlbum'],
> = ResolversObject<{
  addedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  album?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  collection?: Resolver<ResolversTypes['Collection'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  personalNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  personalRating?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ComponentHealthResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ComponentHealth'] = ResolversParentTypes['ComponentHealth'],
> = ResolversObject<{
  details?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  lastCheck?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['HealthStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionApplyErrorResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionApplyError'] = ResolversParentTypes['CorrectionApplyError'],
> = ResolversObject<{
  code?: Resolver<ResolversTypes['ApplyErrorCode'], ParentType, ContextType>;
  context?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionApplyResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionApplyResult'] = ResolversParentTypes['CorrectionApplyResult'],
> = ResolversObject<{
  album?: Resolver<Maybe<ResolversTypes['Album']>, ParentType, ContextType>;
  changes?: Resolver<
    Maybe<ResolversTypes['AppliedChanges']>,
    ParentType,
    ContextType
  >;
  code?: Resolver<
    Maybe<ResolversTypes['ApplyErrorCode']>,
    ParentType,
    ContextType
  >;
  context?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionApplySuccessResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionApplySuccess'] = ResolversParentTypes['CorrectionApplySuccess'],
> = ResolversObject<{
  album?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  changes?: Resolver<ResolversTypes['AppliedChanges'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionArtistCreditResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionArtistCredit'] = ResolversParentTypes['CorrectionArtistCredit'],
> = ResolversObject<{
  mbid?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionPreviewResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionPreview'] = ResolversParentTypes['CorrectionPreview'],
> = ResolversObject<{
  albumId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  albumTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  albumUpdatedAt?: Resolver<
    ResolversTypes['DateTime'],
    ParentType,
    ContextType
  >;
  artistDiff?: Resolver<
    ResolversTypes['ArtistCreditDiff'],
    ParentType,
    ContextType
  >;
  coverArt?: Resolver<ResolversTypes['CoverArtDiff'], ParentType, ContextType>;
  fieldDiffs?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  mbReleaseData?: Resolver<
    Maybe<ResolversTypes['MBReleaseData']>,
    ParentType,
    ContextType
  >;
  sourceResult?: Resolver<
    ResolversTypes['ScoredSearchResult'],
    ParentType,
    ContextType
  >;
  summary?: Resolver<ResolversTypes['PreviewSummary'], ParentType, ContextType>;
  trackDiffs?: Resolver<
    Array<ResolversTypes['TrackDiff']>,
    ParentType,
    ContextType
  >;
  trackSummary?: Resolver<
    ResolversTypes['TrackListSummary'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionScoringInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionScoringInfo'] = ResolversParentTypes['CorrectionScoringInfo'],
> = ResolversObject<{
  lowConfidenceCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  strategy?: Resolver<
    ResolversTypes['ScoringStrategy'],
    ParentType,
    ContextType
  >;
  threshold?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionSearchQueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionSearchQuery'] = ResolversParentTypes['CorrectionSearchQuery'],
> = ResolversObject<{
  albumTitle?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  artistName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  yearFilter?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CorrectionSearchResponseResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CorrectionSearchResponse'] = ResolversParentTypes['CorrectionSearchResponse'],
> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  query?: Resolver<
    ResolversTypes['CorrectionSearchQuery'],
    ParentType,
    ContextType
  >;
  results?: Resolver<
    Array<ResolversTypes['GroupedSearchResult']>,
    ParentType,
    ContextType
  >;
  scoring?: Resolver<
    ResolversTypes['CorrectionScoringInfo'],
    ParentType,
    ContextType
  >;
  totalGroups?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CoverArtDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CoverArtDiff'] = ResolversParentTypes['CoverArtDiff'],
> = ResolversObject<{
  changeType?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  currentUrl?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  sourceUrl?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CreateCollectionPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CreateCollectionPayload'] = ResolversParentTypes['CreateCollectionPayload'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CreateRecommendationPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CreateRecommendationPayload'] = ResolversParentTypes['CreateRecommendationPayload'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CuratedChallengeEntryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['CuratedChallengeEntry'] = ResolversParentTypes['CuratedChallengeEntry'],
> = ResolversObject<{
  album?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  pinnedDate?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  sequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DailyChallengeInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DailyChallengeInfo'] = ResolversParentTypes['DailyChallengeInfo'],
> = ResolversObject<{
  avgAttempts?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  cloudflareImageId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  maxAttempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mySession?: Resolver<
    Maybe<ResolversTypes['UncoverSessionInfo']>,
    ParentType,
    ContextType
  >;
  totalPlays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalWins?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DatabaseStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DatabaseStats'] = ResolversParentTypes['DatabaseStats'],
> = ResolversObject<{
  albumsNeedingEnrichment?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  artistsNeedingEnrichment?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  averageDataQuality?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  failedEnrichments?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recentlyEnriched?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAlbums?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalArtists?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalTracks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DateComponentChangesResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DateComponentChanges'] = ResolversParentTypes['DateComponentChanges'],
> = ResolversObject<{
  day?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  month?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  year?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DateComponentsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DateComponents'] = ResolversParentTypes['DateComponents'],
> = ResolversObject<{
  day?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  month?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DateDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DateDiff'] = ResolversParentTypes['DateDiff'],
> = ResolversObject<{
  changeType?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  componentChanges?: Resolver<
    ResolversTypes['DateComponentChanges'],
    ParentType,
    ContextType
  >;
  current?: Resolver<
    Maybe<ResolversTypes['DateComponents']>,
    ParentType,
    ContextType
  >;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<
    Maybe<ResolversTypes['DateComponents']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteAlbumPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DeleteAlbumPayload'] = ResolversParentTypes['DeleteAlbumPayload'],
> = ResolversObject<{
  deletedId?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeleteArtistPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['DeleteArtistPayload'] = ResolversParentTypes['DeleteArtistPayload'],
> = ResolversObject<{
  deletedId?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EnrichmentFieldDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['EnrichmentFieldDiff'] = ResolversParentTypes['EnrichmentFieldDiff'],
> = ResolversObject<{
  currentValue?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  newValue?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EnrichmentResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['EnrichmentResult'] = ResolversParentTypes['EnrichmentResult'],
> = ResolversObject<{
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EnrichmentStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['EnrichmentStats'] = ResolversParentTypes['EnrichmentStats'],
> = ResolversObject<{
  averageDurationMs?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  failedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  noDataCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skippedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceStats?: Resolver<
    Array<ResolversTypes['SourceStat']>,
    ParentType,
    ContextType
  >;
  successCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAttempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ErrorMetricResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ErrorMetric'] = ResolversParentTypes['ErrorMetric'],
> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  error?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastOccurrence?: Resolver<
    ResolversTypes['DateTime'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FollowUserPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['FollowUserPayload'] = ResolversParentTypes['FollowUserPayload'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  followedId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  followerId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GamePoolStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['GamePoolStats'] = ResolversParentTypes['GamePoolStats'],
> = ResolversObject<{
  eligibleCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  excludedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  neutralCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalWithCoverArt?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupedSearchResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['GroupedSearchResult'] = ResolversParentTypes['GroupedSearchResult'],
> = ResolversObject<{
  alternateVersions?: Resolver<
    Array<ResolversTypes['ScoredSearchResult']>,
    ParentType,
    ContextType
  >;
  bestScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  primaryResult?: Resolver<
    ResolversTypes['ScoredSearchResult'],
    ParentType,
    ContextType
  >;
  releaseGroupMbid?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  versionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GuessResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['GuessResult'] = ResolversParentTypes['GuessResult'],
> = ResolversObject<{
  correctAlbum?: Resolver<
    Maybe<ResolversTypes['UncoverGuessAlbumInfo']>,
    ParentType,
    ContextType
  >;
  gameOver?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  guess?: Resolver<ResolversTypes['UncoverGuessInfo'], ParentType, ContextType>;
  session?: Resolver<
    ResolversTypes['UncoverSessionInfo'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type HealthComponentsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['HealthComponents'] = ResolversParentTypes['HealthComponents'],
> = ResolversObject<{
  memory?: Resolver<ResolversTypes['ComponentHealth'], ParentType, ContextType>;
  queue?: Resolver<ResolversTypes['ComponentHealth'], ParentType, ContextType>;
  redis?: Resolver<ResolversTypes['ComponentHealth'], ParentType, ContextType>;
  spotify?: Resolver<
    ResolversTypes['ComponentHealth'],
    ParentType,
    ContextType
  >;
  worker?: Resolver<ResolversTypes['ComponentHealth'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type HealthMetricsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['HealthMetrics'] = ResolversParentTypes['HealthMetrics'],
> = ResolversObject<{
  activeJobs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  avgProcessingTime?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  completedJobs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  errorRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  failedJobs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  queueDepth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JobRecordResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['JobRecord'] = ResolversParentTypes['JobRecord'],
> = ResolversObject<{
  attempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  data?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  duration?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  result?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  startedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type JobStatusUpdateResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['JobStatusUpdate'] = ResolversParentTypes['JobStatusUpdate'],
> = ResolversObject<{
  addCuratedChallenge?: Resolver<
    ResolversTypes['CuratedChallengeEntry'],
    ParentType,
    ContextType,
    RequireFields<JobStatusUpdateAddCuratedChallengeArgs, 'albumId'>
  >;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pinCuratedChallenge?: Resolver<
    ResolversTypes['CuratedChallengeEntry'],
    ParentType,
    ContextType,
    RequireFields<JobStatusUpdatePinCuratedChallengeArgs, 'date' | 'id'>
  >;
  progress?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  removeCuratedChallenge?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<JobStatusUpdateRemoveCuratedChallengeArgs, 'id'>
  >;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  unpinCuratedChallenge?: Resolver<
    ResolversTypes['CuratedChallengeEntry'],
    ParentType,
    ContextType,
    RequireFields<JobStatusUpdateUnpinCuratedChallengeArgs, 'id'>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LlamaLogResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['LlamaLog'] = ResolversParentTypes['LlamaLog'],
> = ResolversObject<{
  apiCallCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  category?: Resolver<
    ResolversTypes['LlamaLogCategory'],
    ParentType,
    ContextType
  >;
  children?: Resolver<
    Maybe<Array<ResolversTypes['LlamaLog']>>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dataQualityAfter?: Resolver<
    Maybe<ResolversTypes['DataQuality']>,
    ParentType,
    ContextType
  >;
  dataQualityBefore?: Resolver<
    Maybe<ResolversTypes['DataQuality']>,
    ParentType,
    ContextType
  >;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  entityType?: Resolver<
    Maybe<ResolversTypes['EnrichmentEntityType']>,
    ParentType,
    ContextType
  >;
  errorCode?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  errorMessage?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  fieldsEnriched?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  operation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentJobId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  previewData?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType
  >;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  retryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rootJobId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  sources?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LlamaLogStatus'], ParentType, ContextType>;
  triggeredBy?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  userId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LlamaLogChainResponseResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['LlamaLogChainResponse'] = ResolversParentTypes['LlamaLogChainResponse'],
> = ResolversObject<{
  cursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  logs?: Resolver<Array<ResolversTypes['LlamaLog']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MbArtistResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['MBArtist'] = ResolversParentTypes['MBArtist'],
> = ResolversObject<{
  disambiguation?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MbArtistCreditResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['MBArtistCredit'] = ResolversParentTypes['MBArtistCredit'],
> = ResolversObject<{
  artist?: Resolver<ResolversTypes['MBArtist'], ParentType, ContextType>;
  joinphrase?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MbMediumResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['MBMedium'] = ResolversParentTypes['MBMedium'],
> = ResolversObject<{
  format?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  trackCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tracks?: Resolver<
    Array<ResolversTypes['MBMediumTrack']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MbMediumTrackResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['MBMediumTrack'] = ResolversParentTypes['MBMediumTrack'],
> = ResolversObject<{
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recording?: Resolver<ResolversTypes['MBRecording'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MbRecordingResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['MBRecording'] = ResolversParentTypes['MBRecording'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  length?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MbReleaseDataResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['MBReleaseData'] = ResolversParentTypes['MBReleaseData'],
> = ResolversObject<{
  artistCredit?: Resolver<
    Array<ResolversTypes['MBArtistCredit']>,
    ParentType,
    ContextType
  >;
  barcode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  date?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['MBMedium']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = ResolversObject<{
  addAlbum?: Resolver<
    ResolversTypes['Album'],
    ParentType,
    ContextType,
    RequireFields<MutationAddAlbumArgs, 'input'>
  >;
  addAlbumToCollection?: Resolver<
    ResolversTypes['AddAlbumToCollectionPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationAddAlbumToCollectionArgs, 'collectionId' | 'input'>
  >;
  addAlbumToCollectionWithCreate?: Resolver<
    ResolversTypes['AddAlbumToCollectionPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationAddAlbumToCollectionWithCreateArgs, 'input'>
  >;
  addArtist?: Resolver<
    ResolversTypes['Artist'],
    ParentType,
    ContextType,
    RequireFields<MutationAddArtistArgs, 'input'>
  >;
  addCuratedChallenge?: Resolver<
    ResolversTypes['CuratedChallengeEntry'],
    ParentType,
    ContextType,
    RequireFields<MutationAddCuratedChallengeArgs, 'albumId'>
  >;
  addToListenLater?: Resolver<
    ResolversTypes['CollectionAlbum'],
    ParentType,
    ContextType,
    RequireFields<MutationAddToListenLaterArgs, 'albumId'>
  >;
  adminUpdateUserShowTour?: Resolver<
    ResolversTypes['AdminUpdateUserSettingsPayload'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAdminUpdateUserShowTourArgs,
      'showOnboardingTour' | 'userId'
    >
  >;
  artistCorrectionApply?: Resolver<
    ResolversTypes['ArtistCorrectionApplyResult'],
    ParentType,
    ContextType,
    RequireFields<MutationArtistCorrectionApplyArgs, 'input'>
  >;
  batchEnrichment?: Resolver<
    ResolversTypes['BatchEnrichmentResult'],
    ParentType,
    ContextType,
    RequireFields<MutationBatchEnrichmentArgs, 'ids' | 'type'>
  >;
  cleanQueue?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    Partial<MutationCleanQueueArgs>
  >;
  clearFailedJobs?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  correctionApply?: Resolver<
    ResolversTypes['CorrectionApplyResult'],
    ParentType,
    ContextType,
    RequireFields<MutationCorrectionApplyArgs, 'input'>
  >;
  createCollection?: Resolver<
    ResolversTypes['CreateCollectionPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateCollectionArgs, 'isPublic' | 'name'>
  >;
  createRecommendation?: Resolver<
    ResolversTypes['CreateRecommendationPayload'],
    ParentType,
    ContextType,
    Partial<MutationCreateRecommendationArgs>
  >;
  createTrack?: Resolver<
    ResolversTypes['Track'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateTrackArgs, 'input'>
  >;
  deleteAlbum?: Resolver<
    ResolversTypes['DeleteAlbumPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteAlbumArgs, 'id'>
  >;
  deleteArtist?: Resolver<
    ResolversTypes['DeleteArtistPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteArtistArgs, 'id'>
  >;
  deleteCollection?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteCollectionArgs, 'id'>
  >;
  deleteRecommendation?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteRecommendationArgs, 'id'>
  >;
  deleteTrack?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteTrackArgs, 'id'>
  >;
  dismissUserSuggestion?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDismissUserSuggestionArgs, 'userId'>
  >;
  ensureListenLaterCollection?: Resolver<
    ResolversTypes['Collection'],
    ParentType,
    ContextType
  >;
  followUser?: Resolver<
    ResolversTypes['FollowUserPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationFollowUserArgs, 'userId'>
  >;
  manualCorrectionApply?: Resolver<
    ResolversTypes['CorrectionApplyResult'],
    ParentType,
    ContextType,
    RequireFields<MutationManualCorrectionApplyArgs, 'input'>
  >;
  pauseQueue?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  pinCuratedChallenge?: Resolver<
    ResolversTypes['CuratedChallengeEntry'],
    ParentType,
    ContextType,
    RequireFields<MutationPinCuratedChallengeArgs, 'date' | 'id'>
  >;
  previewAlbumEnrichment?: Resolver<
    ResolversTypes['PreviewEnrichmentResult'],
    ParentType,
    ContextType,
    RequireFields<MutationPreviewAlbumEnrichmentArgs, 'id'>
  >;
  previewArtistEnrichment?: Resolver<
    ResolversTypes['PreviewEnrichmentResult'],
    ParentType,
    ContextType,
    RequireFields<MutationPreviewArtistEnrichmentArgs, 'id'>
  >;
  removeAlbumFromCollection?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      MutationRemoveAlbumFromCollectionArgs,
      'albumId' | 'collectionId'
    >
  >;
  removeCuratedChallenge?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveCuratedChallengeArgs, 'id'>
  >;
  removeFromListenLater?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveFromListenLaterArgs, 'albumId'>
  >;
  reorderCollectionAlbums?: Resolver<
    ResolversTypes['ReorderCollectionAlbumsPayload'],
    ParentType,
    ContextType,
    RequireFields<
      MutationReorderCollectionAlbumsArgs,
      'albumIds' | 'collectionId'
    >
  >;
  resetAlbumEnrichment?: Resolver<
    ResolversTypes['Album'],
    ParentType,
    ContextType,
    RequireFields<MutationResetAlbumEnrichmentArgs, 'id'>
  >;
  resetArtistEnrichment?: Resolver<
    ResolversTypes['Artist'],
    ParentType,
    ContextType,
    RequireFields<MutationResetArtistEnrichmentArgs, 'id'>
  >;
  resetDailySession?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  resetOnboardingStatus?: Resolver<
    ResolversTypes['OnboardingStatus'],
    ParentType,
    ContextType
  >;
  resumeQueue?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  retryAllFailed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  retryJob?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationRetryJobArgs, 'jobId'>
  >;
  rollbackSyncJob?: Resolver<
    ResolversTypes['RollbackSyncJobResult'],
    ParentType,
    ContextType,
    RequireFields<MutationRollbackSyncJobArgs, 'dryRun' | 'syncJobId'>
  >;
  skipGuess?: Resolver<
    ResolversTypes['GuessResult'],
    ParentType,
    ContextType,
    RequireFields<MutationSkipGuessArgs, 'sessionId'>
  >;
  startArchiveSession?: Resolver<
    ResolversTypes['StartSessionResult'],
    ParentType,
    ContextType,
    RequireFields<MutationStartArchiveSessionArgs, 'date'>
  >;
  startUncoverSession?: Resolver<
    ResolversTypes['StartSessionResult'],
    ParentType,
    ContextType
  >;
  submitGuess?: Resolver<
    ResolversTypes['GuessResult'],
    ParentType,
    ContextType,
    RequireFields<MutationSubmitGuessArgs, 'albumId' | 'sessionId'>
  >;
  triggerAlbumEnrichment?: Resolver<
    ResolversTypes['EnrichmentResult'],
    ParentType,
    ContextType,
    RequireFields<MutationTriggerAlbumEnrichmentArgs, 'id'>
  >;
  triggerArtistEnrichment?: Resolver<
    ResolversTypes['EnrichmentResult'],
    ParentType,
    ContextType,
    RequireFields<MutationTriggerArtistEnrichmentArgs, 'id'>
  >;
  triggerSpotifySync?: Resolver<
    ResolversTypes['SpotifySyncResult'],
    ParentType,
    ContextType,
    RequireFields<MutationTriggerSpotifySyncArgs, 'type'>
  >;
  unfollowUser?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationUnfollowUserArgs, 'userId'>
  >;
  unpinCuratedChallenge?: Resolver<
    ResolversTypes['CuratedChallengeEntry'],
    ParentType,
    ContextType,
    RequireFields<MutationUnpinCuratedChallengeArgs, 'id'>
  >;
  updateAlbum?: Resolver<
    ResolversTypes['Album'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAlbumArgs, 'id' | 'input'>
  >;
  updateAlbumDataQuality?: Resolver<
    ResolversTypes['Album'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAlbumDataQualityArgs, 'dataQuality' | 'id'>
  >;
  updateAlbumGameStatus?: Resolver<
    ResolversTypes['UpdateAlbumGameStatusResult'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAlbumGameStatusArgs, 'input'>
  >;
  updateAlertThresholds?: Resolver<
    ResolversTypes['AlertThresholds'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAlertThresholdsArgs, 'input'>
  >;
  updateArtistDataQuality?: Resolver<
    ResolversTypes['Artist'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateArtistDataQualityArgs, 'dataQuality' | 'id'>
  >;
  updateCollection?: Resolver<
    ResolversTypes['UpdateCollectionPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCollectionArgs, 'id'>
  >;
  updateCollectionAlbum?: Resolver<
    ResolversTypes['UpdateCollectionAlbumPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCollectionAlbumArgs, 'id' | 'input'>
  >;
  updateDashboardLayout?: Resolver<
    ResolversTypes['UserSettings'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateDashboardLayoutArgs, 'layout'>
  >;
  updateOnboardingStatus?: Resolver<
    ResolversTypes['OnboardingStatus'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateOnboardingStatusArgs, 'hasCompletedTour'>
  >;
  updateProfile?: Resolver<
    ResolversTypes['UpdateProfilePayload'],
    ParentType,
    ContextType,
    Partial<MutationUpdateProfileArgs>
  >;
  updateRecommendation?: Resolver<
    ResolversTypes['UpdateRecommendationPayload'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateRecommendationArgs, 'id' | 'score'>
  >;
  updateTrack?: Resolver<
    ResolversTypes['Track'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateTrackArgs, 'id' | 'input'>
  >;
  updateUserRole?: Resolver<
    ResolversTypes['UpdateUserRolePayload'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateUserRoleArgs, 'role' | 'userId'>
  >;
  updateUserSettings?: Resolver<
    ResolversTypes['UserSettings'],
    ParentType,
    ContextType,
    Partial<MutationUpdateUserSettingsArgs>
  >;
}>;

export type OnboardingStatusResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['OnboardingStatus'] = ResolversParentTypes['OnboardingStatus'],
> = ResolversObject<{
  hasCompletedTour?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  isNewUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  profileUpdatedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OtherAlbumInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['OtherAlbumInfo'] = ResolversParentTypes['OtherAlbumInfo'],
> = ResolversObject<{
  artist?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  cloudflareImageId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PaginationInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PaginationInfo'] = ResolversParentTypes['PaginationInfo'],
> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  perPage?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PreviewEnrichmentResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PreviewEnrichmentResult'] = ResolversParentTypes['PreviewEnrichmentResult'],
> = ResolversObject<{
  fieldsToUpdate?: Resolver<
    Array<ResolversTypes['EnrichmentFieldDiff']>,
    ParentType,
    ContextType
  >;
  llamaLogId?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  matchScore?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  matchedEntity?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawData?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PreviewSummaryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['PreviewSummary'] = ResolversParentTypes['PreviewSummary'],
> = ResolversObject<{
  addedFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  changedFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conflictFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  hasTrackChanges?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  modifiedFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalFields?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = ResolversObject<{
  activeJobs?: Resolver<
    Array<ResolversTypes['JobRecord']>,
    ParentType,
    ContextType
  >;
  album?: Resolver<
    Maybe<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumArgs, 'id'>
  >;
  albumByMusicBrainzId?: Resolver<
    Maybe<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumByMusicBrainzIdArgs, 'musicbrainzId'>
  >;
  albumRecommendations?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumRecommendationsArgs, 'input'>
  >;
  albumTracks?: Resolver<
    Array<ResolversTypes['Track']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumTracksArgs, 'albumId'>
  >;
  albumsByGameStatus?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumsByGameStatusArgs, 'limit' | 'offset' | 'status'>
  >;
  albumsByJobId?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumsByJobIdArgs, 'jobId'>
  >;
  artist?: Resolver<
    Maybe<ResolversTypes['Artist']>,
    ParentType,
    ContextType,
    RequireFields<QueryArtistArgs, 'id'>
  >;
  artistByMusicBrainzId?: Resolver<
    Maybe<ResolversTypes['Artist']>,
    ParentType,
    ContextType,
    RequireFields<QueryArtistByMusicBrainzIdArgs, 'musicbrainzId'>
  >;
  artistCorrectionPreview?: Resolver<
    ResolversTypes['ArtistCorrectionPreview'],
    ParentType,
    ContextType,
    RequireFields<
      QueryArtistCorrectionPreviewArgs,
      'artistId' | 'source' | 'sourceArtistId'
    >
  >;
  artistCorrectionSearch?: Resolver<
    ResolversTypes['ArtistCorrectionSearchResponse'],
    ParentType,
    ContextType,
    RequireFields<QueryArtistCorrectionSearchArgs, 'query' | 'source'>
  >;
  artistDiscography?: Resolver<
    ResolversTypes['CategorizedDiscography'],
    ParentType,
    ContextType,
    RequireFields<QueryArtistDiscographyArgs, 'id' | 'source'>
  >;
  artistRecommendations?: Resolver<
    ResolversTypes['ArtistRecommendationsConnection'],
    ParentType,
    ContextType,
    RequireFields<
      QueryArtistRecommendationsArgs,
      'artistId' | 'limit' | 'offset' | 'sort'
    >
  >;
  collection?: Resolver<
    Maybe<ResolversTypes['Collection']>,
    ParentType,
    ContextType,
    RequireFields<QueryCollectionArgs, 'id'>
  >;
  correctionPreview?: Resolver<
    ResolversTypes['CorrectionPreview'],
    ParentType,
    ContextType,
    RequireFields<QueryCorrectionPreviewArgs, 'input'>
  >;
  correctionSearch?: Resolver<
    ResolversTypes['CorrectionSearchResponse'],
    ParentType,
    ContextType,
    RequireFields<QueryCorrectionSearchArgs, 'input'>
  >;
  curatedChallengeCount?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  curatedChallenges?: Resolver<
    Array<ResolversTypes['CuratedChallengeEntry']>,
    ParentType,
    ContextType,
    Partial<QueryCuratedChallengesArgs>
  >;
  dailyChallenge?: Resolver<
    ResolversTypes['DailyChallengeInfo'],
    ParentType,
    ContextType,
    Partial<QueryDailyChallengeArgs>
  >;
  databaseStats?: Resolver<
    ResolversTypes['DatabaseStats'],
    ParentType,
    ContextType
  >;
  enrichmentStats?: Resolver<
    ResolversTypes['EnrichmentStats'],
    ParentType,
    ContextType,
    Partial<QueryEnrichmentStatsArgs>
  >;
  failedJobs?: Resolver<
    Array<ResolversTypes['JobRecord']>,
    ParentType,
    ContextType,
    RequireFields<QueryFailedJobsArgs, 'limit'>
  >;
  followingActivity?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType,
    RequireFields<QueryFollowingActivityArgs, 'limit'>
  >;
  gamePoolStats?: Resolver<
    ResolversTypes['GamePoolStats'],
    ParentType,
    ContextType
  >;
  getAlbumRecommendations?: Resolver<
    ResolversTypes['AlbumRecommendationsResponse'],
    ParentType,
    ContextType,
    RequireFields<QueryGetAlbumRecommendationsArgs, 'albumId' | 'limit'>
  >;
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isFollowing?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<QueryIsFollowingArgs, 'userId'>
  >;
  jobHistory?: Resolver<
    Array<ResolversTypes['JobRecord']>,
    ParentType,
    ContextType,
    RequireFields<QueryJobHistoryArgs, 'limit'>
  >;
  llamaLogChain?: Resolver<
    ResolversTypes['LlamaLogChainResponse'],
    ParentType,
    ContextType,
    RequireFields<QueryLlamaLogChainArgs, 'entityId' | 'entityType' | 'limit'>
  >;
  llamaLogs?: Resolver<
    Array<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType,
    Partial<QueryLlamaLogsArgs>
  >;
  mutualConnections?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryMutualConnectionsArgs, 'userId'>
  >;
  myArchiveStats?: Resolver<
    Maybe<ResolversTypes['UncoverArchiveStats']>,
    ParentType,
    ContextType
  >;
  myCollectionAlbums?: Resolver<
    Array<ResolversTypes['CollectionAlbum']>,
    ParentType,
    ContextType
  >;
  myCollections?: Resolver<
    Array<ResolversTypes['Collection']>,
    ParentType,
    ContextType
  >;
  myRecommendations?: Resolver<
    ResolversTypes['RecommendationFeed'],
    ParentType,
    ContextType,
    RequireFields<QueryMyRecommendationsArgs, 'limit' | 'sort'>
  >;
  mySettings?: Resolver<
    Maybe<ResolversTypes['UserSettings']>,
    ParentType,
    ContextType
  >;
  myUncoverSessions?: Resolver<
    Array<ResolversTypes['UncoverSessionHistory']>,
    ParentType,
    ContextType,
    Partial<QueryMyUncoverSessionsArgs>
  >;
  myUncoverStats?: Resolver<
    Maybe<ResolversTypes['UncoverPlayerStats']>,
    ParentType,
    ContextType
  >;
  onboardingStatus?: Resolver<
    ResolversTypes['OnboardingStatus'],
    ParentType,
    ContextType
  >;
  publicCollections?: Resolver<
    Array<ResolversTypes['Collection']>,
    ParentType,
    ContextType,
    RequireFields<QueryPublicCollectionsArgs, 'limit' | 'offset'>
  >;
  queueMetrics?: Resolver<
    ResolversTypes['QueueMetrics'],
    ParentType,
    ContextType,
    RequireFields<QueryQueueMetricsArgs, 'timeRange'>
  >;
  queueStatus?: Resolver<
    ResolversTypes['QueueStatus'],
    ParentType,
    ContextType
  >;
  recommendation?: Resolver<
    Maybe<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType,
    RequireFields<QueryRecommendationArgs, 'id'>
  >;
  recommendationFeed?: Resolver<
    ResolversTypes['RecommendationFeed'],
    ParentType,
    ContextType,
    RequireFields<QueryRecommendationFeedArgs, 'limit'>
  >;
  search?: Resolver<
    ResolversTypes['SearchResults'],
    ParentType,
    ContextType,
    RequireFields<QuerySearchArgs, 'input'>
  >;
  searchAlbums?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    Partial<QuerySearchAlbumsArgs>
  >;
  searchArtists?: Resolver<
    Array<ResolversTypes['Artist']>,
    ParentType,
    ContextType,
    Partial<QuerySearchArtistsArgs>
  >;
  searchTracks?: Resolver<
    Array<ResolversTypes['Track']>,
    ParentType,
    ContextType,
    RequireFields<QuerySearchTracksArgs, 'limit' | 'query'>
  >;
  socialFeed?: Resolver<
    ResolversTypes['ActivityFeed'],
    ParentType,
    ContextType,
    RequireFields<QuerySocialFeedArgs, 'limit'>
  >;
  spotifyTrending?: Resolver<
    ResolversTypes['SpotifyTrendingData'],
    ParentType,
    ContextType
  >;
  suggestedGameAlbums?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QuerySuggestedGameAlbumsArgs, 'limit'>
  >;
  syncJob?: Resolver<
    Maybe<ResolversTypes['SyncJob']>,
    ParentType,
    ContextType,
    RequireFields<QuerySyncJobArgs, 'id'>
  >;
  syncJobByJobId?: Resolver<
    Maybe<ResolversTypes['SyncJob']>,
    ParentType,
    ContextType,
    RequireFields<QuerySyncJobByJobIdArgs, 'jobId'>
  >;
  syncJobs?: Resolver<
    ResolversTypes['SyncJobsConnection'],
    ParentType,
    ContextType,
    Partial<QuerySyncJobsArgs>
  >;
  systemHealth?: Resolver<
    ResolversTypes['SystemHealth'],
    ParentType,
    ContextType
  >;
  topRecommendedAlbums?: Resolver<
    Array<ResolversTypes['TopRecommendedAlbum']>,
    ParentType,
    ContextType,
    RequireFields<QueryTopRecommendedAlbumsArgs, 'limit'>
  >;
  topRecommendedArtists?: Resolver<
    Array<ResolversTypes['TopRecommendedArtist']>,
    ParentType,
    ContextType,
    RequireFields<QueryTopRecommendedArtistsArgs, 'limit'>
  >;
  track?: Resolver<
    Maybe<ResolversTypes['Track']>,
    ParentType,
    ContextType,
    RequireFields<QueryTrackArgs, 'id'>
  >;
  trackRecommendations?: Resolver<
    Array<ResolversTypes['Track']>,
    ParentType,
    ContextType,
    RequireFields<QueryTrackRecommendationsArgs, 'limit' | 'trackId'>
  >;
  trendingAlbums?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryTrendingAlbumsArgs, 'limit'>
  >;
  trendingArtists?: Resolver<
    Array<ResolversTypes['Artist']>,
    ParentType,
    ContextType,
    RequireFields<QueryTrendingArtistsArgs, 'limit'>
  >;
  upcomingChallenges?: Resolver<
    Array<ResolversTypes['UpcomingChallenge']>,
    ParentType,
    ContextType,
    RequireFields<QueryUpcomingChallengesArgs, 'days'>
  >;
  user?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserArgs, 'id'>
  >;
  userCollections?: Resolver<
    Array<ResolversTypes['Collection']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserCollectionsArgs, 'userId'>
  >;
  userFollowers?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserFollowersArgs, 'limit' | 'offset' | 'userId'>
  >;
  userFollowing?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserFollowingArgs, 'limit' | 'offset' | 'userId'>
  >;
  userStats?: Resolver<
    ResolversTypes['UserStats'],
    ParentType,
    ContextType,
    RequireFields<QueryUserStatsArgs, 'userId'>
  >;
  userSuggestions?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserSuggestionsArgs, 'limit'>
  >;
  users?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUsersArgs, 'limit' | 'offset' | 'sortBy' | 'sortOrder'>
  >;
  usersCount?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType,
    Partial<QueryUsersCountArgs>
  >;
}>;

export type QueueMetricsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['QueueMetrics'] = ResolversParentTypes['QueueMetrics'],
> = ResolversObject<{
  avgProcessingTime?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  errorRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  jobsFailed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobsProcessed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  successRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  throughput?: Resolver<
    ResolversTypes['ThroughputMetrics'],
    ParentType,
    ContextType
  >;
  timeRange?: Resolver<ResolversTypes['TimeRange'], ParentType, ContextType>;
  topErrors?: Resolver<
    Array<ResolversTypes['ErrorMetric']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueueStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['QueueStats'] = ResolversParentTypes['QueueStats'],
> = ResolversObject<{
  active?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  delayed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  paused?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  waiting?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueueStatusResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['QueueStatus'] = ResolversParentTypes['QueueStatus'],
> = ResolversObject<{
  isPaused?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rateLimitInfo?: Resolver<
    ResolversTypes['RateLimitInfo'],
    ParentType,
    ContextType
  >;
  stats?: Resolver<ResolversTypes['QueueStats'], ParentType, ContextType>;
  workers?: Resolver<
    Array<ResolversTypes['WorkerInfo']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RateLimitInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['RateLimitInfo'] = ResolversParentTypes['RateLimitInfo'],
> = ResolversObject<{
  currentWindowRequests?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  maxRequestsPerSecond?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  windowResetTime?: Resolver<
    ResolversTypes['DateTime'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Recommendation'] = ResolversParentTypes['Recommendation'],
> = ResolversObject<{
  basisAlbum?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizedScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  recommendedAlbum?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  similarity?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationFeedResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['RecommendationFeed'] = ResolversParentTypes['RecommendationFeed'],
> = ResolversObject<{
  cursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recommendations?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReorderCollectionAlbumsPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ReorderCollectionAlbumsPayload'] = ResolversParentTypes['ReorderCollectionAlbumsPayload'],
> = ResolversObject<{
  ids?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RollbackSyncJobResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['RollbackSyncJobResult'] = ResolversParentTypes['RollbackSyncJobResult'],
> = ResolversObject<{
  albumsDeleted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  artistsDeleted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dryRun?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  syncJobId?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ScoreBreakdownResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ScoreBreakdown'] = ResolversParentTypes['ScoreBreakdown'],
> = ResolversObject<{
  artistScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  confidenceTier?: Resolver<
    Maybe<ResolversTypes['ConfidenceTier']>,
    ParentType,
    ContextType
  >;
  mbScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  titleScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  yearScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ScoredSearchResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ScoredSearchResult'] = ResolversParentTypes['ScoredSearchResult'],
> = ResolversObject<{
  artistCredits?: Resolver<
    Array<ResolversTypes['CorrectionArtistCredit']>,
    ParentType,
    ContextType
  >;
  breakdown?: Resolver<
    ResolversTypes['ScoreBreakdown'],
    ParentType,
    ContextType
  >;
  coverArtUrl?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  disambiguation?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  displayScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  firstReleaseDate?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  isLowConfidence?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  mbScore?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  normalizedScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  primaryArtistName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  primaryType?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  releaseGroupMbid?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  scoringStrategy?: Resolver<
    ResolversTypes['ScoringStrategy'],
    ParentType,
    ContextType
  >;
  secondaryTypes?: Resolver<
    Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SearchResult'] = ResolversParentTypes['SearchResult'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    'Album' | 'Artist' | 'Track',
    ParentType,
    ContextType
  >;
}>;

export type SearchResultsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SearchResults'] = ResolversParentTypes['SearchResults'],
> = ResolversObject<{
  albums?: Resolver<
    Array<ResolversTypes['UnifiedRelease']>,
    ParentType,
    ContextType
  >;
  artists?: Resolver<Array<ResolversTypes['Artist']>, ParentType, ContextType>;
  currentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SourceStatResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SourceStat'] = ResolversParentTypes['SourceStat'],
> = ResolversObject<{
  attempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  successRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyAlbumResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyAlbum'] = ResolversParentTypes['SpotifyAlbum'],
> = ResolversObject<{
  artistIds?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  artists?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  releaseDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  spotifyUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalTracks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyArtistResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyArtist'] = ResolversParentTypes['SpotifyArtist'],
> = ResolversObject<{
  followers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  genres?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  popularity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  spotifyUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyPlaylistResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyPlaylist'] = ResolversParentTypes['SpotifyPlaylist'],
> = ResolversObject<{
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  spotifyUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tracksTotal?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyPopularArtistsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyPopularArtists'] = ResolversParentTypes['SpotifyPopularArtists'],
> = ResolversObject<{
  artists?: Resolver<
    Array<ResolversTypes['SpotifyArtist']>,
    ParentType,
    ContextType
  >;
  searchTerm?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifySyncResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifySyncResult'] = ResolversParentTypes['SpotifySyncResult'],
> = ResolversObject<{
  jobId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stats?: Resolver<
    Maybe<ResolversTypes['SpotifySyncStats']>,
    ParentType,
    ContextType
  >;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifySyncStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifySyncStats'] = ResolversParentTypes['SpotifySyncStats'],
> = ResolversObject<{
  albumsCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  albumsQueued?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  albumsUpdated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  enrichmentJobsQueued?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyTopChartResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyTopChart'] = ResolversParentTypes['SpotifyTopChart'],
> = ResolversObject<{
  playlistId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  playlistImage?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  playlistName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tracks?: Resolver<
    Array<ResolversTypes['SpotifyTrack']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyTrackResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyTrack'] = ResolversParentTypes['SpotifyTrack'],
> = ResolversObject<{
  album?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  albumId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  artistIds?: Resolver<
    Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  artists?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  popularity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SpotifyTrendingDataResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SpotifyTrendingData'] = ResolversParentTypes['SpotifyTrendingData'],
> = ResolversObject<{
  expires?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  featuredPlaylists?: Resolver<
    Array<ResolversTypes['SpotifyPlaylist']>,
    ParentType,
    ContextType
  >;
  lastUpdated?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  needsSync?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  newReleases?: Resolver<
    Array<ResolversTypes['SpotifyAlbum']>,
    ParentType,
    ContextType
  >;
  popularArtists?: Resolver<
    Array<ResolversTypes['SpotifyPopularArtists']>,
    ParentType,
    ContextType
  >;
  topCharts?: Resolver<
    Array<ResolversTypes['SpotifyTopChart']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StartSessionResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['StartSessionResult'] = ResolversParentTypes['StartSessionResult'],
> = ResolversObject<{
  challengeId?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  cloudflareImageId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  session?: Resolver<
    ResolversTypes['UncoverSessionInfo'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SubscriptionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription'],
> = ResolversObject<{
  alertStream?: SubscriptionResolver<
    ResolversTypes['Alert'],
    'alertStream',
    ParentType,
    ContextType
  >;
  jobStatusUpdates?: SubscriptionResolver<
    ResolversTypes['JobStatusUpdate'],
    'jobStatusUpdates',
    ParentType,
    ContextType,
    Partial<SubscriptionJobStatusUpdatesArgs>
  >;
  metricsStream?: SubscriptionResolver<
    ResolversTypes['QueueMetrics'],
    'metricsStream',
    ParentType,
    ContextType,
    RequireFields<SubscriptionMetricsStreamArgs, 'interval'>
  >;
  queueStatusUpdates?: SubscriptionResolver<
    ResolversTypes['QueueStatus'],
    'queueStatusUpdates',
    ParentType,
    ContextType
  >;
  systemHealthUpdates?: SubscriptionResolver<
    ResolversTypes['SystemHealth'],
    'systemHealthUpdates',
    ParentType,
    ContextType
  >;
}>;

export type SyncJobResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SyncJob'] = ResolversParentTypes['SyncJob'],
> = ResolversObject<{
  albums?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<SyncJobAlbumsArgs, 'limit'>
  >;
  albumsCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  albumsSkipped?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  albumsUpdated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  artistsCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  artistsUpdated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  errorCode?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  errorMessage?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  jobType?: Resolver<ResolversTypes['SyncJobType'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SyncJobStatus'], ParentType, ContextType>;
  triggeredBy?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SyncJobsConnectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SyncJobsConnection'] = ResolversParentTypes['SyncJobsConnection'],
> = ResolversObject<{
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  jobs?: Resolver<Array<ResolversTypes['SyncJob']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SystemHealthResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['SystemHealth'] = ResolversParentTypes['SystemHealth'],
> = ResolversObject<{
  alerts?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  components?: Resolver<
    ResolversTypes['HealthComponents'],
    ParentType,
    ContextType
  >;
  metrics?: Resolver<ResolversTypes['HealthMetrics'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['HealthStatus'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  uptime?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TextDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TextDiff'] = ResolversParentTypes['TextDiff'],
> = ResolversObject<{
  changeType?: Resolver<ResolversTypes['ChangeType'], ParentType, ContextType>;
  currentValue?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parts?: Resolver<
    Maybe<Array<ResolversTypes['TextDiffPart']>>,
    ParentType,
    ContextType
  >;
  sourceValue?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TextDiffPartResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TextDiffPart'] = ResolversParentTypes['TextDiffPart'],
> = ResolversObject<{
  added?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  removed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ThroughputMetricsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['ThroughputMetrics'] = ResolversParentTypes['ThroughputMetrics'],
> = ResolversObject<{
  jobsPerHour?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  jobsPerMinute?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  peakJobsPerMinute?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TopRecommendedAlbumResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TopRecommendedAlbum'] = ResolversParentTypes['TopRecommendedAlbum'],
> = ResolversObject<{
  album?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  asBasisCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  asTargetCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  averageScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  recommendationCount?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TopRecommendedArtistResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TopRecommendedArtist'] = ResolversParentTypes['TopRecommendedArtist'],
> = ResolversObject<{
  albumsInRecommendations?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  artist?: Resolver<ResolversTypes['Artist'], ParentType, ContextType>;
  averageScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  recommendationCount?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrackResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Track'] = ResolversParentTypes['Track'],
> = ResolversObject<{
  album?: Resolver<Maybe<ResolversTypes['Album']>, ParentType, ContextType>;
  albumId?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  artists?: Resolver<
    Array<ResolversTypes['ArtistCredit']>,
    ParentType,
    ContextType
  >;
  audioFeatures?: Resolver<
    Maybe<ResolversTypes['AudioFeatures']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  discNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  discogsId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  duration?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  explicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isrc?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  latestLlamaLog?: Resolver<
    Maybe<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType
  >;
  llamaLogs?: Resolver<
    Array<ResolversTypes['LlamaLog']>,
    ParentType,
    ContextType,
    Partial<TrackLlamaLogsArgs>
  >;
  musicbrainzId?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  popularity?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  previewUrl?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  searchArtistName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  searchCoverArtUrl?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trackNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrackDataResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TrackData'] = ResolversParentTypes['TrackData'],
> = ResolversObject<{
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trackNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrackDiffResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TrackDiff'] = ResolversParentTypes['TrackDiff'],
> = ResolversObject<{
  changeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  current?: Resolver<
    Maybe<ResolversTypes['TrackData']>,
    ParentType,
    ContextType
  >;
  discNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  durationDelta?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<
    Maybe<ResolversTypes['TrackSourceData']>,
    ParentType,
    ContextType
  >;
  titleDiff?: Resolver<
    Maybe<Array<ResolversTypes['TextDiffPart']>>,
    ParentType,
    ContextType
  >;
  trackId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrackListSummaryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TrackListSummary'] = ResolversParentTypes['TrackListSummary'],
> = ResolversObject<{
  added?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  matching?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  modified?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  removed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalCurrent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSource?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrackSourceDataResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['TrackSourceData'] = ResolversParentTypes['TrackSourceData'],
> = ResolversObject<{
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  mbid?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UuidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

export type UncoverArchiveStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UncoverArchiveStats'] = ResolversParentTypes['UncoverArchiveStats'],
> = ResolversObject<{
  gamesPlayed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  gamesWon?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  totalAttempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  winDistribution?: Resolver<
    Array<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  winRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UncoverGuessAlbumInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UncoverGuessAlbumInfo'] = ResolversParentTypes['UncoverGuessAlbumInfo'],
> = ResolversObject<{
  artistName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  cloudflareImageId?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UncoverGuessInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UncoverGuessInfo'] = ResolversParentTypes['UncoverGuessInfo'],
> = ResolversObject<{
  guessNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  guessedAlbum?: Resolver<
    Maybe<ResolversTypes['UncoverGuessAlbumInfo']>,
    ParentType,
    ContextType
  >;
  guessedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isCorrect?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isSkipped?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UncoverPlayerStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UncoverPlayerStats'] = ResolversParentTypes['UncoverPlayerStats'],
> = ResolversObject<{
  currentStreak?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  gamesPlayed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  gamesWon?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastPlayedDate?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  maxStreak?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalAttempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  winDistribution?: Resolver<
    Array<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >;
  winRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UncoverSessionHistoryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UncoverSessionHistory'] = ResolversParentTypes['UncoverSessionHistory'],
> = ResolversObject<{
  attemptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  challengeDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  completedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  won?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UncoverSessionInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UncoverSessionInfo'] = ResolversParentTypes['UncoverSessionInfo'],
> = ResolversObject<{
  attemptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  guesses?: Resolver<
    Array<ResolversTypes['UncoverGuessInfo']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<
    ResolversTypes['UncoverSessionStatus'],
    ParentType,
    ContextType
  >;
  won?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UnifiedReleaseResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UnifiedRelease'] = ResolversParentTypes['UnifiedRelease'],
> = ResolversObject<{
  artistCredits?: Resolver<
    Maybe<Array<ResolversTypes['ArtistCredit']>>,
    ParentType,
    ContextType
  >;
  artistName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  primaryType?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  releaseDate?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  secondaryTypes?: Resolver<
    Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  source?: Resolver<ResolversTypes['DataSource'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trackCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  year?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpcomingChallengeResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpcomingChallenge'] = ResolversParentTypes['UpcomingChallenge'],
> = ResolversObject<{
  album?: Resolver<Maybe<ResolversTypes['Album']>, ParentType, ContextType>;
  date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  daysSinceEpoch?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isPinned?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateAlbumGameStatusResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpdateAlbumGameStatusResult'] = ResolversParentTypes['UpdateAlbumGameStatusResult'],
> = ResolversObject<{
  album?: Resolver<Maybe<ResolversTypes['Album']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateCollectionAlbumPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpdateCollectionAlbumPayload'] = ResolversParentTypes['UpdateCollectionAlbumPayload'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateCollectionPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpdateCollectionPayload'] = ResolversParentTypes['UpdateCollectionPayload'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateProfilePayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpdateProfilePayload'] = ResolversParentTypes['UpdateProfilePayload'],
> = ResolversObject<{
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateRecommendationPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpdateRecommendationPayload'] = ResolversParentTypes['UpdateRecommendationPayload'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateUserRolePayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UpdateUserRolePayload'] = ResolversParentTypes['UpdateUserRolePayload'],
> = ResolversObject<{
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = ResolversObject<{
  _count?: Resolver<
    Maybe<ResolversTypes['UserCount']>,
    ParentType,
    ContextType
  >;
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  collections?: Resolver<
    Array<ResolversTypes['Collection']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailVerified?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  followers?: Resolver<
    Array<ResolversTypes['UserFollow']>,
    ParentType,
    ContextType
  >;
  followersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  following?: Resolver<
    Array<ResolversTypes['UserFollow']>,
    ParentType,
    ContextType
  >;
  followingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isFollowing?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  lastActive?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  mutualFollowers?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  profileUpdatedAt?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  recommendations?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType
  >;
  recommendationsCount?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  settings?: Resolver<
    Maybe<ResolversTypes['UserSettings']>,
    ParentType,
    ContextType
  >;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserCountResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UserCount'] = ResolversParentTypes['UserCount'],
> = ResolversObject<{
  collections?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recommendations?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserFollowResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UserFollow'] = ResolversParentTypes['UserFollow'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  followed?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  follower?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSettingsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings'],
> = ResolversObject<{
  autoplayPreviews?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dashboardLayout?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType
  >;
  defaultCollectionView?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  emailNotifications?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  followAlerts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  profileVisibility?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  recommendationAlerts?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  showCollectionAddsInFeed?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  showCollections?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  showListenLaterInFeed?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  showOnboardingTour?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  showRecentActivity?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  theme?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserStatsResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['UserStats'] = ResolversParentTypes['UserStats'],
> = ResolversObject<{
  averageRecommendationScore?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  collectionsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  recommendationsCount?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  topGenres?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  totalAlbumsInCollections?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WorkerInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['WorkerInfo'] = ResolversParentTypes['WorkerInfo'],
> = ResolversObject<{
  activeJobCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isPaused?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isRunning?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Activity?: ActivityResolvers<ContextType>;
  ActivityFeed?: ActivityFeedResolvers<ContextType>;
  ActivityMetadata?: ActivityMetadataResolvers<ContextType>;
  AddAlbumToCollectionPayload?: AddAlbumToCollectionPayloadResolvers<ContextType>;
  AdminUpdateUserSettingsPayload?: AdminUpdateUserSettingsPayloadResolvers<ContextType>;
  Album?: AlbumResolvers<ContextType>;
  AlbumRecommendation?: AlbumRecommendationResolvers<ContextType>;
  AlbumRecommendationsResponse?: AlbumRecommendationsResponseResolvers<ContextType>;
  Alert?: AlertResolvers<ContextType>;
  AlertThresholds?: AlertThresholdsResolvers<ContextType>;
  AppliedArtistChanges?: AppliedArtistChangesResolvers<ContextType>;
  AppliedChanges?: AppliedChangesResolvers<ContextType>;
  AppliedTrackChanges?: AppliedTrackChangesResolvers<ContextType>;
  ArrayDiff?: ArrayDiffResolvers<ContextType>;
  Artist?: ArtistResolvers<ContextType>;
  ArtistAppliedChanges?: ArtistAppliedChangesResolvers<ContextType>;
  ArtistCorrectionApplyResult?: ArtistCorrectionApplyResultResolvers<ContextType>;
  ArtistCorrectionPreview?: ArtistCorrectionPreviewResolvers<ContextType>;
  ArtistCorrectionSearchResponse?: ArtistCorrectionSearchResponseResolvers<ContextType>;
  ArtistCorrectionSearchResult?: ArtistCorrectionSearchResultResolvers<ContextType>;
  ArtistCredit?: ArtistCreditResolvers<ContextType>;
  ArtistCreditDiff?: ArtistCreditDiffResolvers<ContextType>;
  ArtistFieldDiff?: ArtistFieldDiffResolvers<ContextType>;
  ArtistPreviewSummary?: ArtistPreviewSummaryResolvers<ContextType>;
  ArtistRecommendation?: ArtistRecommendationResolvers<ContextType>;
  ArtistRecommendationsConnection?: ArtistRecommendationsConnectionResolvers<ContextType>;
  ArtistTopRelease?: ArtistTopReleaseResolvers<ContextType>;
  AudioFeatures?: AudioFeaturesResolvers<ContextType>;
  BatchEnrichmentResult?: BatchEnrichmentResultResolvers<ContextType>;
  CategorizedDiscography?: CategorizedDiscographyResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  CollectionAlbum?: CollectionAlbumResolvers<ContextType>;
  ComponentHealth?: ComponentHealthResolvers<ContextType>;
  CorrectionApplyError?: CorrectionApplyErrorResolvers<ContextType>;
  CorrectionApplyResult?: CorrectionApplyResultResolvers<ContextType>;
  CorrectionApplySuccess?: CorrectionApplySuccessResolvers<ContextType>;
  CorrectionArtistCredit?: CorrectionArtistCreditResolvers<ContextType>;
  CorrectionPreview?: CorrectionPreviewResolvers<ContextType>;
  CorrectionScoringInfo?: CorrectionScoringInfoResolvers<ContextType>;
  CorrectionSearchQuery?: CorrectionSearchQueryResolvers<ContextType>;
  CorrectionSearchResponse?: CorrectionSearchResponseResolvers<ContextType>;
  CoverArtDiff?: CoverArtDiffResolvers<ContextType>;
  CreateCollectionPayload?: CreateCollectionPayloadResolvers<ContextType>;
  CreateRecommendationPayload?: CreateRecommendationPayloadResolvers<ContextType>;
  CuratedChallengeEntry?: CuratedChallengeEntryResolvers<ContextType>;
  DailyChallengeInfo?: DailyChallengeInfoResolvers<ContextType>;
  DatabaseStats?: DatabaseStatsResolvers<ContextType>;
  DateComponentChanges?: DateComponentChangesResolvers<ContextType>;
  DateComponents?: DateComponentsResolvers<ContextType>;
  DateDiff?: DateDiffResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteAlbumPayload?: DeleteAlbumPayloadResolvers<ContextType>;
  DeleteArtistPayload?: DeleteArtistPayloadResolvers<ContextType>;
  EnrichmentFieldDiff?: EnrichmentFieldDiffResolvers<ContextType>;
  EnrichmentResult?: EnrichmentResultResolvers<ContextType>;
  EnrichmentStats?: EnrichmentStatsResolvers<ContextType>;
  ErrorMetric?: ErrorMetricResolvers<ContextType>;
  FollowUserPayload?: FollowUserPayloadResolvers<ContextType>;
  GamePoolStats?: GamePoolStatsResolvers<ContextType>;
  GroupedSearchResult?: GroupedSearchResultResolvers<ContextType>;
  GuessResult?: GuessResultResolvers<ContextType>;
  HealthComponents?: HealthComponentsResolvers<ContextType>;
  HealthMetrics?: HealthMetricsResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JobRecord?: JobRecordResolvers<ContextType>;
  JobStatusUpdate?: JobStatusUpdateResolvers<ContextType>;
  LlamaLog?: LlamaLogResolvers<ContextType>;
  LlamaLogChainResponse?: LlamaLogChainResponseResolvers<ContextType>;
  MBArtist?: MbArtistResolvers<ContextType>;
  MBArtistCredit?: MbArtistCreditResolvers<ContextType>;
  MBMedium?: MbMediumResolvers<ContextType>;
  MBMediumTrack?: MbMediumTrackResolvers<ContextType>;
  MBRecording?: MbRecordingResolvers<ContextType>;
  MBReleaseData?: MbReleaseDataResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  OnboardingStatus?: OnboardingStatusResolvers<ContextType>;
  OtherAlbumInfo?: OtherAlbumInfoResolvers<ContextType>;
  PaginationInfo?: PaginationInfoResolvers<ContextType>;
  PreviewEnrichmentResult?: PreviewEnrichmentResultResolvers<ContextType>;
  PreviewSummary?: PreviewSummaryResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  QueueMetrics?: QueueMetricsResolvers<ContextType>;
  QueueStats?: QueueStatsResolvers<ContextType>;
  QueueStatus?: QueueStatusResolvers<ContextType>;
  RateLimitInfo?: RateLimitInfoResolvers<ContextType>;
  Recommendation?: RecommendationResolvers<ContextType>;
  RecommendationFeed?: RecommendationFeedResolvers<ContextType>;
  ReorderCollectionAlbumsPayload?: ReorderCollectionAlbumsPayloadResolvers<ContextType>;
  RollbackSyncJobResult?: RollbackSyncJobResultResolvers<ContextType>;
  ScoreBreakdown?: ScoreBreakdownResolvers<ContextType>;
  ScoredSearchResult?: ScoredSearchResultResolvers<ContextType>;
  SearchResult?: SearchResultResolvers<ContextType>;
  SearchResults?: SearchResultsResolvers<ContextType>;
  SourceStat?: SourceStatResolvers<ContextType>;
  SpotifyAlbum?: SpotifyAlbumResolvers<ContextType>;
  SpotifyArtist?: SpotifyArtistResolvers<ContextType>;
  SpotifyPlaylist?: SpotifyPlaylistResolvers<ContextType>;
  SpotifyPopularArtists?: SpotifyPopularArtistsResolvers<ContextType>;
  SpotifySyncResult?: SpotifySyncResultResolvers<ContextType>;
  SpotifySyncStats?: SpotifySyncStatsResolvers<ContextType>;
  SpotifyTopChart?: SpotifyTopChartResolvers<ContextType>;
  SpotifyTrack?: SpotifyTrackResolvers<ContextType>;
  SpotifyTrendingData?: SpotifyTrendingDataResolvers<ContextType>;
  StartSessionResult?: StartSessionResultResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SyncJob?: SyncJobResolvers<ContextType>;
  SyncJobsConnection?: SyncJobsConnectionResolvers<ContextType>;
  SystemHealth?: SystemHealthResolvers<ContextType>;
  TextDiff?: TextDiffResolvers<ContextType>;
  TextDiffPart?: TextDiffPartResolvers<ContextType>;
  ThroughputMetrics?: ThroughputMetricsResolvers<ContextType>;
  TopRecommendedAlbum?: TopRecommendedAlbumResolvers<ContextType>;
  TopRecommendedArtist?: TopRecommendedArtistResolvers<ContextType>;
  Track?: TrackResolvers<ContextType>;
  TrackData?: TrackDataResolvers<ContextType>;
  TrackDiff?: TrackDiffResolvers<ContextType>;
  TrackListSummary?: TrackListSummaryResolvers<ContextType>;
  TrackSourceData?: TrackSourceDataResolvers<ContextType>;
  UUID?: GraphQLScalarType;
  UncoverArchiveStats?: UncoverArchiveStatsResolvers<ContextType>;
  UncoverGuessAlbumInfo?: UncoverGuessAlbumInfoResolvers<ContextType>;
  UncoverGuessInfo?: UncoverGuessInfoResolvers<ContextType>;
  UncoverPlayerStats?: UncoverPlayerStatsResolvers<ContextType>;
  UncoverSessionHistory?: UncoverSessionHistoryResolvers<ContextType>;
  UncoverSessionInfo?: UncoverSessionInfoResolvers<ContextType>;
  UnifiedRelease?: UnifiedReleaseResolvers<ContextType>;
  UpcomingChallenge?: UpcomingChallengeResolvers<ContextType>;
  UpdateAlbumGameStatusResult?: UpdateAlbumGameStatusResultResolvers<ContextType>;
  UpdateCollectionAlbumPayload?: UpdateCollectionAlbumPayloadResolvers<ContextType>;
  UpdateCollectionPayload?: UpdateCollectionPayloadResolvers<ContextType>;
  UpdateProfilePayload?: UpdateProfilePayloadResolvers<ContextType>;
  UpdateRecommendationPayload?: UpdateRecommendationPayloadResolvers<ContextType>;
  UpdateUserRolePayload?: UpdateUserRolePayloadResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserCount?: UserCountResolvers<ContextType>;
  UserFollow?: UserFollowResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
  UserStats?: UserStatsResolvers<ContextType>;
  WorkerInfo?: WorkerInfoResolvers<ContextType>;
}>;
