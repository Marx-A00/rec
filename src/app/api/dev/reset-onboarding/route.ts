import { NextResponse } from 'next/server';

import { withApiLogging } from '@/lib/api-utils';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

/**
 * DEV ONLY: Reset onboarding state for the current user.
 * Clears profileUpdatedAt and username so you land on the stepper fresh.
 *
 * Usage: GET /api/dev/reset-onboarding
 * Then navigate to /complete-profile
 */
export const GET = withApiLogging(async () => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  // Clear onboarding state
  await prisma.user.update({
    where: { id: userId },
    data: {
      profileUpdatedAt: null,
      username: null,
    },
  });

  // Clear Last.fm connection so you can re-test that step too
  await prisma.userSettings.updateMany({
    where: { userId },
    data: {
      lastfmUsername: null,
      lastfmConnectedAt: null,
    },
  });

  // Clear taste profile
  await prisma.userFavoriteArtist.deleteMany({
    where: { userId },
  });

  return NextResponse.json({
    success: true,
    message: 'Onboarding reset. Navigate to /complete-profile to start fresh.',
  });
});
