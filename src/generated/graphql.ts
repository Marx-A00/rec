import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql';
import {
  Artist as DatabaseArtist,
  Album as DatabaseAlbum,
  Track as DatabaseTrack,
  AudioFeatures as DatabaseAudioFeatures,
} from '../lib/types/database';
import { GraphQLContext } from '../lib/graphql/context';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
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
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
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
  DateTime: { input: Date; output: Date };
  JSON: { input: any; output: any };
  UUID: { input: string; output: string };
};

export type Album = {
  __typename?: 'Album';
  artists: Array<ArtistCredit>;
  averageRating?: Maybe<Scalars['Float']['output']>;
  barcode?: Maybe<Scalars['String']['output']>;
  basisRecommendations: Array<Recommendation>;
  catalogNumber?: Maybe<Scalars['String']['output']>;
  collectionAlbums: Array<CollectionAlbum>;
  coverArtUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  duration?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  id: Scalars['UUID']['output'];
  inCollectionsCount: Scalars['Int']['output'];
  label?: Maybe<Scalars['String']['output']>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  recommendationScore?: Maybe<Scalars['Float']['output']>;
  releaseDate?: Maybe<Scalars['DateTime']['output']>;
  releaseType?: Maybe<Scalars['String']['output']>;
  targetRecommendations: Array<Recommendation>;
  title: Scalars['String']['output'];
  trackCount?: Maybe<Scalars['Int']['output']>;
  tracks: Array<Track>;
  updatedAt: Scalars['DateTime']['output'];
};

