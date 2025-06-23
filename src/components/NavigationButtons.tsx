'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import RecommendationModal from '@/components/recommendations/RecommendationModal';
import { useNavigation } from '@/hooks/useNavigation';
import { useRecommendationModal } from '@/hooks/useRecommendationModal';

export default function NavigationButtons() {
  const { isOpen, isExiting, openModal, closeModal } = useRecommendationModal();
  const { prefetchRoute } = useNavigation();

  // Strategic prefetching of likely navigation targets
  useEffect(() => {
    // Prefetch common pages that users might visit from the home page
    prefetchRoute('/browse');
    prefetchRoute('/recommend');
  }, [prefetchRoute]);

  return (
    <>
      <div className='flex items-center justify-center py-8'>
        <div className='flex flex-row space-x-4'>
          <button
            onClick={openModal}
            className='text-black bg-cosmic-latte hover:bg-emeraled-green font-bold py-4 px-8 rounded-full text-lg shadow-lg transition-colors'
          >
            Recommend
          </button>
          <Link
            href='/browse'
            className='text-black bg-cosmic-latte hover:bg-emeraled-green font-bold py-4 px-8 rounded-full text-lg shadow-lg transition-colors'
          >
            Browse
          </Link>
        </div>
      </div>

      <RecommendationModal
        isOpen={isOpen}
        onClose={closeModal}
        isExiting={isExiting}
      />
    </>
  );
}
