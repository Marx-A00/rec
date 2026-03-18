'use client';

import { SmokeBackground } from '@/components/ui/smoke-background';
import { MobileUncoverNav } from '@/components/uncover/MobileUncoverNav';
import { useUncoverGameStore } from '@/stores/useUncoverGameStore';

/**
 * Shared layout for all /m/game/* routes.
 * Mirrors the desktop game layout: animated smoke background + vignette overlay.
 *
 * The parent mobile layout uses a flex column with <main> as the scroll container,
 * so this layout simply fills its parent with h-full — no height calculations needed.
 *
 * Smoke color reacts to game status:
 *  - LOST → red (#ef4444)
 *  - default → emerald (#10b981)
 */
export default function MobileGameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useUncoverGameStore(s => s.status);
  const smokeColor = status === 'LOST' ? '#ef4444' : '#10b981';

  return (
    <div className='relative h-full flex flex-col overflow-hidden'>
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
        <MobileUncoverNav />
        {children}
      </div>
    </div>
  );
}
