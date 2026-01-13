import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import SocialStatsDashboard from '@/components/profile/SocialStatsDashboard';
import BackButton from '@/components/ui/BackButton';

interface StatsPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export async function generateMetadata({
  params,
}: StatsPageProps): Promise<Metadata> {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  return {
    title: user
      ? `${user.username}'s Statistics - Rec`
      : 'User Statistics - Rec',
    description: user
      ? `View ${user.username}'s social statistics and engagement metrics`
      : 'User social statistics and engagement metrics',
  };
}

export default async function StatsPage({ params }: StatsPageProps) {
  const session = await auth();
  const { userId } = await params;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      image: true,
      followersCount: true,
      followingCount: true,
      recommendationsCount: true,
    },
  });

  if (!user) {
    redirect('/browse');
  }

  const isOwnProfile = session?.user?.id === userId;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center space-x-4 mb-4'>
            <BackButton />
            <div className='flex items-center space-x-3'>
              {user.image && (
                <Image
                  src={user.image}
                  alt={user.username || ''}
                  width={48}
                  height={48}
                  className='w-12 h-12 rounded-full object-cover'
                />
              )}
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  {isOwnProfile
                    ? 'Your Statistics'
                    : `${user.username}'s Statistics`}
                </h1>
                <div className='flex items-center space-x-4 text-sm text-gray-600'>
                  <span>{user.followersCount} followers</span>
                  <span>•</span>
                  <span>{user.followingCount} following</span>
                  <span>•</span>
                  <span>{user.recommendationsCount} recommendations</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <SocialStatsDashboard userId={userId} isOwnProfile={isOwnProfile} />
      </div>
    </div>
  );
}
