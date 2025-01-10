import Image from "next/image";

interface Track {
  id: string;
  title: string;
  duration: number; // in seconds
  trackNumber: number;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  releaseDate: string; // ISO 8601 format: "YYYY-MM-DD"
  genre: string[];
  label: string;
  image: {
    url: string;
    width: 400;
    height: 400;
    alt?: string;
  };
  tracks: Track[];
  metadata?: {
    totalDuration: number; // in seconds
    numberOfTracks: number;
    format?: string; // e.g., "CD", "Vinyl", "Digital"
    barcode?: string;
  };
}

const album1: Album = {
  id: "1",
  title: "BRAT",
  artist: "Charli XCX",
  releaseDate: "2023-06-16",
  genre: ["Pop", "Electronic"],
  label: "Atlantic Records",
  image: {
    url: "/Charli_XCX_-_Brat_(album_cover).png",
    alt: "Charli XCX - BRAT album cover",
    width: 400,
    height: 400,
  },
  tracks: [
    { id: "1", title: "Lights Out", duration: 180, trackNumber: 1 },
    { id: "2", title: "Used to Know Me", duration: 210, trackNumber: 2 },
    { id: "3", title: "Beg for You", duration: 240, trackNumber: 3 },
    // Add more tracks as needed
  ],
  metadata: {
    totalDuration: 630, // Total duration in seconds
    numberOfTracks: 3, // Number of tracks
    format: "Digital", // Format of the album
    barcode: "123456789012", // Barcode of the album
  },
};

const album2: Album = {
  id: "2",
  title: "Reflections",
  artist: "Hannah Diamond",
  releaseDate: "2019-11-22",
  genre: ["Pop", "Electronic"],
  label: "PC Music",
  image: {
    url: "/reflections-hannah-diamond.webp",
    width: 400,
    height: 400,
    alt: "Hannah Diamond - Reflections album cover",
  },
  tracks: [
    { id: "1", title: "Lights Out", duration: 180, trackNumber: 1 },
    { id: "2", title: "Invisible", duration: 210, trackNumber: 2 },
    { id: "3", title: "Love Goes On", duration: 240, trackNumber: 3 },
    // Add more tracks as needed
  ],
  metadata: {
    totalDuration: 861, // Total duration in seconds
    numberOfTracks: 3, // Number of tracks
    format: "Digital", // Format of the album
    barcode: "123456789012", // Barcode of the album
  },
};


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-4xl font-bold text-center pb-10">Test Data Display</h1>
        <div className="flex gap-4">
          <div id="basis-album">
            <Image src={album1.image.url} alt={album1.image.alt || ''} width={400} height={400} />
            {album1.title}
          </div>
          <div id="recommended-album">
            <Image src={album2.image.url} alt={album2.image.alt || ''}  width={400} height={400}/>
            {album2.title}
          </div>
        </div>
        <div className="text-lg font-semibold">Score: 90</div>
      </div>
    </div>
  );
}
