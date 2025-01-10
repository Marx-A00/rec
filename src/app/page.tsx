import Image from "next/image";

interface Album {
  id: string;
  title: string;
  artist: string;
  image: string;
  score: number;
}

const album1: Album = {
  id: "1",
  title: "Album 1",
  artist: "Artist 1",
  image: "/image1.png",
  score: 90,
};

const album2: Album = {
  id: "2",
  title: "Album 2",
  artist: "Artist 2",
  image: "/image2.png",
  score: 80,
};

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-2xl font-bold text-center">Test Data Display</h1>
        <div className="flex gap-4">
          <div>
            {album1.title}
          </div>
            {album1.score}
          <div>
            {album2.title}
          </div>
            {album2.score}
          <Image
            src="/image1.png"
            alt="Image 1"
            width={200}
            height={200}
          />
          <Image
            src="/image2.png"
            alt="Image 2"
            width={200}
            height={200}
          />
        </div>
        <div className="text-lg font-semibold">Score: 90</div>
      </div>
    </div>
  );
}
