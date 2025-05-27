import { auth } from '@/../auth';
import { redirect } from 'next/navigation';
import Profile from './profile';
import prisma from '@/lib/prisma';

async function getUserCollections(userId: string) {
  try {
    const collections = await prisma.collection.findMany({
      where: { userId },
      include: {
        albums: {
          include: {
            album: {
              include: {
                tracks: true
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Flatten all albums from all collections into a single array
    const allAlbums = collections.flatMap(collection => 
      collection.albums.map(collectionAlbum => ({
        id: collectionAlbum.id,
        albumId: collectionAlbum.albumId,
        album: {
          id: collectionAlbum.album.id,
          title: collectionAlbum.album.title,
          artist: collectionAlbum.album.artist,
          releaseDate: collectionAlbum.album.releaseDate || undefined,
          genre: collectionAlbum.album.genre,
          label: collectionAlbum.album.label || undefined,
          image: {
            url: collectionAlbum.album.imageUrl || '/placeholder.svg?height=400&width=400',
            width: 400,
            height: 400,
            alt: `${collectionAlbum.album.title} cover`
          }
        },
        addedAt: collectionAlbum.addedAt.toISOString(),
        addedBy: collection.userId,
        personalRating: collectionAlbum.personalRating || undefined,
        personalNotes: collectionAlbum.personalNotes || undefined
      }))
    );
    
    return allAlbums;
  } catch (error) {
    console.error('Error fetching user collections:', error);
    return [];
  }
}

async function getUserRecommendations(userId: string) {
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { userId },
      include: {
        basisAlbum: true,
        recommendedAlbum: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return recommendations.map(rec => ({
      id: rec.id,
      score: rec.score,
      createdAt: rec.createdAt.toISOString(),
              basisAlbum: {
          id: rec.basisAlbum.id,
          title: rec.basisAlbum.title,
          artist: rec.basisAlbum.artist,
          releaseDate: rec.basisAlbum.releaseDate || undefined,
          genre: rec.basisAlbum.genre,
          label: rec.basisAlbum.label || undefined,
          image: {
            url: rec.basisAlbum.imageUrl || '/placeholder.svg?height=400&width=400',
            width: 400,
            height: 400,
            alt: `${rec.basisAlbum.title} cover`
          }
        },
        recommendedAlbum: {
          id: rec.recommendedAlbum.id,
          title: rec.recommendedAlbum.title,
          artist: rec.recommendedAlbum.artist,
          releaseDate: rec.recommendedAlbum.releaseDate || undefined,
          genre: rec.recommendedAlbum.genre,
          label: rec.recommendedAlbum.label || undefined,
          image: {
            url: rec.recommendedAlbum.imageUrl || '/placeholder.svg?height=400&width=400',
            width: 400,
            height: 400,
            alt: `${rec.recommendedAlbum.title} cover`
          }
        }
    }));
  } catch (error) {
    console.error('Error fetching user recommendations:', error);
    return [];
  }
}

export default async function ProfilePage() {
  const session = await auth();
  const userData = session?.user;

  if (!userData || !userData.id) {
    redirect('/');
  }
  
  // Get user's real collection and recommendations from database
  const userCollection = await getUserCollections(userData.id);
  const userRecommendations = await getUserRecommendations(userData.id);
  
  // Create a user object with auth data plus additional profile fields
  const user = {
    name: userData.name || "User",
    email: userData.email || null,
    image: userData.image || "/placeholder.svg?height=100&width=100",
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio: "Music enthusiast | Sharing vibes and discovering new sounds",
    followers: 0,
    following: 0,
    collection: userCollection, // Real collection from database
    recommendations: userRecommendations, // Real recommendations from database
  };
  
  // Pass the user data to the client component
  return <Profile user={user} />;
}



// 'use client'

// import Link from 'next/link';
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// interface User {
//   name: string
//   username: string
//   avatar: string
//   bio: string
//   followers: number
//   following: number
// }

// const user: User = {
//   name: "Jane Doe",
//   username: "@janedoe",
//   avatar: "/placeholder.svg?height=100&width=100",
//   bio: "Music enthusiast | Sharing vibes and discovering new sounds",
//   followers: 1234,
//   following: 567
// }

// export default function Profile() {

// return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
//         <div className="max-w-4xl mx-auto">
//             <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
//                 <Avatar className="w-32 h-32">
//                     <AvatarImage src={user.avatar} alt={user.name} />
//                     <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
//                 </Avatar>
//                 <div className="text-center md:text-left">
//                     <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
//                     <p className="text-gray-400 mb-4">{user.username}</p>
//                     <p className="mb-4 max-w-md">{user.bio}</p>
//                     <div className="flex justify-center md:justify-start gap-4 text-sm">
//                         <span><strong>{user.followers}</strong> Followers</span>
//                         <span><strong>{user.following}</strong> Following</span>
//                     </div>
//                 </div>
//             </div>
//             <h2 className="text-2xl font-semibold mb-6">Collection</h2>
//         </div>
//         <Link href="/"
//         className="text-white bg-red-500 hover:bg-red-700 font-bold mb-20 py-4 px-8 rounded-full text-lg shadow-lg"
//         >home</Link>
//     </div>
// )};