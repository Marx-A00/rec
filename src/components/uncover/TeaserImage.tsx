'use client';

import { useDailyChallengeQuery } from '@/generated/graphql';
import { RevealImage } from '@/components/uncover/RevealImage';

/**
 * Teaser image for the Uncover game home page.
 * Shows stage 1 (most obscured) of today's challenge to create curiosity.
 */
export function TeaserImage({ className }: { className?: string }) {
  const { data, isLoading } = useDailyChallengeQuery();

  if (isLoading) {
    return (
      <div
        className={`aspect-square w-full overflow-hidden rounded-lg bg-muted animate-pulse ${className ?? ''}`}
      />
    );
  }

  if (!data?.dailyChallenge?.imageUrl || !data?.dailyChallenge?.id) {
    return null;
  }

  return (
    <RevealImage
      imageUrl={data.dailyChallenge.imageUrl}
      challengeId={data.dailyChallenge.id}
      stage={1}
      revealMode='regions'
      showToggle={false}
      className={`aspect-square w-full overflow-hidden rounded-lg ${className ?? ''}`}
    />
  );
}
