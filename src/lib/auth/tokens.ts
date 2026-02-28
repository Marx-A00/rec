import crypto from 'crypto';

import prisma from '@/lib/prisma';

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes
const IDENTIFIER_PREFIX = 'pwreset:';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a password reset token for the given email.
 * Returns the raw token (to be sent in the email) or null if throttled.
 */
export async function createPasswordResetToken(
  email: string
): Promise<string | null> {
  const identifier = `${IDENTIFIER_PREFIX}${email.toLowerCase()}`;

  // Check for recent token (throttle)
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      expires: { gt: new Date(Date.now() + TOKEN_EXPIRY_MS - THROTTLE_MS) },
    },
  });

  if (recentToken) {
    return null; // Throttled — token was requested recently
  }

  // Clean up any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  // Generate new token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });

  return rawToken;
}

/**
 * Verifies a password reset token and deletes it (single-use).
 * Returns true if the token is valid.
 */
export async function verifyAndConsumeToken(
  email: string,
  rawToken: string
): Promise<boolean> {
  const identifier = `${IDENTIFIER_PREFIX}${email.toLowerCase()}`;
  const hashedToken = hashToken(rawToken);

  const storedToken = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: hashedToken,
    },
  });

  if (!storedToken) {
    return false;
  }

  // Delete the token (single-use)
  await prisma.verificationToken.deleteMany({
    where: { identifier, token: hashedToken },
  });

  // Check expiry
  if (storedToken.expires < new Date()) {
    return false;
  }

  return true;
}
