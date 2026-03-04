'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Home, Compass, Eye, Settings, LogOut, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface MobileSideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DrawerNavItem {
  icon: typeof Home;
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
}

const mainNavItems: DrawerNavItem[] = [
  {
    icon: Home,
    label: 'Home',
    href: '/m',
    isActive: pathname => pathname === '/m' || pathname === '/m/',
  },
  {
    icon: Compass,
    label: 'Browse',
    href: '/m/browse',
    isActive: pathname => pathname.startsWith('/m/browse'),
  },
  {
    icon: Eye,
    label: 'Uncover',
    href: '/m/game',
    isActive: pathname => pathname.startsWith('/m/game'),
  },
  // TODO: Add back when mobile routes exist
  // { icon: Disc3, label: 'Recommend', href: '/m/recommend', ... },
  // { icon: Library, label: 'Collections', href: '/m/collections', ... },
];

const bottomNavItems: DrawerNavItem[] = [
  {
    icon: Settings,
    label: 'Settings',
    href: '/m/settings',
    isActive: pathname => pathname.startsWith('/m/settings'),
  },
];

export function MobileSideDrawer({
  open,
  onOpenChange,
}: MobileSideDrawerProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on route change
  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  const profileHref = session?.user?.id
    ? `/m/profile/${session.user.id}`
    : '/m/profile';

  const userName = session?.user?.username || 'User';
  const userHandle = session?.user?.username ? `@${session.user.username}` : '';
  const userImage = session?.user?.image;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300',
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden='true'
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 left-0 z-[60] h-full w-[310px] bg-zinc-900 shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out',
          'pt-[env(safe-area-inset-top)]',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        role='dialog'
        aria-modal='true'
        aria-label='Navigation menu'
      >
        {/* Profile Section */}
        <div className='flex items-center gap-3 px-5 pt-6 pb-5'>
          <Link
            href={profileHref}
            className='flex-shrink-0'
            onClick={() => onOpenChange(false)}
          >
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={48}
                height={48}
                className='h-12 w-12 rounded-full object-cover ring-2 ring-zinc-700'
                unoptimized
              />
            ) : (
              <div className='h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center'>
                <span className='text-lg font-semibold text-zinc-300'>
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </Link>
          <div className='flex-1 min-w-0'>
            <p className='text-base font-semibold text-white truncate'>
              {userName}
            </p>
            {userHandle && (
              <p className='text-sm text-zinc-400 truncate'>{userHandle}</p>
            )}
          </div>

          {/* Close button */}
          <button
            type='button'
            onClick={() => onOpenChange(false)}
            className='flex items-center justify-center h-9 w-9 rounded-full bg-white/10 active:bg-white/20 transition-colors'
            aria-label='Close menu'
          >
            <X className='h-5 w-5 text-white' />
          </button>
        </div>

        <div className='h-px bg-zinc-800 mx-5' />

        {/* Main Nav */}
        <nav className='flex-1 px-3 py-2 overflow-y-auto'>
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 px-3 h-12 rounded-xl transition-colors',
                  active
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-300 active:bg-zinc-800'
                )}
              >
                <Icon
                  className='h-5 w-5 flex-shrink-0'
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[15px]',
                    active ? 'font-semibold' : 'font-normal'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className='px-3 pb-2'>
          <div className='h-px bg-zinc-800 mx-2 mb-2' />

          {bottomNavItems.map(item => {
            const Icon = item.icon;
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 px-3 h-12 rounded-xl transition-colors',
                  active
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-zinc-400 active:bg-zinc-800'
                )}
              >
                <Icon className='h-5 w-5 flex-shrink-0' strokeWidth={2} />
                <span className='text-[15px]'>{item.label}</span>
              </Link>
            );
          })}

          {/* Log Out */}
          <button
            type='button'
            onClick={() => signOut({ callbackUrl: '/m/auth/signin' })}
            className='flex items-center gap-4 px-3 h-12 w-full rounded-xl text-red-400 active:bg-zinc-800 transition-colors'
          >
            <LogOut className='h-5 w-5 flex-shrink-0' strokeWidth={2} />
            <span className='text-[15px]'>Log Out</span>
          </button>
        </div>

        {/* Safe area bottom padding */}
        <div className='pb-[env(safe-area-inset-bottom)]' />
      </div>
    </>
  );
}
