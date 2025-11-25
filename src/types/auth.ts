/**
 * Authentication error codes for NextAuth credentials provider
 */
export const AUTH_ERROR_CODES = {
  MISSING_CREDENTIALS: 'MissingCredentials',
  USER_NOT_FOUND: 'UserNotFound',
  INVALID_PASSWORD: 'InvalidPassword',
  NO_PASSWORD_SET: 'NoPasswordSet',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * User-friendly error messages for authentication failures
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [AUTH_ERROR_CODES.MISSING_CREDENTIALS]:
    'Please enter both email and password.',
  [AUTH_ERROR_CODES.USER_NOT_FOUND]:
    'No account found with this email address.',
  [AUTH_ERROR_CODES.INVALID_PASSWORD]: 'Incorrect password. Please try again.',
  [AUTH_ERROR_CODES.NO_PASSWORD_SET]:
    'This account uses social login. Please sign in with Google or Spotify.',
  CredentialsSignin: 'Invalid credentials. Please try again.',
  default: 'An error occurred. Please try again.',
};

/**
 * Get a user-friendly error message from a NextAuth error
 */
export function getAuthErrorMessage(error: string | undefined): string {
  if (!error) return AUTH_ERROR_MESSAGES.default;
  return AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.default;
}
