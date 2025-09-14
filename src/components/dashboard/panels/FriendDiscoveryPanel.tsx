// src/components/dashboard/panels/FriendDiscoveryPanel.tsx
// @ts-nocheck - Friend panel type issues, needs cleanup  
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserPlus, User, Music, Heart, RefreshCw } from 'lucide-react';
import { PanelComponentProps } from '@/types/dashboard';
import { Button } from '@/components/ui/button';

interface SuggestedFriend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  mutualFriends: number;
  sharedGenres: string[];
  commonAlbums: number;
  bio?: string;
  isFollowing: boolean;
  reasonType: 'mutual_friends' | 'similar_taste' | 'location' | 'new_user';
}

export default function FriendDiscoveryPanel({ 
  panelId, 
  config, 
  isEditMode 
}: PanelComponentProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock suggestions data
  const mockSuggestions: SuggestedFriend[] = [
    {
      id: '1',
      name: 'Riley Chen',
      username: '@rileybeats',
      avatar: undefined,
      mutualFriends: 3,
      sharedGenres: ['Electronic', 'Indie Pop'],
      commonAlbums: 12,
      bio: 'Music producer & vinyl collector 🎵',
      isFollowing: false,
      reasonType: 'similar_taste'
    },
    {
      id: '2', 
      name: 'Casey Williams',
      username: '@caseytunes',
      avatar: undefined,
      mutualFriends: 1,
      sharedGenres: ['Hip Hop', 'R&B'],
      commonAlbums: 8,
      bio: 'Always finding hidden gems ✨',
      isFollowing: false,
      reasonType: 'mutual_friends'
    },
    {
      id: '3',
      name: 'Morgan Davis',
      username: '@morganmusic',
      avatar: undefined,
      mutualFriends: 0,
      sharedGenres: ['Rock', 'Alternative'],
      commonAlbums: 15,
      bio: 'Concert photographer & music lover 📸',
      isFollowing: false,
      reasonType: 'similar_taste'
    },
    {
      id: '4',
      name: 'River Thompson',
      username: '@riverwaves',
      avatar: undefined,
      mutualFriends: 2,
      sharedGenres: ['Ambient', 'Post-Rock'],
      commonAlbums: 6,
      bio: 'New to the community! 👋',
      isFollowing: false,
      reasonType: 'new_user'
    },
  ];

  // Fetch friend suggestions
  useEffect(() => {
    if (user && !isEditMode) {
      const fetchSuggestions = async () => {
        setIsLoading(true);
        try {
          // Mock delay
          setTimeout(() => {
            setSuggestions(mockSuggestions);
            setIsLoading(false);
          }, 1000);
        } catch (error) {
          console.error('Error fetching friend suggestions:', error);
          setIsLoading(false);
        }
      };

      fetchSuggestions();
    }
  }, [user, isEditMode]);

  const handleFollow = (friendId: string) => {
    setSuggestions(prev => 
      prev.map(suggestion => 
        suggestion.id === friendId 
          ? { ...suggestion, isFollowing: true }
          : suggestion
      )
    );
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate fetching new suggestions
    setTimeout(() => {
      // Shuffle the suggestions for demo
      const shuffled = [...mockSuggestions].sort(() => Math.random() - 0.5);
      setSuggestions(shuffled);
      setIsLoading(false);
    }, 800);
  };

  const getReasonText = (suggestion: SuggestedFriend) => {
    switch (suggestion.reasonType) {
      case 'mutual_friends':
        return `${suggestion.mutualFriends} mutual friend${suggestion.mutualFriends !== 1 ? 's' : ''}`;
      case 'similar_taste':
        return `${suggestion.commonAlbums} albums in common`;
      case 'location':
        return 'From your area';
      case 'new_user':
        return 'New to the community';
      default:
        return 'Suggested for you';
    }
  };

  // Show preview content in edit mode
  if (isEditMode) {
    return (
      <div className="bg-zinc-900/50 p-6 h-full overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="mb-3 flex-shrink-0">
            <p className="text-sm text-zinc-400 mb-2">Panel Preview</p>
            <h2 className="text-lg font-semibold text-white">
              Friend Discovery
            </h2>
          </div>
          
          <div className="flex-1 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-zinc-700 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-700 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-1/2" />
                    <div className="h-6 bg-zinc-700 rounded animate-pulse w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 p-6 h-full overflow-hidden">
      {user ? (
        <div className="h-full flex flex-col">
          {/* Header with refresh */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-sm font-medium text-white">Discover People</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-6 w-6 p-0 hover:bg-zinc-700"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Suggestions */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-zinc-700 rounded-full animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-700 rounded animate-pulse w-2/3" />
                        <div className="h-3 bg-zinc-700 rounded animate-pulse w-1/2" />
                        <div className="h-6 bg-zinc-700 rounded animate-pulse w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id}
                    className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-zinc-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {suggestion.avatar ? (
                          <img 
                            src={suggestion.avatar} 
                            alt={suggestion.name} 
                            className="w-full h-full rounded-full" 
                          />
                        ) : (
                          <User className="w-6 h-6 text-zinc-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {suggestion.name}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {suggestion.username}
                        </p>
                        {suggestion.bio && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                            {suggestion.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Shared Interests */}
                    <div className="mb-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Music className="w-3 h-3" />
                        <span>Likes: {suggestion.sharedGenres.join(', ')}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {getReasonText(suggestion)}
                      </div>
                    </div>

                    {/* Follow Button */}
                    <div className="flex gap-2">
                      {suggestion.isFollowing ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          className="flex-1 text-emeraled-green border border-emeraled-green/50"
                        >
                          <Heart className="w-3 h-3 mr-1 fill-current" />
                          Following
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleFollow(suggestion.id)}
                          className="flex-1 bg-emeraled-green hover:bg-emeraled-green/90 text-black"
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Follow
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-2">No suggestions available</p>
                <p className="text-xs text-zinc-500">
                  Check back later for new friend recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center">
          <UserPlus className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Discover Friends
          </h3>
          <p className="text-zinc-400 text-sm">
            Sign in to find people with similar music taste
          </p>
        </div>
      )}
    </div>
  );
}
