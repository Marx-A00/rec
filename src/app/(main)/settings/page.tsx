import { redirect } from 'next/navigation';
import { Metadata } from 'next';

import { auth } from '@/../auth';
import prisma from '@/lib/prisma';
import BackButton from '@/components/ui/BackButton';

import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings - Rec',
  description: 'Manage your account settings and preferences',
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/signin');
  }

  // Get user data with preferences
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      followersCount: true,
      followingCount: true,
      recommendationsCount: true,
    },
  });

  if (!user) {
    redirect('/signin');
  }

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <BackButton />
        <div>
          <h1 className='text-3xl font-bold text-white'>Settings</h1>
          <p className='text-zinc-400 mt-2'>
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Settings Content */}
      <SettingsClient user={user} />
    </div>
  );
}
