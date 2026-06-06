'use client';

import { useRef, useState, useCallback } from 'react';

const DEFAULT_COLOR = '#CC4B24';

// Multiply each RGB channel by a factor to derive the darker 3D base edge.
function shadeHex(hex: string, factor: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = Math.round(parseInt(normalized.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(normalized.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(normalized.slice(4, 6), 16) * factor);
  const toHex = (n: number) =>
    Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface ArcadeButtonProps {
  color?: string;
  sound?: string;
}

export default function ArcadeButton({
  color = DEFAULT_COLOR,
  sound = '/sounds/pluh.mp3',
}: ArcadeButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pressed, setPressed] = useState(false);

  const baseColor = shadeHex(color, 0.67);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(sound);
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  }, [sound]);

  return (
    <div className='relative w-[200px] h-[198px]'>
      {/* Stationary base — darker edge, never moves */}
      <div
        className='absolute rounded-full'
        style={{
          width: '188px',
          height: '174px',
          top: '15px',
          left: '6px',
          background: baseColor,
        }}
      />

      {/* Pressable face — colored circle + sprite move down into the base */}
      <div
        className='absolute top-0 left-0'
        style={{
          transform: pressed ? 'translateY(6px)' : 'translateY(0px)',
          transition: 'transform 75ms',
        }}
      >
        {/* Colored circle face */}
        <div
          className='absolute rounded-full'
          style={{
            width: '188px',
            height: '174px',
            top: '7px',
            left: '6px',
            background: color,
          }}
        />
        {/* Transparent button sprite overlay */}
        <button
          type='button'
          title='Arcade'
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => {
            setPressed(false);
            play();
          }}
          onPointerLeave={() => setPressed(false)}
          className='relative w-[200px] h-[190px] border-0 block cursor-pointer bg-no-repeat'
          style={{
            backgroundImage: 'url(/sounds/button-sprite.png)',
            backgroundPosition: '-5px -5px',
            WebkitTapHighlightColor: 'transparent',
          }}
        />
      </div>
    </div>
  );
}
