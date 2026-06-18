'use client';

import Link from 'next/link';

import { Marquee } from '@/components/ui/marquee';
import { AlbumImage } from '@/components/ui/AlbumImage';

export interface MarqueeCover {
  src?: string | null;
  cloudflareImageId?: string | null;
  alt: string;
  href?: string;
}

// Deterministic shuffle so each column gets a distinct, stable order
// (seeded to avoid hydration mismatch / reload flicker)
function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed + 0x6d2b79f5;
  const random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Repeat covers until we have at least `min` so columns stay visually full
function ensureMinimum(covers: MarqueeCover[], min: number): MarqueeCover[] {
  if (covers.length === 0) return covers;
  const out = [...covers];
  while (out.length < min) out.push(...covers);
  return out;
}

interface KeyedCover extends MarqueeCover {
  key: string;
}

// Generate covers for one column, each in its own shuffled order, doubled for
// seamless looping
function generateColumn(
  covers: MarqueeCover[],
  columnId: string,
  seed: number
): KeyedCover[] {
  const padded = ensureMinimum(covers, 30);
  const shuffled = seededShuffle(padded, seed);
  return [...shuffled, ...shuffled].map((cover, idx) => ({
    ...cover,
    key: `${columnId}-${idx}`,
  }));
}

// Keep scroll speed roughly constant regardless of how many covers exist:
// duration scales with the number of rendered items per column.
function columnDuration(itemCount: number, factor: number): number {
  return Math.round(itemCount * factor);
}

interface AlbumCardProps {
  cover: MarqueeCover;
  priority?: boolean;
}

function AlbumCard({ cover, priority = false }: AlbumCardProps) {
  const inner = (
    <div className='relative h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 overflow-hidden rounded-xl shadow-xl transition-all duration-300 group-hover/card:-translate-y-2 group-hover/card:scale-105 group-hover/card:shadow-2xl group-hover/card:ring-2 group-focus-visible/card:ring-2 ring-cosmic-latte/70 border border-zinc-800/50 bg-zinc-900'>
      <AlbumImage
        src={cover.src}
        cloudflareImageId={cover.cloudflareImageId}
        alt={cover.alt}
        fill
        priority={priority}
        showSkeleton={false}
        className='h-full w-full'
        sizes='(max-width: 640px) 128px, (max-width: 768px) 160px, 176px'
      />
      {/* Glossy overlay */}
      <div className='absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-black/30 pointer-events-none' />
    </div>
  );

  if (cover.href) {
    return (
      <Link
        href={cover.href}
        aria-label={cover.alt}
        className='relative group/card block cursor-pointer outline-hidden rounded-xl'
      >
        {inner}
      </Link>
    );
  }

  return <div className='relative group/card'>{inner}</div>;
}

interface HeroMarqueeProps {
  // Server-rendered, DB-backed marquee covers (clickable). Falls back to the
  // static set when empty so the landing page never looks bare.
  covers: MarqueeCover[];
}

export function HeroMarquee({ covers }: HeroMarqueeProps) {
  const columns = [
    {
      covers: generateColumn(covers, 'col1', 101),
      reverse: false,
      factor: 3.7,
    },
    { covers: generateColumn(covers, 'col2', 202), reverse: true, factor: 4.3 },
    {
      covers: generateColumn(covers, 'col3', 303),
      reverse: false,
      factor: 3.5,
    },
    { covers: generateColumn(covers, 'col4', 404), reverse: true, factor: 4.0 },
    {
      covers: generateColumn(covers, 'col5', 505),
      reverse: false,
      factor: 4.2,
    },
    { covers: generateColumn(covers, 'col6', 606), reverse: true, factor: 3.9 },
    {
      covers: generateColumn(covers, 'col7', 707),
      reverse: false,
      factor: 4.5,
    },
    { covers: generateColumn(covers, 'col8', 808), reverse: true, factor: 3.6 },
  ];

  const mobileCovers = generateColumn(covers, 'mobile', 909);

  return (
    <>
      {/* Right side - 3D Tilted Vertical Marquee */}
      <div className='hidden lg:flex flex-1 relative h-[calc(100vh-4rem)] w-full items-center justify-center'>
        {/* Gradient overlays for smooth fade on all edges */}
        <div className='pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-black via-black/80 to-transparent z-10' />
        <div className='pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black via-black/80 to-transparent z-10' />
        <div className='pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-black via-black/80 to-transparent z-10' />
        <div className='pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-linear-to-l from-black via-black/80 to-transparent z-10' />

        {/* Inner container with overflow hidden and perspective */}
        <div className='absolute inset-0 overflow-hidden perspective-distant'>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div
              className='flex flex-row items-center gap-4'
              style={{
                transform:
                  'translateX(50px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
              }}
            >
              {columns.map((column, colIdx) => (
                <Marquee
                  key={colIdx}
                  vertical
                  reverse={column.reverse}
                  pauseOnHover
                  className='h-[150vh] min-h-[900px] [--gap:1rem]'
                  style={
                    {
                      '--duration': `${columnDuration(column.covers.length, column.factor)}s`,
                    } as React.CSSProperties
                  }
                >
                  {column.covers.map((album, idx) => (
                    <AlbumCard
                      key={album.key}
                      cover={album}
                      priority={colIdx === 0 && idx < 2}
                    />
                  ))}
                </Marquee>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile marquee - horizontal at bottom */}
      <div className='lg:hidden absolute bottom-0 left-0 right-0 overflow-hidden pb-4'>
        <div className='relative'>
          <Marquee pauseOnHover className='[--duration:25s] [--gap:0.75rem]'>
            {mobileCovers.slice(0, 12).map((album, idx) => {
              const image = (
                <div className='relative h-24 w-24 overflow-hidden rounded-lg shadow-lg bg-zinc-900'>
                  <AlbumImage
                    src={album.src}
                    cloudflareImageId={album.cloudflareImageId}
                    alt={album.alt}
                    fill
                    priority={idx < 2}
                    showSkeleton={false}
                    className='h-full w-full'
                    sizes='96px'
                  />
                </div>
              );
              return album.href ? (
                <Link
                  key={album.key}
                  href={album.href}
                  aria-label={album.alt}
                  className='active:scale-95 transition-transform'
                >
                  {image}
                </Link>
              ) : (
                <div key={album.key}>{image}</div>
              );
            })}
          </Marquee>
          {/* Gradient overlays for smooth fade */}
          <div className='pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-black' />
          <div className='pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-black' />
        </div>
      </div>
    </>
  );
}
