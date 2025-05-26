import { notFound } from 'next/navigation';
import Profile from '../profile';
import { getSampleCollectionsByUserId } from '../../../../data/collections';
import { getDetailedRecommendationsByUserId } from '../../../../data/index';

interface User {
  id: string;
  name: string;
  email: string;
  image: string;
}

// Sample users data - in a real app, this would come from your database
const sampleUsers: User[] = [
  {
    id: "user-1",
    name: "Alex Rodriguez",
    email: "alex@example.com",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-2", 
    name: "Sam Chen",
    email: "sam@example.com",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-3",
    name: "Jordan Taylor",
    email: "jordan@example.com", 
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-4",
    name: "Casey Morgan",
    email: "casey@example.com",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  },
  {
    id: "user-5",
    name: "Riley Park",
    email: "riley@example.com",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
  }
];

async function getUserById(userId: string): Promise<User | null> {
  try {
    // In a real app, you would fetch from your database
    // For now, use sample data
    const user = sampleUsers.find(u => u.id === userId);
    return user || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

interface ProfilePageProps {
  params: {
    userId: string;
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const userData = await getUserById(params.userId);

  if (!userData) {
    notFound();
  }
  
  // Get user's collections
  const userCollections = getSampleCollectionsByUserId(params.userId);
  
  // Get user's recommendations
  const userRecommendations = getDetailedRecommendationsByUserId(params.userId);
  
  // Create a user object with the fetched data plus additional profile fields
  const user = {
    name: userData.name,
    email: userData.email,
    image: userData.image,
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio: "Music enthusiast | Sharing vibes and discovering new sounds",
    followers: Math.floor(Math.random() * 1000) + 100, // Random followers for demo
    following: Math.floor(Math.random() * 500) + 50,   // Random following for demo
    collections: userCollections,
    recommendations: userRecommendations,
  };
  
  return <Profile user={user} />;
} 