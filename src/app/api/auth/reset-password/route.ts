import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import { verifyAndConsumeToken } from '@/lib/auth/tokens';
import {
  validateRequestBody,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/validations/api';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z
    .string()
    .email('Please provide a valid email address')
    .max(255)
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be 128 characters or less')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateRequestBody(resetPasswordSchema, body);

    if (!validation.success) {
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_REQUEST'
      );
      return NextResponse.json(response, { status });
    }

    const { token, email, password } = validation.data;

    // Verify and consume the token
    const isValid = await verifyAndConsumeToken(email, token);

    if (!isValid) {
      const { response, status } = createErrorResponse(
        'This reset link is invalid or has expired. Please request a new one.',
        400,
        undefined,
        'INVALID_TOKEN'
      );
      return NextResponse.json(response, { status });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      const { response, status } = createErrorResponse(
        'This reset link is invalid or has expired. Please request a new one.',
        400,
        undefined,
        'INVALID_TOKEN'
      );
      return NextResponse.json(response, { status });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    const { response, status } = createSuccessResponse(
      'Your password has been reset successfully. You can now sign in with your new password.'
    );
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    const { response, status } = createErrorResponse(
      'Something went wrong. Please try again.',
      500,
      undefined,
      'INTERNAL_ERROR'
    );
    return NextResponse.json(response, { status });
  }
}
