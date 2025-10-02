/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Test GraphQL recommendations queries
import { readFileSync } from 'fs';
import { join } from 'path';

import { ApolloServer } from '@apollo/server';

import { prisma } from '@/lib/prisma';
import { resolvers } from '@/lib/graphql/resolvers';

async function testGraphQL() {
  // Load schema
  const typeDefs = readFileSync(
    join(process.cwd(), 'src/graphql/schema.graphql'),
    'utf8'
  );

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  console.log('\n=== Testing GraphQL recommendationFeed query ===\n');

  const feedQuery = `
    query GetRecommendationFeed($cursor: String, $limit: Int) {
      recommendationFeed(cursor: $cursor, limit: $limit) {
        recommendations {
          id
          score
          createdAt
          user {
            id
            name
          }
          basisAlbum {
            id
            title
          }
          recommendedAlbum {
            id
            title
          }
        }
        cursor
        hasMore
      }
    }
  `;

  try {
    const result = await server.executeOperation(
      {
        query: feedQuery,
        variables: { limit: 5 },
      },
      {
        contextValue: {
          user: null,
          prisma,
          dataloaders: {},
          requestId: 'test-feed',
          timestamp: new Date(),
        },
      }
    );

    if ('body' in result && result.body.kind === 'single') {
      const data = result.body.singleResult.data;
      console.log('Feed Response:', JSON.stringify(data, null, 2));

      if (data?.recommendationFeed?.recommendations) {
        console.log(
          `\n✅ Found ${data.recommendationFeed.recommendations.length} recommendations in feed`
        );
        data.recommendationFeed.recommendations.forEach((rec: any) => {
          console.log(
            `  - ${rec.basisAlbum?.title} → ${rec.recommendedAlbum?.title} by ${rec.user?.name}`
          );
        });
      }
    }
  } catch (error) {
    console.error('GraphQL Feed Error:', error);
  }

  // Test user-specific recommendations
  console.log('\n\n=== Testing GraphQL myRecommendations query ===\n');

  const myRecsQuery = `
    query GetMyRecommendations($sort: RecommendationSort, $limit: Int) {
      myRecommendations(sort: $sort, limit: $limit) {
        id
        score
        createdAt
        user {
          id
          name
        }
        basisAlbum {
          id
          title
        }
        recommendedAlbum {
          id
          title
        }
      }
    }
  `;

  const mockUser = {
    id: 'cmfmo8b6900019dwpsf9dsn35',
    email: 'mnandrade1999@gmail.com',
  };

  try {
    const result = await server.executeOperation(
      {
        query: myRecsQuery,
        variables: { limit: 5, sort: 'SCORE_DESC' },
      },
      {
        contextValue: {
          user: mockUser,
          prisma,
          dataloaders: {},
          requestId: 'test-my-recs',
          timestamp: new Date(),
        },
      }
    );

    if ('body' in result && result.body.kind === 'single') {
      const data = result.body.singleResult.data;
      console.log(
        'My Recommendations Response:',
        JSON.stringify(data, null, 2)
      );

      if (data?.myRecommendations) {
        console.log(
          `\n✅ Found ${data.myRecommendations.length} recommendations for user`
        );
        data.myRecommendations.forEach((rec: any) => {
          console.log(
            `  - ${rec.basisAlbum?.title} → ${rec.recommendedAlbum?.title} (score: ${rec.score})`
          );
        });
      }
    }
  } catch (error) {
    console.error('GraphQL My Recs Error:', error);
  }

  await prisma.$disconnect();
}

testGraphQL().catch(console.error);
