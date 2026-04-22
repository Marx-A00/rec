'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { HelpCircle, Mail, Info, RotateCcw } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { useTourContext } from '@/contexts/TourContext';

interface HelpMenuProps {
  isExpanded?: boolean;
}

export default function HelpMenu({ isExpanded = false }: HelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { startTour } = useTourContext();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // Compute dropdown position from button rect
  const updateMenuPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        left: rect.right + 8,
        bottom: window.innerHeight - rect.bottom,
      });
    }
  }, []);

  // Close menu when clicking outside (handles both inline and portal dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInButton = menuRef.current?.contains(target);
      const clickedInDropdown = dropdownRef.current?.contains(target);
      if (!clickedInButton && !clickedInDropdown) {
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

  // Expanded mode: render items inline with labels
  if (isExpanded) {
    return (
      <div className='w-full space-y-1'>
        <Link
          href='/help'
          className='flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors'
        >
          <HelpCircle className='h-5 w-5' />
          <span>Help</span>
        </Link>
        <Link
          href='/contact'
          className='flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors'
        >
          <Mail className='h-5 w-5' />
          <span>Contact</span>
        </Link>
        <Link
          href='/about'
          className='flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors'
        >
          <Info className='h-5 w-5' />
          <span>About</span>
        </Link>
        {isAuthenticated && (
          <button
            onClick={handleRestartTour}
            className='flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors w-full text-left'
          >
            <RotateCcw className='h-5 w-5' />
            <span>Restart Tour</span>
          </button>
        )}
      </div>
    );
  }

  // Collapsed mode: portal dropdown to escape sidebar overflow
  const dropdown = isOpen && menuPos && createPortal(
    <div
      ref={dropdownRef}
      className='fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]'
      style={{ left: menuPos.left, bottom: menuPos.bottom }}
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
      {isAuthenticated && (
        <button
          onClick={handleRestartTour}
          className='flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 w-full text-left transition-colors'
          role='menuitem'
        >
          <RotateCcw className='h-4 w-4 text-zinc-400' />
          Restart Tour
        </button>
      )}
    </div>,
    document.body
  );

  return (
    <div ref={menuRef}>
      {/* Help Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          updateMenuPos();
          setIsOpen(!isOpen);
        }}
        className='group flex justify-center items-center transition-all p-2'
        aria-label='Help menu'
        aria-expanded={isOpen}
        aria-haspopup='menu'
      >
        <HelpCircle className='w-6 h-6 text-zinc-500 group-hover:text-cosmic-latte transition-colors' />
      </button>

      {dropdown}
    </div>
  );
}
