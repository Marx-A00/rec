'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // TODO: Add persistent caching with React Query Persister
  // This would allow caching to survive page refreshes and improve UX:
  // 1. Install @tanstack/query-sync-storage-persister and @tanstack/react-query-persist-client
  // 2. Create a persister with localStorage or IndexedDB
  // 3. Wrap QueryClient with PersistQueryClientProvider
  // 4. Configure cache time and what queries to persist (e.g., user collections, album details)
  // Benefits: Instant loading on refresh, offline support, reduced API calls
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
