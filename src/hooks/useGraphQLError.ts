import { useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { extractErrorMessage, isAuthError } from '@/lib/graphql-client';

export function useGraphQLError() {
  const router = useRouter();

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const message = customMessage || extractErrorMessage(error);

      // Check if it's an authentication error
      if (isAuthError(error)) {
        toast.error('Please sign in to continue');
        router.push('/login');
        return;
      }

      // Show error toast
      toast.error(message);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('GraphQL Error:', error);
      }
    },
    [router]
  );

  return { handleError };
}

// Hook for mutation error handling with retry logic
export function useMutationErrorHandler() {
  const { handleError } = useGraphQLError();

  const handleMutationError = useCallback(
    (
      error: unknown,
      options?: {
        customMessage?: string;
        retry?: () => void;
        onError?: (error: unknown) => void;
      }
    ) => {
      const { customMessage, retry, onError } = options || {};

      // Call custom error handler if provided
      if (onError) {
        onError(error);
      }

      // Show error message
      handleError(error, customMessage);

      // Offer retry option if provided
      if (retry) {
        toast.error(customMessage || 'Operation failed', {
          action: {
            label: 'Retry',
            onClick: retry,
          },
        });
      }
    },
    [handleError]
  );

  return { handleMutationError };
}
