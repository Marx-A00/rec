'use client';

import { useRef, useState, useCallback } from 'react';

export default function PluhButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pressed, setPressed] = useState(false);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/pluh.mp3');
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  }, []);

  return (
    <div className='relative w-[200px] h-[198px]'>
      {/* Stationary base — dark red edge, never moves */}
      <div
        className='absolute rounded-full'
        style={{
          width: '188px',
          height: '174px',
          top: '15px',
          left: '6px',
          background: '#8a3218',
        }}
      />

      {/* Pressable face — red circle + sprite move down into the base */}
      <div
        className='absolute top-0 left-0'
        style={{
          transform: pressed ? 'translateY(6px)' : 'translateY(0px)',
          transition: 'transform 75ms',
        }}
      >
        {/* Red circle face */}
        <div
          className='absolute rounded-full bg-dark-pastel-red'
          style={{
            width: '188px',
            height: '174px',
            top: '7px',
            left: '6px',
          }}
        />
        {/* Transparent button sprite overlay */}
        <button
          type='button'
          title='Pluh'
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
