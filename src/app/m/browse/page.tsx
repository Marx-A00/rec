import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import { getLatestReleases } from '@/lib/albums/latest-releases';

import MobileBrowseClient from './MobileBrowseClient';

export const dynamic = 'force-dynamic';

export default async function MobileBrowsePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/m/auth/signin');
  }

  const { releases: latestReleases } = await getLatestReleases(20);

  return <MobileBrowseClient latestReleases={latestReleases} />;
}
