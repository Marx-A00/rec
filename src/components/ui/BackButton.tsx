'use client';

import { ArrowLeft } from 'lucide-react';

import { useNavigation } from '@/hooks/useNavigation';

interface BackButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function BackButton({
  className = 'inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors',
  children = (
    <>
      <ArrowLeft className='h-4 w-4 mr-2' />
      Back
    </>
  ),
}: BackButtonProps) {
  const { goBack } = useNavigation();

  return (
    <button onClick={() => goBack()} className={className}>
      {children}
    </button>
  );
}
