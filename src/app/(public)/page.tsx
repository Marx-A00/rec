// src/app/(public)/page.tsx
import Link from 'next/link';
import Image from 'next/image';

import { Marquee } from '@/components/ui/marquee';
import { Button } from '@/components/ui/button';
import { RecentRecs } from '@/components/landing/RecentRecs';

// Album cover data for the marquee
const albumCovers = [
  {
    src: '/landing/Charli_XCX_-_Brat_(album_cover).png',
    alt: 'Charli XCX - Brat',
  },
  {
    src: '/demo-albums/discovery-daft-punk.jpg',
    alt: 'Daft Punk - Discovery',
  },
  {
    src: '/demo-albums/RAM-daft-punk.jpeg',
    alt: 'Daft Punk - Random Access Memories',
  },
  {
    src: '/landing/reflections-hannah-diamond.webp',
    alt: 'Hannah Diamond - Reflections',
  },
];

// Generate covers with unique keys for each column
const generateCovers = (columnId: string) => {
  return [...albumCovers, ...albumCovers].map((cover, idx) => ({
    ...cover,
    key: `${columnId}-${idx}`,
  }));
};

interface AlbumCardProps {
  src: string;
  alt: string;
  priority?: boolean;
}

function AlbumCard({ src, alt, priority = false }: AlbumCardProps) {
  return (
    <div className='relative group'>
      <div className='relative h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 overflow-hidden rounded-xl shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl border border-zinc-800/50'>
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          priority={priority}
          className='object-cover'
          sizes='(max-width: 640px) 128px, (max-width: 768px) 160px, 176px'
        />
        {/* Glossy overlay */}
        <div className='absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30 pointer-events-none' />
      </div>
    </div>
  );
}

function HeroSection() {
  const column1 = generateCovers('col1');
  const column2 = generateCovers('col2');
  const column3 = generateCovers('col3');
  const column4 = generateCovers('col4');
  const column5 = generateCovers('col5');
  const mobileCovers = generateCovers('mobile');

  return (
    <section className='relative min-h-[calc(100vh-4rem)] overflow-hidden bg-black'>
      {/* Subtle gradient overlay */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cosmic-latte/5 via-transparent to-transparent pointer-events-none' />

      {/* Main content */}
      <div className='relative z-10 flex min-h-[calc(100vh-4rem)]'>
        {/* Left side - Hero content */}
        <div className='flex flex-1 flex-col justify-center px-6 sm:px-12 lg:px-20 py-12'>
          <div className='max-w-xl'>
            {/* Logo/Brand */}
            <div className='mb-8'>
              <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-cosmic-latte'>
                rec
              </h1>
            </div>

            {/* Tagline */}
            <h2 className='text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4'>
              Discover music that moves you
            </h2>

            <p className='text-lg sm:text-xl text-zinc-400 mb-8 leading-relaxed'>
              Get personalized album recommendations from people with great
              taste. Build your collection. Share your discoveries.
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-col sm:flex-row gap-4'>
              <Button
                asChild
                variant='primary'
                size='lg'
                className='px-8 py-6 text-lg rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl'
              >
                <Link href='/register'>Get Started</Link>
              </Button>
              <Button
                asChild
                variant='outline'
                size='lg'
                className='px-8 py-6 text-lg rounded-xl transition-all duration-300'
              >
                <Link href='/signin'>Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Right side - 3D Tilted Vertical Marquee */}
        <div className='hidden lg:flex flex-1 relative h-[calc(100vh-4rem)] w-full items-center justify-center'>
          {/* Gradient overlays for smooth fade on all edges - OUTSIDE the overflow container */}
          <div className='pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black via-black/80 to-transparent z-10' />
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10' />
          <div className='pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black via-black/80 to-transparent z-10' />
          <div className='pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black via-black/80 to-transparent z-10' />

          {/* Inner container with overflow hidden and perspective */}
          <div className='absolute inset-0 overflow-hidden [perspective:1200px]'>
            {/* 3D tilted container - pushed inward to avoid edge clipping */}
            <div className='absolute inset-0 flex items-center justify-center'>
              <div
                className='flex flex-row items-center gap-4'
                style={{
                  transform:
                    'translateX(50px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
                }}
              >
                {/* Column 1 */}
                <Marquee
                  vertical
                  pauseOnHover
                  className='h-[700px] [--duration:30s] [--gap:1rem]'
                >
                  {column1.map((album, idx) => (
                    <AlbumCard
                      key={album.key}
                      src={album.src}
                      alt={album.alt}
                      priority={idx < 2}
                    />
                  ))}
                </Marquee>

                {/* Column 2 - reverse */}
                <Marquee
                  vertical
                  reverse
                  pauseOnHover
                  className='h-[700px] [--duration:35s] [--gap:1rem]'
                >
                  {column2.map(album => (
                    <AlbumCard
                      key={album.key}
                      src={album.src}
                      alt={album.alt}
                    />
                  ))}
                </Marquee>

                {/* Column 3 */}
                <Marquee
                  vertical
                  pauseOnHover
                  className='h-[700px] [--duration:28s] [--gap:1rem]'
                >
                  {column3.map(album => (
                    <AlbumCard
                      key={album.key}
                      src={album.src}
                      alt={album.alt}
                    />
                  ))}
                </Marquee>

                {/* Column 4 - reverse */}
                <Marquee
                  vertical
                  reverse
                  pauseOnHover
                  className='h-[700px] [--duration:32s] [--gap:1rem]'
                >
                  {column4.map(album => (
                    <AlbumCard
                      key={album.key}
                      src={album.src}
                      alt={album.alt}
                    />
                  ))}
                </Marquee>

                {/* Column 5 */}
                <Marquee
                  vertical
                  pauseOnHover
                  className='h-[700px] [--duration:34s] [--gap:1rem]'
                >
                  {column5.map(album => (
                    <AlbumCard
                      key={album.key}
                      src={album.src}
                      alt={album.alt}
                    />
                  ))}
                </Marquee>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile marquee - horizontal at bottom */}
      <div className='lg:hidden absolute bottom-0 left-0 right-0 overflow-hidden pb-4'>
        <div className='relative'>
          <Marquee pauseOnHover className='[--duration:25s] [--gap:0.75rem]'>
            {mobileCovers.slice(0, 8).map((album, idx) => (
              <div
                key={album.key}
                className='relative h-24 w-24 overflow-hidden rounded-lg shadow-lg'
              >
                <Image
                  src={album.src}
                  alt={album.alt}
                  fill
                  unoptimized
                  priority={idx < 2}
                  className='object-cover'
                  sizes='96px'
                />
              </div>
            ))}
          </Marquee>
          {/* Gradient overlays for smooth fade */}
          <div className='pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black' />
          <div className='pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black' />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='bg-black border-t border-zinc-800/50'>
      <div className='max-w-6xl mx-auto px-6 py-12'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-6'>
          {/* Logo */}
          <div className='flex items-center gap-3'>
            <span className='text-2xl font-bold text-cosmic-latte'>rec</span>
            <span className='text-zinc-600'>|</span>
            <span className='text-sm text-zinc-500'>music recommendations</span>
          </div>

          {/* Links */}
          <div className='flex items-center gap-6 text-sm'>
            <Link
              href='/about'
              className='text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              About
            </Link>
            <Link
              href='/privacy'
              className='text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              Privacy
            </Link>
            <Link
              href='/terms'
              className='text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              Terms
            </Link>
          </div>

          {/* Copyright */}
          <div className='text-sm text-zinc-600'>© {currentYear}</div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className='bg-black'>
      <HeroSection />
      <RecentRecs />
      <Footer />
    </div>
  );
}
