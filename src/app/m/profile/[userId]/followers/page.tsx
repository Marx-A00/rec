import { notFound } from 'next/navigation';

import prisma from '@/lib/prisma';
import { userProfileParamsSchema } from '@/lib/validations/params';
import MobileFollowListClient from '@/components/mobile/profile/MobileFollowListClient';

interface FollowersPageProps {
  params: Promise<{ userId: string }>;
}

export default async function MobileFollowersPage({
  params,
}: FollowersPageProps) {
  const rawParams = await params;

  const paramsResult = userProfileParamsSchema.safeParse(rawParams);
  if (!paramsResult.success) {
    notFound();
  }

  const { userId } = paramsResult.data;

  const userData = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
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
    <MobileFollowListClient
      userId={userData.id}
      username={userData.username}
      userImage={userData.image}
      count={userData.followersCount}
      type='followers'
    />
  );
}
