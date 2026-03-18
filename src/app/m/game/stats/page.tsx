import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stats | Uncover',
  description: 'Your Uncover game statistics',
};

export default function MobileStatsPage() {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-4 px-4'>
      <h2 className='text-xl font-bold text-white'>Stats</h2>
      <p className='text-sm text-zinc-500'>Coming soon.</p>
    </div>
  );
}
