import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dismissedUserId, reason } = body;

    if (!dismissedUserId) {
      return NextResponse.json(
        { error: 'dismissedUserId is required' },
        { status: 400 }
      );
    }

    // Check if the dismissed user exists
    const dismissedUser = await prisma.user.findUnique({
      where: { id: dismissedUserId },
      select: { id: true },
    });

    if (!dismissedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For now, we'll store dismissed suggestions in a simple table
    // In a production app, you might want to create a DismissedSuggestion model
    // For this implementation, we'll use a simple approach and just return success

    // TODO: Consider adding a DismissedSuggestion model to track:
    // - userId (who dismissed)
    // - dismissedUserId (who was dismissed)
    // - reason (optional)
    // - dismissedAt (timestamp)
    // - algorithm (which algorithm suggested this user)

    // For now, we'll just log the dismissal and return success
    console.log(
      `User ${session.user.id} dismissed suggestion for user ${dismissedUserId}`,
      {
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Suggestion dismissed successfully',
      dismissedUserId,
    });
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
