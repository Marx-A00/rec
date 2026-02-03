'use client';

import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ExternalIdStatusProps {
  /** MusicBrainz release ID */
  musicbrainzId: string | null;
  /** Spotify album ID */
  spotifyId: string | null;
  /** Discogs release ID */
  discogsId: string | null;
}

interface IdConfig {
  name: string;
  id: string | null;
  getUrl: (id: string) => string;
  truncateLength: number;
}

function truncateId(id: string, length: number): string {
  if (id.length <= length) return id;
  return id.slice(0, length) + '...';
}

/**
 * Displays the status of external IDs (MusicBrainz, Spotify, Discogs).
 *
 * Present IDs show as clickable links with green checkmark.
 * Missing IDs show with muted X icon.
 */
export function ExternalIdStatus({
  musicbrainzId,
  spotifyId,
  discogsId,
}: ExternalIdStatusProps) {
  const idConfigs: IdConfig[] = [
    {
      name: 'MusicBrainz',
      id: musicbrainzId,
      getUrl: id => 'https://musicbrainz.org/release/' + id,
      truncateLength: 8,
    },
    {
      name: 'Spotify',
      id: spotifyId,
      getUrl: id => 'https://open.spotify.com/album/' + id,
      truncateLength: 12,
    },
    {
      name: 'Discogs',
      id: discogsId,
      getUrl: id => 'https://www.discogs.com/release/' + id,
      truncateLength: 12,
    },
  ];

  return (
    <TooltipProvider>
      <div className='flex flex-wrap gap-3'>
        {idConfigs.map(({ name, id, getUrl, truncateLength }) => (
          <div key={name} className='flex items-center gap-1.5'>
            {id ? (
              <>
                <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={getUrl(id)}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={cn(
                        'text-sm hover:underline flex items-center gap-1',
                        'text-zinc-300 hover:text-emerald-400'
                      )}
                    >
                      {name}: {truncateId(id, truncateLength)}
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{id}</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <XCircle className='h-4 w-4 text-zinc-600' />
                <span className='text-sm text-zinc-500'>{name}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
