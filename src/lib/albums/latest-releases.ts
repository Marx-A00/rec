import prisma from '@/lib/prisma';

export interface LatestRelease {
  id: string;
  title: string;
  coverArtUrl: string | null;
  cloudflareImageId: string | null;
  releaseDate: string | null;
  source: string;
  artists: string;
}

export interface LatestReleasesResult {
  releases: LatestRelease[];
  newestReleaseDate: Date | null;
}

export async function getLatestReleases(
  limit: number = 20
): Promise<LatestReleasesResult> {
  const albums = await prisma.album.findMany({
    where: {
      releaseDate: { not: null },
    },
    orderBy: { releaseDate: { sort: 'desc', nulls: 'last' } },
    take: limit,
    include: {
      artists: {
        include: { artist: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (albums.length === 0) {
    return { releases: [], newestReleaseDate: null };
  }

  const releases = albums.map(album => ({
    id: album.id,
    title: album.title,
    coverArtUrl: album.coverArtUrl,
    cloudflareImageId: album.cloudflareImageId,
    releaseDate: album.releaseDate?.toISOString() || null,
    source: album.source,
    artists: album.artists.map(aa => aa.artist.name).join(', '),
  }));

  return {
    releases,
    newestReleaseDate: albums[0].releaseDate,
  };
}
