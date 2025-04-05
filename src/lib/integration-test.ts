import { PrismaClient } from '@prisma/client'

// Initialize Prisma Client - this creates a connection to your Supabase database
const prisma = new PrismaClient()

/**
 * Tests the Album-related API endpoints
 * These endpoints are in src/app/api/albums/... and connect to Discogs API
 */
async function testAlbumAPI() {
  console.log('\n🎵 Testing Album API...')
  
  try {
    // Test the album search endpoint (/api/albums/search)
    // This endpoint connects to Discogs API to search for albums
    console.log('\nTesting album search...')
    const searchResponse = await fetch('http://localhost:3000/api/albums/search?query=nevermind%20nirvana')
    if (!searchResponse.ok) throw new Error(`Album search failed: ${searchResponse.statusText}`)
    const searchResults = await searchResponse.json()
    console.log(`✅ Album search successful, found ${searchResults.albums?.length || 0} albums`)

    // Test the album details endpoint (/api/albums/[id])
    // This endpoint gets detailed information about a specific album from Discogs
    if (searchResults.albums?.[0]) {
      console.log('\nTesting album details...')
      const albumId = searchResults.albums[0].id
      const detailsResponse = await fetch(`http://localhost:3000/api/albums/${albumId}`)
      if (!detailsResponse.ok) throw new Error(`Album details failed: ${detailsResponse.statusText}`)
      const albumDetails = await detailsResponse.json()
      console.log('✅ Album details fetched successfully:', albumDetails.album?.title)
    }
  } catch (error) {
    console.error('❌ Album API test failed:', error)
    throw error
  }
}

/**
 * Tests database operations using Prisma
 * This directly interacts with your Supabase database to:
 * 1. Create and manage users
 * 2. Store albums and their tracks
 * 3. Create recommendations linking users and albums
 */
async function testDatabaseOperations() {
  console.log('\n💾 Testing Database Operations...')
  
  try {
    // Create a test user in the database
    // This uses the User model defined in your Prisma schema
    console.log('\nTesting user operations...')
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
      },
    })
    console.log('✅ User created successfully')

    // Create two test albums with their tracks
    // This tests the Album and Track models and their relationship
    console.log('\nTesting album operations...')
    const album1 = await prisma.album.create({
      data: {
        discogsId: 'test-123',
        title: 'Test Album 1',
        artist: 'Test Artist',
        genre: ['Rock'],
        label: 'Test Label',
        imageUrl: 'https://example.com/image.jpg',
        // Create tracks for the album using the nested create feature of Prisma
        tracks: {
          create: [
            { title: 'Track 1', trackNumber: 1, duration: 180 }, // duration in seconds
            { title: 'Track 2', trackNumber: 2, duration: 200 },
          ],
        },
      },
    })
    console.log('✅ Album created successfully')

    const album2 = await prisma.album.create({
      data: {
        discogsId: 'test-456',
        title: 'Test Album 2',
        artist: 'Test Artist 2',
        genre: ['Jazz'],
        label: 'Test Label 2',
        imageUrl: 'https://example.com/image2.jpg',
        tracks: {
          create: [
            { title: 'Track 1', trackNumber: 1, duration: 180 },
          ],
        },
      },
    })
    console.log('✅ Second album created successfully')

    // Create a recommendation linking the user and both albums
    // This tests the Recommendation model and its relationships
    console.log('\nTesting recommendation operations...')
    const recommendation = await prisma.recommendation.create({
      data: {
        score: 8,
        userId: user.id,          // Link to the test user
        basisAlbumId: album1.id,  // Link to the first album as the basis
        recommendedAlbumId: album2.id, // Link to the second album as the recommendation
      },
      // Include related data in the response to verify relationships
      include: {
        user: true,
        basisAlbum: true,
        recommendedAlbum: true,
      },
    })
    console.log('✅ Recommendation created successfully')

    // Clean up all test data
    // This deletes everything in reverse order of creation to respect foreign key constraints
    console.log('\nCleaning up test data...')
    await prisma.recommendation.deleteMany({
      where: { userId: user.id },
    })
    await prisma.track.deleteMany({
      where: { 
        albumId: { 
          in: [album1.id, album2.id] 
        } 
      },
    })
    await prisma.album.deleteMany({
      where: { 
        id: { 
          in: [album1.id, album2.id] 
        } 
      },
    })
    await prisma.user.delete({
      where: { id: user.id },
    })
    console.log('✅ Cleanup completed successfully')

  } catch (error) {
    console.error('❌ Database operations test failed:', error)
    throw error
  }
}

/**
 * Main test function that runs all tests in sequence
 * 1. Tests database operations (creating/deleting records in Supabase)
 * 2. Tests API endpoints (Discogs integration)
 */
async function main() {
  try {
    console.log('🚀 Starting integration tests...')
    
    // Test database operations first
    await testDatabaseOperations()
    
    // Then test the API endpoints
    await testAlbumAPI()
    
    console.log('\n✨ All tests completed successfully!')
  } catch (error) {
    console.error('\n❌ Integration tests failed:', error)
  } finally {
    // Always disconnect from the database when done
    await prisma.$disconnect()
  }
}

// Only run the tests if this file is being run directly (not imported)
if (require.main === module) {
  main()
} 