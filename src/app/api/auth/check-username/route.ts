// src/app/api/auth/check-username/route.ts
import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required', available: false },
        { status: 400 }
      );
    }

    // Check if username exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existingUser,
      username: username.toLowerCase(),
    });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { error: 'Failed to check username', available: false },
      { status: 500 }
    );
  }
}

