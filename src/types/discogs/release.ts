export interface DiscogsRelease {
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
  labels: Array<{
    name: string;
    catno: string;
    entity_type: string;
    entity_type_name: string;
    id: number;
    resource_url: string;
  }>;
  series: Array<any>;
  companies: Array<{
    name: string;
    catno: string;
    entity_type: string;
    entity_type_name: string;
    id: number;
    resource_url: string;
  }>;
  formats: Array<{
    name: string;
    qty: string;
    descriptions?: string[];
    text?: string;
  }>;
  data_quality: string;
  community: {
    want: number;
    have: number;
    rating: {
      count: number;
      average: number;
    };
    submitter: {
      username: string;
      resource_url: string;
    };
    contributors: Array<{
      username: string;
      resource_url: string;
    }>;
    data_quality: string;
    status: string;
  };
  date_added: string;
  date_changed: string;
  estimated_weight: number;
  extraartists: Array<{
    id: number;
    name: string;
    anv: string;
    join: string;
    role: string;
    tracks: string;
    resource_url: string;
  }>;
  genres: string[];
  styles: string[];
  images: Array<{
    type: string;
    uri: string;
    resource_url: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  lowest_price: number | null;
  master_id: number | null;
  master_url: string | null;
  notes: string;
  num_for_sale: number;
  released: string;
  released_formatted: string;
  resource_url: string;
  status: string;
  tracklist: Array<{
    position: string;
    type_: string;
    title: string;
    duration: string;
    extraartists?: Array<{
      id: number;
      name: string;
      anv: string;
      join: string;
      role: string;
      tracks: string;
      resource_url: string;
    }>;
  }>;
  uri: string;
  videos: Array<{
    uri: string;
    title: string;
    description: string;
    duration: number;
    embed: boolean;
  }>;
  year: number;
}
