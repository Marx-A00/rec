export default function MobileBrowseLoading() {
  return (
    <div className='min-h-screen bg-black pb-4'>
      {/* Sticky Header Skeleton */}
      <div className='sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='min-h-[44px] min-w-[44px] flex items-center'>
            <div className='h-5 w-5 rounded bg-zinc-800 animate-pulse' />
          </div>
          <div className='h-5 w-20 rounded bg-zinc-800 animate-pulse' />
          <div className='min-w-[44px]' />
        </div>
      </div>

      <div className='space-y-8 py-4'>
        {/* New Music Lovers */}
        <SkeletonSection>
          <SkeletonScrollRow>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonUserCard key={i} />
            ))}
          </SkeletonScrollRow>
        </SkeletonSection>

        {/* Top Recommended Artists */}
        <SkeletonSection>
          <SkeletonScrollRow>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCircleCard key={i} />
            ))}
          </SkeletonScrollRow>
        </SkeletonSection>

        {/* Most Recommended Albums */}
        <SkeletonSection>
          <SkeletonScrollRow>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonAlbumCard key={i} />
            ))}
          </SkeletonScrollRow>
        </SkeletonSection>

        {/* Latest Releases */}
        <SkeletonSection>
          <SkeletonScrollRow>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonAlbumCard key={i} />
            ))}
          </SkeletonScrollRow>
        </SkeletonSection>
      </div>
    </div>
  );
}

function SkeletonSection({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <div className='flex items-center gap-2 px-4 mb-3'>
        <div className='h-4 w-4 rounded bg-zinc-800 animate-pulse' />
        <div className='h-4 w-36 rounded bg-zinc-800 animate-pulse' />
      </div>
      {children}
    </section>
  );
}

function SkeletonScrollRow({ children }: { children: React.ReactNode }) {
  return <div className='flex gap-3 overflow-hidden px-4 pb-1'>{children}</div>;
}

function SkeletonUserCard() {
  return (
    <div className='flex-shrink-0 w-[130px] bg-zinc-900 border border-zinc-800 rounded-xl p-3'>
      <div className='animate-pulse flex flex-col items-center gap-2'>
        <div className='w-14 h-14 rounded-full bg-zinc-800' />
        <div className='h-3 w-16 rounded bg-zinc-800' />
        <div className='h-4 w-10 rounded-full bg-zinc-800/60' />
      </div>
    </div>
  );
}

function SkeletonCircleCard() {
  return (
    <div className='flex-shrink-0 w-[130px] bg-zinc-900 border border-zinc-800 rounded-xl p-3'>
      <div className='animate-pulse flex flex-col items-center gap-2'>
        <div className='w-14 h-14 rounded-full bg-zinc-800' />
        <div className='h-3 w-20 rounded bg-zinc-800' />
        <div className='h-2.5 w-12 rounded bg-zinc-800/60' />
      </div>
    </div>
  );
}

function SkeletonAlbumCard() {
  return (
    <div className='flex-shrink-0 w-[100px]'>
      <div className='animate-pulse'>
        <div className='aspect-square rounded-lg bg-zinc-800 mb-1.5' />
        <div className='h-3 w-full rounded bg-zinc-800 mb-1' />
        <div className='h-2.5 w-3/4 rounded bg-zinc-800/60' />
      </div>
    </div>
  );
}
