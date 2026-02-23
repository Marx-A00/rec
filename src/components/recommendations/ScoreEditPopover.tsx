import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ScoreEditPopoverProps {
  currentScore: number;
  onSave: (score: number) => void;
  isPending: boolean;
  onCancel: () => void;
}

const SCORES = [5, 6, 7, 8, 9, 10] as const;

function getScoreColor(score: number, isSelected: boolean) {
  if (!isSelected) return 'text-zinc-600';
  if (score >= 10) return 'text-red-500 fill-red-500';
  if (score >= 8) return 'text-green-500 fill-green-500';
  return 'text-yellow-500 fill-yellow-500';
}

function getScoreBg(score: number, isSelected: boolean) {
  if (!isSelected) return 'bg-zinc-800 hover:bg-zinc-700';
  if (score >= 10) return 'bg-red-500/15 ring-1 ring-red-500/40';
  if (score >= 8) return 'bg-green-500/15 ring-1 ring-green-500/40';
  return 'bg-yellow-500/15 ring-1 ring-yellow-500/40';
}

export default function ScoreEditPopover({
  currentScore,
  onSave,
  isPending,
  onCancel,
}: ScoreEditPopoverProps) {
  const [selectedScore, setSelectedScore] = useState(currentScore);
  const hasChanged = selectedScore !== currentScore;

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-xs font-medium text-zinc-400 text-center'>
        Edit score
      </p>

      {/* Score buttons */}
      <div className='flex gap-1.5 justify-center'>
        {SCORES.map(score => {
          const isSelected = score <= selectedScore;
          return (
            <button
              key={score}
              onClick={() => setSelectedScore(score)}
              disabled={isPending}
              className={`
                relative flex flex-col items-center justify-center
                w-9 h-10 rounded-lg transition-all duration-150
                ${getScoreBg(score, isSelected)}
                ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={`Set score to ${score}`}
            >
              <Heart
                className={`h-4 w-4 transition-colors duration-150 ${getScoreColor(score, isSelected)}`}
              />
              <span
                className={`text-[10px] font-bold mt-0.5 tabular-nums ${
                  isSelected ? 'text-zinc-200' : 'text-zinc-500'
                }`}
              >
                {score}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className='flex gap-2'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onCancel}
          disabled={isPending}
          className='flex-1 h-7 text-xs text-zinc-400 hover:text-zinc-200'
        >
          Cancel
        </Button>
        <Button
          size='sm'
          onClick={() => onSave(selectedScore)}
          disabled={!hasChanged || isPending}
          className='flex-1 h-7 text-xs bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-40'
        >
          {isPending ? <Loader2 className='h-3 w-3 animate-spin' /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
