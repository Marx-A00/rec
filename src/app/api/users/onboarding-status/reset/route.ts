import { NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

// POST - Reset onboarding status (for testing only)
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    // Reset profileUpdatedAt to null to make user appear as "new" again
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        profileUpdatedAt: null,
      },
      select: {
        id: true,
        profileUpdatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding status reset. Refresh the page to trigger onboarding.',
      userId: user.id,
      profileUpdatedAt: user.profileUpdatedAt,
    });
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
