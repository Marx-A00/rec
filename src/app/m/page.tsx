import { redirect } from 'next/navigation';

import { auth } from '@/../auth';

import MobileHomeClient from './MobileHomeClient';

export default async function MobileHomePage() {
  const session = await auth();

  if (!session) {
    redirect('/m/auth/signin?callbackUrl=%2Fm');
  }

  return <MobileHomeClient session={session} />;
}
