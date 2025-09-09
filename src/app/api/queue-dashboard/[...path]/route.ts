// src/app/api/queue-dashboard/[...trpc]/route.ts
import { appRouter } from '@queuedash/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz';

// Get the queue instance from our service
const queueService = getQueuedMusicBrainzService();
const queue = queueService.getQueue();

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/queue-dashboard',
    req,
    router: appRouter,
    createContext: () => ({
      queues: [
        {
          queue: queue,
          displayName: 'MusicBrainz API',
          type: 'bullmq' as const,
        },
      ],
    }),
  });

export { handler as GET, handler as POST };
