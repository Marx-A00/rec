import { NextResponse } from 'next/server';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import {
  validateRequestBody,
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/validations/api';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .max(255)
    .toLowerCase()
    .trim(),
});

// Generic success message — always returned regardless of whether the email exists
const GENERIC_SUCCESS =
  'If an account exists with that email, we have sent a password reset link.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateRequestBody(forgotPasswordSchema, body);

    if (!validation.success) {
      const { response, status } = createErrorResponse(
        validation.error,
        400,
        validation.details.join('; '),
        'INVALID_REQUEST'
      );
      return NextResponse.json(response, { status });
    }

    const { email } = validation.data;

    // Look up user — but always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, hashedPassword: true, deletedAt: true },
    });

    // Skip sending if: no user, OAuth-only (no password), or soft-deleted
    if (!user || !user.hashedPassword || user.deletedAt) {
      const { response, status } = createSuccessResponse(GENERIC_SUCCESS);
      return NextResponse.json(response, { status });
    }

    // Generate token (returns null if throttled)
    const token = await createPasswordResetToken(email);

    if (!token) {
      // Throttled — still return generic success
      const { response, status } = createSuccessResponse(GENERIC_SUCCESS);
      return NextResponse.json(response, { status });
    }

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(email, resetUrl);

    if (!emailResult.success) {
      console.error(
        '[forgot-password] Failed to send email:',
        emailResult.error
      );
      // Still return generic success — don't leak info about email delivery failures
    }

    const { response, status } = createSuccessResponse(GENERIC_SUCCESS);
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    const { response, status } = createErrorResponse(
      'Something went wrong. Please try again.',
      500,
      undefined,
      'INTERNAL_ERROR'
    );
    return NextResponse.json(response, { status });
  }
}
