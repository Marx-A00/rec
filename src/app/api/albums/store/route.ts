import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { album } = data;

    if (!album || !album.id) {
      return NextResponse.json(
        { error: "Valid album data is required" },
        { status: 400 }
      );
    }

    // Check if album already exists in our database
    const existingAlbum = await prisma.album.findUnique({
      where: { discogsId: album.id.toString() },
    });

    if (existingAlbum) {
      // Return the existing album if it's already in our database
      return NextResponse.json({ album: existingAlbum, isNew: false });
    }

    // Create the album in our database
    const newAlbum = await prisma.album.create({
      data: {
        discogsId: album.id.toString(),
        title: album.title,
        artist: album.artist,
        releaseDate: album.releaseDate,
        genre: album.genre || [],
        label: album.label,
        imageUrl: album.image.url,
        tracks: {
          create: album.tracks.map((track: any) => ({
            title: track.title,
            duration: track.duration,
            trackNumber: track.trackNumber,
          })),
        },
      },
      include: {
        tracks: true,
      },
    });

    return NextResponse.json({ album: newAlbum, isNew: true }, { status: 201 });
  } catch (error) {
    console.error("Error storing album:", error);
    return NextResponse.json(
      { error: "Failed to store album" },
      { status: 500 }
    );
  }
} 