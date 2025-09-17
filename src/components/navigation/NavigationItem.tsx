'use client';

import React, { FC, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NavItem, NavigationContext } from '@/config/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavigationItemProps {
  item: NavItem;
  isCollapsed?: boolean;
  context?: NavigationContext;
  depth?: number;
  onItemClick?: (item: NavItem) => void;
}

export const NavigationItem: FC<NavigationItemProps> = ({
  item,
  isCollapsed = false,
  context,
  depth = 0,
  onItemClick
}) => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = item.href === pathname;
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (item.action && context) {
      e.preventDefault();
      item.action(context);
    } else if (hasChildren && !item.href) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
    onItemClick?.(item);
  };

  const ItemIcon = item.icon;
  const itemContent = (
    <div
      className={cn(
        'transition-all duration-200',
        isCollapsed ? 'flex items-center justify-center p-3 rounded-xl' : 'flex items-center gap-2 px-3 py-2 rounded-lg',
        'hover:bg-zinc-800/50',
        isActive && 'bg-zinc-800 text-emeraled-green',
        !isActive && 'text-zinc-400 hover:text-white',
        depth > 0 && !isCollapsed && 'ml-6'
      )}
    >
      <ItemIcon className={cn(
        isCollapsed ? 'w-6 h-6' : 'w-5 h-5',
        'flex-shrink-0'
      )} />
      {!isCollapsed && (
        <>
          <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
          {item.badge && (
            <span className={cn(
              'px-2 py-0.5 text-xs rounded-full',
              item.badge.variant === 'danger' && 'bg-red-500/20 text-red-400',
              item.badge.variant === 'warning' && 'bg-yellow-500/20 text-yellow-400',
              (!item.badge.variant || item.badge.variant === 'default') && 'bg-zinc-700 text-zinc-300'
            )}>
              {item.badge.count}
            </span>
          )}
          {hasChildren && (
            <div className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  const wrapperElement = item.href ? (
    <Link href={item.href} onClick={handleClick} className="block">
      {itemContent}
    </Link>
  ) : (
    <button onClick={handleClick} className="w-full text-left">
      {itemContent}
    </button>
  );

  return (
    <>
      {isCollapsed ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {wrapperElement}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.tooltip || item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        wrapperElement
      )}

      {/* Render children if expanded */}
      {!isCollapsed && hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map(child => (
            <NavigationItem
              key={child.id}
              item={child}
              isCollapsed={isCollapsed}
              context={context}
              depth={depth + 1}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default NavigationItem;