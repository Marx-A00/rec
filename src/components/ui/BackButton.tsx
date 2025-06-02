'use client';

import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useNavigation } from '@/hooks/useNavigation';

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
}

export default function BackButton({
  fallbackPath = '/',
  label = 'Back',
  className = '',
  variant = 'default',
}: BackButtonProps) {
  const { goBack, navigateTo } = useNavigation();
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      goBack();
    } else {
      navigateTo(fallbackPath);
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant={variant}
      className={`inline-flex items-center text-zinc-400 hover:text-white transition-colors ${className}`}
    >
      <ArrowLeft className='w-4 h-4' />
      {label}
    </Button>
  );
}
