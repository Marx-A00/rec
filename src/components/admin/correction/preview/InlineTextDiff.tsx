/**
 * Inline text diff component for character-level change highlighting.
 *
 * Renders TextDiffPart arrays as color-coded spans:
 * - Green background: Text added in source (new from MusicBrainz)
 * - Red background + line-through: Text removed (exists in current but not source)
 * - No background: Unchanged text
 */

import type { TextDiffPart } from '@/generated/graphql';

/**
 * Props for InlineTextDiff component
 */
export interface InlineTextDiffProps {
  /** Array of diff parts from text comparison */
  parts: TextDiffPart[];
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Renders inline text with color-coded diff highlighting.
 *
 * Each part of the diff is rendered as a span with conditional styling:
 * - Added text: Green background (bg-green-500/20, text-green-400)
 * - Removed text: Red background with strikethrough (bg-red-500/20, text-red-400, line-through)
 * - Unchanged text: Muted zinc color (text-zinc-300)
 *
 * @example
 * ```tsx
 * <InlineTextDiff parts={[
 *   { value: 'The ', added: false, removed: false },
 *   { value: 'Beatles', removed: true },
 *   { value: 'Rolling Stones', added: true },
 * ]} />
 * ```
 */
export function InlineTextDiff({ parts, className = '' }: InlineTextDiffProps) {
  // Handle empty parts array
  if (!parts || parts.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Determine styling based on diff type
        if (part.added) {
          return (
            <span
              key={index}
              className='bg-green-500/20 text-green-400 rounded-sm px-0.5'
            >
              {part.value}
            </span>
          );
        }

        if (part.removed) {
          return (
            <span
              key={index}
              className='bg-red-500/20 text-red-400 line-through rounded-sm px-0.5'
            >
              {part.value}
            </span>
          );
        }

        // Unchanged text
        return (
          <span key={index} className='text-zinc-300'>
            {part.value}
          </span>
        );
      })}
    </span>
  );
}
