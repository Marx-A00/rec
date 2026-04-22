import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

import MobileBrowseClient from './MobileBrowseClient';

export const dynamic = 'force-dynamic';

async function getNewUsers(limit: number = 15) {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    take: limit,
    select: {
      id: true,
      username: true,
      image: true,
      recommendationsCount: true,
    },
  });

  // Sort by ID descending as proxy for creation order
  return users.sort((a, b) => b.id.localeCompare(a.id));
}

async function getLatestReleases(limit: number = 20) {
  const albums = await prisma.album.findMany({
    where: { source: 'SPOTIFY' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      artists: {
        include: { artist: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  return albums.map(album => ({
    id: album.id,
    title: album.title,
    coverArtUrl: album.coverArtUrl,
    cloudflareImageId: album.cloudflareImageId,
    releaseDate: album.releaseDate?.toISOString() || null,
    artists: album.artists.map(aa => aa.artist.name).join(', '),
  }));
}

export default async function MobileBrowsePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/m/auth/signin');
  }

  const [newUsers, latestReleases] = await Promise.all([
    getNewUsers(),
    getLatestReleases(),
  ]);

  return (
    <MobileBrowseClient newUsers={newUsers} latestReleases={latestReleases} />
  );
}
