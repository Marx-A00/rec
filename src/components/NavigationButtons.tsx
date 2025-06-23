'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Heart, Search } from 'lucide-react';

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
        <div className='flex flex-row space-x-6'>
          {/* Recommend Button with Tooltip */}
          <button
            onClick={openModal}
            className='group relative h-12 w-12 flex items-center justify-center rounded-full bg-cosmic-latte hover:bg-emeraled-green transition-colors duration-200 shadow-lg'
            aria-label='Create recommendation'
            aria-describedby='recommend-tooltip'
          >
            <Heart className='w-6 h-6 text-black transition-transform duration-200 group-hover:scale-110' />
            <span
              id='recommend-tooltip'
              className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
              role='tooltip'
            >
              Create Recommendation
              <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800'></div>
            </span>
          </button>

          {/* Browse Button with Tooltip */}
          <Link href='/browse'>
            <button
              className='group relative h-12 w-12 flex items-center justify-center rounded-full bg-cosmic-latte hover:bg-emeraled-green transition-colors duration-200 shadow-lg'
              aria-label='Browse music and users'
              aria-describedby='browse-tooltip'
            >
              <Search className='w-6 h-6 text-black transition-transform duration-200 group-hover:scale-110' />
              <span
                id='browse-tooltip'
                className='absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-zinc-800 text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-opacity duration-200 pointer-events-none z-50'
                role='tooltip'
              >
                Browse & Discover
                <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800'></div>
              </span>
            </button>
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
