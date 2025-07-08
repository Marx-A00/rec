// src/components/artistDetails/CollapsibleBio.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleBioProps {
  content: string;
  maxLength?: number;
}

export function CollapsibleBio({
  content,
  maxLength = 200,
}: CollapsibleBioProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Split content into sentences and take first few for preview
  const sentences = content
    .split(/[.!?]+/)
    .filter(sentence => sentence.trim().length > 0);
  const previewSentences =
    sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');

  // If content is short enough, don't show expand/collapse
  const shouldShowExpandButton =
    content.length > maxLength || sentences.length > 2;

  const displayContent = isExpanded ? content : previewSentences;

  return (
    <div className='space-y-3'>
      <p className='text-zinc-300 text-sm leading-relaxed'>
        {displayContent}
        {!isExpanded && shouldShowExpandButton && (
          <span className='text-zinc-500'>...</span>
        )}
      </p>

      {shouldShowExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors duration-200 group'
        >
          <span>{isExpanded ? 'Show less' : 'Show more'}</span>
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
