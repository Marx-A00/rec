import { Collection, CollectionAlbum } from '../src/types/collection';
import { sampleAlbums } from './albums';

// Sample collection albums (linking albums to collections)
export const sampleCollectionAlbums: CollectionAlbum[] = [
  // Essential Albums collection
  {
    id: "ca-1",
    albumId: "album-1", // OK Computer
    album: {
      id: "album-1",
      title: "OK Computer",
      artist: "Radiohead",
      releaseDate: "1997-06-16",
      genre: ["Alternative Rock", "Electronic"],
      label: "Parlophone",
      image: {
        url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
        width: 400,
        height: 400,
        alt: "OK Computer album cover"
      },
      tracks: [
        { id: "track-1", title: "Airbag", duration: 284, trackNumber: 1 },
        { id: "track-2", title: "Paranoid Android", duration: 383, trackNumber: 2 },
        { id: "track-3", title: "Subterranean Homesick Alien", duration: 267, trackNumber: 3 },
        { id: "track-4", title: "Exit Music (For a Film)", duration: 263, trackNumber: 4 },
        { id: "track-5", title: "Let Down", duration: 299, trackNumber: 5 }
      ],
      metadata: {
        totalDuration: 1496,
        numberOfTracks: 5,
        format: "CD"
      }
    },
    addedAt: "2024-01-15T10:30:00Z",
    addedBy: "user-1",
    personalRating: 9,
    personalNotes: "Revolutionary album that changed my perspective on music",
    position: 1
  },
  {
    id: "ca-2",
    albumId: "album-2", // Dark Side of the Moon
    album: {
      id: "album-2",
      title: "The Dark Side of the Moon",
      artist: "Pink Floyd",
      releaseDate: "1973-03-01",
      genre: ["Progressive Rock", "Psychedelic Rock"],
      label: "Harvest Records",
      image: {
        url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
        width: 400,
        height: 400,
        alt: "The Dark Side of the Moon album cover"
      },
      tracks: [
        { id: "track-6", title: "Speak to Me", duration: 90, trackNumber: 1 },
        { id: "track-7", title: "Breathe (In the Air)", duration: 163, trackNumber: 2 },
        { id: "track-8", title: "On the Run", duration: 216, trackNumber: 3 },
        { id: "track-9", title: "Time", duration: 413, trackNumber: 4 },
        { id: "track-10", title: "Money", duration: 382, trackNumber: 5 }
      ],
      metadata: {
        totalDuration: 1264,
        numberOfTracks: 5,
        format: "Vinyl"
      }
    },
    addedAt: "2024-01-16T14:20:00Z",
    addedBy: "user-1",
    personalRating: 10,
    personalNotes: "Perfect from start to finish",
    position: 2
  },
  {
    id: "ca-3",
    albumId: "album-3", // Kind of Blue
    album: {
      id: "album-3",
      title: "Kind of Blue",
      artist: "Miles Davis",
      releaseDate: "1959-08-17",
      genre: ["Jazz", "Modal Jazz"],
      label: "Columbia Records",
      image: {
        url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
        width: 400,
        height: 400,
        alt: "Kind of Blue album cover"
      },
      tracks: [
        { id: "track-11", title: "So What", duration: 562, trackNumber: 1 },
        { id: "track-12", title: "Freddie Freeloader", duration: 578, trackNumber: 2 },
        { id: "track-13", title: "Blue in Green", duration: 337, trackNumber: 3 },
        { id: "track-14", title: "All Blues", duration: 691, trackNumber: 4 },
        { id: "track-15", title: "Flamenco Sketches", duration: 562, trackNumber: 5 }
      ],
      metadata: {
        totalDuration: 2730,
        numberOfTracks: 5,
        format: "Vinyl"
      }
    },
    addedAt: "2024-01-17T09:15:00Z",
    addedBy: "user-1",
    personalRating: 8,
    personalNotes: "Essential jazz listening",
    position: 3
  },

  // Late Night Vibes collection
  {
    id: "ca-4",
    albumId: "album-8", // Blonde
    album: {
      id: "album-8",
      title: "Blonde",
      artist: "Frank Ocean",
      releaseDate: "2016-08-20",
      genre: ["R&B", "Alternative R&B", "Pop"],
      label: "Boys Don't Cry",
      image: {
        url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
        width: 400,
        height: 400,
        alt: "Blonde album cover"
      },
      tracks: [
        { id: "track-36", title: "Nikes", duration: 314, trackNumber: 1 },
        { id: "track-37", title: "Ivy", duration: 249, trackNumber: 2 },
        { id: "track-38", title: "Pink + White", duration: 184, trackNumber: 3 },
        { id: "track-39", title: "Be Yourself", duration: 69, trackNumber: 4 },
        { id: "track-40", title: "Solo", duration: 257, trackNumber: 5 }
      ],
      metadata: {
        totalDuration: 1073,
        numberOfTracks: 5,
        format: "Digital"
      }
    },
    addedAt: "2024-01-20T22:00:00Z",
    addedBy: "user-1",
    personalRating: 9,
    personalNotes: "Perfect for late night contemplation",
    position: 1
  },

  // 90s Grunge collection
  {
    id: "ca-5",
    albumId: "album-4", // Nevermind
    album: {
      id: "album-4",
      title: "Nevermind",
      artist: "Nirvana",
      releaseDate: "1991-09-24",
      genre: ["Grunge", "Alternative Rock"],
      label: "DGC Records",
      image: {
        url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
        width: 400,
        height: 400,
        alt: "Nevermind album cover"
      },
      tracks: [
        { id: "track-16", title: "Smells Like Teen Spirit", duration: 301, trackNumber: 1 },
        { id: "track-17", title: "In Bloom", duration: 254, trackNumber: 2 },
        { id: "track-18", title: "Come As You Are", duration: 219, trackNumber: 3 },
        { id: "track-19", title: "Breed", duration: 183, trackNumber: 4 },
        { id: "track-20", title: "Lithium", duration: 257, trackNumber: 5 }
      ],
      metadata: {
        totalDuration: 1214,
        numberOfTracks: 5,
        format: "CD"
      }
    },
    addedAt: "2024-01-18T15:30:00Z",
    addedBy: "user-2",
    personalRating: 8,
    personalNotes: "Defined a generation",
    position: 1
  }
];

