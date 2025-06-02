import { auth } from '@/../auth';
import { redirect } from 'next/navigation';
import Profile from './profile';
import prisma from '@/lib/prisma';

async function getUserRecommendations(userId: string) {
  return await prisma.recommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

async function getUserCollections(userId: string) {
  return await prisma.collection.findMany({
    where: { userId },
    include: {
      albums: {
        orderBy: { addedAt: 'desc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

export default async function ProfilePage() {
  const session = await auth();
  const userData = session?.user;

  if (!userData || !userData.id) {
    redirect('/');
  }
  
  const [collections, recommendations] = await Promise.all([
    getUserCollections(userData.id),
    getUserRecommendations(userData.id)
  ]);
  
  // Minimal user object
  const user = {
    name: userData.name || "User",
    email: userData.email || null,
    image: userData.image || "/placeholder.svg?height=100&width=100",
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio: "Music enthusiast | Sharing vibes and discovering new sounds",
  };
  
  return <Profile user={user} collections={collections} recommendations={recommendations} />;
}

