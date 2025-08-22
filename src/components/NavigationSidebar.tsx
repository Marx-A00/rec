'use client';

import { useState, useEffect } from 'react';
import { Home, TreePalm, Disc, Menu, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useRecommendationDrawerContext } from '@/contexts/RecommendationDrawerContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import SignOutButton from '@/components/auth/SignOutButton';
import SignInButton from '@/components/auth/SignInButton';

export default function NavigationSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const { openDrawer } = useRecommendationDrawerContext();

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
    // Add subtle mount animation delay
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    // Emit custom event to notify layout wrapper
    window.dispatchEvent(new CustomEvent('sidebar-toggled'));
  }, [isCollapsed]);

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const _toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <>
      {/* Skip link for screen readers */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-cosmic-latte focus:text-zinc-900 focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900'
      >
        Skip to main content
      </a>

      {/* ARIA live region for screen reader announcements */}
      <div
        className='sr-only'
        aria-live='polite'
        aria-atomic='true'
        id='sidebar-status'
      >
        {isCollapsed ? 'Sidebar collapsed' : 'Sidebar expanded'}
      </div>

      {/* Mobile hamburger menu button */}
      <button
        onClick={e => {
          toggleMobileSidebar();
          e.currentTarget.blur();
        }}
        onKeyDown={e => handleKeyDown(e, toggleMobileSidebar)}
        className={`fixed top-4 left-4 z-50 md:hidden w-12 h-12 bg-zinc-900/95 rounded-lg flex items-center justify-center border border-zinc-800 hover:bg-zinc-800 focus:outline-none active:scale-95 transition-all duration-200 ease-out ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        aria-label={
          isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'
        }
        aria-expanded={isMobileOpen}
        aria-controls='mobile-navigation'
      >
        <div
          className={`transition-transform duration-200 ease-out ${isMobileOpen ? 'rotate-90' : 'rotate-0'}`}
        >
          {isMobileOpen ? (
            <X className='w-6 h-6 text-zinc-400 transition-colors duration-150' />
          ) : (
            <Menu className='w-6 h-6 text-zinc-400 transition-colors duration-150' />
          )}
        </div>
      </button>

      {/* Mobile overlay with fade animation */}
      {isMobileOpen && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ease-out ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobileSidebar}
          onKeyDown={e => handleKeyDown(e, closeMobileSidebar)}
          role='button'
          tabIndex={0}
          aria-label='Close navigation menu'
        />
      )}

      {/* User Avatar - Fixed at top left corner, separate from nav */}
      <div
        className={`fixed top-8 left-4 z-[60] hidden md:block transition-all duration-200 ease-out delay-0 ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <HoverCard>
          <HoverCardTrigger asChild>
            {user ? (
              <Link
                href='/profile'
                onClick={e => {
                  (e.currentTarget as HTMLElement).blur();
                }}
              >
                <button
                  id='user-profile-menu'
                  className='group relative w-12 h-12 flex items-center justify-center rounded-lg backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:shadow-lg hover:shadow-cosmic-latte/20 hover:scale-105 focus:outline-none transition-all duration-200 ease-out'
                  aria-label={`User profile: ${user.name || 'Unknown user'}`}
                  aria-describedby='user-profile-info'
                >
                  <Avatar className='h-8 w-8'>
                    <AvatarImage
                      src={user.image || '/placeholder.svg'}
                      alt={user.name || 'User'}
                    />
                    <AvatarFallback className='bg-zinc-800 text-zinc-200 text-sm'>
                      {user.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </Link>
            ) : (
              <button
                className='group relative w-12 h-12 flex items-center justify-center rounded-lg backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:shadow-lg hover:shadow-cosmic-latte/20 hover:scale-105 focus:outline-none transition-all duration-200 ease-out'
                aria-label='Sign in to your account'
                aria-describedby='sign-in-info'
              >
                <Avatar className='h-8 w-8'>
                  <AvatarImage src='/placeholder.svg' alt='Guest user' />
                  <AvatarFallback className='bg-zinc-800 text-zinc-200 text-sm'>
                    ?
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </HoverCardTrigger>
          <HoverCardContent
            side='right'
            align='start'
            className='w-64 bg-black/90 backdrop-blur-sm border-zinc-700/50'
            collisionBoundary={typeof window !== 'undefined' ? document.body : undefined}
            collisionPadding={16}
            alignOffset={-8}
          >
            {user ? (
              <div>
                <div
                  id='user-profile-info'
                  className='flex items-center space-x-3 mb-6'
                >
                  <Avatar className='h-12 w-12'>
                    <AvatarImage
                      src={user.image || '/placeholder.svg'}
                      alt={user.name || 'User'}
                    />
                    <AvatarFallback className='bg-zinc-800 text-zinc-200'>
                      {user.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <h4 className='text-sm font-semibold text-white'>
                        {user.name}
                      </h4>
                      <Link href='/settings'>
                        <button
                          className='p-1 rounded hover:bg-zinc-800 transition-colors focus:outline-none'
                          aria-label='User settings'
                        >
                          <Settings className='w-4 h-4 text-zinc-400 hover:text-cosmic-latte' />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
                <SignOutButton />
              </div>
            ) : (
              <div>
                <div
                  id='sign-in-info'
                  className='flex items-center space-x-3 mb-6'
                >
                  <Avatar className='h-12 w-12'>
                    <AvatarImage src='/placeholder.svg' alt='Guest user' />
                    <AvatarFallback className='bg-zinc-800 text-zinc-200'>
                      ?
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <h4 className='text-sm font-semibold text-white'>
                      Welcome
                    </h4>
                    <p className='text-xs text-zinc-400'>
                      Sign in to access your profile
                    </p>
                  </div>
                </div>
                <SignInButton />
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Navigation buttons - Centered vertically on desktop */}
      <nav
        id='desktop-navigation'
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3 transition-all duration-300 ease-out ${
          isCollapsed
            ? 'md:opacity-0 md:scale-95'
            : 'md:opacity-100 md:scale-100'
        } ${isMounted ? 'opacity-100' : 'opacity-0'}`}
        role='navigation'
        aria-label='Main navigation'
      >
        {[
          {
            href: '/',
            icon: Home,
            label: 'Navigate to Home',
            tooltip: 'Home',
            delay: 'delay-75',
          },
          {
            href: '/browse',
            icon: TreePalm,
            label: 'Navigate to Browse & Discover',
            tooltip: 'Browse & Discover',
            delay: 'delay-150',
          },
          {
            href: '/recommend',
            icon: Disc,
            label: 'Open Create Recommendation',
            tooltip: 'Create Recommendation',
            delay: 'delay-225',
            isDrawerTrigger: true,
          },
        ].map(
          ({ href, icon: Icon, label, tooltip, delay, isDrawerTrigger }) => {
            const handleClick = (e: React.MouseEvent) => {
              closeMobileSidebar();
              // Blur the button to remove focus state after click
              (e.currentTarget as HTMLElement).blur();
              if (isDrawerTrigger) {
                // Open recommendation drawer using context
                openDrawer();
              }
            };

            const handleKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isDrawerTrigger) {
                  openDrawer();
                } else {
                  window.location.href = href;
                }
              }
            };

            // For drawer triggers, render as button; for navigation, render as Link
            if (isDrawerTrigger) {
              return (
                <button
                  key={href}
                  id='create-recommendation-button'
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  tabIndex={isCollapsed ? -1 : 0}
                  className={`group relative w-12 h-12 flex items-center justify-center rounded-lg backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:shadow-lg hover:shadow-cosmic-latte/20 hover:scale-105 focus:outline-none active:scale-95 transition-all duration-200 ease-out ${
                    isMounted
                      ? `opacity-100 translate-y-0 ${delay}`
                      : 'opacity-0 translate-y-2'
                  }`}
                  aria-label={label}
                  aria-describedby={`${href.slice(1) || 'home'}-tooltip`}
                >
                  <Icon className='w-6 h-6 text-zinc-300 group-hover:text-cosmic-latte group-hover:drop-shadow-sm transition-all duration-200 ease-out' />
                  <span
                    id={`${href.slice(1) || 'home'}-tooltip`}
                    className={`absolute left-full ml-3 opacity-0 group-hover:opacity-100 bg-black/90 backdrop-blur-sm text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-all duration-200 ease-out delay-300 pointer-events-none z-50 border border-zinc-700/50 shadow-lg hidden md:block scale-95 group-hover:scale-100 ${
                      isCollapsed ? 'md:hidden' : ''
                    }`}
                    role='tooltip'
                  >
                    {tooltip}
                    <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-black/90'></div>
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={handleClick}
                tabIndex={isCollapsed ? -1 : 0}
              >
                <button
                  id={href === '/browse' ? 'discover-nav-button' : undefined}
                  className={`group relative w-12 h-12 flex items-center justify-center rounded-lg backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:shadow-lg hover:shadow-cosmic-latte/20 hover:scale-105 focus:outline-none active:scale-95 transition-all duration-200 ease-out ${
                    isMounted
                      ? `opacity-100 translate-y-0 ${delay}`
                      : 'opacity-0 translate-y-2'
                  }`}
                  aria-label={label}
                  aria-describedby={`${href.slice(1) || 'home'}-tooltip`}
                  onKeyDown={handleKeyDown}
                >
                  <Icon className='w-6 h-6 text-zinc-300 group-hover:text-cosmic-latte group-hover:drop-shadow-sm transition-all duration-200 ease-out' />
                  <span
                    id={`${href.slice(1) || 'home'}-tooltip`}
                    className={`absolute left-full ml-3 opacity-0 group-hover:opacity-100 bg-black/90 backdrop-blur-sm text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition-all duration-200 ease-out delay-300 pointer-events-none z-50 border border-zinc-700/50 shadow-lg hidden md:block scale-95 group-hover:scale-100 ${
                      isCollapsed ? 'md:hidden' : ''
                    }`}
                    role='tooltip'
                  >
                    {tooltip}
                    <div className='absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-black/90'></div>
                  </span>
                </button>
              </Link>
            );
          }
        )}
      </nav>

      {/* Mobile sidebar - separate for mobile navigation */}
      <nav
        id='mobile-navigation'
        role='navigation'
        aria-label='Mobile navigation'
        className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-out md:hidden ${
          isMobileOpen
            ? 'translate-x-0 w-16 bg-zinc-900/95 shadow-md'
            : '-translate-x-full w-16'
        }`}
      >
        <div
          className={`flex flex-col gap-3 p-2 mt-16 ${isMounted ? 'opacity-100' : 'opacity-0'}`}
        >
          {[
            { href: '/', icon: Home, label: 'Navigate to Home' },
            {
              href: '/browse',
              icon: TreePalm,
              label: 'Navigate to Browse & Discover',
            },
            {
              href: '/recommend',
              icon: Disc,
              label: 'Open Create Recommendation',
              isDrawerTrigger: true,
            },
          ].map(({ href, icon: Icon, label, isDrawerTrigger }) => {
            const handleMobileClick = () => {
              closeMobileSidebar();
              if (isDrawerTrigger) {
                openDrawer();
              }
            };

            if (isDrawerTrigger) {
              return (
                <button
                  key={href}
                  id='create-recommendation-button-mobile'
                  onClick={e => {
                    handleMobileClick();
                    (e.currentTarget as HTMLElement).blur();
                  }}
                  className='group relative w-12 h-12 flex items-center justify-center rounded-lg backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:shadow-lg hover:shadow-cosmic-latte/20 hover:scale-105 focus:outline-none active:scale-95 transition-all duration-200 ease-out'
                  aria-label={label}
                >
                  <Icon className='w-6 h-6 text-zinc-300 group-hover:text-cosmic-latte group-hover:drop-shadow-sm transition-all duration-200 ease-out' />
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={e => {
                  handleMobileClick();
                  (e.currentTarget as HTMLElement).blur();
                }}
              >
                <button
                  id={
                    href === '/browse'
                      ? 'discover-nav-button-mobile'
                      : undefined
                  }
                  className='group relative w-12 h-12 flex items-center justify-center rounded-lg backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:shadow-lg hover:shadow-cosmic-latte/20 hover:scale-105 focus:outline-none active:scale-95 transition-all duration-200 ease-out'
                  aria-label={label}
                >
                  <Icon className='w-6 h-6 text-zinc-300 group-hover:text-cosmic-latte group-hover:drop-shadow-sm transition-all duration-200 ease-out' />
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
