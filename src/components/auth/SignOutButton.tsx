'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <button
      onClick={handleSignOut}
      className='w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 px-3 rounded-md font-normal'
    >
      Sign Out
    </button>
  );
}
