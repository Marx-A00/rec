'use client';

import Link from 'next/link';

import RecommendationModal from '@/components/recommendations/RecommendationModal';
import { useRecommendationModal } from '@/hooks/useRecommendationModal';

export default function NavigationButtons() {
  const { isOpen, isExiting, openModal, closeModal } = useRecommendationModal();

  return (
    <>
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

      <RecommendationModal
        isOpen={isOpen}
        onClose={closeModal}
        isExiting={isExiting}
      />
    </>
  );
}
