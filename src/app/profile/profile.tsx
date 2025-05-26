'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  name: string;
  email: string | null;
  image: string;
  username: string;
  bio: string;
  followers: number;
  following: number;
}

interface ProfileClientProps {
  user: User;
}

export default function ProfileClient({ user }: ProfileClientProps) {
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
                  <strong className="text-cosmic-latte">{user.followers}</strong> Followers
                </span>
                <span className="text-zinc-300">
                  <strong className="text-cosmic-latte">{user.following}</strong> Following
                </span>
              </div>
            </div>
          </div>
          
          {/* Collection Section */}
          <section className="border-t border-zinc-800 pt-8">
            <h2 className="text-2xl font-semibold mb-6 text-cosmic-latte">Music Collection</h2>
            <div className="text-center py-12">
              <p className="text-zinc-400 mb-4">This user's collection will be displayed here.</p>
              <p className="text-sm text-zinc-500">Feature coming soon!</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}