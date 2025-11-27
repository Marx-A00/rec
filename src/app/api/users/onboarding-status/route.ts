import { NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

// GET - Check if user is new (needs onboarding)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        profileUpdatedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // User is "new" if profileUpdatedAt is null
    // This indicates they haven't completed the onboarding tour yet
    const isNewUser = user.profileUpdatedAt === null;

    return NextResponse.json({
      isNewUser,
      userId: user.id,
      createdAt: user.createdAt,
      profileUpdatedAt: user.profileUpdatedAt,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Mark user as having started onboarding
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update profileUpdatedAt to mark that onboarding has been started
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        profileUpdatedAt: new Date(),
      },
      select: {
        id: true,
        profileUpdatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      profileUpdatedAt: user.profileUpdatedAt,
    });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
