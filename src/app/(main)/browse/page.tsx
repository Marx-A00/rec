import BackButton from '@/components/ui/BackButton';
import { getRecommendations, getUsers } from '@/lib/api/browse';

import BrowsePageClient from './BrowsePageClient';

export default async function BrowsePage() {
  // Fetch data server-side
  const [users, recommendations] = await Promise.all([
    getUsers(),
    getRecommendations(),
  ]);

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <BackButton className='inline-flex items-center text-cosmic-latte hover:text-emeraled-green transition-colors mb-4' />
          <h1 className='text-4xl font-bold text-cosmic-latte mb-2'>Browse</h1>
          <p className='text-zinc-400'>
            Discover users, their music recommendations, and social activity
          </p>
        </div>

        {/* Client-side content with tabs */}
        <BrowsePageClient
          initialUsers={users}
          initialRecommendations={recommendations}
        />
      </div>
    </div>
  );
}
