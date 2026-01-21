import { ProfileSkeleton } from '@/components/ui/skeletons';

export default function ProfileLoading() {
  return (
    <ProfileSkeleton
      showCollection={true}
      showRecommendations={true}
      albumCount={12}
      recommendationCount={6}
      isOwnProfile={false} // We don't know yet, so default to false
    />
  );
}
