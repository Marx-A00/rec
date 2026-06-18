import { redirect } from 'next/navigation';

import { auth } from '@/../auth';
import CreateCollectionForm from '@/components/collections/CreateCollectionForm';

export default async function NewCollectionPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-white'>Create Collection</h1>
        <p className='text-zinc-400 mt-2'>
          Organize your favorite albums into a personal collection
        </p>
      </div>

      {/* Form */}
      <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
        <CreateCollectionForm />
      </div>
    </div>
  );
}
