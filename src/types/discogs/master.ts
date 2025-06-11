export interface DiscogsMaster {
  id: number;
  title: string;
  artists: Array<{
    id: number;
    name: string;
    anv: string;
    join: string;
    role: string;
    tracks: string;
    resource_url: string;
    thumbnail_url: string;
  }>;
  main_release: number;
  most_recent_release: number;
  resource_url: string;
  uri: string;
  versions_url: string;
  main_release_url: string;
  most_recent_release_url: string;
  num_for_sale: number;
  lowest_price: number | null;
  images: Array<{
    type: string;
    uri: string;
    resource_url: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  genres?: string[];
  styles?: string[];
  year?: number;
  tracklist: Array<{
    position: string;
    type_: string;
    title: string;
    duration: string;
  }>;
  data_quality: string;
  videos: Array<{
    uri: string;
    title: string;
    description: string;
    duration: number;
    embed: boolean;
  }>;
}
