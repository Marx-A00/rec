'use client';

import { Heart, Music } from 'lucide-react';

const mockAlbums = [
  { src: { title: 'OK Computer', artist: 'Radiohead', hue: 'bg-sky-900' }, rec: { title: 'Kid A', artist: 'Radiohead', hue: 'bg-red-900' }, score: 10 },
  { src: { title: 'In Rainbows', artist: 'Radiohead', hue: 'bg-orange-900' }, rec: { title: 'Loveless', artist: 'My Bloody Valentine', hue: 'bg-pink-900' }, score: 9 },
  { src: { title: 'The Bends', artist: 'Radiohead', hue: 'bg-indigo-900' }, rec: { title: 'Dummy', artist: 'Portishead', hue: 'bg-amber-900' }, score: 8 },
  { src: { title: 'Amnesiac', artist: 'Radiohead', hue: 'bg-slate-800' }, rec: { title: 'Vespertine', artist: 'Bjork', hue: 'bg-violet-900' }, score: 7 },
  { src: { title: 'Hail to the Thief', artist: 'Radiohead', hue: 'bg-zinc-800' }, rec: { title: 'Homogenic', artist: 'Bjork', hue: 'bg-teal-900' }, score: 6 },
  { src: { title: 'Pablo Honey', artist: 'Radiohead', hue: 'bg-yellow-900' }, rec: { title: 'Siamese Dream', artist: 'Smashing Pumpkins', hue: 'bg-fuchsia-900' }, score: 5 },
];

type ColorSet = {
  heartColor: string;
  textColor: string;
  borderColor: string;
  bgGradient?: string;
  bgSolid?: string;
};

type ColorOption = {
  name: string;
  description: string;
  solid?: boolean;
  getColors: (score: number) => ColorSet;
};