export type Artist = {
  __typename?: 'Artist';
  albumCount: Scalars['Int']['output'];
  albums: Array<Album>;
  biography?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  formedYear?: Maybe<Scalars['Int']['output']>;
  id: Scalars['UUID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  name: Scalars['String']['output'];
  popularity?: Maybe<Scalars['Float']['output']>;
  trackCount: Scalars['Int']['output'];
  tracks: Array<Track>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ArtistCredit = {
  __typename?: 'ArtistCredit';
  artist: Artist;
  position: Scalars['Int']['output'];
  role: Scalars['String']['output'];
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

export type Mutation = {
  __typename?: 'Mutation';
  addAlbumToCollection: CollectionAlbum;
  createCollection: Collection;
  createRecommendation: Recommendation;
  deleteRecommendation: Scalars['Boolean']['output'];
  followUser: UserFollow;
  removeAlbumFromCollection: Scalars['Boolean']['output'];
  unfollowUser: Scalars['Boolean']['output'];
  updateCollectionAlbum: CollectionAlbum;
  updateProfile: User;
  updateRecommendation: Recommendation;
};

export type MutationAddAlbumToCollectionArgs = {
  collectionId: Scalars['String']['input'];
  input: CollectionAlbumInput;
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

export type MutationDeleteRecommendationArgs = {
  id: Scalars['String']['input'];
};

export type MutationFollowUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationRemoveAlbumFromCollectionArgs = {
  albumId: Scalars['UUID']['input'];
  collectionId: Scalars['String']['input'];
};

export type MutationUnfollowUserArgs = {
  userId: Scalars['String']['input'];
};

export type MutationUpdateCollectionAlbumArgs = {
  id: Scalars['String']['input'];
  input: CollectionAlbumInput;
};

export type MutationUpdateProfileArgs = {
  bio?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type MutationUpdateRecommendationArgs = {
  id: Scalars['String']['input'];
  score: Scalars['Int']['input'];
};

export type Query = {
  __typename?: 'Query';
  album?: Maybe<Album>;
  albumRecommendations: Array<Album>;
  artist?: Maybe<Artist>;
  collection?: Maybe<Collection>;
  followingActivity: Array<Recommendation>;
  health: Scalars['String']['output'];
  myCollections: Array<Collection>;
  myRecommendations: Array<Recommendation>;
  recommendation?: Maybe<Recommendation>;
  recommendationFeed: RecommendationFeed;
  search: SearchResults;
  track?: Maybe<Track>;
  trackRecommendations: Array<Track>;
  trendingAlbums: Array<Album>;
  trendingArtists: Array<Artist>;
  user?: Maybe<User>;
  userSuggestions: Array<User>;
};

export type QueryAlbumArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryAlbumRecommendationsArgs = {
  input: RecommendationInput;
};

export type QueryArtistArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryCollectionArgs = {
  id: Scalars['String']['input'];
};

export type QueryFollowingActivityArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryMyRecommendationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<RecommendationSort>;
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

export type QueryUserSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
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

export type SearchInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  type?: InputMaybe<SearchType>;
};

export type SearchResult = Album | Artist | Track;

export type SearchResults = {
  __typename?: 'SearchResults';
  albums: Array<Album>;
  artists: Array<Artist>;
  hasMore: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
  tracks: Array<Track>;
};

export enum SearchType {
  Album = 'ALBUM',
  All = 'ALL',
  Artist = 'ARTIST',
  Track = 'TRACK',
}

export type Track = {
  __typename?: 'Track';
  album: Album;
  albumId: Scalars['UUID']['output'];
  artists: Array<ArtistCredit>;
  audioFeatures?: Maybe<AudioFeatures>;
  createdAt: Scalars['DateTime']['output'];
  discNumber: Scalars['Int']['output'];
  duration?: Maybe<Scalars['String']['output']>;
  durationMs?: Maybe<Scalars['Int']['output']>;
  explicit: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  isrc?: Maybe<Scalars['String']['output']>;
  musicbrainzId?: Maybe<Scalars['UUID']['output']>;
  popularity?: Maybe<Scalars['Float']['output']>;
  previewUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  trackNumber: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type User = {
  __typename?: 'User';
  bio?: Maybe<Scalars['String']['output']>;
  collections: Array<Collection>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
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
  updatedAt: Scalars['DateTime']['output'];
};

export type UserFollow = {
  __typename?: 'UserFollow';
  createdAt: Scalars['DateTime']['output'];
  followed: User;
  follower: User;
  id: Scalars['String']['output'];
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
    SearchResult: DatabaseAlbum | DatabaseArtist | DatabaseTrack;
  }>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Album: ResolverTypeWrapper<DatabaseAlbum>;
  Artist: ResolverTypeWrapper<DatabaseArtist>;
  ArtistCredit: ResolverTypeWrapper<
    Omit<ArtistCredit, 'artist'> & { artist: ResolversTypes['Artist'] }
  >;
  AudioFeatures: ResolverTypeWrapper<DatabaseAudioFeatures>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Collection: ResolverTypeWrapper<
    Omit<Collection, 'albums' | 'user'> & {
      albums: Array<ResolversTypes['CollectionAlbum']>;
      user: ResolversTypes['User'];
    }
  >;
  CollectionAlbum: ResolverTypeWrapper<
    Omit<CollectionAlbum, 'album' | 'collection'> & {
      album: ResolversTypes['Album'];
      collection: ResolversTypes['Collection'];
    }
  >;
  CollectionAlbumInput: CollectionAlbumInput;
  CollectionSort: CollectionSort;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  Recommendation: ResolverTypeWrapper<
    Omit<Recommendation, 'basisAlbum' | 'recommendedAlbum' | 'user'> & {
      basisAlbum: ResolversTypes['Album'];
      recommendedAlbum: ResolversTypes['Album'];
      user: ResolversTypes['User'];
    }
  >;
  RecommendationFeed: ResolverTypeWrapper<
    Omit<RecommendationFeed, 'recommendations'> & {
      recommendations: Array<ResolversTypes['Recommendation']>;
    }
  >;
  RecommendationInput: RecommendationInput;
  RecommendationSort: RecommendationSort;
  SearchInput: SearchInput;
  SearchResult: ResolverTypeWrapper<
    ResolversUnionTypes<ResolversTypes>['SearchResult']
  >;
  SearchResults: ResolverTypeWrapper<
    Omit<SearchResults, 'albums' | 'artists' | 'tracks'> & {
      albums: Array<ResolversTypes['Album']>;
      artists: Array<ResolversTypes['Artist']>;
      tracks: Array<ResolversTypes['Track']>;
    }
  >;
  SearchType: SearchType;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Track: ResolverTypeWrapper<DatabaseTrack>;
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
  User: ResolverTypeWrapper<
    Omit<
      User,
      | 'collections'
      | 'followers'
      | 'following'
      | 'mutualFollowers'
      | 'recommendations'
    > & {
      collections: Array<ResolversTypes['Collection']>;
      followers: Array<ResolversTypes['UserFollow']>;
      following: Array<ResolversTypes['UserFollow']>;
      mutualFollowers: Array<ResolversTypes['User']>;
      recommendations: Array<ResolversTypes['Recommendation']>;
    }
  >;
  UserFollow: ResolverTypeWrapper<
    Omit<UserFollow, 'followed' | 'follower'> & {
      followed: ResolversTypes['User'];
      follower: ResolversTypes['User'];
    }
  >;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Album: DatabaseAlbum;
  Artist: DatabaseArtist;
  ArtistCredit: Omit<ArtistCredit, 'artist'> & {
    artist: ResolversParentTypes['Artist'];
  };
  AudioFeatures: DatabaseAudioFeatures;
  Boolean: Scalars['Boolean']['output'];
  Collection: Omit<Collection, 'albums' | 'user'> & {
    albums: Array<ResolversParentTypes['CollectionAlbum']>;
    user: ResolversParentTypes['User'];
  };
  CollectionAlbum: Omit<CollectionAlbum, 'album' | 'collection'> & {
    album: ResolversParentTypes['Album'];
    collection: ResolversParentTypes['Collection'];
  };
  CollectionAlbumInput: CollectionAlbumInput;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Query: {};
  Recommendation: Omit<
    Recommendation,
    'basisAlbum' | 'recommendedAlbum' | 'user'
  > & {
    basisAlbum: ResolversParentTypes['Album'];
    recommendedAlbum: ResolversParentTypes['Album'];
    user: ResolversParentTypes['User'];
  };
  RecommendationFeed: Omit<RecommendationFeed, 'recommendations'> & {
    recommendations: Array<ResolversParentTypes['Recommendation']>;
  };
  RecommendationInput: RecommendationInput;
  SearchInput: SearchInput;
  SearchResult: ResolversUnionTypes<ResolversParentTypes>['SearchResult'];
  SearchResults: Omit<SearchResults, 'albums' | 'artists' | 'tracks'> & {
    albums: Array<ResolversParentTypes['Album']>;
    artists: Array<ResolversParentTypes['Artist']>;
    tracks: Array<ResolversParentTypes['Track']>;
  };
  String: Scalars['String']['output'];
  Track: DatabaseTrack;
  UUID: Scalars['UUID']['output'];
  User: Omit<
    User,
    | 'collections'
    | 'followers'
    | 'following'
    | 'mutualFollowers'
    | 'recommendations'
  > & {
    collections: Array<ResolversParentTypes['Collection']>;
    followers: Array<ResolversParentTypes['UserFollow']>;
    following: Array<ResolversParentTypes['UserFollow']>;
    mutualFollowers: Array<ResolversParentTypes['User']>;
    recommendations: Array<ResolversParentTypes['Recommendation']>;
  };
  UserFollow: Omit<UserFollow, 'followed' | 'follower'> & {
    followed: ResolversParentTypes['User'];
    follower: ResolversParentTypes['User'];
  };
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
  duration?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  inCollectionsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  musicbrainzId?: Resolver<
    Maybe<ResolversTypes['UUID']>,
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
  countryCode?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  formedYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  musicbrainzId?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export interface DateTimeScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface JsonScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = ResolversObject<{
  addAlbumToCollection?: Resolver<
    ResolversTypes['CollectionAlbum'],
    ParentType,
    ContextType,
    RequireFields<MutationAddAlbumToCollectionArgs, 'collectionId' | 'input'>
  >;
  createCollection?: Resolver<
    ResolversTypes['Collection'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateCollectionArgs, 'isPublic' | 'name'>
  >;
  createRecommendation?: Resolver<
    ResolversTypes['Recommendation'],
    ParentType,
    ContextType,
    RequireFields<
      MutationCreateRecommendationArgs,
      'basisAlbumId' | 'recommendedAlbumId' | 'score'
    >
  >;
  deleteRecommendation?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteRecommendationArgs, 'id'>
  >;
  followUser?: Resolver<
    ResolversTypes['UserFollow'],
    ParentType,
    ContextType,
    RequireFields<MutationFollowUserArgs, 'userId'>
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
  unfollowUser?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationUnfollowUserArgs, 'userId'>
  >;
  updateCollectionAlbum?: Resolver<
    ResolversTypes['CollectionAlbum'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCollectionAlbumArgs, 'id' | 'input'>
  >;
  updateProfile?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    Partial<MutationUpdateProfileArgs>
  >;
  updateRecommendation?: Resolver<
    ResolversTypes['Recommendation'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateRecommendationArgs, 'id' | 'score'>
  >;
}>;

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = ResolversObject<{
  album?: Resolver<
    Maybe<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumArgs, 'id'>
  >;
  albumRecommendations?: Resolver<
    Array<ResolversTypes['Album']>,
    ParentType,
    ContextType,
    RequireFields<QueryAlbumRecommendationsArgs, 'input'>
  >;
  artist?: Resolver<
    Maybe<ResolversTypes['Artist']>,
    ParentType,
    ContextType,
    RequireFields<QueryArtistArgs, 'id'>
  >;
  collection?: Resolver<
    Maybe<ResolversTypes['Collection']>,
    ParentType,
    ContextType,
    RequireFields<QueryCollectionArgs, 'id'>
  >;
  followingActivity?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType,
    RequireFields<QueryFollowingActivityArgs, 'limit'>
  >;
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  myCollections?: Resolver<
    Array<ResolversTypes['Collection']>,
    ParentType,
    ContextType
  >;
  myRecommendations?: Resolver<
    Array<ResolversTypes['Recommendation']>,
    ParentType,
    ContextType,
    RequireFields<QueryMyRecommendationsArgs, 'limit' | 'sort'>
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
  userSuggestions?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserSuggestionsArgs, 'limit'>
  >;
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
  albums?: Resolver<Array<ResolversTypes['Album']>, ParentType, ContextType>;
  artists?: Resolver<Array<ResolversTypes['Artist']>, ParentType, ContextType>;
  hasMore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TrackResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['Track'] = ResolversParentTypes['Track'],
> = ResolversObject<{
  album?: Resolver<ResolversTypes['Album'], ParentType, ContextType>;
  albumId?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
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
  explicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isrc?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  trackNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UuidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

export type UserResolvers<
  ContextType = GraphQLContext,
  ParentType extends
    ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = ResolversObject<{
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  collections?: Resolver<
    Array<ResolversTypes['Collection']>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Album?: AlbumResolvers<ContextType>;
  Artist?: ArtistResolvers<ContextType>;
  ArtistCredit?: ArtistCreditResolvers<ContextType>;
  AudioFeatures?: AudioFeaturesResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  CollectionAlbum?: CollectionAlbumResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Recommendation?: RecommendationResolvers<ContextType>;
  RecommendationFeed?: RecommendationFeedResolvers<ContextType>;
  SearchResult?: SearchResultResolvers<ContextType>;
  SearchResults?: SearchResultsResolvers<ContextType>;
  Track?: TrackResolvers<ContextType>;
  UUID?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  UserFollow?: UserFollowResolvers<ContextType>;
}>;
