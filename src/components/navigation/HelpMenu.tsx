'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, Mail, Info, RotateCcw } from 'lucide-react';

import { useTourContext } from '@/contexts/TourContext';

export default function HelpMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { startTour } = useTourContext();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleRestartTour = () => {
    setIsOpen(false);
    startTour();
  };

  return (
    <div className='relative' ref={menuRef}>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='group flex justify-center items-center transition-all p-2'
        aria-label='Help menu'
        aria-expanded={isOpen}
        aria-haspopup='menu'
      >
        <HelpCircle className='w-6 h-6 text-zinc-500 group-hover:text-cosmic-latte transition-colors' />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className='absolute bottom-full left-0 mb-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]'
          role='menu'
          aria-label='Help options'
        >
          <Link
            href='/help'
            onClick={() => setIsOpen(false)}
            className='flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 w-full transition-colors'
            role='menuitem'
          >
            <HelpCircle className='h-4 w-4 text-zinc-400' />
            Help
          </Link>
          <Link
            href='/contact'
            onClick={() => setIsOpen(false)}
            className='flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 w-full transition-colors'
            role='menuitem'
          >
            <Mail className='h-4 w-4 text-zinc-400' />
            Contact
          </Link>
          <Link
            href='/about'
            onClick={() => setIsOpen(false)}
            className='flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 w-full transition-colors'
            role='menuitem'
          >
            <Info className='h-4 w-4 text-zinc-400' />
            About
          </Link>
          <button
            onClick={handleRestartTour}
            className='flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 w-full text-left transition-colors'
            role='menuitem'
          >
            <RotateCcw className='h-4 w-4 text-zinc-400' />
            Restart Tour
          </button>
        </div>
      )}
    </div>
  );
}