const options: ColorOption[] = [
  {
    name: 'Current',
    description: 'Pastel from-*-50 to-*-50 with border-*-100 — nearly invisible on dark bg',
    getColors: (score: number) => {
      if (score >= 10) return { heartColor: 'text-red-500 fill-red-500', textColor: 'text-red-600', bgGradient: 'from-red-50 to-pink-50', borderColor: 'border-red-100' };
      if (score >= 8) return { heartColor: 'text-green-500 fill-green-500', textColor: 'text-green-600', bgGradient: 'from-green-50 to-emerald-50', borderColor: 'border-green-100' };
      return { heartColor: 'text-yellow-500 fill-yellow-500', textColor: 'text-yellow-600', bgGradient: 'from-yellow-50 to-amber-50', borderColor: 'border-yellow-100' };
    },
  },
  {
    name: 'Option A',
    description: 'Score color at /20 opacity gradient',
    getColors: (score: number) => {
      if (score >= 10) return { heartColor: 'text-red-500 fill-red-500', textColor: 'text-red-500', bgGradient: 'from-red-500/20 to-pink-500/20', borderColor: 'border-red-500/30' };
      if (score >= 8) return { heartColor: 'text-emerald-500 fill-emerald-500', textColor: 'text-emerald-500', bgGradient: 'from-emerald-500/20 to-green-500/20', borderColor: 'border-emerald-500/30' };
      return { heartColor: 'text-yellow-500 fill-yellow-500', textColor: 'text-yellow-500', bgGradient: 'from-yellow-500/20 to-amber-500/20', borderColor: 'border-yellow-500/30' };
    },
  },
  {
    name: 'Option B',
    description: 'Solid color at /15 opacity, no gradient',
    solid: true,
    getColors: (score: number) => {
      if (score >= 10) return { heartColor: 'text-red-500 fill-red-500', textColor: 'text-red-500', bgSolid: 'bg-red-500/15', borderColor: 'border-red-500/30' };
      if (score >= 8) return { heartColor: 'text-emerald-500 fill-emerald-500', textColor: 'text-emerald-500', bgSolid: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30' };
      return { heartColor: 'text-yellow-500 fill-yellow-500', textColor: 'text-yellow-500', bgSolid: 'bg-yellow-500/15', borderColor: 'border-yellow-500/30' };
    },
  },
  {
    name: 'Option C',
    description: 'Deep 900 shades at /60 opacity gradient',
    getColors: (score: number) => {
      if (score >= 10) return { heartColor: 'text-red-500 fill-red-500', textColor: 'text-red-500', bgGradient: 'from-red-900/60 to-pink-900/60', borderColor: 'border-red-500/30' };
      if (score >= 8) return { heartColor: 'text-emerald-500 fill-emerald-500', textColor: 'text-emerald-500', bgGradient: 'from-emerald-900/60 to-green-900/60', borderColor: 'border-emerald-500/30' };
      return { heartColor: 'text-yellow-500 fill-yellow-500', textColor: 'text-yellow-500', bgGradient: 'from-yellow-900/60 to-amber-900/60', borderColor: 'border-yellow-500/30' };
    },
  },
  {
    name: 'Option D',
    description: 'Score color /25 gradient + stronger /50 border',
    getColors: (score: number) => {
      if (score >= 10) return { heartColor: 'text-red-500 fill-red-500', textColor: 'text-red-400', bgGradient: 'from-red-500/25 to-pink-500/15', borderColor: 'border-red-500/50' };
      if (score >= 8) return { heartColor: 'text-emerald-500 fill-emerald-500', textColor: 'text-emerald-400', bgGradient: 'from-emerald-500/25 to-green-500/15', borderColor: 'border-emerald-500/50' };
      return { heartColor: 'text-yellow-500 fill-yellow-500', textColor: 'text-yellow-400', bgGradient: 'from-yellow-500/25 to-amber-500/15', borderColor: 'border-yellow-500/50' };
    },
  },
  {
    name: 'Option E',
    description: 'Solid 950 (darkest Tailwind shade) + colored border',
    solid: true,
    getColors: (score: number) => {
      if (score >= 10) return { heartColor: 'text-red-500 fill-red-500', textColor: 'text-red-400', bgSolid: 'bg-red-950', borderColor: 'border-red-500/40' };
      if (score >= 8) return { heartColor: 'text-emerald-500 fill-emerald-500', textColor: 'text-emerald-400', bgSolid: 'bg-emerald-950', borderColor: 'border-emerald-500/40' };
      return { heartColor: 'text-yellow-500 fill-yellow-500', textColor: 'text-yellow-400', bgSolid: 'bg-yellow-950', borderColor: 'border-yellow-500/40' };
    },
  },
];

function AlbumPlaceholder({ hue }: { hue: string }) {
  return (
    <div className={`w-full aspect-square rounded-lg ${hue} flex items-center justify-center`}>
      <Music className='w-8 h-8 text-white/20' />
    </div>
  );
}

function MockCard({ album, colors, solid }: { album: (typeof mockAlbums)[0]; colors: ColorSet; solid?: boolean }) {
  const bgClass = solid && colors.bgSolid ? colors.bgSolid : `bg-linear-to-r ${colors.bgGradient || ''}`;

  return (
    <article className='bg-black rounded-xl shadow-lg border border-zinc-600 p-3 relative overflow-hidden w-full max-w-[280px]'>
      <div className='flex items-center space-x-2 mb-3'>
        <div className='w-6 h-6 rounded-full bg-zinc-700 ring-2 ring-zinc-600' />
        <span className='text-xs font-medium text-zinc-300'>username</span>
      </div>

      <div className='relative'>
        <div className='grid grid-cols-2 gap-2'>
          <div className='relative'>
            <div className='mb-1.5 text-center'>
              <p className='font-bold text-sm text-white leading-tight line-clamp-1'>{album.src.title}</p>
              <p className='text-zinc-300 text-xs font-medium line-clamp-1'>{album.src.artist}</p>
            </div>
            <div className='relative'>
              <AlbumPlaceholder hue={album.src.hue} />
              <div className='absolute bottom-2 left-2 z-20'>
                <span className='bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg'>SRC</span>
              </div>
            </div>
          </div>

          <div className='relative'>
            <div className='mb-1.5 text-center'>
              <p className='font-bold text-sm text-white leading-tight line-clamp-1'>{album.rec.title}</p>
              <p className='text-zinc-300 text-xs font-medium line-clamp-1'>{album.rec.artist}</p>
            </div>
            <div className='relative'>
              <AlbumPlaceholder hue={album.rec.hue} />
              <div className='absolute bottom-2 left-2 z-20'>
                <span className='bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg'>REC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score badge — matches RecommendationCard layout */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20'>
          <div className='bg-black border-3 border-black rounded-full shadow-lg'>
            <div className={`flex items-center justify-center w-10 h-10 ${bgClass} rounded-full border-2 ${colors.borderColor} shadow-md`}>
              <div className='flex flex-col items-center'>
                <Heart className={`h-3 w-3 ${colors.heartColor} drop-shadow-xs mb-0.5`} />
                <span className={`text-xs font-bold ${colors.textColor} tabular-nums leading-none`}>{album.score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MockModalBadge({ score, colors, solid }: { score: number; colors: ColorSet; solid?: boolean }) {
  const bgClass = solid && colors.bgSolid ? colors.bgSolid : `bg-linear-to-r ${colors.bgGradient || ''}`;

  return (
    <div className='bg-black border-2 border-black rounded-full shadow-xl'>
      <div className={`flex items-center justify-center w-16 h-16 ${bgClass} rounded-full border-2 ${colors.borderColor} shadow-lg`}>
        <div className='flex flex-col items-center'>
          <Heart className={`h-5 w-5 ${colors.heartColor} drop-shadow-xs mb-0.5`} />
          <span className={`text-sm font-bold ${colors.textColor} tabular-nums leading-none`}>{score}</span>
        </div>
      </div>
    </div>
  );
}

export default function ScoreBadgesDevPage() {
  return (
    <div className='min-h-screen bg-zinc-950 p-8'>
      <h1 className='text-2xl font-bold text-white mb-1'>Score Badge Options</h1>
      <p className='text-zinc-400 mb-10'>Each option shown in card context (small badge) and modal context (large badge)</p>

      {options.map((option) => (
        <section key={option.name} className='mb-16'>
          <div className='mb-4 border-b border-zinc-800 pb-3'>
            <h2 className='text-xl font-semibold text-white'>{option.name}</h2>
            <p className='text-sm text-zinc-500'>{option.description}</p>
          </div>

          {/* Cards row */}
          <div className='mb-6'>
            <p className='text-xs text-zinc-500 uppercase tracking-wide mb-3'>Cards (small badge)</p>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4'>
              {mockAlbums.map((album) => (
                <MockCard
                  key={`${option.name}-card-${album.score}`}
                  album={album}
                  colors={option.getColors(album.score)}
                  solid={option.solid}
                />
              ))}
            </div>
          </div>

          {/* Modal-size badges row */}
          <div>
            <p className='text-xs text-zinc-500 uppercase tracking-wide mb-3'>Modal (large badge)</p>
            <div className='flex items-center gap-6 bg-black/50 rounded-xl p-6 border border-zinc-800'>
              {[10, 9, 8, 7, 6, 5].map((score) => (
                <div key={score} className='flex flex-col items-center gap-2'>
                  <MockModalBadge score={score} colors={option.getColors(score)} solid={option.solid} />
                  <span className='text-xs text-zinc-600'>Score {score}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
