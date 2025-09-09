// src/app/api/queue-dashboard/[...trpc]/route.ts
import { appRouter } from '@queuedash/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { getMusicBrainzQueue } from '@/lib/queue';

// Get a single reference to the queue instance at module load time
const queueInstance = getMusicBrainzQueue().getQueue();

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/queue-dashboard',
    req,
    router: appRouter,
    createContext: () => ({
      queues: [
        {
          queue: queueInstance,
          displayName: 'MusicBrainz API',
          type: 'bullmq' as const,
        },
      ],
    }),
  });

export { handler as GET, handler as POST };
