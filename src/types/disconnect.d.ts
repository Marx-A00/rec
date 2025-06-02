declare module 'disconnect' {
  export interface DiscogsOptions {
    consumerKey?: string;
    consumerSecret?: string;
    userToken?: string;
    userAgent?: string;
  }
  import { Release } from './album';
  import { Artist } from './artist';

  export interface DiscogsImage {
    uri?: string;
    uri150?: string;
    width?: number;
    height?: number;
    type?: string;
  }

  export interface DiscogsSearchResult {
    id: number;
    title: string;
    type?: string;
    artist?: string;
    year?: number | string;
    genre?: string[];
    label?: string[];
    cover_image?: string;
    thumb?: string;
    uri?: string;
    resource_url?: string;
  }

  export interface SearchOptions {
    query?: string;
    type?: string;
    title?: string;
    release_title?: string;
    credit?: string;
    artist?: string;
    anv?: string;
    label?: string;
    genre?: string;
    style?: string;
    country?: string;
    year?: string;
    format?: string;
    catno?: string;
    barcode?: string;
    track?: string;
    submitter?: string;
    contributor?: string;
    page?: number;
    per_page?: number;
  }

  export interface SearchResponse {
    results: DiscogsSearchResult[];
    pagination: {
      pages: number;
      page: number;
      per_page: number;
      items: number;
      urls: {
        last?: string;
        next?: string;
      };
    };
  }

  export interface Release {
    id: number;
    title: string;
    artists?: Array<{ name: string; id: number }>;
    labels?: Array<{ name: string; catno: string }>;
    year?: number;
    formats?: Array<{ name: string; qty: string }>;
    genres?: string[];
    styles?: string[];
    tracklist?: Array<{ title: string; duration?: string }>;
    images?: DiscogsImage[];
    resource_url?: string;
  }

  export interface Artist {
    id: number;
    name: string;
    profile?: string;
    images?: DiscogsImage[];
    urls?: string[];
    resource_url?: string;
  }

  export interface Label {
    id: number;
    name: string;
    profile?: string;
    images?: DiscogsImage[];
    urls?: string[];
    sublabels?: Label[];
    parent_label?: { name: string; id: number };
    contactinfo?: string;
    resource_url?: string;
  }

  export interface PaginationOptions {
    page?: number;
    per_page?: number;
    sort?: string;
    sort_order?: 'asc' | 'desc';
  }

  export interface ReleasesResponse {
    releases: Release[];
    pagination: {
      pages: number;
      page: number;
      per_page: number;
      items: number;
      urls: {
        last?: string;
        next?: string;
      };
    };
  }

  export interface RatingResponse {
    rating: number;
    count: number;
  }

  export interface UserRatingResponse {
    username: string;
    rating: number;
  }

  export interface ReleaseStatsResponse {
    in_wantlist: number;
    in_collection: number;
  }

  export class Database {
    search(options: SearchOptions): Promise<SearchResponse>;
    getMaster(id: number | string): Promise<Release>;
    getRelease(id: number | string): Promise<Release>;
    getArtist(id: number | string): Promise<Artist>;
    getArtistReleases(
      id: number | string,
      options?: PaginationOptions
    ): Promise<ReleasesResponse>;
    getLabel(id: number | string): Promise<Label>;
    getLabelReleases(
      id: number | string,
      options?: PaginationOptions
    ): Promise<ReleasesResponse>;
    getReleaseRating(id: number | string): Promise<UserRatingResponse>;
    setReleaseRating(
      id: number | string,
      rating: number
    ): Promise<UserRatingResponse>;
    getReleaseCommunityRating(id: number | string): Promise<RatingResponse>;
    getReleaseStats(id: number | string): Promise<ReleaseStatsResponse>;
    getMasterVersions(
      id: number | string,
      options?: PaginationOptions
    ): Promise<ReleasesResponse>;
  }

  export class Client {
    constructor(options: DiscogsOptions);
    database(): Database;
  }

  const disconnect = {
    Client,
  };

  export default disconnect;
}
