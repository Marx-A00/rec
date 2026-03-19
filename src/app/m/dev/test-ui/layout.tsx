'use client';

import { SmokeBackground } from '@/components/ui/smoke-background';

/**
 * Layout for /m/dev/test-ui — mirrors the /m/game layout exactly:
 * smoke background + vignette overlay, no UncoverNav.
 */
export default function TestUILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='relative h-full flex flex-col overflow-hidden'>
      <SmokeBackground
        smokeColor='#10b981'
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

      <div className='relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto'>
        {children}
      </div>
    </div>
  );
}
