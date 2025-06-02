'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileClientProps {
  user: {
    name: string;
    email: string | null;
    image: string;
    username: string;
    bio: string;
  };
  collections: any[]; // Raw Prisma data
  recommendations: any[]; // Raw Prisma data
}

export default function ProfileClient({ user, collections, recommendations }: ProfileClientProps) {
  // Flatten collections to get all albums
  const allAlbums = collections.flatMap(collection => collection.albums);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with back navigation */}
        <div className="mb-8">
          <Link 
            href="/browse" 
            className="inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4"
          >
            ← Back to Browse
          </Link>
        </div>

        {/* Profile Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
            <Avatar className="w-32 h-32 border-2 border-zinc-800">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-zinc-800 text-cosmic-latte text-2xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold mb-2 text-cosmic-latte">{user.name}</h1>
              <p className="text-zinc-400 mb-4 text-lg">{user.username}</p>
              <p className="mb-6 max-w-md text-zinc-300">{user.bio}</p>
              <div className="flex justify-center md:justify-start gap-6 text-sm">
                <span className="text-zinc-300">
                  <strong className="text-cosmic-latte">0</strong> Followers
                </span>
                <span className="text-zinc-300">
                  <strong className="text-cosmic-latte">0</strong> Following
                </span>
              </div>
              
              {/* Create Album Collage Button */}
              <div className="mt-6">
                <Link href="/profile/collage">
                  <button className="bg-emeraled-green text-black hover:bg-emeraled-green/90 font-semibold py-2 px-4 rounded-md transition-colors">
                    🎵 Create Album Collage
                  </button>
                </Link>
              </div>
            </div>
          </div>
          
                    {/* Collection Section */}
          <section className="border-t border-zinc-800 pt-8">
            <h2 className="text-2xl font-semibold mb-6 text-cosmic-latte">Record Collection</h2>
            {allAlbums.length > 0 ? (
              <div>
                {/* Collection Stats */}
                <div className="mb-6 text-sm text-zinc-400">
                  <p>{allAlbums.length} albums in collection</p>
                </div>

                {/* Album Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {allAlbums.map((album: any) => (
                    <div key={album.id} className="relative group">
                      <img 
                        src={album.albumImageUrl || '/placeholder.svg?height=400&width=400'} 
                        alt={album.albumTitle}
                        className="w-full aspect-square rounded object-cover border border-zinc-800"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 rounded flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 text-cosmic-latte text-xs text-center p-2">
                          <p className="font-medium truncate mb-1">{album.albumTitle}</p>
                          <p className="text-zinc-300 truncate mb-1">{album.albumArtist}</p>
                          {album.personalRating && (
                            <p className="text-emeraled-green text-xs">★ {album.personalRating}/10</p>
                          )}
                        </div>
                      </div>
                      {/* Added date indicator */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs bg-black bg-opacity-75 text-zinc-300 px-1 py-0.5 rounded">
                          {new Date(album.addedAt).getFullYear()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-400 mb-4">No albums in collection yet.</p>
                <p className="text-sm text-zinc-500">This user hasn't added any albums to their record collection.</p>
              </div>
            )}
          </section>

          {/* Recommendations Section */}
          <section className="border-t border-zinc-800 pt-8 mt-8">
            <h2 className="text-2xl font-semibold mb-6 text-cosmic-latte">Music Recommendations</h2>
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendations.map((rec: any) => (
                  <div 
                    key={rec.id} 
                    className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    {/* Recommendation Header */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-cosmic-latte">
                          Music Recommendation
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm bg-emeraled-green text-black px-2 py-1 rounded-full font-medium">
                            ★ {rec.score}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Albums Comparison */}
                    <div className="space-y-4">
                      {/* Basis Album */}
                      <div>
                        <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">If you like</p>
                        <div className="flex items-center space-x-3 bg-zinc-800 rounded-lg p-3">
                          <img 
                            src={rec.basisAlbumImageUrl || '/placeholder.svg?height=400&width=400'} 
                            alt={rec.basisAlbumTitle}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-cosmic-latte font-medium truncate">
                              {rec.basisAlbumTitle}
                            </p>
                            <p className="text-zinc-400 text-sm truncate">
                              {rec.basisAlbumArtist}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="text-emeraled-green text-xl">↓</div>
                      </div>

                      {/* Recommended Album */}
                      <div>
                        <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">Then try</p>
                        <div className="flex items-center space-x-3 bg-zinc-800 rounded-lg p-3">
                          <img 
                            src={rec.recommendedAlbumImageUrl || '/placeholder.svg?height=400&width=400'} 
                            alt={rec.recommendedAlbumTitle}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-cosmic-latte font-medium truncate">
                              {rec.recommendedAlbumTitle}
                            </p>
                            <p className="text-zinc-400 text-sm truncate">
                              {rec.recommendedAlbumArtist}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-400 mb-4">No recommendations created yet.</p>
                <p className="text-sm text-zinc-500">This user hasn't shared any music recommendations.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}