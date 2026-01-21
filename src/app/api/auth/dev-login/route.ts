import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

/**
 * DEV ONLY: Auto-login endpoint for development convenience.
 * Triggered by Ctrl+C Ctrl+C on the sign-in page.
 *
 * Set DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in your .env.local
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const devEmail = process.env.DEV_LOGIN_EMAIL;
  const devPassword = process.env.DEV_LOGIN_PASSWORD;

  if (!devEmail || !devPassword) {
    return NextResponse.json(
      {
        error:
          'DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD must be set in environment',
      },
      { status: 500 }
    );
  }

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email: devEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${devEmail} not found` },
        { status: 404 }
      );
    }

    // Return credentials for client-side signIn
    return NextResponse.json({
      success: true,
      credentials: {
        identifier: devEmail,
        password: devPassword,
      },
    });
  } catch (error) {
    console.error('[dev-login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get dev credentials' },
      { status: 500 }
    );
  }
}
