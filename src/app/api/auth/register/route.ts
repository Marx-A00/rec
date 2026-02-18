import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import prisma from '@/lib/prisma';
import { initializeNewUser } from '@/lib/users';
import {
  userRegistrationSchema,
  validateRequestBody,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/validations/api';

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const requestBody = await request.json();
    const validation = validateRequestBody(userRegistrationSchema, requestBody);

    if (!validation.success) {
      console.error('Invalid registration request body:', validation.details);
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_REGISTRATION_DATA'
      );
      return NextResponse.json(response, { status });
    }

    const { email, password, username } = validation.data;

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const { response, status } = createErrorResponse(
        'Account already exists',
        409,
        'An account with this email address already exists',
        'ACCOUNT_EXISTS'
      );
      return NextResponse.json(response, { status });
    }

    // Check if username already exists (case-insensitive)
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
      });

      if (existingUsername) {
        const { response, status } = createErrorResponse(
          'Username already taken',
          409,
          'This username is already in use. Please choose a different one.',
          'USERNAME_TAKEN'
        );
        return NextResponse.json(response, { status });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username || null,
        hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    // Initialize default collections and settings
    await initializeNewUser(user.id);

    const { response, status } = createSuccessResponse(
      'Account created successfully',
      { user },
      201
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Registration error:', error);
    const { response, status } = createErrorResponse(
      'Failed to create account',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      'REGISTRATION_FAILED'
    );
    return NextResponse.json(response, { status });
  }
}
