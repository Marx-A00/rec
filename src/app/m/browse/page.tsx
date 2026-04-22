import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { getLatestReleases } from '@/lib/albums/latest-releases';

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

  return users.sort((a, b) => b.id.localeCompare(a.id));
}

export default async function MobileBrowsePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/m/auth/signin');
  }

  const [newUsers, { releases: latestReleases }] = await Promise.all([
    getNewUsers(),
    getLatestReleases(20),
  ]);

  return (
    <MobileBrowseClient newUsers={newUsers} latestReleases={latestReleases} />
  );
}
