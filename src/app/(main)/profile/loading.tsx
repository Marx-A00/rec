import ProfileSkeleton from '@/components/ui/ProfileSkeleton';

export default function ProfileRedirectLoading() {
  return (
    <ProfileSkeleton
      showCollection={true}
      showRecommendations={true}
      albumCount={12}
      recommendationCount={6}
      isOwnProfile={true} // Default to own profile since /profile redirects to own profile
    />
  );
}
