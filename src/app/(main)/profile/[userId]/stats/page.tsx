import { auth } from '@/../auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import SocialStatsDashboard from '@/components/profile/SocialStatsDashboard';
import BackButton from '@/components/ui/BackButton';

interface StatsPageProps {
  params: {
    userId: string;
  };
}

export async function generateMetadata({
  params,
}: StatsPageProps): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true },
  });

  return {
    title: user ? `${user.name}'s Statistics - Rec` : 'User Statistics - Rec',
    description: user
      ? `View ${user.name}'s social statistics and engagement metrics`
      : 'User social statistics and engagement metrics',
  };
}

export default async function StatsPage({ params }: StatsPageProps) {
  const session = await auth();
  const { userId } = params;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
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
                <img
                  src={user.image}
                  alt={user.name || ''}
                  className='w-12 h-12 rounded-full object-cover'
                />
              )}
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  {isOwnProfile
                    ? 'Your Statistics'
                    : `${user.name}'s Statistics`}
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