// Sample collections
export const sampleCollections: Collection[] = [
  {
    id: "collection-1",
    name: "Essential Albums",
    description: "Albums that shaped my musical taste and understanding",
    userId: "user-1",
    isPublic: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-17T09:15:00Z",
    albums: [sampleCollectionAlbums[0], sampleCollectionAlbums[1], sampleCollectionAlbums[2]],
    metadata: {
      totalAlbums: 3,
      totalDuration: 5490, // sum of all album durations
      genres: ["Alternative Rock", "Electronic", "Progressive Rock", "Psychedelic Rock", "Jazz", "Modal Jazz"],
      averageRating: 9
    },
    tags: ["favorites", "classics", "essential"],
    coverImage: {
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      width: 400,
      height: 400,
      alt: "Essential Albums collection cover"
    }
  },
  {
    id: "collection-2",
    name: "Late Night Vibes",
    description: "Perfect albums for late night listening sessions and introspection",
    userId: "user-1",
    isPublic: false,
    createdAt: "2024-01-20T22:00:00Z",
    updatedAt: "2024-01-20T22:00:00Z",
    albums: [sampleCollectionAlbums[3]], // Just Blonde
    metadata: {
      totalAlbums: 1,
      totalDuration: 1073,
      genres: ["R&B", "Alternative R&B", "Pop"],
      averageRating: 9
    },
    tags: ["chill", "nighttime", "atmospheric", "moody"]
  },
  {
    id: "collection-3",
    name: "90s Grunge Essentials",
    description: "The albums that defined the grunge movement",
    userId: "user-2",
    isPublic: true,
    createdAt: "2024-01-18T15:00:00Z",
    updatedAt: "2024-01-18T15:30:00Z",
    albums: [sampleCollectionAlbums[4]], // Just Nevermind for now
    metadata: {
      totalAlbums: 1,
      totalDuration: 1214,
      genres: ["Grunge", "Alternative Rock"],
      averageRating: 8
    },
    tags: ["90s", "grunge", "alternative", "rock"],
    coverImage: {
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      width: 400,
      height: 400,
      alt: "90s Grunge collection cover"
    }
  },
  {
    id: "collection-4",
    name: "Jazz Foundations",
    description: "Essential jazz albums every music lover should know",
    userId: "user-3",
    isPublic: true,
    createdAt: "2024-01-19T11:00:00Z",
    updatedAt: "2024-01-19T11:00:00Z",
    albums: [sampleCollectionAlbums[2]], // Kind of Blue
    metadata: {
      totalAlbums: 1,
      totalDuration: 2730,
      genres: ["Jazz", "Modal Jazz"],
      averageRating: 8
    },
    tags: ["jazz", "classic", "instrumental", "modal"]
  },
  {
    id: "collection-5",
    name: "Electronic Explorations",
    description: "Pushing the boundaries of electronic music",
    userId: "user-4",
    isPublic: false,
    createdAt: "2024-01-21T14:00:00Z",
    updatedAt: "2024-01-21T14:00:00Z",
    albums: [], // Empty for now
    metadata: {
      totalAlbums: 0,
      totalDuration: 0,
      genres: [],
      averageRating: 0
    },
    tags: ["electronic", "experimental", "ambient"]
  }
];

// Helper functions for working with sample collection data
export const getSampleCollectionById = (id: string): Collection | undefined => {
  return sampleCollections.find(collection => collection.id === id);
};

export const getSampleCollectionsByUserId = (userId: string): Collection[] => {
  return sampleCollections.filter(collection => collection.userId === userId);
};

export const getPublicSampleCollections = (): Collection[] => {
  return sampleCollections.filter(collection => collection.isPublic);
}; 