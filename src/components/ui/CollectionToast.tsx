'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CollectionToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  showNavigation?: boolean;
  navigationLabel?: string;
  navigationUrl?: string;
}

export default function CollectionToast({
  message,
  type,
  isVisible,
  onClose,
  duration = 4000, // Auto-dismiss duration
  showNavigation = false,
  navigationLabel = 'View Collection',
  navigationUrl = '/profile',
}: CollectionToastProps) {
  const router = useRouter();

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const handleNavigation = () => {
    router.push(navigationUrl);
    onClose();
  };

  if (!isVisible) return null;

  // Render via portal to bypass stacking context issues
  const toastElement = (
    <div className='fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2'>
      <div
        className={`
        flex flex-col space-y-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm
        ${
          type === 'success'
            ? 'bg-emeraled-green/90 border-emeraled-green/50 text-white'
            : 'bg-red-900/90 border-red-700 text-red-100'
        }
      `}
      >
        {/* Header with icon, message, and close button */}
        <div className='flex items-center space-x-3'>
          {type === 'success' ? (
            <CheckCircle className='h-5 w-5 text-white flex-shrink-0' />
          ) : (
            <XCircle className='h-5 w-5 text-red-400 flex-shrink-0' />
          )}

          <p className='text-sm font-medium flex-1'>{message}</p>

          <button
            onClick={onClose}
            className='text-current hover:opacity-70 transition-opacity'
            aria-label='Close notification'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        {/* Navigation button for success toasts */}
        {showNavigation && type === 'success' && (
          <button
            onClick={handleNavigation}
            className='flex items-center justify-center space-x-2 w-full py-2 px-3 bg-white/20 hover:bg-white/30 rounded-md transition-colors text-sm font-medium'
            aria-label={`Navigate to ${navigationLabel}`}
          >
            <span>{navigationLabel}</span>
            <ArrowRight className='h-4 w-4' />
          </button>
        )}
      </div>
    </div>
  );

  // Only render via portal on client side
  if (typeof window !== 'undefined') {
    return createPortal(toastElement, document.body);
  }

  return toastElement;
}

// Enhanced hook for collection toasts
export function useCollectionToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
    showNavigation: boolean;
    navigationLabel?: string;
    navigationUrl?: string;
  }>({
    message: '',
    type: 'success',
    isVisible: false,
    showNavigation: false,
  });

  const showCollectionToast = (
    message: string,
    type: 'success' | 'error' = 'success',
    options?: {
      showNavigation?: boolean;
      navigationLabel?: string;
      navigationUrl?: string;
    }
  ) => {
    setToast({
      message,
      type,
      isVisible: true,
      showNavigation: options?.showNavigation || false,
      navigationLabel: options?.navigationLabel,
      navigationUrl: options?.navigationUrl,
    });
  };

  const hideCollectionToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  return {
    toast,
    showCollectionToast,
    hideCollectionToast,
  };
}
