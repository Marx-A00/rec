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
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import UniversalSearchBar from '@/components/ui/UniversalSearchBar';

interface MobileNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export default function MobileNavigation({
  children,
  className
}: MobileNavigationProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const bottomNavItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Search, label: 'Search', action: () => setSearchOpen(!searchOpen) },
    { icon: Compass, label: 'Discover', href: '/discover' },
    { icon: Library, label: 'Library', href: '/collections' },
    { icon: Menu, label: 'Menu', action: () => setMenuOpen(!menuOpen) }
  ];

  const menuItems = [
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Users, label: 'Friends', href: '/friends' },
    { icon: Settings, label: 'Settings', href: '/settings' }
  ];

  return (
    <div className={cn('flex flex-col h-screen', className)}>
      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 p-4 pt-20">
          <button
            onClick={() => setSearchOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <UniversalSearchBar
            preset="modal"
            className="w-full"
          />
        </div>
      )}

      {/* Hamburger Menu Modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/95">
          <div className="flex flex-col h-full p-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-white">Menu</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <nav className="flex flex-col space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg transition-colors',
                      pathname === item.href
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-base">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950 pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-zinc-800">
        <div className="flex justify-around items-center h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href && pathname === item.href;

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center gap-1 p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-2 transition-colors',
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}