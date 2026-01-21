// Desktop equivalent: src/app/(main)/settings/page.tsx

import { redirect } from 'next/navigation';

import { auth } from '@/../auth';

import MobileSettingsClient from './MobileSettingsClient';

export default async function MobileSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/m/auth/signin');
  }

  return <MobileSettingsClient userId={session.user.id} />;
}
