'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** If provided, renders "Showing X–Y of Z" above the page numbers */
  totalCount?: number;
  /** Used to compute the "Showing" range (default: 50) */
  pageSize?: number;
  /** Actual items on the current page (for accurate range on last page) */
  currentPageItemCount?: number;
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);
  return pages;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  pageSize = 50,
  currentPageItemCount,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const offset = (currentPage - 1) * pageSize;
  const itemCount = currentPageItemCount ?? pageSize;

  return (
    <div className='flex flex-col items-center gap-2'>
      {totalCount != null && (
        <p className='text-sm text-zinc-500'>
          Showing {offset + 1}–{offset + itemCount} of{' '}
          {totalCount.toLocaleString()}
        </p>
      )}
      <div className='flex items-center gap-1'>
        <Button
          variant='ghost'
          size='sm'
          className='h-8 w-8 p-0'
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>
        {getPageNumbers(currentPage, totalPages).map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className='px-1 text-sm text-zinc-600'>
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant='ghost'
              size='sm'
              className={`h-8 w-8 p-0 text-sm ${
                page === currentPage
                  ? 'bg-zinc-700 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </Button>
          )
        )}
        <Button
          variant='ghost'
          size='sm'
          className='h-8 w-8 p-0'
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
