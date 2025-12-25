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

export enum EnrichmentEntityType {
  Album = 'ALBUM',
  Artist = 'ARTIST',
  Track = 'TRACK',
}

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
  addToListenLater: CollectionAlbum;
  batchEnrichment: BatchEnrichmentResult;
  cleanQueue: Scalars['Boolean']['output'];
  clearFailedJobs: Scalars['Boolean']['output'];
  createCollection: CreateCollectionPayload;
  createRecommendation: CreateRecommendationPayload;
  createTrack: Track;
  deleteAlbum: DeleteAlbumPayload;
  deleteCollection: Scalars['Boolean']['output'];
  deleteRecommendation: Scalars['Boolean']['output'];
  deleteTrack: Scalars['Boolean']['output'];
  dismissUserSuggestion: Scalars['Boolean']['output'];
  ensureListenLaterCollection: Collection;
  followUser: FollowUserPayload;
  pauseQueue: Scalars['Boolean']['output'];
  removeAlbumFromCollection: Scalars['Boolean']['output'];
  removeFromListenLater: Scalars['Boolean']['output'];
  reorderCollectionAlbums: ReorderCollectionAlbumsPayload;
  resetAlbumEnrichment: Album;
  resetArtistEnrichment: Artist;
  resetOnboardingStatus: OnboardingStatus;
  resumeQueue: Scalars['Boolean']['output'];
  retryAllFailed: Scalars['Int']['output'];
  retryJob: Scalars['Boolean']['output'];
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

export type MutationTriggerAlbumEnrichmentArgs = {
  id: Scalars['UUID']['input'];
  priority?: InputMaybe<EnrichmentPriority>;
};

