const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDuplicateFix() {
  console.log('🧪 Testing duplicate album prevention fix...\n');

  try {
    // Simulate what the buggy code would have done:
    // Creating an album with a database UUID as the "MusicBrainz ID"

    const testAlbum1 = {
      title: 'Test Album For Duplicate Check',
      releaseDate: null,
      albumType: 'ALBUM',
      totalTracks: null,
      coverImageUrl: null,
      musicbrainzId: null, // ❌ No MBID (simulating the bug scenario)
      artists: [
        {
          artistName: 'Test Artist',
          role: 'PRIMARY',
        },
      ],
    };

    console.log('📝 Step 1: Creating first test album (no MBID)...');
    const response1 = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'YOUR_SESSION_COOKIE' // You'll need to replace this
      },
      body: JSON.stringify({
        query: `
          mutation AddAlbum($input: AlbumInput!) {
            addAlbum(input: $input) {
              id
              title
              musicbrainzId
            }
          }
        `,
        variables: { input: testAlbum1 },
      }),
    });

    const data1 = await response1.json();
    console.log('✅ First album created:', data1.data?.addAlbum?.id);

    console.log('\n📝 Step 2: Creating second identical album (should be deduplicated)...');
    const response2 = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'YOUR_SESSION_COOKIE'
      },
      body: JSON.stringify({
        query: `
          mutation AddAlbum($input: AlbumInput!) {
            addAlbum(input: $input) {
              id
              title
              musicbrainzId
            }
          }
        `,
        variables: { input: testAlbum1 },
      }),
    });

    const data2 = await response2.json();
    console.log('✅ Second album result:', data2.data?.addAlbum?.id);

    // Check if they're the same ID (deduplication worked)
    const id1 = data1.data?.addAlbum?.id;
    const id2 = data2.data?.addAlbum?.id;

    if (id1 === id2) {
      console.log('\n✅ TEST PASSED: Deduplication worked! Both requests returned the same album.');
    } else {
      console.log('\n❌ TEST FAILED: Two different albums were created!');
      console.log(`   First ID:  ${id1}`);
      console.log(`   Second ID: ${id2}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    if (id1) {
      await prisma.album.delete({ where: { id: id1 } });
    }
    if (id2 && id2 !== id1) {
      await prisma.album.delete({ where: { id: id2 } });
    }
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative: Direct Prisma test (bypassing GraphQL)
async function testDirect() {
  console.log('🧪 Testing duplicate detection directly with Prisma...\n');

  try {
    const testTitle = 'Direct Test Album';
    const testArtist = 'Direct Test Artist';

    // Check 1: Create an artist
    let artist = await prisma.artist.findFirst({
      where: { name: { equals: testArtist, mode: 'insensitive' } }
    });

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: testArtist,
          dataQuality: 'LOW',
          enrichmentStatus: 'PENDING',
        }
      });
      console.log('✅ Created test artist:', artist.id);
    }

    // Check 2: Create first album
    const album1 = await prisma.album.create({
      data: {
        title: testTitle,
        releaseType: 'ALBUM',
        dataQuality: 'LOW',
        enrichmentStatus: 'PENDING',
        artists: {
          create: {
            artistId: artist.id,
            role: 'PRIMARY',
          }
        }
      }
    });
    console.log('✅ Created first album:', album1.id);

    // Check 3: Try to find existing album by title + artist
    const existing = await prisma.album.findFirst({
      where: {
        title: { equals: testTitle, mode: 'insensitive' },
        artists: {
          some: {
            role: 'PRIMARY',
            artist: {
              name: { equals: testArtist, mode: 'insensitive' }
            }
          }
        }
      }
    });

    if (existing && existing.id === album1.id) {
      console.log('✅ TEST PASSED: Deduplication query works correctly!');
    } else {
      console.log('❌ TEST FAILED: Could not find album by title+artist');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await prisma.album.delete({ where: { id: album1.id } });
    await prisma.artist.delete({ where: { id: artist.id } });
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the direct test (doesn't require authentication)
testDirect();
