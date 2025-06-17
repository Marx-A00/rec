import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import CollageCreator from '@/components/collage/CollageCreator';

export default async function CollagePage() {
  const session = await auth();
  const userData = session?.user;

  if (!userData || !userData.id) {
    redirect('/auth/signin');
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <CollageCreator />
    </div>
  );
}
