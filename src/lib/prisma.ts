import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : ['error'],
  });

// Custom query logging with truncation and source info
// TODO: Fix for newer Prisma versions - $on is deprecated
// if (process.env.NODE_ENV === 'development') {
//   prisma.$on('query', (e) => {
//     const query = e.query.length > 200 ? e.query.substring(0, 200) + '...' : e.query;
//     const params = e.params.length > 100 ? e.params.substring(0, 100) + '...' : e.params;

//     // Get caller info from stack trace
//     if (process.env.PRISMA_LOG_CALLER === 'true') {
//       const stack = new Error().stack;
//       const caller = stack?.split('\n')[10]?.trim() || 'unknown'; // Adjust index as needed
//       console.log(`📍 ${caller}`);
//     }

//     console.log(`[${e.duration}ms] ${query}`);
//     if (process.env.PRISMA_LOG_PARAMS === 'true') {
//       console.log(`  Params: ${params}`);
//     }
//   });
// }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
