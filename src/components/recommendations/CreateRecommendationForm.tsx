import { useState } from 'react';

import { CreateRecommendationRequest } from '@/types/recommendation';
import { Album } from '@/types/album';
import { useCreateRecommendationMutation, getErrorMessage } from '@/hooks';
import { sanitizeArtistName } from '@/lib/utils';

// Helper function to format artists naturally with sanitization
function formatArtists(artists: Array<{ name: string }> | undefined): string {
  if (!artists || artists.length === 0) return 'Unknown Artist';
  return artists.map(artist => artist.name).join(', ');
}

/**
 * Extract the best ID for album navigation - prefers master ID over release ID
 */
function extractBestAlbumId(album: Album): string {
  // Check if the album has Discogs metadata stored
  const discogsData = (album as any)._discogs;

  if (discogsData) {
    const uri = discogsData.uri || discogsData.resource_url || '';

    // If this is a release, try to get the master ID
    if (uri.includes('/releases/')) {
      // If we have access to master_id from the original data, use that
      const masterIdFromData = (album as any).master_id;
      if (masterIdFromData) {
        return masterIdFromData.toString();
      }
    }

    // If this is already a master or we don't have master_id, use the current ID
    if (uri.includes('/masters/')) {
      const masterId = uri.match(/\/masters\/(\d+)/)?.[1];
      if (masterId) {
        return masterId;
      }
    }
  }

  // Fallback to the regular ID
  return album.id;
}

