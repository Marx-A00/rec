'use client';

import Link from 'next/link';

import RecommendationModal from '@/components/recommendations/RecommendationModal';
import RecommendationsList from '@/components/recommendations/RecommendationsList';
import { useRecommendationModal } from '@/hooks/useRecommendationModal';

export default function HomeContent() {
  const { isOpen, isExiting, openModal, closeModal } = useRecommendationModal();

  return (
    <>
      {/* Main Navigation */}
      <div className='flex items-center justify-center py-8'>
        <div className='flex flex-row space-x-4'>
          <button className='text-black bg-cosmic-latte hover:bg-emeraled-green font-bold py-4 px-8 rounded-full text-lg shadow-lg'>
            Discover
          </button>
          <button
            onClick={openModal}
            className='text-black bg-cosmic-latte hover:bg-emeraled-green font-bold py-4 px-8 rounded-full text-lg shadow-lg'
          >
            Recommend
          </button>
          <Link
            href='/browse'
            className='text-black bg-cosmic-latte hover:bg-emeraled-green font-bold py-4 px-8 rounded-full text-lg shadow-lg'
          >
            Browse
          </Link>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className='flex-1 px-4 pb-8'>
        <div className='max-w-6xl mx-auto'>
          <RecommendationsList />
        </div>
      </div>

      {/* Recommendation Modal */}
      <RecommendationModal
        isOpen={isOpen}
        onClose={closeModal}
        isExiting={isExiting}
      />
    </>
  );
}
