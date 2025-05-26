import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get most recent recommendations
    const recommendations = await prisma.recommendation.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        basisAlbum: true,
        recommendedAlbum: true,
      },
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check for authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to create a recommendation" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { basisAlbumId, recommendedAlbumId, score } = data;
    
    if (!basisAlbumId || !recommendedAlbumId || !score) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        userId: session.user.id,
        basisAlbumId,
        recommendedAlbumId,
        score,
      },
      include: {
        basisAlbum: true,
        recommendedAlbum: true,
      },
    });

    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (error) {
    console.error("Error creating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to create recommendation" },
      { status: 500 }
    );
  }
} 