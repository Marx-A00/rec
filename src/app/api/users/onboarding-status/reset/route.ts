import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

// DEBUG ENDPOINT: Reset user's onboarding status for testing
export async function POST() {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset profileUpdatedAt to null to simulate a new user
    const updatedUser = await prisma.user.update({
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
      message: 'Onboarding status reset successfully - user will be treated as new on next login/page refresh',
      profileUpdatedAt: updatedUser.profileUpdatedAt,
    });
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 