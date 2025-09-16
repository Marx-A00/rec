// Test GraphQL collections query directly
import { ApolloServer } from '@apollo/server';
import { readFileSync } from 'fs';
import { join } from 'path';
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

  // Mock user context
  const mockUser = {
    id: 'cmfmo8b6900019dwpsf9dsn35',
    email: 'mnandrade1999@gmail.com'
  };

  console.log('\n=== Testing GraphQL myCollections query ===\n');
  console.log('Mock user:', mockUser);

  const query = `
    query GetMyCollections {
      myCollections {
        id
        name
        albums {
          id
          position
          personalRating
          personalNotes
          addedAt
          album {
            id
            title
            coverArtUrl
            releaseDate
            artists {
              artist {
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const result = await server.executeOperation(
      { query },
      {
        contextValue: {
          user: mockUser,
          prisma,
          dataloaders: {}, // Empty for test
          requestId: 'test-123',
          timestamp: new Date()
        }
      }
    );

    console.log('\nGraphQL Response:');
    console.log(JSON.stringify(result, null, 2));

    if ('body' in result && result.body.kind === 'single') {
      const data = result.body.singleResult.data;
      if (data?.myCollections) {
        console.log(`\n✅ Found ${data.myCollections.length} collections`);
        data.myCollections.forEach((col: any) => {
          console.log(`  - "${col.name}" with ${col.albums?.length || 0} albums`);
        });
      }
    }
  } catch (error) {
    console.error('GraphQL Error:', error);
  }

  await prisma.$disconnect();
}

testGraphQL().catch(console.error);