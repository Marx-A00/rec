import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Test connection by trying to create and then delete a test user
  try {
    console.log('Testing database connection...')
    
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
      },
    })
    
    console.log('Successfully created test user:', testUser)
    
    // Clean up by deleting the test user
    await prisma.user.delete({
      where: {
        id: testUser.id,
      },
    })
    
    console.log('Successfully deleted test user')
    console.log('Database connection is working!')
  } catch (error) {
    console.error('Error testing database connection:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 