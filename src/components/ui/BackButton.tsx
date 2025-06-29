'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  text?: string;
  fallbackHref?: string;
  className?: string;
}

export default function BackButton({
  text = 'Back',
  fallbackHref = '/',
  className = 'inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors',
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Try to go back in history, but fallback to a specific route if needed
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={className}
      type='button'
      aria-label={text}
    >
      <ArrowLeft className='h-4 w-4 mr-2' />
      {text}
    </button>
  );
}
