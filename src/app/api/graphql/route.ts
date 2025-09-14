// src/app/api/graphql/route.ts
// Apollo Server 5.x integration with Next.js 15 App Router

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { createGraphQLContext, GraphQLContext } from '@/lib/graphql/context';
import { resolvers } from '@/lib/graphql/resolvers';
import { formatError } from '@/lib/graphql/errors';

// Load GraphQL schema from file
const typeDefs = readFileSync(
  join(process.cwd(), 'src/graphql/schema.graphql'),
  'utf8'
);

// Initialize Prisma client (singleton pattern)
const prisma = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV === 'development') globalThis.prisma = prisma;

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

// Export route handlers for Next.js App Router
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

// Type augmentation for global Prisma client
declare global {
  var prisma: PrismaClient | undefined;
}
