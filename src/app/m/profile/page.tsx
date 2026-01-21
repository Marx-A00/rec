import { redirect } from 'next/navigation';

import { auth } from '@/../auth';

export default async function MobileProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/m/auth/signin');
  }

  redirect(`/m/profile/${session.user.id}`);
}
