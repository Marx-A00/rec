const ICON_COLOR = '#FFFBEB'; // cosmic latte

/**
 * Vinyl record SVG with waveform icon.
 * When animated=true, rings glow with a staggered breathe effect.
 *
 * This is a server-compatible component (no 'use client') so it can
 * render in Suspense fallbacks without waiting for JS hydration.
 */
export function VinylPlaceholder({ animated = false }: { animated?: boolean }) {
  const delays = [0, 0.2, 0.4, 0.6, 0.8];
  const animStyle = (i: number) =>
    animated
      ? { animation: `vinylBreathe 2.5s ease-in-out ${delays[i]}s infinite` }
      : undefined;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="400" fill="#18181b" />
      <circle cx="200" cy="200" r="150" fill="#27272a" stroke="#3f3f46" strokeWidth="2" style={animStyle(0)} />
      <circle cx="200" cy="200" r="120" fill="#18181b" stroke="#3f3f46" strokeWidth="1" opacity="0.5" style={animStyle(1)} />
      <circle cx="200" cy="200" r="90" fill="#27272a" stroke="#3f3f46" strokeWidth="1" opacity="0.4" style={animStyle(2)} />
      <circle cx="200" cy="200" r="60" fill="#18181b" stroke="#3f3f46" strokeWidth="1" opacity="0.3" style={animStyle(3)} />
      <circle cx="200" cy="200" r="40" fill="#3f3f46" style={animStyle(4)} />
      {/* Waveform icon */}
      <g transform="translate(200, 200)" stroke={ICON_COLOR} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <line x1="-12" y1="-6" x2="-12" y2="6" />
        <line x1="-6" y1="-12" x2="-6" y2="12" />
        <line x1="0" y1="-8" x2="0" y2="8" />
        <line x1="6" y1="-14" x2="6" y2="14" />
        <line x1="12" y1="-4" x2="12" y2="4" />
      </g>
      {animated && (
        <style>{`
          @keyframes vinylBreathe {
            0%, 100% { opacity: 0.15; filter: brightness(1); }
            50% { opacity: 0.7; filter: brightness(1.6); }
          }
        `}</style>
      )}
    </svg>
  );
}
