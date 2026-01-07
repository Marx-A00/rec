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
  duration?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  enrichmentLogs: Array<EnrichmentLog>;
  enrichmentStatus?: Maybe<EnrichmentStatus>;
  id: Scalars['UUID']['output'];
  inCollectionsCount: Scalars['Int']['output'];
  label?: Maybe<Scalars['String']['output']>;
  lastEnriched?: Maybe<Scalars['DateTime']['output']>;
  latestEnrichmentLog?: Maybe<EnrichmentLog>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  needsEnrichment: Scalars['Boolean']['output'];
  recommendationScore?: Maybe<Scalars['Float']['output']>;
  releaseDate?: Maybe<Scalars['DateTime']['output']>;
  releaseType?: Maybe<Scalars['String']['output']>;
  targetRecommendations: Array<Recommendation>;
  title: Scalars['String']['output'];
  trackCount?: Maybe<Scalars['Int']['output']>;
  tracks: Array<Track>;
  updatedAt: Scalars['DateTime']['output'];
};

export type AlbumEnrichmentLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

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

export type Artist = {
  __typename?: 'Artist';
  albumCount: Scalars['Int']['output'];
  albums: Array<Album>;
  biography?: Maybe<Scalars['String']['output']>;
  cloudflareImageId?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  dataQuality?: Maybe<DataQuality>;
  enrichmentLogs: Array<EnrichmentLog>;
  enrichmentStatus?: Maybe<EnrichmentStatus>;
  formedYear?: Maybe<Scalars['Int']['output']>;
  id: Scalars['UUID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  lastEnriched?: Maybe<Scalars['DateTime']['output']>;
  latestEnrichmentLog?: Maybe<EnrichmentLog>;
  listeners?: Maybe<Scalars['Int']['output']>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  name: Scalars['String']['output'];
  needsEnrichment: Scalars['Boolean']['output'];
  popularity?: Maybe<Scalars['Float']['output']>;
  trackCount: Scalars['Int']['output'];
  tracks: Array<Track>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ArtistEnrichmentLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type ArtistAlbumInput = {
  artistId?: InputMaybe<Scalars['UUID']['input']>;
  artistName?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type ArtistCredit = {
  __typename?: 'ArtistCredit';
  artist: Artist;
  position: Scalars['Int']['output'];
  role: Scalars['String']['output'];
};

export type ArtistInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  musicbrainzId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
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

export type CreateCollectionPayload = {
  __typename?: 'CreateCollectionPayload';
  id: Scalars['String']['output'];
};

export type CreateRecommendationPayload = {
  __typename?: 'CreateRecommendationPayload';
  id: Scalars['String']['output'];
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

export type EnrichmentLog = {
  __typename?: 'EnrichmentLog';
  apiCallCount: Scalars['Int']['output'];
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
  previewData?: Maybe<Scalars['JSON']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  retryCount: Scalars['Int']['output'];
  sources: Array<Scalars['String']['output']>;
  status: EnrichmentLogStatus;
  triggeredBy?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['String']['output']>;
};

export enum EnrichmentLogStatus {
  Failed = 'FAILED',
  NoDataAvailable = 'NO_DATA_AVAILABLE',
  PartialSuccess = 'PARTIAL_SUCCESS',
  Preview = 'PREVIEW',
  Skipped = 'SKIPPED',
  Success = 'SUCCESS',
}

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

export type FollowUserPayload = {
  __typename?: 'FollowUserPayload';
  createdAt: Scalars['DateTime']['output'];
  followedId: Scalars['String']['output'];
  followerId: Scalars['String']['output'];
  id: Scalars['String']['output'];
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
  jobId: Scalars['String']['output'];
  message?: Maybe<Scalars['String']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
  status: JobStatus;
  timestamp: Scalars['DateTime']['output'];
  type: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addAlbum: Album;
  addAlbumToCollection: AddAlbumToCollectionPayload;
  addArtist: Artist;
  addToListenLater: CollectionAlbum;
  batchEnrichment: BatchEnrichmentResult;
  cleanQueue: Scalars['Boolean']['output'];
  clearFailedJobs: Scalars['Boolean']['output'];
  createCollection: CreateCollectionPayload;
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
  pauseQueue: Scalars['Boolean']['output'];
  previewAlbumEnrichment: PreviewEnrichmentResult;
  previewArtistEnrichment: PreviewEnrichmentResult;
  removeAlbumFromCollection: Scalars['Boolean']['output'];
  removeFromListenLater: Scalars['Boolean']['output'];
  reorderCollectionAlbums: ReorderCollectionAlbumsPayload;
  resetAlbumEnrichment: Album;
  resetArtistEnrichment: Artist;
  resetOnboardingStatus: OnboardingStatus;
  resumeQueue: Scalars['Boolean']['output'];
  retryAllFailed: Scalars['Int']['output'];
  retryJob: Scalars['Boolean']['output'];
  rollbackSyncJob: RollbackSyncJobResult;
  triggerAlbumEnrichment: EnrichmentResult;
  triggerArtistEnrichment: EnrichmentResult;
  triggerSpotifySync: SpotifySyncResult;
  unfollowUser: Scalars['Boolean']['output'];
  updateAlbum: Album;
  updateAlbumDataQuality: Album;
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

export type MutationAddArtistArgs = {
  input: ArtistInput;
};

export type MutationAddToListenLaterArgs = {
  albumData?: InputMaybe<AlbumInput>;
  albumId: Scalars['UUID']['input'];
};

export type MutationBatchEnrichmentArgs = {
  ids: Array<Scalars['UUID']['input']>;
  priority?: InputMaybe<EnrichmentPriority>;
  type: EnrichmentType;
};

export type MutationCleanQueueArgs = {
  olderThan?: InputMaybe<Scalars['Int']['input']>;
};

export type MutationCreateCollectionArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type MutationCreateRecommendationArgs = {
  basisAlbumId: Scalars['UUID']['input'];
  recommendedAlbumId: Scalars['UUID']['input'];
  score: Scalars['Int']['input'];
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

export type MutationUpdateAlbumArgs = {
  id: Scalars['UUID']['input'];
  input: AlbumInput;
};

export type MutationUpdateAlbumDataQualityArgs = {
  dataQuality: DataQuality;
  id: Scalars['UUID']['input'];
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
  name?: InputMaybe<Scalars['String']['input']>;
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
  enrichmentLogId: Scalars['UUID']['output'];
  fieldsToUpdate: Array<EnrichmentFieldDiff>;
  matchScore?: Maybe<Scalars['Float']['output']>;
  matchedEntity?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  rawData?: Maybe<Scalars['JSON']['output']>;
  sources: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Query = {
  __typename?: 'Query';
  activeJobs: Array<JobRecord>;
  album?: Maybe<Album>;
  albumByMusicBrainzId?: Maybe<Album>;
  albumRecommendations: Array<Album>;
  albumTracks: Array<Track>;
  albumsByJobId: Array<Album>;
  artist?: Maybe<Artist>;
  artistByMusicBrainzId?: Maybe<Artist>;
  artistDiscography: CategorizedDiscography;
  artistRecommendations: ArtistRecommendationsConnection;
  collection?: Maybe<Collection>;
  databaseStats: DatabaseStats;
  enrichmentLogs: Array<EnrichmentLog>;
  enrichmentStats: EnrichmentStats;
  failedJobs: Array<JobRecord>;
  followingActivity: Array<Recommendation>;
  getAlbumRecommendations: AlbumRecommendationsResponse;
  health: Scalars['String']['output'];
  isFollowing: Scalars['Boolean']['output'];
  jobHistory: Array<JobRecord>;
  mutualConnections: Array<User>;
  myCollectionAlbums: Array<CollectionAlbum>;
  myCollections: Array<Collection>;
  myRecommendations: RecommendationFeed;
  mySettings?: Maybe<UserSettings>;
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

export type QueryAlbumsByJobIdArgs = {
  jobId: Scalars['String']['input'];
};

export type QueryArtistArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryArtistByMusicBrainzIdArgs = {
  musicbrainzId: Scalars['UUID']['input'];
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

export type QueryEnrichmentLogsArgs = {
  entityId?: InputMaybe<Scalars['UUID']['input']>;
  entityType?: InputMaybe<EnrichmentEntityType>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sources?: InputMaybe<Array<Scalars['String']['input']>>;
  status?: InputMaybe<EnrichmentLogStatus>;
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

export type QueryMutualConnectionsArgs = {
  userId: Scalars['String']['input'];
};

export type QueryMyRecommendationsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<RecommendationSort>;
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
  duration?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  enrichmentLogs: Array<EnrichmentLog>;
  explicit: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  isrc?: Maybe<Scalars['String']['output']>;
  latestEnrichmentLog?: Maybe<EnrichmentLog>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  popularity?: Maybe<Scalars['Float']['output']>;
  previewUrl?: Maybe<Scalars['String']['output']>;
  searchArtistName?: Maybe<Scalars['String']['output']>;
  searchCoverArtUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  trackNumber: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TrackEnrichmentLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type TrackInput = {
  albumId: Scalars['UUID']['input'];
  artists: Array<ArtistTrackInput>;
  discNumber?: InputMaybe<Scalars['Int']['input']>;
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  explicit?: InputMaybe<Scalars['Boolean']['input']>;
  isrc?: InputMaybe<Scalars['String']['input']>;
  musicbrainzId?: InputMaybe<Scalars['UUID']['input']>;
  previewUrl?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  trackNumber: Scalars['Int']['input'];
};

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
  name?: Maybe<Scalars['String']['output']>;
};

export type UpdateRecommendationPayload = {
  __typename?: 'UpdateRecommendationPayload';
  id: Scalars['String']['output'];
};

export type UpdateTrackInput = {
  discNumber?: InputMaybe<Scalars['Int']['input']>;
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
  name?: Maybe<Scalars['String']['output']>;
  profileUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  recommendations: Array<Recommendation>;
  recommendationsCount: Scalars['Int']['output'];
  role: UserRole;
  settings?: Maybe<UserSettings>;
  updatedAt: Scalars['DateTime']['output'];
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
  Album: ResolverTypeWrapper<Album>;
  AlbumInput: AlbumInput;
  AlbumRecommendation: ResolverTypeWrapper<AlbumRecommendation>;
  AlbumRecommendationsResponse: ResolverTypeWrapper<AlbumRecommendationsResponse>;
  AlbumRole: AlbumRole;
  Alert: ResolverTypeWrapper<Alert>;
  AlertLevel: AlertLevel;
  AlertThresholds: ResolverTypeWrapper<AlertThresholds>;
  AlertThresholdsInput: AlertThresholdsInput;
  AlertType: AlertType;
  Artist: ResolverTypeWrapper<Artist>;
  ArtistAlbumInput: ArtistAlbumInput;
  ArtistCredit: ResolverTypeWrapper<ArtistCredit>;
  ArtistInput: ArtistInput;
  ArtistRecommendation: ResolverTypeWrapper<ArtistRecommendation>;
  ArtistRecommendationSort: ArtistRecommendationSort;
  ArtistRecommendationsConnection: ResolverTypeWrapper<ArtistRecommendationsConnection>;
  ArtistTrackInput: ArtistTrackInput;
  AudioFeatures: ResolverTypeWrapper<AudioFeatures>;
  BatchEnrichmentResult: ResolverTypeWrapper<BatchEnrichmentResult>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CategorizedDiscography: ResolverTypeWrapper<CategorizedDiscography>;
  Collection: ResolverTypeWrapper<Collection>;
  CollectionAlbum: ResolverTypeWrapper<CollectionAlbum>;
  CollectionAlbumInput: CollectionAlbumInput;
  CollectionSort: CollectionSort;
  ComponentHealth: ResolverTypeWrapper<ComponentHealth>;
  CreateCollectionPayload: ResolverTypeWrapper<CreateCollectionPayload>;
  CreateRecommendationPayload: ResolverTypeWrapper<CreateRecommendationPayload>;
  DataQuality: DataQuality;
  DataSource: DataSource;
  DatabaseStats: ResolverTypeWrapper<DatabaseStats>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteAlbumPayload: ResolverTypeWrapper<DeleteAlbumPayload>;
  DeleteArtistPayload: ResolverTypeWrapper<DeleteArtistPayload>;
  EnrichmentEntityType: EnrichmentEntityType;
  EnrichmentFieldDiff: ResolverTypeWrapper<EnrichmentFieldDiff>;
  EnrichmentLog: ResolverTypeWrapper<EnrichmentLog>;
  EnrichmentLogStatus: EnrichmentLogStatus;
  EnrichmentPriority: EnrichmentPriority;
  EnrichmentResult: ResolverTypeWrapper<EnrichmentResult>;
  EnrichmentStats: ResolverTypeWrapper<EnrichmentStats>;
  EnrichmentStatus: EnrichmentStatus;
  EnrichmentType: EnrichmentType;
  ErrorMetric: ResolverTypeWrapper<ErrorMetric>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FollowUserPayload: ResolverTypeWrapper<FollowUserPayload>;
  HealthComponents: ResolverTypeWrapper<HealthComponents>;
  HealthMetrics: ResolverTypeWrapper<HealthMetrics>;
  HealthStatus: HealthStatus;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JobRecord: ResolverTypeWrapper<JobRecord>;
  JobStatus: JobStatus;
  JobStatusUpdate: ResolverTypeWrapper<JobStatusUpdate>;
  Mutation: ResolverTypeWrapper<{}>;
  OnboardingStatus: ResolverTypeWrapper<OnboardingStatus>;
  OtherAlbumInfo: ResolverTypeWrapper<OtherAlbumInfo>;
  PaginationInfo: ResolverTypeWrapper<PaginationInfo>;
  PreviewEnrichmentResult: ResolverTypeWrapper<PreviewEnrichmentResult>;
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
  SearchInput: SearchInput;
  SearchMode: SearchMode;
  SearchResult: ResolverTypeWrapper<
    ResolversUnionTypes<ResolversTypes>['SearchResult']
  >;
  SearchResults: ResolverTypeWrapper<SearchResults>;
  SearchType: SearchType;
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
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  SyncJob: ResolverTypeWrapper<SyncJob>;
  SyncJobStatus: SyncJobStatus;
  SyncJobType: SyncJobType;
  SyncJobsConnection: ResolverTypeWrapper<SyncJobsConnection>;
  SyncJobsInput: SyncJobsInput;
  SystemHealth: ResolverTypeWrapper<SystemHealth>;
  ThroughputMetrics: ResolverTypeWrapper<ThroughputMetrics>;
  TimeRange: TimeRange;
  TimeRangeInput: TimeRangeInput;
  TopRecommendedAlbum: ResolverTypeWrapper<TopRecommendedAlbum>;
  TopRecommendedArtist: ResolverTypeWrapper<TopRecommendedArtist>;
  Track: ResolverTypeWrapper<Track>;
  TrackInput: TrackInput;
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
  UnifiedRelease: ResolverTypeWrapper<UnifiedRelease>;
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
  Album: Album;
  AlbumInput: AlbumInput;
  AlbumRecommendation: AlbumRecommendation;
  AlbumRecommendationsResponse: AlbumRecommendationsResponse;
  Alert: Alert;
  AlertThresholds: AlertThresholds;
  AlertThresholdsInput: AlertThresholdsInput;
  Artist: Artist;
  ArtistAlbumInput: ArtistAlbumInput;
  ArtistCredit: ArtistCredit;
  ArtistInput: ArtistInput;
  ArtistRecommendation: ArtistRecommendation;
  ArtistRecommendationsConnection: ArtistRecommendationsConnection;
  ArtistTrackInput: ArtistTrackInput;
  AudioFeatures: AudioFeatures;
  BatchEnrichmentResult: BatchEnrichmentResult;
  Boolean: Scalars['Boolean']['output'];
  CategorizedDiscography: CategorizedDiscography;
  Collection: Collection;
  CollectionAlbum: CollectionAlbum;
  CollectionAlbumInput: CollectionAlbumInput;
  ComponentHealth: ComponentHealth;
  CreateCollectionPayload: CreateCollectionPayload;
  CreateRecommendationPayload: CreateRecommendationPayload;
  DatabaseStats: DatabaseStats;
  DateTime: Scalars['DateTime']['output'];
  DeleteAlbumPayload: DeleteAlbumPayload;
  DeleteArtistPayload: DeleteArtistPayload;
  EnrichmentFieldDiff: EnrichmentFieldDiff;
  EnrichmentLog: EnrichmentLog;
  EnrichmentResult: EnrichmentResult;
  EnrichmentStats: EnrichmentStats;
  ErrorMetric: ErrorMetric;
  Float: Scalars['Float']['output'];
  FollowUserPayload: FollowUserPayload;
  HealthComponents: HealthComponents;
  HealthMetrics: HealthMetrics;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  JobRecord: JobRecord;
  JobStatusUpdate: JobStatusUpdate;
  Mutation: {};
  OnboardingStatus: OnboardingStatus;
  OtherAlbumInfo: OtherAlbumInfo;
  PaginationInfo: PaginationInfo;
  PreviewEnrichmentResult: PreviewEnrichmentResult;
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
  SearchInput: SearchInput;
  SearchResult: ResolversUnionTypes<ResolversParentTypes>['SearchResult'];
  SearchResults: SearchResults;
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
  String: Scalars['String']['output'];
  Subscription: {};
  SyncJob: SyncJob;
  SyncJobsConnection: SyncJobsConnection;
  SyncJobsInput: SyncJobsInput;
  SystemHealth: SystemHealth;
  ThroughputMetrics: ThroughputMetrics;
  TimeRangeInput: TimeRangeInput;
  TopRecommendedAlbum: TopRecommendedAlbum;
  TopRecommendedArtist: TopRecommendedArtist;
  Track: Track;
  TrackInput: TrackInput;
  UUID: Scalars['UUID']['output'];
  UnifiedRelease: UnifiedRelease;
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
  duration?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  enrichmentLogs?: Resolver<
    Array<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType,
    Partial<AlbumEnrichmentLogsArgs>
  >;
  enrichmentStatus?: Resolver<
    Maybe<ResolversTypes['EnrichmentStatus']>,
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
  latestEnrichmentLog?: Resolver<
    Maybe<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType
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
  enrichmentLogs?: Resolver<
    Array<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType,
    Partial<ArtistEnrichmentLogsArgs>
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
  latestEnrichmentLog?: Resolver<
    Maybe<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType
  >;
  listeners?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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
  trackCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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

export type EnrichmentLogResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['EnrichmentLog'] = ResolversParentTypes['EnrichmentLog'],
> = ResolversObject<{
  apiCallCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  previewData?: Resolver<
    Maybe<ResolversTypes['JSON']>,
    ParentType,
    ContextType
  >;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  retryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<
    ResolversTypes['EnrichmentLogStatus'],
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  userId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  progress?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  addArtist?: Resolver<
    ResolversTypes['Artist'],
    ParentType,
    ContextType,
    RequireFields<MutationAddArtistArgs, 'input'>
  >;
  addToListenLater?: Resolver<
    ResolversTypes['CollectionAlbum'],
    ParentType,
    ContextType,
    RequireFields<MutationAddToListenLaterArgs, 'albumId'>
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
    RequireFields<
      MutationCreateRecommendationArgs,
      'basisAlbumId' | 'recommendedAlbumId' | 'score'
    >
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
  pauseQueue?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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
  enrichmentLogId?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  fieldsToUpdate?: Resolver<
    Array<ResolversTypes['EnrichmentFieldDiff']>,
    ParentType,
    ContextType
  >;
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
  databaseStats?: Resolver<
    ResolversTypes['DatabaseStats'],
    ParentType,
    ContextType
  >;
  enrichmentLogs?: Resolver<
    Array<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType,
    Partial<QueryEnrichmentLogsArgs>
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
  mutualConnections?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryMutualConnectionsArgs, 'userId'>
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
  duration?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  enrichmentLogs?: Resolver<
    Array<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType,
    Partial<TrackEnrichmentLogsArgs>
  >;
  explicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isrc?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  latestEnrichmentLog?: Resolver<
    Maybe<ResolversTypes['EnrichmentLog']>,
    ParentType,
    ContextType
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

export interface UuidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

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
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  Album?: AlbumResolvers<ContextType>;
  AlbumRecommendation?: AlbumRecommendationResolvers<ContextType>;
  AlbumRecommendationsResponse?: AlbumRecommendationsResponseResolvers<ContextType>;
  Alert?: AlertResolvers<ContextType>;
  AlertThresholds?: AlertThresholdsResolvers<ContextType>;
  Artist?: ArtistResolvers<ContextType>;
  ArtistCredit?: ArtistCreditResolvers<ContextType>;
  ArtistRecommendation?: ArtistRecommendationResolvers<ContextType>;
  ArtistRecommendationsConnection?: ArtistRecommendationsConnectionResolvers<ContextType>;
  AudioFeatures?: AudioFeaturesResolvers<ContextType>;
  BatchEnrichmentResult?: BatchEnrichmentResultResolvers<ContextType>;
  CategorizedDiscography?: CategorizedDiscographyResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  CollectionAlbum?: CollectionAlbumResolvers<ContextType>;
  ComponentHealth?: ComponentHealthResolvers<ContextType>;
  CreateCollectionPayload?: CreateCollectionPayloadResolvers<ContextType>;
  CreateRecommendationPayload?: CreateRecommendationPayloadResolvers<ContextType>;
  DatabaseStats?: DatabaseStatsResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteAlbumPayload?: DeleteAlbumPayloadResolvers<ContextType>;
  DeleteArtistPayload?: DeleteArtistPayloadResolvers<ContextType>;
  EnrichmentFieldDiff?: EnrichmentFieldDiffResolvers<ContextType>;
  EnrichmentLog?: EnrichmentLogResolvers<ContextType>;
  EnrichmentResult?: EnrichmentResultResolvers<ContextType>;
  EnrichmentStats?: EnrichmentStatsResolvers<ContextType>;
  ErrorMetric?: ErrorMetricResolvers<ContextType>;
  FollowUserPayload?: FollowUserPayloadResolvers<ContextType>;
  HealthComponents?: HealthComponentsResolvers<ContextType>;
  HealthMetrics?: HealthMetricsResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JobRecord?: JobRecordResolvers<ContextType>;
  JobStatusUpdate?: JobStatusUpdateResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  OnboardingStatus?: OnboardingStatusResolvers<ContextType>;
  OtherAlbumInfo?: OtherAlbumInfoResolvers<ContextType>;
  PaginationInfo?: PaginationInfoResolvers<ContextType>;
  PreviewEnrichmentResult?: PreviewEnrichmentResultResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  QueueMetrics?: QueueMetricsResolvers<ContextType>;
  QueueStats?: QueueStatsResolvers<ContextType>;
  QueueStatus?: QueueStatusResolvers<ContextType>;
  RateLimitInfo?: RateLimitInfoResolvers<ContextType>;
  Recommendation?: RecommendationResolvers<ContextType>;
  RecommendationFeed?: RecommendationFeedResolvers<ContextType>;
  ReorderCollectionAlbumsPayload?: ReorderCollectionAlbumsPayloadResolvers<ContextType>;
  RollbackSyncJobResult?: RollbackSyncJobResultResolvers<ContextType>;
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
  Subscription?: SubscriptionResolvers<ContextType>;
  SyncJob?: SyncJobResolvers<ContextType>;
  SyncJobsConnection?: SyncJobsConnectionResolvers<ContextType>;
  SystemHealth?: SystemHealthResolvers<ContextType>;
  ThroughputMetrics?: ThroughputMetricsResolvers<ContextType>;
  TopRecommendedAlbum?: TopRecommendedAlbumResolvers<ContextType>;
  TopRecommendedArtist?: TopRecommendedArtistResolvers<ContextType>;
  Track?: TrackResolvers<ContextType>;
  UUID?: GraphQLScalarType;
  UnifiedRelease?: UnifiedReleaseResolvers<ContextType>;
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
