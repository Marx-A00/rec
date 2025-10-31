// src/app/api/graphql/route.ts
// Apollo Server 5.x integration with Next.js 15 App Router

import { readFileSync } from 'fs';
import { join } from 'path';

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';

import { createGraphQLContext, GraphQLContext } from '@/lib/graphql/context';
import { resolvers } from '@/lib/graphql/resolvers';
import { formatError } from '@/lib/graphql/errors';
import { prisma } from '@/lib/prisma';
import {
  runWithCorrelationId,
  generateCorrelationId,
} from '@/lib/correlation-context';

// Load GraphQL schema from file
const typeDefs = readFileSync(
  join(process.cwd(), 'src/graphql/schema.graphql'),
  'utf8'
);

// Apollo Server configuration
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  // @ts-expect-error - GraphQL error formatter type signature mismatch
  formatError,
});

// Create Next.js handler with proper typing
const handler = startServerAndCreateNextHandler(server, {
  context: async (req: NextRequest) => createGraphQLContext(req, prisma),
});

// Export route handlers for Next.js App Router with correlation ID context
export async function GET(request: NextRequest) {
  const correlationId =
    request.headers.get('x-correlation-id') || generateCorrelationId();

  const response = await runWithCorrelationId(
    correlationId,
    { requestPath: request.nextUrl.pathname },
    async () => await handler(request)
  );

  // Add correlation ID to response headers for client tracking
  response.headers.set('x-correlation-id', correlationId);
  return response;
}

export async function POST(request: NextRequest) {
  const correlationId =
    request.headers.get('x-correlation-id') || generateCorrelationId();

  const response = await runWithCorrelationId(
    correlationId,
    { requestPath: request.nextUrl.pathname },
    async () => await handler(request)
  );

  // Add correlation ID to response headers for client tracking
  response.headers.set('x-correlation-id', correlationId);
  return response;
}
