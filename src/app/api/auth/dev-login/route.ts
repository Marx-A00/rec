import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

import prisma from '@/lib/prisma';

/**
 * DEV ONLY: Auto-login endpoint for development convenience.
 * Triggered by Ctrl+C Ctrl+C on the sign-in page.
 *
 * Set DEV_LOGIN_EMAIL in your .env.local to your admin user's email.
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const devEmail = process.env.DEV_LOGIN_EMAIL;
  if (!devEmail) {
    return NextResponse.json(
      { error: 'DEV_LOGIN_EMAIL not set in environment' },
      { status: 500 }
    );
  }

  try {
    // Find the admin user
    const user = await prisma.user.findUnique({
      where: { email: devEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${devEmail} not found` },
        { status: 404 }
      );
    }

    // Create a session token manually
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'NEXTAUTH_SECRET not set' },
        { status: 500 }
      );
    }

    // NextAuth v5 requires salt parameter for encode
    const cookieName = 'authjs.session-token';
    const salt = cookieName; // NextAuth v5 uses cookie name as salt

    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.username,
        picture: user.image,
      },
      secret,
      salt,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the session cookie
    const cookieStore = await cookies();

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: false, // Dev mode
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    console.error('[dev-login] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create dev session' },
      { status: 500 }
    );
  }
}