export type MutationTriggerArtistEnrichmentArgs = {
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
  showCollections?: InputMaybe<Scalars['Boolean']['input']>;
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

export type Query = {
  __typename?: 'Query';
  activeJobs: Array<JobRecord>;
  album?: Maybe<Album>;
  albumRecommendations: Array<Album>;
  albumTracks: Array<Track>;
  artist?: Maybe<Artist>;
  artistByMusicBrainzId?: Maybe<Artist>;
  artistDiscography: CategorizedDiscography;
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
  systemHealth: SystemHealth;
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

export type QueryAlbumRecommendationsArgs = {
  input: RecommendationInput;
};

export type QueryAlbumTracksArgs = {
  albumId: Scalars['UUID']['input'];
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
};

export type QuerySearchArtistsArgs = {
  dataQuality?: InputMaybe<Scalars['String']['input']>;
  enrichmentStatus?: InputMaybe<Scalars['String']['input']>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type QueryUsersCountArgs = {
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
  showCollections: Scalars['Boolean']['output'];
  showRecentActivity: Scalars['Boolean']['output'];
  theme: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

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

export type EnsureListenLaterMutationVariables = Exact<{
  [key: string]: never;
}>;

export type EnsureListenLaterMutation = {
  __typename?: 'Mutation';
  ensureListenLaterCollection: {
    __typename?: 'Collection';
    id: string;
    name: string;
    isPublic: boolean;
  };
};

export type AddToListenLaterMutationVariables = Exact<{
  albumId: Scalars['UUID']['input'];
  albumData?: InputMaybe<AlbumInput>;
}>;

export type AddToListenLaterMutation = {
  __typename?: 'Mutation';
  addToListenLater: { __typename?: 'CollectionAlbum'; id: string };
};

export type RemoveFromListenLaterMutationVariables = Exact<{
  albumId: Scalars['UUID']['input'];
}>;

export type RemoveFromListenLaterMutation = {
  __typename?: 'Mutation';
  removeFromListenLater: boolean;
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
  name?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
}>;

export type UpdateProfileMutation = {
  __typename?: 'Mutation';
  updateProfile: {
    __typename?: 'UpdateProfilePayload';
    id: string;
    name?: string | null;
    bio?: string | null;
  };
};

export type UpdateUserSettingsMutationVariables = Exact<{
  theme?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  profileVisibility?: InputMaybe<Scalars['String']['input']>;
  showRecentActivity?: InputMaybe<Scalars['Boolean']['input']>;
  showCollections?: InputMaybe<Scalars['Boolean']['input']>;
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
    emailNotifications: boolean;
    recommendationAlerts: boolean;
    followAlerts: boolean;
    defaultCollectionView: string;
    autoplayPreviews: boolean;
    createdAt: Date;
    updatedAt: Date;
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
    title: string;
    releaseDate?: Date | null;
    releaseType?: string | null;
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
    latestEnrichmentLog?: {
      __typename?: 'EnrichmentLog';
      id: string;
      status: EnrichmentLogStatus;
      sources: Array<string>;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      createdAt: Date;
    } | null;
    enrichmentLogs: Array<{
      __typename?: 'EnrichmentLog';
      id: string;
      operation: string;
      sources: Array<string>;
      status: EnrichmentLogStatus;
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
  } | null;
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

export type GetEnrichmentLogsQueryVariables = Exact<{
  entityType?: InputMaybe<EnrichmentEntityType>;
  entityId?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<EnrichmentLogStatus>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetEnrichmentLogsQuery = {
  __typename?: 'Query';
  enrichmentLogs: Array<{
    __typename?: 'EnrichmentLog';
    id: string;
    entityType?: EnrichmentEntityType | null;
    entityId?: string | null;
    operation: string;
    sources: Array<string>;
    status: EnrichmentLogStatus;
    fieldsEnriched: Array<string>;
    dataQualityBefore?: DataQuality | null;
    dataQualityAfter?: DataQuality | null;
    errorMessage?: string | null;
    errorCode?: string | null;
    durationMs?: number | null;
    apiCallCount: number;
    metadata?: any | null;
    createdAt: Date;
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
        year?: string | null;
      };
      user: {
        __typename?: 'User';
        id: string;
        name?: string | null;
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
    latestEnrichmentLog?: {
      __typename?: 'EnrichmentLog';
      id: string;
      status: EnrichmentLogStatus;
      sources: Array<string>;
      fieldsEnriched: Array<string>;
      errorMessage?: string | null;
      createdAt: Date;
    } | null;
    enrichmentLogs: Array<{
      __typename?: 'EnrichmentLog';
      id: string;
      operation: string;
      sources: Array<string>;
      status: EnrichmentLogStatus;
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
          artist: { __typename?: 'Artist'; name: string };
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
    name?: string | null;
    email?: string | null;
    image?: string | null;
    bio?: string | null;
    followersCount: number;
    followingCount: number;
    recommendationsCount: number;
  } | null;
};

export type RecommendationFieldsFragment = {
  __typename?: 'Recommendation';
  id: string;
  score: number;
  createdAt: Date;
  user: {
    __typename?: 'User';
    id: string;
    name?: string | null;
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
        name?: string | null;
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
        name?: string | null;
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
      name?: string | null;
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
      name?: string | null;
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
      name?: string | null;
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
    name
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

export const EnsureListenLaterDocument = `
    mutation EnsureListenLater {
  ensureListenLaterCollection {
    id
    name
    isPublic
  }
}
    `;

export const useEnsureListenLaterMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    EnsureListenLaterMutation,
    TError,
    EnsureListenLaterMutationVariables,
    TContext
  >
) => {
  return useMutation<
    EnsureListenLaterMutation,
    TError,
    EnsureListenLaterMutationVariables,
    TContext
  >({
    mutationKey: ['EnsureListenLater'],
    mutationFn: (variables?: EnsureListenLaterMutationVariables) =>
      fetcher<EnsureListenLaterMutation, EnsureListenLaterMutationVariables>(
        EnsureListenLaterDocument,
        variables
      )(),
    ...options,
  });
};

useEnsureListenLaterMutation.getKey = () => ['EnsureListenLater'];

export const AddToListenLaterDocument = `
    mutation AddToListenLater($albumId: UUID!, $albumData: AlbumInput) {
  addToListenLater(albumId: $albumId, albumData: $albumData) {
    id
  }
}
    `;

export const useAddToListenLaterMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    AddToListenLaterMutation,
    TError,
    AddToListenLaterMutationVariables,
    TContext
  >
) => {
  return useMutation<
    AddToListenLaterMutation,
    TError,
    AddToListenLaterMutationVariables,
    TContext
  >({
    mutationKey: ['AddToListenLater'],
    mutationFn: (variables?: AddToListenLaterMutationVariables) =>
      fetcher<AddToListenLaterMutation, AddToListenLaterMutationVariables>(
        AddToListenLaterDocument,
        variables
      )(),
    ...options,
  });
};

useAddToListenLaterMutation.getKey = () => ['AddToListenLater'];

export const RemoveFromListenLaterDocument = `
    mutation RemoveFromListenLater($albumId: UUID!) {
  removeFromListenLater(albumId: $albumId)
}
    `;

export const useRemoveFromListenLaterMutation = <
  TError = unknown,
  TContext = unknown,
>(
  options?: UseMutationOptions<
    RemoveFromListenLaterMutation,
    TError,
    RemoveFromListenLaterMutationVariables,
    TContext
  >
) => {
  return useMutation<
    RemoveFromListenLaterMutation,
    TError,
    RemoveFromListenLaterMutationVariables,
    TContext
  >({
    mutationKey: ['RemoveFromListenLater'],
    mutationFn: (variables?: RemoveFromListenLaterMutationVariables) =>
      fetcher<
        RemoveFromListenLaterMutation,
        RemoveFromListenLaterMutationVariables
      >(RemoveFromListenLaterDocument, variables)(),
    ...options,
  });
};

useRemoveFromListenLaterMutation.getKey = () => ['RemoveFromListenLater'];

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
    mutation UpdateProfile($name: String, $bio: String) {
  updateProfile(name: $name, bio: $bio) {
    id
    name
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
    mutation UpdateUserSettings($theme: String, $language: String, $profileVisibility: String, $showRecentActivity: Boolean, $showCollections: Boolean) {
  updateUserSettings(
    theme: $theme
    language: $language
    profileVisibility: $profileVisibility
    showRecentActivity: $showRecentActivity
    showCollections: $showCollections
  ) {
    id
    userId
    theme
    language
    profileVisibility
    showRecentActivity
    showCollections
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
    title
    releaseDate
    releaseType
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
    latestEnrichmentLog {
      id
      status
      sources
      fieldsEnriched
      errorMessage
      createdAt
    }
    enrichmentLogs(limit: 5) {
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

export const GetArtistByMusicBrainzIdDocument = `
    query GetArtistByMusicBrainzId($musicbrainzId: UUID!) {
  artistByMusicBrainzId(musicbrainzId: $musicbrainzId) {
    id
    musicbrainzId
    name
    imageUrl
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

export const GetEnrichmentLogsDocument = `
    query GetEnrichmentLogs($entityType: EnrichmentEntityType, $entityId: UUID, $status: EnrichmentLogStatus, $skip: Int, $limit: Int) {
  enrichmentLogs(
    entityType: $entityType
    entityId: $entityId
    status: $status
    skip: $skip
    limit: $limit
  ) {
    id
    entityType
    entityId
    operation
    sources
    status
    fieldsEnriched
    dataQualityBefore
    dataQualityAfter
    errorMessage
    errorCode
    durationMs
    apiCallCount
    metadata
    createdAt
  }
}
    `;

export const useGetEnrichmentLogsQuery = <
  TData = GetEnrichmentLogsQuery,
  TError = unknown,
>(
  variables?: GetEnrichmentLogsQueryVariables,
  options?: Omit<
    UseQueryOptions<GetEnrichmentLogsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseQueryOptions<
      GetEnrichmentLogsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useQuery<GetEnrichmentLogsQuery, TError, TData>({
    queryKey:
      variables === undefined
        ? ['GetEnrichmentLogs']
        : ['GetEnrichmentLogs', variables],
    queryFn: fetcher<GetEnrichmentLogsQuery, GetEnrichmentLogsQueryVariables>(
      GetEnrichmentLogsDocument,
      variables
    ),
    ...options,
  });
};

useGetEnrichmentLogsQuery.getKey = (
  variables?: GetEnrichmentLogsQueryVariables
) =>
  variables === undefined
    ? ['GetEnrichmentLogs']
    : ['GetEnrichmentLogs', variables];

export const useInfiniteGetEnrichmentLogsQuery = <
  TData = InfiniteData<GetEnrichmentLogsQuery>,
  TError = unknown,
>(
  variables: GetEnrichmentLogsQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<GetEnrichmentLogsQuery, TError, TData>,
    'queryKey'
  > & {
    queryKey?: UseInfiniteQueryOptions<
      GetEnrichmentLogsQuery,
      TError,
      TData
    >['queryKey'];
  }
) => {
  return useInfiniteQuery<GetEnrichmentLogsQuery, TError, TData>(
    (() => {
      const { queryKey: optionsQueryKey, ...restOptions } = options;
      return {
        queryKey:
          (optionsQueryKey ?? variables === undefined)
            ? ['GetEnrichmentLogs.infinite']
            : ['GetEnrichmentLogs.infinite', variables],
        queryFn: metaData =>
          fetcher<GetEnrichmentLogsQuery, GetEnrichmentLogsQueryVariables>(
            GetEnrichmentLogsDocument,
            { ...variables, ...(metaData.pageParam ?? {}) }
          )(),
        ...restOptions,
      };
    })()
  );
};

useInfiniteGetEnrichmentLogsQuery.getKey = (
  variables?: GetEnrichmentLogsQueryVariables
) =>
  variables === undefined
    ? ['GetEnrichmentLogs.infinite']
    : ['GetEnrichmentLogs.infinite', variables];

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
    mutation TriggerAlbumEnrichment($id: UUID!, $priority: EnrichmentPriority) {
  triggerAlbumEnrichment(id: $id, priority: $priority) {
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
    mutation TriggerArtistEnrichment($id: UUID!, $priority: EnrichmentPriority) {
  triggerArtistEnrichment(id: $id, priority: $priority) {
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
        year
      }
      user {
        id
        name
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
    latestEnrichmentLog {
      id
      status
      sources
      fieldsEnriched
      errorMessage
      createdAt
    }
    enrichmentLogs(limit: 5) {
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
    albums {
      id
      album {
        id
        title
        releaseDate
        coverArtUrl
        artists {
          artist {
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
    name
    email
    image
    bio
    followersCount
    followingCount
    recommendationsCount
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
      name
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
    query SearchAlbumsAdmin($query: String, $id: UUID, $dataQuality: String, $enrichmentStatus: String, $needsEnrichment: Boolean, $sortBy: String, $sortOrder: String, $skip: Int, $limit: Int) {
  searchAlbums(
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
    query SearchArtistsAdmin($query: String, $dataQuality: String, $enrichmentStatus: String, $needsEnrichment: Boolean, $sortBy: String, $sortOrder: String, $skip: Int, $limit: Int) {
  searchArtists(
    query: $query
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
      name
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
