import { notFound } from 'next/navigation';
import Image from 'next/image';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import BackButton from '@/components/ui/BackButton';
import FollowersList from '@/components/profile/FollowersList';
import { userProfileParamsSchema } from '@/lib/validations/params';

interface FollowersPageProps {
  params: Promise<{ userId: string }>;
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const session = await auth();
  const rawParams = await params;

  // Validate parameters
  const paramsResult = userProfileParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    console.error('Invalid user profile parameters:', paramsResult.error);
    notFound();
  }

  const { userId } = paramsResult.data;

  // Fetch user data to display in header
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      image: true,
      followersCount: true,
    },
  });

  if (!userData) {
    notFound();
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8 max-w-4xl'>
        {/* Header */}
        <div className='mb-8'>
          <BackButton className='inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4' />

          <div className='flex items-center gap-4 mb-6'>
            <Image
              src={userData.image || '/placeholder.svg'}
              alt={userData.username || 'User'}
              width={64}
              height={64}
              className='w-16 h-16 rounded-full object-cover'
            />
            <div>
              <h1 className='text-3xl font-bold text-cosmic-latte'>
                {userData.username || 'Anonymous music enjoyer'}
              </h1>
              <p className='text-zinc-400'>
                {userData.followersCount || 0}{' '}
                {(userData.followersCount || 0) === 1
                  ? 'Follower'
                  : 'Followers'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className='flex gap-4 border-b border-zinc-800'>
            <a
              href={`/profile/${userId}/followers`}
              className='px-4 py-2 text-emeraled-green border-b-2 border-emeraled-green font-medium'
            >
              Followers
            </a>
            <a
              href={`/profile/${userId}/following`}
              className='px-4 py-2 text-zinc-400 hover:text-white transition-colors'
            >
              Following
            </a>
          </div>
        </div>

        {/* Followers List */}
        <FollowersList
          userId={userId}
          type='followers'
          currentUserId={session?.user?.id}
        />
      </div>
    </div>
  );
}
