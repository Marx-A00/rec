// src/components/artistDetails/CollapsibleBio.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleBioProps {
  content: string;
  /** Number of lines to show when collapsed (default: 2) */
  collapsedLines?: number;
}

export function CollapsibleBio({
  content,
  collapsedLines = 2,
}: CollapsibleBioProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Measure content to determine if it needs expand/collapse
  useEffect(() => {
    if (measureRef.current && contentRef.current) {
      const fullHeight = measureRef.current.scrollHeight;
      const lineHeight = parseFloat(
        getComputedStyle(measureRef.current).lineHeight
      );
      const collapsedHeight = lineHeight * collapsedLines;

      // Show button if content exceeds collapsed height
      setShouldShowButton(fullHeight > collapsedHeight + 4); // 4px tolerance
      setContentHeight(isExpanded ? fullHeight : collapsedHeight);
    }
  }, [content, collapsedLines, isExpanded]);

  return (
    <div className='space-y-3'>
      {/* Hidden element to measure full content height */}
      <div
        ref={measureRef}
        className='absolute opacity-0 pointer-events-none text-zinc-300 text-sm leading-relaxed'
        style={{ width: contentRef.current?.offsetWidth || 'auto' }}
        aria-hidden='true'
      >
        {content}
      </div>

      {/* Visible content with animation */}
      <div
        ref={contentRef}
        className='overflow-hidden transition-[height] duration-300 ease-in-out'
        style={{ height: contentHeight ? `${contentHeight}px` : 'auto' }}
      >
        <p className='text-zinc-300 text-sm leading-relaxed'>{content}</p>
      </div>

      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors duration-200 group'
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? 'Show less' : 'Read more'}</span>
          {isExpanded ? (
            <ChevronUp className='h-3 w-3 group-hover:translate-y-[-1px] transition-transform duration-200' />
          ) : (
            <ChevronDown className='h-3 w-3 group-hover:translate-y-[1px] transition-transform duration-200' />
          )}
        </button>
      )}
    </div>
  );
}
