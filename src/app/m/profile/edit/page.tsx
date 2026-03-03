import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

import MobileEditProfileClient from './MobileEditProfileClient';

export default async function MobileEditProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/m/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  if (!user) {
    redirect('/m/auth/signin');
  }

  return <MobileEditProfileClient user={user} />;
}
