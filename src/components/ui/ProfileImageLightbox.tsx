'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null | undefined;
  username: string;
}

export default function ProfileImageLightbox({
  isOpen,
  onClose,
  imageUrl,
  username,
}: ProfileImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label={`${username}'s profile picture`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className='absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'
        aria-label='Close'
      >
        <X className='h-5 w-5' />
      </button>

      {/* Enlarged avatar */}
      <div
        className='animate-in zoom-in-75 duration-200'
        onClick={e => e.stopPropagation()}
      >
        <Avatar className='w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 border-2 border-zinc-700 shadow-2xl'>
          <AvatarImage
            src={imageUrl || undefined}
            alt={username}
            className='object-cover'
          />
          <AvatarFallback className='bg-zinc-800 text-cosmic-latte text-6xl md:text-7xl'>
            {(username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
