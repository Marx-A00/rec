'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { isAdmin } from '@/lib/permissions';

import UncoverVisionClient from './UncoverVisionClient';

export default function UncoverVisionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || !isAdmin(session.user.role)) {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-zinc-400'>Loading...</div>
      </div>
    );
  }

  if (!session?.user || !isAdmin(session.user.role)) {
    return null;
  }

  return <UncoverVisionClient />;
}
