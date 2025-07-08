import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

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
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If profileUpdatedAt is null, this is a new user who hasn't seen the tour
    const isNewUser = user.profileUpdatedAt === null;

    return NextResponse.json({
      isNewUser,
      profileUpdatedAt: user.profileUpdatedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update profileUpdatedAt to mark that the user has started the tour
    const updatedUser = await prisma.user.update({
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
      profileUpdatedAt: updatedUser.profileUpdatedAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 