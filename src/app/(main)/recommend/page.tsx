'use client';

import Link from 'next/link';
import { useState } from 'react';

import AlbumCard from '@/components/recommendations/AlbumCard';
import AlbumSearch from '@/components/recommendations/AlbumSearch';
import CreateRecommendationForm from '@/components/recommendations/CreateRecommendationForm';
import { Album } from '@/types/album';

export default function CreateRecommendationPage() {
  const [selectedBasisAlbum, setSelectedBasisAlbum] = useState<Album | null>(
    null
  );
  const [selectedRecommendedAlbum, setSelectedRecommendedAlbum] =
    useState<Album | null>(null);
  const [isSearchingForBasis, setIsSearchingForBasis] = useState<boolean>(true);

  const handleAlbumSelect = (album: Album) => {
    if (isSearchingForBasis) {
      setSelectedBasisAlbum(album);
    } else {
      setSelectedRecommendedAlbum(album);
    }
  };

  const switchAlbumType = (isBasis: boolean) => {
    setIsSearchingForBasis(isBasis);
  };

  const handleSuccess = () => {
    // Reset form after successful creation
    setSelectedBasisAlbum(null);
    setSelectedRecommendedAlbum(null);
    setIsSearchingForBasis(true);
    console.log('Recommendation created successfully!');
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen p-4 bg-black'>
      <div className='flex flex-col gap-4 items-center max-w-4xl w-full'>
        <Link
          href='/home-mosaic'
          className='text-white bg-red-500 hover:bg-red-700 font-bold mb-10 py-4 px-8 rounded-full text-lg shadow-lg'
        >
          home
        </Link>
        <h1 className='text-4xl font-bold text-center pb-6 text-cosmic-latte'>
          Create Recommendation
        </h1>

        <div className='w-full space-y-6'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-white'>
                Search for {isSearchingForBasis ? 'Basis' : 'Recommended'} Album
              </h2>
            </div>

            <AlbumSearch
              onAlbumSelect={handleAlbumSelect}
              placeholder='Search for an album by title or artist'
              disabled={false}
            />
          </div>

          <div className='flex flex-col md:flex-row gap-6 justify-center'>
            <AlbumCard
              album={selectedBasisAlbum}
              title='Basis Album'
              isActive={isSearchingForBasis}
              onClick={() => switchAlbumType(true)}
              placeholder={
                isSearchingForBasis
                  ? 'Search for an album above'
                  : 'Click to search for a basis album'
              }
            />

            <AlbumCard
              album={selectedRecommendedAlbum}
              title='Recommended Album'
              isActive={!isSearchingForBasis}
              onClick={() => switchAlbumType(false)}
              placeholder={
                !isSearchingForBasis
                  ? 'Search for an album above'
                  : 'Click to search for a recommended album'
              }
            />
          </div>

          <CreateRecommendationForm
            basisAlbum={selectedBasisAlbum}
            recommendedAlbum={selectedRecommendedAlbum}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
