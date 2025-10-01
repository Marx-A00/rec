'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface MosaicLoadingStateProps {
  message?: string;
  className?: string;
}

export const MosaicLoadingState = React.memo(function MosaicLoadingState({
  message = 'Loading panels...',
  className = '',
}: MosaicLoadingStateProps) {
  return (
    <div
      className={`flex items-center justify-center h-full bg-zinc-900/50 rounded-lg border border-zinc-800 ${className}`}
    >
      <div className='flex flex-col items-center space-y-3 text-center'>
        <Loader2 className='w-8 h-8 text-zinc-400 animate-spin' />
        <p className='text-sm text-zinc-400 animate-pulse'>{message}</p>
      </div>
    </div>
  );
});

export default MosaicLoadingState;
