'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameTestRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/game/test');
  }, [router]);
  return (
    <div className='flex items-center justify-center h-full text-zinc-400'>
      Redirecting to game test...
    </div>
  );
}
