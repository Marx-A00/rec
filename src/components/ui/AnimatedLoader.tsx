import React from 'react';

export const AnimatedLoader: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        className='w-[170px] h-[170px]'
        version='1.1'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          <filter id='goo'>
            <feGaussianBlur in='SourceGraphic' stdDeviation={10} result='blur' />
            <feColorMatrix
              in='blur'
              mode='matrix'
              values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7'
            />
          </filter>
        </defs>
        <g filter='url(#goo)'>
          <circle
            cx={85}
            cy={60}
            r={20}
            fill='#3b82f6'
            className='animate-[bounce_1.5s_ease-in-out_infinite]'
          />
          <circle
            cx={85}
            cy={60}
            r={20}
            fill='#3b82f6'
            className='animate-[bounce_1.5s_ease-in-out_0.1s_infinite]'
          />
          <circle
            cx={85}
            cy={60}
            r={20}
            fill='#3b82f6'
            className='animate-[bounce_1.5s_ease-in-out_0.2s_infinite]'
          />
          <circle
            cx={85}
            cy={60}
            r={20}
            fill='#3b82f6'
            className='animate-[bounce_1.5s_ease-in-out_0.3s_infinite]'
          />
          <circle
            cx={85}
            cy={60}
            r={20}
            fill='#3b82f6'
            className='animate-[bounce_1.5s_ease-in-out_0.4s_infinite]'
          />
          <circle
            cx={85}
            cy={60}
            r={20}
            fill='#3b82f6'
            className='animate-[bounce_1.5s_ease-in-out_0.5s_infinite]'
          />
        </g>
      </svg>
    </div>
  );
};

export default AnimatedLoader;
