'use client';

import React, { useState } from 'react';
import {
  Home,
  Search,
  Library,
  User,
  Menu,
  X,
  Compass,
  Users,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import UniversalSearchBar from '@/components/ui/UniversalSearchBar';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface MobileNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export default function MobileNavigation({
  children,
  className,
}: MobileNavigationProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const bottomNavItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Search, label: 'Search', action: () => setSearchOpen(!searchOpen) },
    { icon: Compass, label: 'Discover', href: '/discover' },
    { icon: Library, label: 'Library', href: '/collections' },
    { icon: Menu, label: 'Menu', action: () => setMenuOpen(!menuOpen) },
  ];

  const menuItems = [
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Users, label: 'Friends', href: '/friends' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className={cn('flex flex-col h-screen', className)}>
      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className='fixed inset-0 z-50 bg-black/95 p-4 pt-20'
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }
            }
          >
            <motion.button
              onClick={() => setSearchOpen(false)}
              className='absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700'
              initial={prefersReducedMotion ? undefined : { scale: 0 }}
              animate={prefersReducedMotion ? undefined : { scale: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { delay: 0.1, type: 'spring', stiffness: 200 }
              }
              whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              aria-label='Close search'
            >
              <X className='h-5 w-5 text-white' />
            </motion.button>
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <UniversalSearchBar preset='modal' className='w-full' />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger Menu Modal */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className='fixed inset-0 z-50 bg-black/95'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className='flex flex-col h-full p-4'
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className='flex justify-between items-center mb-8'>
                <h2 className='text-xl font-semibold text-white'>Menu</h2>
                <motion.button
                  onClick={() => setMenuOpen(false)}
                  className='p-2 rounded-full bg-zinc-800 hover:bg-zinc-700'
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label='Close menu'
                >
                  <X className='h-5 w-5 text-white' />
                </motion.button>
              </div>

              <nav
                className='flex flex-col space-y-2'
                role='navigation'
                aria-label='Main menu'
              >
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg transition-colors',
                          pathname === item.href
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                        )}
                        aria-current={
                          pathname === item.href ? 'page' : undefined
                        }
                      >
                        <Icon className='h-5 w-5' aria-hidden='true' />
                        <span className='text-base'>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className='flex-1 overflow-y-auto bg-zinc-950 pb-16'>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className='fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-zinc-800'
        role='navigation'
        aria-label='Mobile navigation'
      >
        <div className='flex justify-around items-center h-16'>
          {bottomNavItems.map(item => {
            const Icon = item.icon;
            const isActive = item.href && pathname === item.href;

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className='flex flex-col items-center justify-center gap-1 p-2 text-zinc-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emeraled-green focus:ring-offset-2 focus:ring-offset-black rounded'
                  aria-label={item.label}
                >
                  <Icon className='h-5 w-5' aria-hidden='true' />
                  <span className='text-xs' aria-hidden='true'>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emeraled-green focus:ring-offset-2 focus:ring-offset-black rounded',
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className='h-5 w-5' aria-hidden='true' />
                <span className='text-xs' aria-hidden='true'>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
