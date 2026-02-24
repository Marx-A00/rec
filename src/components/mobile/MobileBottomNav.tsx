'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, User } from 'lucide-react';

import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    href: '/m',
    isActive: pathname => pathname === '/m' || pathname === '/m/',
  },
  {
    icon: User,
    label: 'Profile',
    href: '/m/profile',
    isActive: pathname => pathname.startsWith('/m/profile'),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide nav on auth pages
  const isAuthPage = pathname.startsWith('/m/auth');
  if (isAuthPage) return null;

  // Update profile link to include user ID if available
  const getHref = (item: NavItem) => {
    if (item.label === 'Profile' && session?.user?.id) {
      return `/m/profile/${session.user.id}`;
    }
    return item.href;
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'h-14 bg-zinc-900/95 backdrop-blur-lg',
        'border-t border-zinc-800',
        'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <div className='flex h-full items-center justify-around px-2'>
        {navItems.map(item => {
          const isActive = item.isActive(pathname);
          const Icon = item.icon;
          const href = getHref(item);

          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-h-[48px] min-w-[48px] px-3',
                'transition-colors duration-200',
                isActive ? 'text-white' : 'text-zinc-400'
              )}
            >
              <Icon
                className={cn('mb-0.5 h-6 w-6', isActive && 'fill-current')}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className='text-[10px] font-medium'>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
