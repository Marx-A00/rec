'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Share2,
  User,
  ExternalLink,
  Calendar,
  MapPin,
} from 'lucide-react';

import AlbumImage from '@/components/ui/AlbumImage';
import MobileDiscography from '@/components/mobile/MobileDiscography';
import { CollapsibleBio } from '@/components/artistDetails/CollapsibleBio';
import { sanitizeArtistName } from '@/lib/utils';

interface ArtistDetails {
  id: string;
  name: string;
  imageUrl?: string;
  realName?: string;
  profile?: string;
  country?: string;
  disambiguation?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  urls?: string[];
  aliases?: Array<{ name: string }>;
  source: 'local' | 'musicbrainz' | 'discogs';
  musicbrainzId?: string;
}

interface MobileArtistClientProps {
  artist: ArtistDetails;
}

export default function MobileArtistClient({
  artist,
}: MobileArtistClientProps) {
  const router = useRouter();

  // Handle share
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: sanitizeArtistName(artist.name),
          text: `Check out ${sanitizeArtistName(artist.name)} on Rec`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled or share failed
    }
  };

  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-2 text-white min-h-[44px] min-w-[44px]'
            aria-label='Go back'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <h1 className='text-lg font-semibold text-white truncate max-w-[200px]'>
            {sanitizeArtistName(artist.name)}
          </h1>
          <button
            onClick={handleShare}
            className='min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400'
            aria-label='Share artist'
          >
            <Share2 className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Artist Hero - Circular Photo */}
      <section className='px-4 py-6 flex flex-col items-center'>
        <div className='w-[120px] h-[120px] rounded-full overflow-hidden mb-4 border-2 border-zinc-800'>
          <AlbumImage
            src={artist.imageUrl}
            alt={sanitizeArtistName(artist.name)}
            width={120}
            height={120}
            className='w-full h-full object-cover'
            priority
            fallbackIcon={<User className='h-12 w-12 text-zinc-600' />}
          />
        </div>

        <h2 className='text-2xl font-bold text-white text-center'>
          {sanitizeArtistName(artist.name)}
        </h2>

        {artist.disambiguation && (
          <p className='text-sm text-zinc-500 mt-1'>{artist.disambiguation}</p>
        )}

        {/* Meta info row */}
        <div className='flex items-center gap-4 mt-3 text-sm text-zinc-400'>
          {artist.country && (
            <span className='flex items-center gap-1'>
              <MapPin className='h-3.5 w-3.5' />
              {artist.country}
            </span>
          )}
          {artist.lifeSpan?.begin && (
            <span className='flex items-center gap-1'>
              <Calendar className='h-3.5 w-3.5' />
              {artist.lifeSpan.begin}
              {artist.lifeSpan.ended
                ? ` - ${artist.lifeSpan.end || '?'}`
                : ' - Present'}
            </span>
          )}
        </div>

        {/* External Link */}
        {artist.urls && artist.urls.length > 0 && (
          <a
            href={artist.urls[0]}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-1 mt-3 text-sm text-emeraled-green'
          >
            <ExternalLink className='h-3.5 w-3.5' />
            Official Website
          </a>
        )}
      </section>

      {/* Collapsible Bio Section */}
      {artist.profile && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Biography</h3>
          <div className='bg-zinc-900 rounded-lg p-4 border border-zinc-800'>
            <CollapsibleBio content={artist.profile} collapsedLines={2} />
          </div>
        </section>
      )}

      {/* Aliases Section */}
      {artist.aliases && artist.aliases.length > 0 && (
        <section className='px-4 mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>
            Also Known As
          </h3>
          <div className='flex flex-wrap gap-2'>
            {artist.aliases.map((alias, index) => (
              <span
                key={index}
                className='bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full text-sm'
              >
                {sanitizeArtistName(alias.name)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Discography Section */}
      <section className='px-4 mb-6'>
        <h3 className='text-lg font-semibold text-white mb-3'>Discography</h3>
        <MobileDiscography
          artistId={artist.id}
          artistName={sanitizeArtistName(artist.name)}
          source={artist.source}
        />
      </section>
    </div>
  );
}
