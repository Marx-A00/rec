import { Album } from "./album";

export interface Artist {
    id: string;
    title: string;
    subtitle?: string;
    type: string;
    image: {
        url: string;
        width: number;
        height: number;
        alt?: string;
    };
    _discogs?: {
        type: string;
        uri: string;
        resource_url: string;
    };
}

// Extended interface for detailed artist data (what you get from the API)
export interface ArtistDetails extends Artist {
    realname?: string;
    profile?: string;
    urls?: string[];
    aliases?: Array<{ name: string }>;
    members?: Array<{ name: string; role?: string }>;
    groups?: Array<{ name: string }>;
}

export interface ArtistDiscography {
    albums: Album[];
}
