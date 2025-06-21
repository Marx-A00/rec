import AlbumImage from '@/components/ui/AlbumImage';
import { Recommendation } from '@/types/recommendation';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export default function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  return (
    <div className='bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center space-x-2'>
          {recommendation.user?.image && (
            <AlbumImage
              src={recommendation.user.image}
              alt={recommendation.user.name || 'User'}
              width={32}
              height={32}
              className='rounded-full'
            />
          )}
          <span className='text-sm text-gray-600'>
            {recommendation.user?.name || 'Anonymous'}
          </span>
        </div>
        <div className='flex items-center space-x-1'>
          <span className='text-lg font-bold text-yellow-500'>
            {recommendation.score}
          </span>
          <span className='text-sm text-gray-500'>/10</span>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        {/* Basis Album */}
        <div className='text-center'>
          <h3 className='text-sm font-medium text-gray-500 mb-2'>
            If you like
          </h3>
          <div className='relative w-full aspect-square mb-2'>
            <AlbumImage
              src={recommendation.basisAlbumImageUrl}
              alt={`${recommendation.basisAlbumTitle} by ${recommendation.basisAlbumArtist}`}
              width={200}
              height={200}
              sizes='(max-width: 768px) 50vw, 200px'
              className='w-full h-full object-cover rounded'
            />
          </div>
          <div className='space-y-1'>
            <p className='font-semibold text-sm'>
              {recommendation.basisAlbumTitle}
            </p>
            <p className='text-gray-600 text-xs'>
              {recommendation.basisAlbumArtist}
            </p>
            {recommendation.basisAlbumYear && (
              <p className='text-gray-500 text-xs'>
                {recommendation.basisAlbumYear}
              </p>
            )}
          </div>
        </div>

        {/* Recommended Album */}
        <div className='text-center'>
          <h3 className='text-sm font-medium text-gray-500 mb-2'>
            You might like
          </h3>
          <div className='relative w-full aspect-square mb-2'>
            <AlbumImage
              src={recommendation.recommendedAlbumImageUrl}
              alt={`${recommendation.recommendedAlbumTitle} by ${recommendation.recommendedAlbumArtist}`}
              width={200}
              height={200}
              sizes='(max-width: 768px) 50vw, 200px'
              className='w-full h-full object-cover rounded'
            />
          </div>
          <div className='space-y-1'>
            <p className='font-semibold text-sm'>
              {recommendation.recommendedAlbumTitle}
            </p>
            <p className='text-gray-600 text-xs'>
              {recommendation.recommendedAlbumArtist}
            </p>
            {recommendation.recommendedAlbumYear && (
              <p className='text-gray-500 text-xs'>
                {recommendation.recommendedAlbumYear}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className='mt-4 text-xs text-gray-400 text-center'>
        {new Date(recommendation.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
