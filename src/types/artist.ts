import { Album } from "./album";

export interface Artist {
    id: string;
    title: string;
    subtitle?: string;
    type: string;
    image: {
        url: string;

    }

}
