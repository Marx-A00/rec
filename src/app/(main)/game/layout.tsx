'use client';

import { SmokeBackground } from '@/components/ui/smoke-background';
import { UncoverPageHeader } from '@/components/uncover/UncoverPageHeader';
import { useUncoverGameStore } from '@/stores/useUncoverGameStore';

/**
 * Shared layout for all /game/* routes.
 * Fixed positioning below TopBar (65px) with sidebar offset (md:ml-16).
 * Renders page header with tabs, then child content fills remaining space.
 * Smoke background covers the entire game section (header + content).
 *
 * Smoke color reacts to game status:
 *  - LOST → red (#ef4444)
 *  - default → emerald (#10b981)
 */
export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useUncoverGameStore(s => s.status);
  const smokeColor = status === 'LOST' ? '#ef4444' : '#10b981';

  return (
    <div className='fixed inset-x-0 bottom-0 top-[65px] flex flex-col overflow-hidden md:left-16'>
      <SmokeBackground
        smokeColor={smokeColor}
        speed={0.015}
        density={3.0}
        className='opacity-70'
      />

      {/* Vignette overlay — frames the smoke */}
      <div
        className='pointer-events-none absolute inset-0 z-[1]'
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      <div className='relative z-10 flex min-h-0 flex-1 flex-col'>
        <UncoverPageHeader />
        <div className='min-h-0 flex-1'>{children}</div>
      </div>
    </div>
  );
}