interface SimilarityRatingDialProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function SimilarityRatingDial({
  value,
  onChange,
  disabled = false,
}: SimilarityRatingDialProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate rotation angle (0-270 degrees for values 1-10)
  const rotation = ((value - 1) / 9) * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let degrees = (angle * 180) / Math.PI + 90;
    if (degrees < 0) degrees += 360;

    // Map angle to value (0-270 degrees = 1-10)
    const clampedDegrees = Math.max(0, Math.min(270, degrees));
    const newValue = Math.round((clampedDegrees / 270) * 9) + 1;

    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className='flex flex-col items-center space-y-4'>
      {/* Dial Label */}
      <div className='text-center'>
        <div className='text-sm font-bold text-zinc-300 mb-1'>
          SIMILARITY RATING
        </div>
        <div className='text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
          {value}/10
        </div>
      </div>

      {/* Main Dial Container */}
      <div className='relative'>
        {/* Outer Ring with LED Indicators */}
        <div className='relative w-32 h-32 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-4 border-zinc-600 shadow-2xl'>
          {/* LED Ring */}
          {Array.from({ length: 10 }, (_, i) => {
            const ledAngle = (i * 270) / 9 - 135; // Start from -135 degrees
            const isActive = i + 1 <= value;
            const ledX = 50 + 42 * Math.cos((ledAngle * Math.PI) / 180);
            const ledY = 50 + 42 * Math.sin((ledAngle * Math.PI) / 180);

            return (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? value <= 3
                      ? 'bg-red-500 shadow-red-500/50'
                      : value <= 6
                        ? 'bg-yellow-500 shadow-yellow-500/50'
                        : 'bg-green-500 shadow-green-500/50'
                    : 'bg-zinc-800'
                } shadow-lg`}
                style={{
                  left: `${ledX}%`,
                  top: `${ledY}%`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: isActive ? '0 0 8px currentColor' : 'none',
                }}
              />
            );
          })}

          {/* Inner Knob */}
          <div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full cursor-pointer transition-all duration-200 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            style={{
              background:
                'conic-gradient(from 0deg, #71717a, #a1a1aa, #d4d4d8, #a1a1aa, #71717a)',
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              boxShadow: isDragging
                ? '0 0 20px rgba(59, 130, 246, 0.5), inset 0 2px 4px rgba(0,0,0,0.3)'
                : '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.2)',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Knob Indicator Line */}
            <div
              className='absolute w-1 h-6 bg-white rounded-full shadow-lg'
              style={{
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            />

            {/* Center Dot */}
            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-900 rounded-full border border-zinc-700 shadow-inner' />
          </div>
        </div>

        {/* Scale Labels */}
        <div className='absolute inset-0 pointer-events-none'>
          {[1, 5, 10].map((num, index) => {
            const labelAngle = index === 0 ? -135 : index === 1 ? 0 : 135;
            const labelX = 50 + 55 * Math.cos((labelAngle * Math.PI) / 180);
            const labelY = 50 + 55 * Math.sin((labelAngle * Math.PI) / 180);

            return (
              <div
                key={num}
                className='absolute text-xs font-bold text-zinc-400'
                style={{
                  left: `${labelX}%`,
                  top: `${labelY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Text */}
      <div className='text-center'>
        <div
          className={`text-xs font-medium ${
            value <= 3
              ? 'text-red-400'
              : value <= 6
                ? 'text-yellow-400'
                : 'text-green-400'
          }`}
        >
          {value <= 3
            ? 'DIFFERENT VIBE'
            : value <= 6
              ? 'SIMILAR ENERGY'
              : 'PERFECT MATCH'}
        </div>
      </div>
    </div>
  );
}

interface CreateRecommendationFormProps {
  basisAlbum: Album | null;
  recommendedAlbum: Album | null;
  score?: number;
  onSuccess?: () => void;
}

export default function CreateRecommendationForm({
  basisAlbum,
  recommendedAlbum,
  score: externalScore,
  onSuccess,
}: CreateRecommendationFormProps) {
  const [score, setScore] = useState(7);
  const finalScore = externalScore ?? score;

  const createMutation = useCreateRecommendationMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!basisAlbum || !recommendedAlbum) {
      return;
    }

    const request: CreateRecommendationRequest = {
      basisAlbumDiscogsId: extractBestAlbumId(basisAlbum),
      recommendedAlbumDiscogsId: extractBestAlbumId(recommendedAlbum),
      score: finalScore,
      basisAlbumTitle: basisAlbum.title,
      basisAlbumArtist: formatArtists(basisAlbum.artists),
      basisAlbumImageUrl: basisAlbum.image.url,
      basisAlbumYear: basisAlbum.year?.toString() ?? null,
      recommendedAlbumTitle: recommendedAlbum.title,
      recommendedAlbumArtist: formatArtists(recommendedAlbum.artists),
      recommendedAlbumImageUrl: recommendedAlbum.image.url,
      recommendedAlbumYear: recommendedAlbum.year?.toString() ?? null,
      // Extract artist IDs from the first artist in the array
      basisAlbumArtistDiscogsId: basisAlbum.artists?.[0]?.id || null,
      recommendedAlbumArtistDiscogsId:
        recommendedAlbum.artists?.[0]?.id || null,
    };

    createMutation.mutate(request);
  };

  const isDisabled =
    !basisAlbum || !recommendedAlbum || createMutation.isPending;

  return (
    <div className='relative'>
      {createMutation.isError && (
        <div className='bg-red-950 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4'>
          {getErrorMessage(createMutation.error)}
        </div>
      )}

      {/* DJ-Style Similarity Rating Dial - only show if no external score */}
      {externalScore === undefined && (
        <div className='flex justify-center'>
          <SimilarityRatingDial
            value={score}
            onChange={setScore}
            disabled={isDisabled}
          />
        </div>
      )}

      {/* Circular Play Button - Bottom Right */}
      <button
        id='submit-recommendation-button'
        type='submit'
        onClick={handleSubmit}
        className={`
          absolute -bottom-6 right-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
          ${
            isDisabled
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed opacity-50'
              : 'bg-green-600 hover:bg-green-500 text-white hover:scale-110 active:scale-95 shadow-lg hover:shadow-green-500/25'
          }
        `}
        disabled={isDisabled}
        title={
          createMutation.isPending ? 'Creating...' : 'Create Recommendation'
        }
      >
        {createMutation.isPending ? (
          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
        ) : (
          <svg
            className='w-5 h-5 ml-0.5'
            fill='currentColor'
            viewBox='0 0 24 24'
          >
            <path d='M8 5v14l11-7z' />
          </svg>
        )}
      </button>
    </div>
  );
}
