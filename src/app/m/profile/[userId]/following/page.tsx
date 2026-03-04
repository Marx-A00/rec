import { notFound } from 'next/navigation';

import prisma from '@/lib/prisma';
import { userProfileParamsSchema } from '@/lib/validations/params';
import MobileFollowListClient from '@/components/mobile/profile/MobileFollowListClient';

interface FollowingPageProps {
  params: Promise<{ userId: string }>;
}

export default async function MobileFollowingPage({
  params,
}: FollowingPageProps) {
  const rawParams = await params;

  const paramsResult = userProfileParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    notFound();
  }

  const { userId } = paramsResult.data;

  const userData = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      image: true,
      followingCount: true,
    },
  });

  if (!userData) {
    notFound();
  }

  return (
    <MobileFollowListClient
      userId={userData.id}
      username={userData.username}
      userImage={userData.image}
      count={userData.followingCount}
      type='following'
    />
  );
}
