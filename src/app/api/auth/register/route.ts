import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import prisma from '@/lib/prisma';
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

    const { email, password, name } = validation.data;

    // Check if user already exists
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

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
