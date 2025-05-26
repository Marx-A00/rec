import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface User {
  id: string;
  name: string;
  email: string;
  image: string;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
}

interface Recommendation {
  id: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
  basisAlbum: Album;
  recommendedAlbum: Album;
  score: number;
  createdAt: string;
}

async function getUsers(): Promise<User[]> {
  try {
    // In a real app, this would fetch from your API
    // For now, return sample data
    return [
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
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function getRecommendations(): Promise<Recommendation[]> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/recommendations`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }
    
    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

export default async function BrowsePage() {
  const [users, recommendations] = await Promise.all([
    getUsers(),
    getRecommendations()
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-cosmic-latte mb-2">Browse</h1>
          <p className="text-zinc-400">Discover users and their music recommendations</p>
        </div>

        {/* Users Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-cosmic-latte mb-6 border-b border-zinc-800 pb-2">
            Music Enthusiasts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {users.map((user) => (
              <HoverCard key={user.id}>
                <HoverCardTrigger asChild>
                  <div className="bg-zinc-900 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback className="bg-zinc-700 text-zinc-200">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-medium text-white mb-1">{user.name}</h3>
                      <p className="text-sm text-zinc-400">{user.email}</p>
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 bg-zinc-900 border-zinc-800 text-white">
                  <div className="flex space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback className="bg-zinc-700 text-zinc-200">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {user.name}
                      </h4>
                      <p className="text-sm text-zinc-300">
                        {user.email}
                      </p>
                      <div className="flex items-center pt-1">
                        <span className="text-xs text-zinc-400">
                          Music enthusiast
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </section>

        {/* Recommendations Section */}
        <section>
          <h2 className="text-2xl font-semibold text-cosmic-latte mb-6 border-b border-zinc-800 pb-2">
            Latest Recommendations
          </h2>
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((recommendation) => (
                <div 
                  key={recommendation.id} 
                  className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  {/* User info */}
                  <div className="flex items-center mb-4">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={recommendation.user.image} alt={recommendation.user.name} />
                      <AvatarFallback className="bg-zinc-700 text-zinc-200 text-xs">
                        {recommendation.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">{recommendation.user.name}</p>
                      <p className="text-xs text-zinc-400">recommended</p>
                    </div>
                  </div>

                  {/* Albums */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={recommendation.basisAlbum.imageUrl || "https://via.placeholder.com/48x48?text=No+Image"} 
                        alt={recommendation.basisAlbum.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {recommendation.basisAlbum.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          by {recommendation.basisAlbum.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="text-emeraled-green text-sm font-medium">
                        ↓ If you like this, try ↓
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <img 
                        src={recommendation.recommendedAlbum.imageUrl || "https://via.placeholder.com/48x48?text=No+Image"} 
                        alt={recommendation.recommendedAlbum.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {recommendation.recommendedAlbum.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          by {recommendation.recommendedAlbum.artist}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Similarity Score</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emeraled-green rounded-full"
                            style={{ width: `${(recommendation.score / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-emeraled-green font-medium">
                          {recommendation.score}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400 mb-4">No recommendations available yet.</p>
              <Link 
                href="/recommend" 
                className="inline-block bg-cosmic-latte hover:bg-emeraled-green text-black font-medium py-2 px-4 rounded-full transition-colors"
              >
                Create the first recommendation
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
} 