'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Music, Sparkles } from 'lucide-react';

interface AccountCreatedSuccessProps {
  userName?: string;
  onContinue?: () => void;
}

export default function AccountCreatedSuccess({
  userName,
  onContinue,
}: AccountCreatedSuccessProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in after a brief delay
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    setIsVisible(false);
    // Small delay for exit animation
    setTimeout(() => {
      if (onContinue) {
        onContinue();
      } else {
        window.location.href = '/';
      }
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-black/90 backdrop-blur-sm border border-cosmic-latte/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Success Icon with Animation */}
        <div className='flex justify-center mb-6'>
          <div className='relative'>
            <div className='absolute inset-0 bg-cosmic-latte/20 rounded-full animate-ping'></div>
            <div className='relative bg-cosmic-latte/10 backdrop-blur-sm border border-cosmic-latte/30 rounded-full p-4'>
              <CheckCircle className='w-12 h-12 text-cosmic-latte' />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className='text-center space-y-4 mb-8'>
          <div className='flex items-center justify-center gap-2 mb-2'>
            <Sparkles className='w-5 h-5 text-cosmic-latte animate-pulse' />
            <h2 className='text-2xl font-bold text-white'>
              Welcome to the community!
            </h2>
            <Sparkles className='w-5 h-5 text-cosmic-latte animate-pulse' />
          </div>

          <p className='text-lg text-zinc-300'>
            {userName ? `Hey ${userName}! ` : ''}Your account has been created
            successfully.
          </p>

          <div className='bg-cosmic-latte/10 backdrop-blur-sm border border-cosmic-latte/20 rounded-lg p-4 space-y-2'>
            <div className='flex items-center gap-3 text-zinc-300'>
              <Music className='w-5 h-5 text-cosmic-latte flex-shrink-0' />
              <span className='text-sm'>
                You're automatically signed in and ready to discover music
              </span>
            </div>
            <div className='flex items-center gap-3 text-zinc-300'>
              <CheckCircle className='w-5 h-5 text-cosmic-latte flex-shrink-0' />
              <span className='text-sm'>
                Start exploring albums, creating collections, and getting
                recommendations
              </span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className='w-full bg-cosmic-latte hover:bg-cosmic-latte/90 text-black font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:ring-offset-2 focus:ring-offset-black'
        >
          Start discovering music
        </button>

        {/* Decorative Elements */}
        <div className='absolute top-4 right-4 opacity-20'>
          <Music className='w-6 h-6 text-cosmic-latte' />
        </div>
        <div className='absolute bottom-4 left-4 opacity-20'>
          <Sparkles className='w-4 h-4 text-cosmic-latte' />
        </div>
      </div>
    </div>
  );
}
